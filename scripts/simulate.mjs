#!/usr/bin/env node
/**
 * scripts/simulate.mjs — 自适应出题算法四场景模拟（qa/CONTRACT.md 第 10 节）
 *
 * - 题库来源：data/index.json + data/*.json，自行构造 bank
 *   （{ id, q, options, answer, type, ai }，ai = answerSource === "ai"），不依赖 www/；
 * - 随机数：mulberry32；选题流与答题对错流使用两个独立种子；
 * - 4 个场景各 1000 题，now = Date.UTC(2026, 0, 1) + i * 3600000；
 * - 每步：nextQuestion -> 按场景概率决定对错 -> applyAnswer -> state.currentId = id；
 * - 统计各类型出题占比（1–200 / 201–800 / 801–1000）、每 100 题正确率、
 *   已见题占比（作答前 seen>0）、局部 reviewRatio 分布、覆盖率、
 *   连续同题 / 同类型连击（阈值取 CONFIG.maxSameTypeStreak）、无效 id / 异常；
 * - 断言阈值不写死：场景 1 从 bank 自然占比计算，场景 4 用 2pp；
 * - 生成 qa/simulation.md；任一断言失败 -> 退出码 1。
 *
 * 用法：node scripts/simulate.mjs [seed]
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data");
const QA_DIR = join(ROOT, "qa");
const SELECTOR_PATH = join(ROOT, "src", "selector.js");
const REPORT_PATH = join(QA_DIR, "simulation.md");

const N_PER_SCENARIO = 1000;
const HOUR_MS = 3600000;
const START_NOW = Date.UTC(2026, 0, 1);
const DEFAULT_SEED = 20260101;
const ANSWER_SEED_MIX = 0x9e3779b9;

/** 报告里的出题占比窗口：第 1–200、201–800、801–1000 题（沿用契约原文区间） */
const WINDOWS = [
  { label: "1–200", start: 0, end: 200 },
  { label: "201–800", start: 200, end: 800 },
  { label: "801–1000", start: 800, end: 1000 },
];

/**
 * 契约第 10 节断言阈值。
 * - 场景 1 的阈值从 bank 自然占比计算（2 × galaxyNatural、starNatural），不写死百分比；
 * - 同类型连击阈值取 selector.CONFIG.maxSameTypeStreak，不写死 3。
 */
const ASSERT = {
  scenario4MinImprovement: 0.02, // 场景 4：前 200 占比 - 后 200 占比 >= 2pp（契约 §10 断言 2，只验证回落趋势）
};

/** 四个模拟场景（正确率规则见契约 10） */
const SCENARIOS = [
  {
    id: 1,
    label: "场景 1 · 偏科",
    description: "正确率：恒星与星座 0.90，星系与宇宙 0.25，其他类型 0.60。",
    probability(type) {
      if (type === "恒星与星座") return 0.9;
      if (type === "星系与宇宙") return 0.25;
      return 0.6;
    },
  },
  {
    id: 2,
    label: "场景 2 · 全能",
    description: "正确率：所有类型 0.80。",
    probability() {
      return 0.8;
    },
  },
  {
    id: 3,
    label: "场景 3 · 新手",
    description: "正确率：所有类型 0.25。",
    probability() {
      return 0.25;
    },
  },
  {
    id: 4,
    label: "场景 4 · 进步",
    description:
      "天象与时间历法 p = min(0.90, 0.30 + 0.60 × 该类已作答数 / 60)，其他类型 0.60。",
    probability(type, typeAnswerCounts) {
      if (type !== "天象与时间历法") return 0.6;
      const answered = typeAnswerCounts[type] || 0;
      return Math.min(0.9, 0.3 + 0.6 * (answered / 60));
    },
  },
];

// ---------------------------------------------------------------------------
// 通用工具
// ---------------------------------------------------------------------------

function die(message) {
  console.error(`[simulate] ✗ ${message}`);
  process.exit(1);
}

function readJson(filePath, label) {
  let raw;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    die(`无法读取${label} ${filePath}：${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    die(`${label} ${filePath} 不是合法 JSON：${err.message}`);
  }
}

/** 契约建议的 mulberry32（固定种子、可复现） */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pct(num, den) {
  return den > 0 ? num / den : 0;
}

function fmtPct(x, digits = 2) {
  return `${(x * 100).toFixed(digits)}%`;
}

function fmtPp(x) {
  return `${(x * 100).toFixed(2)}pp`;
}

function formatValue(value) {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value);
}

function mdTable(headers, rows) {
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];
  for (const row of rows) lines.push(`| ${row.join(" | ")} |`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 加载 selector 与题库
// ---------------------------------------------------------------------------

function loadSelector() {
  if (!existsSync(SELECTOR_PATH)) {
    die(`找不到 ${SELECTOR_PATH}（src/selector.js 尚未交付）`);
  }
  const require = createRequire(import.meta.url);
  let api;
  try {
    api = require(SELECTOR_PATH);
  } catch (err) {
    die(`加载 src/selector.js 失败：${err && err.message ? err.message : err}`);
  }
  if (!api || typeof api !== "object") die("src/selector.js 未导出对象");
  const { CONFIG, TYPE_ORDER, nextQuestion, applyAnswer } = api;
  if (!CONFIG || typeof CONFIG !== "object") die("src/selector.js 缺少 CONFIG 导出");
  if (!Array.isArray(TYPE_ORDER) || TYPE_ORDER.length === 0) {
    die("src/selector.js 缺少 TYPE_ORDER 导出");
  }
  if (typeof nextQuestion !== "function") die("src/selector.js 缺少 nextQuestion 导出");
  if (typeof applyAnswer !== "function") die("src/selector.js 缺少 applyAnswer 导出");
  return api;
}

/**
 * 读取 data/index.json 及其中列出的题库文件，构造 bank。
 * 不读取 www/，不修改 data/。
 */
function loadBank(TYPE_ORDER) {
  const indexPath = join(DATA_DIR, "index.json");
  if (!existsSync(indexPath)) die("找不到 data/index.json");
  const index = readJson(indexPath, "题库索引");
  if (!Array.isArray(index) || index.length === 0) die("data/index.json 必须是非空数组");

  const bank = [];
  const seenIds = new Set();

  for (const file of index) {
    if (typeof file !== "string" || file.trim() === "") {
      die("data/index.json 中存在非字符串文件名");
    }
    if (file.includes("/") || file.includes("\\")) {
      die(`data/index.json 中 ${JSON.stringify(file)} 只能是 data/ 下的文件名`);
    }
    const year = file.replace(/\.json$/i, "");
    if (!/^\d{4}$/.test(year)) {
      die(`data/${file}：文件名必须是 4 位年份（如 2014.json）`);
    }
    const list = readJson(join(DATA_DIR, file), `题库 data/${file}`);
    if (!Array.isArray(list)) die(`data/${file} 必须是题目数组`);

    list.forEach((item, position) => {
      const where = `data/${file} 第 ${position + 1} 条（题号 ${
        item && item.no !== undefined ? item.no : "?"
      }）`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        die(`${where}：题目必须是对象`);
      }
      if (!Number.isInteger(item.no) || item.no < 1) {
        die(`${where}：no 必须是正整数`);
      }
      if (typeof item.q !== "string" || item.q.trim() === "") {
        die(`${where}：q 必须是非空字符串`);
      }
      if (!Array.isArray(item.options) || item.options.length !== 4) {
        die(`${where}：options 必须恰好有 4 个选项`);
      }
      item.options.forEach((option, i) => {
        if (typeof option !== "string" || option.trim() === "") {
          die(`${where}：options[${i}] 必须是非空字符串`);
        }
      });
      if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer > 3) {
        die(`${where}：answer 必须是 0..3 的整数`);
      }
      if (typeof item.type !== "string" || !TYPE_ORDER.includes(item.type)) {
        die(`${where}：type 必须属于 TYPE_ORDER，实际为 ${JSON.stringify(item.type)}`);
      }
      if (item.answerSource !== undefined && typeof item.answerSource !== "string") {
        die(`${where}：answerSource 必须是字符串`);
      }
      const ai = item.answerSource === "ai";
      if (typeof ai !== "boolean") die(`${where}：ai 必须是 boolean`);

      const id = `${year}-${item.no}`;
      if (seenIds.has(id)) die(`${where}：题目 ID "${id}" 重复`);
      seenIds.add(id);

      bank.push({
        id,
        q: item.q,
        options: item.options.slice(),
        answer: item.answer,
        type: item.type,
        ai,
      });
    });
  }

  if (bank.length === 0) die("题库为空");
  return { bank, filesCount: index.length };
}

// ---------------------------------------------------------------------------
// 场景模拟
// ---------------------------------------------------------------------------

/**
 * CONTRACT §6.6：最近 reviewRatioWindow 条 log 窗口内的局部复习比例。
 * 仅用于报告口径说明，不参与选题；需要与 selector 使用同一 CONFIG 参数。
 */
function localReviewRatio(q, log, config) {
  const window = log.slice(-config.reviewRatioWindow);
  if (window.length === 0) return 0;
  let reviewCount = 0;
  for (let i = 0; i < window.length; i += 1) {
    const x = window[i].id;
    let occurrencesFromHere = 0;
    for (let j = i; j < window.length; j += 1) {
      if (window[j].id === x) occurrencesFromHere += 1;
    }
    const seenBefore = ((q[x] && q[x].seen) || 0) - occurrencesFromHere;
    if (seenBefore > 0) reviewCount += 1;
  }
  return reviewCount / window.length;
}

/** 汇总局部 reviewRatio 分布：均值/中位/最大/达到 gate 的步数占比 */
function summarizeReviewRatios(ratios, gate) {
  if (ratios.length === 0) {
    return { total: 0, mean: 0, median: 0, max: 0, gateClosedCount: 0, gateClosedShare: 0 };
  }
  const sorted = ratios.slice().sort((a, b) => a - b);
  const sum = ratios.reduce((a, b) => a + b, 0);
  const gateClosedCount = ratios.reduce((n, r) => n + (r >= gate ? 1 : 0), 0);
  return {
    total: ratios.length,
    mean: sum / ratios.length,
    median: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
    gateClosedCount,
    gateClosedShare: gateClosedCount / ratios.length,
  };
}

/**
 * 跑一个场景：1000 步，每步 nextQuestion -> 按概率对错 -> applyAnswer。
 * 每场景 state 从空 v3 开始（契约 §10）；任一异常/无效 id 都记录并计入断言。
 */
function simulateScenario(scenario, ctx) {
  const {
    bank,
    bankById,
    nextQuestion,
    applyAnswer,
    selectRng,
    answerRng,
    config,
    maxSameTypeStreak: streakLimit,
  } = ctx;

  const picks = [];
  const ratios = [];
  const typeAnswerCounts = Object.create(null);
  const errors = [];
  let state = { currentId: "", step: 0, q: {}, log: [] };

  let invalidIdCount = 0;
  let exceptionCount = 0;

  let consecutiveSameQuestion = 0;
  let maxSameQuestionStreak = 0;
  let sameQuestionStreak = 0;
  let prevId = null;

  let maxSameTypeStreak = 0;
  let sameTypeStreakOver = 0;
  let sameTypeStreak = 0;
  let prevType = null;

  for (let i = 0; i < N_PER_SCENARIO; i += 1) {
    const now = START_NOW + i * HOUR_MS;

    // 报告口径：本步作答前 state.log 窗口内的局部 reviewRatio（CONTRACT §6.6）
    ratios.push(localReviewRatio(state.q, state.log, config));

    let id;
    try {
      id = nextQuestion(bank, state, now, selectRng);
    } catch (err) {
      exceptionCount += 1;
      if (errors.length < 10) {
        errors.push(`第 ${i + 1} 题：nextQuestion 抛异常：${err && err.message ? err.message : err}`);
      }
      continue;
    }

    if (typeof id !== "string" || !bankById.has(id)) {
      invalidIdCount += 1;
      if (errors.length < 10) {
        errors.push(`第 ${i + 1} 题：nextQuestion 返回无效 id ${JSON.stringify(id)}`);
      }
      continue;
    }

    const item = bankById.get(id);
    const seenBefore = (state.q && state.q[id] && state.q[id].seen) || 0;
    const p = scenario.probability(item.type, typeAnswerCounts);
    const ok = answerRng() < p;

    try {
      state = applyAnswer(state, item, ok, now);
    } catch (err) {
      exceptionCount += 1;
      if (errors.length < 10) {
        errors.push(`第 ${i + 1} 题：applyAnswer 抛异常：${err && err.message ? err.message : err}`);
      }
      continue;
    }
    state.currentId = id;

    picks.push({ id, type: item.type, ok, seen: seenBefore > 0, p });
    typeAnswerCounts[item.type] = (typeAnswerCounts[item.type] || 0) + 1;

    // 连续相同题
    if (id === prevId) {
      sameQuestionStreak += 1;
      consecutiveSameQuestion += 1;
    } else {
      sameQuestionStreak = 1;
    }
    if (sameQuestionStreak > maxSameQuestionStreak) maxSameQuestionStreak = sameQuestionStreak;
    prevId = id;

    // 同类型连击
    sameTypeStreak = item.type === prevType ? sameTypeStreak + 1 : 1;
    prevType = item.type;
    if (sameTypeStreak > maxSameTypeStreak) maxSameTypeStreak = sameTypeStreak;
    if (sameTypeStreak > streakLimit) sameTypeStreakOver += 1;
  }

  const stats = computeStats(picks, bank.length);
  const reviewRatioStats = summarizeReviewRatios(ratios, config.reviewRatioCap);

  return {
    scenario,
    stats,
    reviewRatioStats,
    invalidIdCount,
    exceptionCount,
    consecutiveSameQuestion,
    maxSameQuestionStreak,
    maxSameTypeStreak,
    sameTypeStreakOver,
    errors,
  };
}

function computeStats(picks, bankSize) {
  const total = picks.length;
  const correct = picks.reduce((n, p) => n + (p.ok ? 1 : 0), 0);
  const seenCount = picks.reduce((n, p) => n + (p.seen ? 1 : 0), 0);
  const distinct = new Set(picks.map((p) => p.id)).size;

  const typeCounts = {};
  const typeCorrect = {};
  const windowTypeCounts = WINDOWS.map(() => ({}));
  const windowTotals = WINDOWS.map(() => 0);

  for (const p of picks) {
    typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
    if (p.ok) typeCorrect[p.type] = (typeCorrect[p.type] || 0) + 1;
  }

  picks.forEach((p, index) => {
    const wi = WINDOWS.findIndex((w) => index >= w.start && index < w.end);
    if (wi >= 0) {
      windowTypeCounts[wi][p.type] = (windowTypeCounts[wi][p.type] || 0) + 1;
      windowTotals[wi] += 1;
    }
  });

  const segments = [];
  for (let i = 0; i < N_PER_SCENARIO / 100; i += 1) {
    const slice = picks.slice(i * 100, (i + 1) * 100);
    const segCorrect = slice.reduce((n, p) => n + (p.ok ? 1 : 0), 0);
    segments.push({
      label: `${i * 100 + 1}–${(i + 1) * 100}`,
      total: slice.length,
      correct: segCorrect,
    });
  }

  return {
    total,
    correct,
    accuracy: pct(correct, total),
    seenCount,
    seenRate: pct(seenCount, total),
    distinct,
    coverage: pct(distinct, bankSize),
    typeCounts,
    typeCorrect,
    windowTypeCounts,
    windowTotals,
    segments,
  };
}

// ---------------------------------------------------------------------------
// 断言
// ---------------------------------------------------------------------------

function buildAssertions(entries, bankTypeCounts, bankSize, streakLimit) {
  const list = [];

  const scenario1 = entries[0];
  const galaxyNatural = pct(bankTypeCounts["星系与宇宙"] || 0, bankSize);
  const starNatural = pct(bankTypeCounts["恒星与星座"] || 0, bankSize);
  const galaxyShare = pct(scenario1.stats.typeCounts["星系与宇宙"] || 0, scenario1.stats.total);
  const starShare = pct(scenario1.stats.typeCounts["恒星与星座"] || 0, scenario1.stats.total);

  list.push({
    id: "1a",
    label: "场景 1：星系与宇宙总出题占比 > 2 × 其自然占比",
    threshold: `> ${fmtPct(2 * galaxyNatural, 4)}（= 2 × 自然占比）`,
    actual: fmtPct(galaxyShare),
    pass: galaxyShare > 2 * galaxyNatural,
  });
  list.push({
    id: "1b",
    label: "场景 1：恒星与星座总出题占比 < 其自然占比",
    threshold: `< ${fmtPct(starNatural, 4)}（= 自然占比）`,
    actual: fmtPct(starShare),
    pass: starShare < starNatural,
  });

  const scenario4 = entries[3];
  const typeKey = "天象与时间历法";
  const firstCount = scenario4.stats.windowTypeCounts[0][typeKey] || 0;
  const lastCount = scenario4.stats.windowTypeCounts[2][typeKey] || 0;
  const firstTotal = scenario4.stats.windowTotals[0];
  const lastTotal = scenario4.stats.windowTotals[2];
  const firstShare = pct(firstCount, firstTotal);
  const lastShare = pct(lastCount, lastTotal);
  const improvement = firstShare - lastShare;

  const scenario4MinLabel = `${(ASSERT.scenario4MinImprovement * 100).toFixed(0)}pp`;
  list.push({
    id: "2",
    label: `场景 4：天象与时间历法 第 1–200 题占比 - 第 801–1000 题占比 ≥ ${scenario4MinLabel}`,
    threshold: `≥ ${scenario4MinLabel}（${fmtPp(ASSERT.scenario4MinImprovement)}）`,
    actual: `前 200 = ${fmtPct(firstShare)}（${firstCount}/${firstTotal}），后 200 = ${fmtPct(
      lastShare,
    )}（${lastCount}/${lastTotal}），差 ${fmtPp(improvement)}`,
    pass: improvement >= ASSERT.scenario4MinImprovement,
  });

  for (const entry of entries) {
    const tag = entry.scenario.label;
    list.push({
      id: `3-${entry.scenario.id}a`,
      label: `${tag}：连续相同题次数 = 0`,
      threshold: "= 0",
      actual: String(entry.consecutiveSameQuestion),
      pass: entry.consecutiveSameQuestion === 0,
    });
    list.push({
      id: `3-${entry.scenario.id}b`,
      label: `${tag}：同一类型连续 > ${streakLimit} 次（CONFIG.maxSameTypeStreak）= 0`,
      threshold: "= 0",
      actual: `${entry.sameTypeStreakOver}（最大同类型连击 ${entry.maxSameTypeStreak}）`,
      pass:
        entry.sameTypeStreakOver === 0 && entry.maxSameTypeStreak <= streakLimit,
    });
    list.push({
      id: `3-${entry.scenario.id}c`,
      label: `${tag}：nextQuestion 无效 id = 0`,
      threshold: "= 0",
      actual: String(entry.invalidIdCount),
      pass: entry.invalidIdCount === 0,
    });
    list.push({
      id: `3-${entry.scenario.id}d`,
      label: `${tag}：异常次数 = 0`,
      threshold: "= 0",
      actual: String(entry.exceptionCount),
      pass: entry.exceptionCount === 0,
    });
  }

  const totalExceptions = entries.reduce((n, e) => n + e.exceptionCount, 0);
  list.push({
    id: "4",
    label: "运行 4 个场景全程不得抛异常（合计）",
    threshold: "= 0",
    actual: String(totalExceptions),
    pass: totalExceptions === 0,
  });

  return list;
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------

function addScenarioSection(lines, entry, api, bank, bankTypeCounts) {
  const { CONFIG, TYPE_ORDER } = api;
  const s = entry.stats;
  const rr = entry.reviewRatioStats;
  const add = (text = "") => lines.push(text);

  add(`### ${entry.scenario.label}`);
  add();
  add(`> ${entry.scenario.description}`);
  add();
  add(`- 作答：**${s.total}** 题，正确 **${s.correct}**（${fmtPct(s.accuracy)}）`);
  add(`- 已见题占比（作答前该 id 的 seen>0）：**${fmtPct(s.seenRate)}**（${s.seenCount}/${s.total}）`);
  add(
    `- 局部 reviewRatio（§6.6，最近 ${CONFIG.reviewRatioWindow} 条 log 窗口）：均值 **${fmtPct(
      rr.mean,
    )}**，中位 **${fmtPct(rr.median)}**，最大 **${fmtPct(rr.max)}**；其中 ${rr.gateClosedCount} 步（${fmtPct(
      rr.gateClosedShare,
    )}）≥ ${CONFIG.reviewRatioCap}，不满足 §6.1 复习 gate（该步不出到期复习题）`,
  );
  add(`- 覆盖率：**${s.distinct}/${bank.length}**（${fmtPct(s.coverage)}）`);
  add(
    `- 最大同类型连击：**${entry.maxSameTypeStreak}**（阈值 CONFIG.maxSameTypeStreak = ${
      CONFIG.maxSameTypeStreak
    }）；连续相同题：**${entry.consecutiveSameQuestion}**；无效 id：**${entry.invalidIdCount}**；异常：**${
      entry.exceptionCount
    }**`,
  );
  add();
  add("**各类型出题占比（窗口内占比 = 该窗口该类型题数 / 该窗口总题数）**");
  add();
  add(
    mdTable(
      ["类型", "自然占比", ...WINDOWS.map((w) => w.label), "总占比", "该类型正确率"],
      TYPE_ORDER.map((type) => {
        const typeTotal = s.typeCounts[type] || 0;
        const windowCells = WINDOWS.map((w, wi) => {
          const count = s.windowTypeCounts[wi][type] || 0;
          return `${count}（${fmtPct(pct(count, s.windowTotals[wi]))}）`;
        });
        return [
          type,
          fmtPct(pct(bankTypeCounts[type] || 0, bank.length)),
          ...windowCells,
          fmtPct(pct(typeTotal, s.total)),
          fmtPct(pct(s.typeCorrect[type] || 0, typeTotal)),
        ];
      }),
    ),
  );
  add();
  add("**每 100 题正确率**");
  add();
  add(
    mdTable(
      ["区间", "正确 / 作答", "正确率"],
      s.segments.map((seg) => [
        seg.label,
        `${seg.correct} / ${seg.total}`,
        fmtPct(pct(seg.correct, seg.total)),
      ]),
    ),
  );
  add();

  if (entry.errors.length > 0) {
    add("**异常 / 无效记录（最多 10 条）**");
    add();
    for (const message of entry.errors) add(`- ${message}`);
    add();
  }
}

function buildReport({ seed, answerSeed, api, filesCount, bank, bankTypeCounts, entries, assertions }) {
  const { CONFIG, TYPE_ORDER } = api;
  const lines = [];
  const add = (text = "") => lines.push(text);

  add("# 自适应出题算法 · 四场景模拟报告");
  add();
  add("> 本文件由 `node scripts/simulate.mjs` 自动生成，请勿手动修改。");
  add("> 规则来源：`qa/CONTRACT.md` 第 10 节。");
  add();
  add("## 1. 运行参数");
  add();
  add(`- 选题随机流种子（mulberry32）：\`${seed}\``);
  add(`- 答题对错随机流种子（独立流）：\`${answerSeed}\``);
  add(`- 起始 now：\`${START_NOW}\`（\`Date.UTC(2026, 0, 1)\`），每题 \`+${HOUR_MS}\` ms`);
  add(
    `- 每场景题数：${N_PER_SCENARIO}，共 ${N_PER_SCENARIO * SCENARIOS.length} 次作答；每场景从空 v3 状态开始`,
  );
  add(
    `- 题库：${filesCount} 个数据文件、${bank.length} 道题（直接读取 \`data/index.json\` + \`data/*.json\`，不依赖 www/）`,
  );
  add("- 复现：`node scripts/simulate.mjs`，同一种子输出完全一致");
  add();
  add("### 1.1 CONFIG（来自 `src/selector.js`）");
  add();
  add(
    mdTable(
      ["参数", "值"],
      Object.entries(CONFIG).map(([key, value]) => [`\`${key}\``, `\`${formatValue(value)}\``]),
    ),
  );
  add();
  add("### 1.2 题库类型分布");
  add();
  add(
    mdTable(
      ["类型", "题数", "自然占比"],
      TYPE_ORDER.map((type) => [
        type,
        String(bankTypeCounts[type] || 0),
        fmtPct(pct(bankTypeCounts[type] || 0, bank.length), 4),
      ]),
    ),
  );
  add();
  add("## 2. 场景汇总");
  add();
  add(
    mdTable(
      [
        "场景",
        "正确率",
        "已见题占比（seen>0）",
        "局部 reviewRatio 均值 / 最大",
        "覆盖率",
        "最大同类型连击",
        "连续相同题",
        "无效 id",
        "异常",
      ],
      entries.map((entry) => [
        entry.scenario.label,
        fmtPct(entry.stats.accuracy),
        fmtPct(entry.stats.seenRate),
        `${fmtPct(entry.reviewRatioStats.mean)} / ${fmtPct(entry.reviewRatioStats.max)}`,
        `${entry.stats.distinct}/${bank.length}（${fmtPct(entry.stats.coverage)}）`,
        String(entry.maxSameTypeStreak),
        String(entry.consecutiveSameQuestion),
        String(entry.invalidIdCount),
        String(entry.exceptionCount),
      ]),
    ),
  );
  add();
  add("> 口径说明（避免误读）：");
  add(
    `> - **已见题占比（作答前 seen>0）** 是全局统计；${N_PER_SCENARIO} 题跑 ${bank.length} 题题库时至少会有 ${
      N_PER_SCENARIO - bank.length
    } 道重复题，因此该比例天然 ≥ ${fmtPct(
      Math.max(0, (N_PER_SCENARIO - bank.length) / N_PER_SCENARIO),
    )}，不代表复习调度超限。`,
  );
  add(
    `> - **局部 reviewRatio** 按 CONTRACT §6.6 只在最近 ${CONFIG.reviewRatioWindow} 条 log 的窗口内计算；§6.1 的 \`reviewRatio < ${CONFIG.reviewRatioCap}\` 只是"本轮是否允许出到期复习题"的窗口局部 gate，不是全局"已见题占比"或复习调度比例的上限。两者口径不同，不可直接比较。`,
  );
  add();
  add("## 3. 分场景明细");
  add();
  for (const entry of entries) {
    addScenarioSection(lines, entry, api, bank, bankTypeCounts);
  }
  add("## 4. 断言结果");
  add();
  add(
    mdTable(
      ["#", "断言", "阈值", "实测", "结果"],
      assertions.map((a) => [a.id, a.label, a.threshold, a.actual, a.pass ? "PASS ✅" : "FAIL ❌"]),
    ),
  );
  add();

  const failed = assertions.filter((a) => !a.pass);
  if (failed.length === 0) {
    add("**总结论：全部断言 PASS。**");
  } else {
    add(`**总结论：FAIL（${failed.length} 项断言未通过）。**`);
    add();
    for (const assertion of failed) {
      add(`- 失败 ${assertion.id}：${assertion.label} —— 实测 ${assertion.actual}`);
    }
  }
  add();
  add(`- 选题 seed：\`${seed}\``);
  add(`- 答题 seed：\`${answerSeed}\``);
  add();

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

function parseSeed(raw) {
  const text = String(raw).trim();
  const value = /^0x[0-9a-f]+$/i.test(text) ? Number.parseInt(text, 16) : Number(text);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    die(`非法 seed：${raw}（需要整数）`);
  }
  return value >>> 0;
}

function main() {
  const seed = process.argv[2] === undefined ? DEFAULT_SEED >>> 0 : parseSeed(process.argv[2]);
  const answerSeed = (seed ^ ANSWER_SEED_MIX) >>> 0;

  const api = loadSelector();
  const { CONFIG, TYPE_ORDER, nextQuestion, applyAnswer } = api;
  const { bank, filesCount } = loadBank(TYPE_ORDER);
  const bankById = new Map(bank.map((item) => [item.id, item]));

  // 契约 §10 断言 3：同类型连击阈值必须取自 selector.CONFIG，不写死
  const maxSameTypeStreak = CONFIG.maxSameTypeStreak;
  if (!Number.isInteger(maxSameTypeStreak) || maxSameTypeStreak <= 0) {
    die("src/selector.js 的 CONFIG.maxSameTypeStreak 必须是正整数");
  }

  const bankTypeCounts = {};
  for (const item of bank) {
    bankTypeCounts[item.type] = (bankTypeCounts[item.type] || 0) + 1;
  }

  const selectRng = mulberry32(seed);
  const answerRng = mulberry32(answerSeed);
  const ctx = {
    bank,
    bankById,
    nextQuestion,
    applyAnswer,
    selectRng,
    answerRng,
    config: CONFIG,
    maxSameTypeStreak,
  };

  const entries = [];
  for (let i = 0; i < SCENARIOS.length; i += 1) {
    entries.push(simulateScenario(SCENARIOS[i], ctx));
  }

  const assertions = buildAssertions(entries, bankTypeCounts, bank.length, maxSameTypeStreak);
  const report = buildReport({
    seed,
    answerSeed,
    api,
    filesCount,
    bank,
    bankTypeCounts,
    entries,
    assertions,
  });
  writeFileSync(REPORT_PATH, report, "utf8");

  console.log(
    `[simulate] 题库：${filesCount} 个文件 / ${bank.length} 题；seed(select)=${seed}，seed(answer)=${answerSeed}`,
  );
  for (const entry of entries) {
    const s = entry.stats;
    console.log(
      `[simulate] ${entry.scenario.label}：正确率 ${fmtPct(s.accuracy)}，已见题占比 ${fmtPct(
        s.seenRate,
      )}，局部 reviewRatio 均值 ${fmtPct(entry.reviewRatioStats.mean)} / 最大 ${fmtPct(
        entry.reviewRatioStats.max,
      )}，覆盖率 ${fmtPct(s.coverage)}（${s.distinct}/${bank.length}），最大同类型连击 ${
        entry.maxSameTypeStreak
      }，连续同题 ${entry.consecutiveSameQuestion}，无效 id ${entry.invalidIdCount}，异常 ${
        entry.exceptionCount
      }`,
    );
  }
  for (const assertion of assertions) {
    console.log(
      `[assert] ${assertion.pass ? "PASS" : "FAIL"} ${assertion.id} ${assertion.label}（实测 ${
        assertion.actual
      }，阈值 ${assertion.threshold}）`,
    );
  }
  const failedCount = assertions.filter((a) => !a.pass).length;
  console.log(
    `[simulate] 断言：${assertions.length - failedCount} PASS / ${failedCount} FAIL；报告：${REPORT_PATH}`,
  );

  if (failedCount > 0) {
    console.error(`[simulate] ✗ 有 ${failedCount} 条断言未通过（退出码 1）`);
    process.exit(1);
  }
  console.log("[simulate] ✓ 全部断言通过");
}

// 供只读诊断脚本复用同一份逻辑；直接用 node 运行时才执行 main()
export {
  loadSelector,
  loadBank,
  simulateScenario,
  computeStats,
  buildAssertions,
  buildReport,
  mulberry32,
  SCENARIOS,
  START_NOW,
  HOUR_MS,
  N_PER_SCENARIO,
};

const isDirectRun =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  try {
    main();
  } catch (err) {
    console.error(`[simulate] ✗ 运行失败：${err && err.stack ? err.stack : err}`);
    process.exit(1);
  }
}
