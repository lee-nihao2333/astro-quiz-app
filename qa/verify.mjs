// qa/verify.mjs — 天文刷题应用 www/index.html 自动化验收（Playwright + 本机 Chromium）
//
// 产品形态（v3 自适应刷题）：
//   1. 只有题目 + 类别小字 + 4 个选项，没有进度条 / 题号进度
//   2. app.js 动态加载 selector.js 后初始化；题库 485 题，按自适应算法出题
//   3. 作答后先显示约 600ms 对错反馈（正确项绿、选错项红）；答对自动切题，
//      答错展开 explain 解析并“轻触继续”
//   4. 当前题与作答记录保存在 localStorage（astroQuizState.v3）；v1 / v2 可迁移且原 key 保留
//
// 覆盖：
//   - 应用动态加载 selector 的就绪等待（#question 非空 + v3 存在，最长 5 秒）
//   - 485 题、无进度 UI、4 选项、初始 v3 状态
//   - 360×640 / 412×915：initial / feedback / feedback-wrong / feedback-correct /
//     after-answer / resume / long-question / long-stem / double-click 截图
//   - 对错反馈（绿/红、600ms）；答错解析（含 **加粗** 渲染、轻触继续）
//   - 作答后 v3：step +1、currentId 变化、q[oldId]、log 最后一条、反馈期间已保存下一题
//   - 刷新续做同一题
//   - v2 → v3、v1 → v3 迁移（step/q/log 正确，旧 key 保留）
//   - 冷启动类型序列（空状态连续 16 题全部答对 → TYPE_ORDER 每类 2 题）
//   - v3 零容忍回退（含题库外 id 的 v3 → 整份丢弃并按 v2/v1/空状态回退）
//   - 最近 10 题排除（连续作答，用 v3 log 校验）
//   - 防连点（同步双点不同选项 / 同选项 / 间隔 50ms）
//   - 键盘 A-D / 1-4 选答
//   - 长题干 / 长选项换行、无横向溢出、内容最多题垂直可达
//   - console / 网络错误、www 无外部 URL
//
// 说明：本脚本不做“纯随机”断言。自适应算法细节（掌握度、softmax、Leitner 到期等）
// 由 qa/selector.test.mjs 与 scripts/simulate.mjs 覆盖；这里只做浏览器集成断言。
//
// 用法：node qa/verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);

const QA_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(QA_DIR, '..');
const WWW = path.join(ROOT, 'www', 'index.html');

// 本机可用的 playwright-core（优先环境变量），找不到时给出明确报错
const PLAYWRIGHT_CANDIDATES = [
  process.env.PLAYWRIGHT_CORE_PATH,
  '/home/marvin/Documents/deepseek-harness/default-workspace/node_modules/playwright-core',
  path.join(ROOT, 'node_modules', 'playwright-core'),
  '/tmp/review-tools/node_modules/playwright-core',
  '/usr/lib/node_modules/playwright-core',
].filter(Boolean);
let PLAYWRIGHT_PATH = null;
let playwright = null;
for (const candidate of PLAYWRIGHT_CANDIDATES) {
  try {
    playwright = require(candidate);
    PLAYWRIGHT_PATH = candidate;
    break;
  } catch (e) {
    /* 尝试下一个 */
  }
}
if (!playwright) {
  throw new Error(
    '找不到 playwright-core，可用 PLAYWRIGHT_CORE_PATH 指定路径；已尝试：' +
      PLAYWRIGHT_CANDIDATES.join(', ')
  );
}
const { chromium } = playwright;

// 本机 Chromium（优先环境变量；再按候选路径回退）
const CHROME_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  process.env.CHROME_PATH,
  '/home/marvin/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((p) => fs.existsSync(p)) || CHROME_CANDIDATES[0];

const V3_KEY = 'astroQuizState.v3';
const V2_KEY = 'astroQuizState.v2';
const V1_KEY = 'astroQuizState.v1';
const TOTAL = 485;
const DAY_MS = 86400000;
const READY_TIMEOUT_MS = 5000;
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 412, height: 915 },
];

const results = []; // { id, title, expected, actual, pass }
const consoleErrors = []; // { viewport, kind, text }
const screenshots = []; // { file, viewport, size, width, height }
const warnings = [];
const tallestSummary = [];
let longSummary = null;

function rec(id, title, expected, actual, pass) {
  results.push({
    id,
    title,
    expected: String(expected),
    actual: String(actual),
    pass: !!pass,
  });
  console.log(
    `[${pass ? 'PASS' : 'FAIL'}] ${id} ${title} | 期望=${expected} 实际=${actual}`
  );
}
const eq = (id, title, expected, actual) =>
  rec(id, title, expected, actual, Object.is(expected, actual));
const ok = (id, title, pass, actual) =>
  rec(id, title, 'true', actual, pass);

async function screenshot(page, name, viewport) {
  const file = path.join(QA_DIR, name);
  await page.screenshot({ path: file, animations: 'disabled' });
  const buf = fs.readFileSync(file);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  screenshots.push({ file, viewport, size: buf.length, width, height });
  return { file, width, height, size: buf.length };
}

// ---------------- 页面读取工具 ----------------

async function readV3(page) {
  return page.evaluate((key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }, V3_KEY);
}

async function readStorageRaw(page, key) {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

async function readQuestion(page) {
  return page.$eval('#question', (el) => el.textContent.trim());
}

const OPTION_SEL = '#options button.option';

async function optionCount(page) {
  return page.$$eval(OPTION_SEL, (els) => els.length);
}

async function readFeedback(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('#options button.option')];
    const parseRgb = (text) => {
      const match = String(text).match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(',').map((x) => parseFloat(x));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };
    return {
      correct: buttons
        .map((b, i) => (b.classList.contains('correct') ? i : -1))
        .filter((i) => i >= 0),
      wrong: buttons
        .map((b, i) => (b.classList.contains('wrong') ? i : -1))
        .filter((i) => i >= 0),
      colors: buttons.map((b) => {
        const cs = getComputedStyle(b);
        return {
          correct: b.classList.contains('correct'),
          wrong: b.classList.contains('wrong'),
          border: cs.borderTopColor,
          parsed: parseRgb(cs.borderTopColor),
        };
      }),
    };
  });
}

async function readExplanation(page) {
  return page.evaluate(() => {
    const box = document.getElementById('explain');
    const text = document.getElementById('explainText');
    const hint = document.getElementById('explainHint');
    return {
      hidden: box ? box.hidden : true,
      text: text ? text.textContent : '',
      html: text ? text.innerHTML : '',
      strongTexts: text
        ? [...text.querySelectorAll('strong')].map((el) => el.textContent)
        : [],
      hintHidden: hint ? hint.hidden : true,
    };
  });
}

function isGreenColor(color) {
  return !!color && color.g > color.r + 30 && color.g > color.b + 20;
}
function isRedColor(color) {
  return !!color && color.r > color.g + 30 && color.r > color.b + 30;
}

// 灰色小字：解析 rgb(...) 并判断为低饱和、偏暗的颜色
function parseCssRgb(text) {
  const m = String(text).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(',').map((x) => parseFloat(x));
  return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
}

function isGrayish(color) {
  if (!color) return false;
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  return max - min <= 60 && max < 220;
}

// 应用动态加载 selector.js 后再初始化。轮询 #question 文本与 v3 状态，最长 5 秒。
async function waitReady(page) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const snapshot = await page.evaluate((key) => {
        const el = document.getElementById('question');
        const text = el ? el.textContent.trim() : '';
        let state = null;
        try {
          state = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          state = null;
        }
        return { text, hasState: !!state, state };
      }, V3_KEY);
      if (
        snapshot.text.length > 0 &&
        snapshot.hasState &&
        snapshot.state &&
        typeof snapshot.state.currentId === 'string'
      ) {
        return snapshot.state;
      }
    } catch (e) {
      /* 页面导航中 evaluate 可能失败，继续轮询 */
    }
    await page.waitForTimeout(100);
  }
  return null;
}

async function ensureReady(page, tag, label) {
  const state = await waitReady(page);
  if (!state) {
    rec(
      `${tag}/ready-${label}`,
      `应用在 5 秒内就绪（${label}：#question 非空 + v3 存在）`,
      'true',
      '超时',
      false
    );
    throw new Error(`${tag}/${label}: 应用未在 ${READY_TIMEOUT_MS}ms 内就绪`);
  }
  return state;
}

async function gotoApp(page, tag, label) {
  await page.goto('file://' + WWW, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  return ensureReady(page, tag, label);
}

async function reloadApp(page, tag, label) {
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  return ensureReady(page, tag, label);
}

// 注入合法的最小 v3 状态（currentId=targetId，step=0，q/log 为空），用于确定性场景。
async function injectV3(page, tag, targetId, label) {
  await page.evaluate(
    ({ key, targetId }) => {
      localStorage.setItem(
        key,
        JSON.stringify({ currentId: targetId, step: 0, q: {}, log: [] })
      );
    },
    { key: V3_KEY, targetId }
  );
  return reloadApp(page, tag, label);
}

// 等待“下一题已渲染”：v3.currentId 已变化，且 #question 文本等于新 currentId 的题干。
async function waitForNextRendered(page, oldId, timeout = 3000) {
  try {
    await page.waitForFunction(
      ({ key, oldId }) => {
        let state = null;
        try {
          state = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          return false;
        }
        if (!state || state.currentId === oldId) return false;
        const item = (window.QUESTION_BANK || []).find(
          (x) => x.id === state.currentId
        );
        const el = document.getElementById('question');
        return !!item && !!el && el.textContent.trim() === item.q.trim();
      },
      { key: V3_KEY, oldId },
      { timeout }
    );
    await page.waitForTimeout(200); // 等待淡入结束 + 解锁（150ms）
    return true;
  } catch (e) {
    return false;
  }
}

async function readBankMeta(page) {
  return page.evaluate(() => {
    const bank = window.QUESTION_BANK || [];
    const byId = {};
    for (const item of bank) {
      byId[item.id] = {
        id: item.id,
        q: item.q,
        answer: item.answer,
        type: item.type,
        ai: item.ai,
        explain: item.explain,
        options: item.options.slice(),
      };
    }
    return { length: bank.length, ids: bank.map((x) => x.id), byId };
  });
}

// 从页面导出的 CONFIG 派生 box 上限 / log 上限（F2：不硬编码 5、500）。
async function readSelectorConfig(page) {
  return page.evaluate(() => {
    const api = window.AstroSelector;
    if (!api || !api.CONFIG || !Array.isArray(api.CONFIG.intervalsDays)) {
      return null;
    }
    const intervalsDays = api.CONFIG.intervalsDays.slice();
    return {
      intervalsDays,
      maxBox: intervalsDays.length - 1,
      logLimit: api.CONFIG.logLimit,
    };
  });
}

// 单次作答的 v3 断言（step / currentId / q 记录 / log 最后一条）
function checkAnswerV3({
  tag,
  label,
  before,
  after,
  oldId,
  item,
  correct,
  bankIds,
  maxBox,
}) {
  const prev = before.q && before.q[oldId] ? before.q[oldId] : null;
  const expectedStep = before.step + 1;
  const expectedSeen = (prev ? prev.seen : 0) + 1;
  const expectedWrong = (prev ? prev.wrong : 0) + (correct ? 0 : 1);
  let expectedBox;
  if (!correct) expectedBox = 0;
  else if (!prev || prev.seen === 0) expectedBox = 2;
  else expectedBox = Math.min(maxBox, (prev.box || 0) + 1);

  const record = after && after.q ? after.q[oldId] : null;
  const lastLog =
    after && Array.isArray(after.log) && after.log.length > 0
      ? after.log[after.log.length - 1]
      : null;

  ok(
    `${tag}/${label}-v3-step`,
    '作答后 v3.step = 旧 step + 1',
    !!after && after.step === expectedStep,
    after ? `before=${before.step}, after=${after.step}` : 'v3=null'
  );

  ok(
    `${tag}/${label}-v3-next-saved`,
    '作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘）',
    !!after &&
      after.currentId !== oldId &&
      bankIds.includes(after.currentId),
    after ? `currentId=${after.currentId}` : 'v3=null'
  );

  const recordProblems = [];
  if (!record) {
    recordProblems.push('q[oldId] 缺失');
  } else {
    if (record.seen !== expectedSeen || record.seen < 1) {
      recordProblems.push(`seen=${record.seen}(期望 ${expectedSeen})`);
    }
    if (record.wrong !== expectedWrong || record.wrong < 0) {
      recordProblems.push(`wrong=${record.wrong}(期望 ${expectedWrong})`);
    }
    if (
      !Number.isInteger(record.box) ||
      record.box < 0 ||
      record.box > maxBox
    ) {
      recordProblems.push(`box=${record.box}(上限 ${maxBox})`);
    } else if (record.box !== expectedBox) {
      recordProblems.push(`box=${record.box}(期望 ${expectedBox})`);
    }
    if (!Number.isInteger(record.lastStep) || record.lastStep !== expectedStep) {
      recordProblems.push(`lastStep=${record.lastStep}(期望 ${expectedStep})`);
    }
    if (typeof record.due !== 'number' || !Number.isFinite(record.due)) {
      recordProblems.push(`due=${record.due}`);
    } else if (record.box === 0 && record.due !== 0) {
      recordProblems.push(`box0 due=${record.due}(期望 0)`);
    } else if (record.box > 0 && !(record.due > 0)) {
      recordProblems.push(`box${record.box} due=${record.due}(期望 >0)`);
    }
  }
  ok(
    `${tag}/${label}-v3-record`,
    `v3.q[oldId] 正确（seen/wrong/box 0-${maxBox}/lastStep==step/due 数字）`,
    recordProblems.length === 0,
    recordProblems.length ? recordProblems.join('; ') : JSON.stringify(record)
  );

  const logProblems = [];
  if (!lastLog) {
    logProblems.push('log 为空');
  } else {
    if (lastLog.id !== oldId) logProblems.push(`id=${lastLog.id}(期望 ${oldId})`);
    if (lastLog.type !== item.type) logProblems.push(`type=${lastLog.type}(期望 ${item.type})`);
    if (lastLog.ok !== correct) logProblems.push(`ok=${lastLog.ok}(期望 ${correct})`);
    if (lastLog.step !== expectedStep) logProblems.push(`step=${lastLog.step}(期望 ${expectedStep})`);
  }
  ok(
    `${tag}/${label}-v3-log-last`,
    'v3.log 最后一条匹配 {id, type, ok, step}',
    logProblems.length === 0,
    logProblems.length ? logProblems.join('; ') : JSON.stringify(lastLog)
  );
}

// ---------------- 布局 / 长题候选 ----------------

async function layoutMetrics(page) {
  return page.evaluate(() => {
    const lineCount = (el) => {
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight);
      const h = el.getBoundingClientRect().height;
      const byHeight = lh > 0 ? Math.round(h / lh) : 0;
      let byRange = 0;
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = new Set(
        [...range.getClientRects()].map((r) => Math.round(r.top))
      );
      byRange = tops.size;
      return { lines: Math.max(byHeight, byRange), byHeight, byRange };
    };
    const q = document.getElementById('question');
    const typeEl = document.getElementById('questionType');
    const typeStyle = typeEl ? getComputedStyle(typeEl) : null;
    const optTexts = [...document.querySelectorAll('.option-text')];
    return {
      questionText: q.textContent,
      questionTypeText: typeEl ? typeEl.textContent : '',
      questionTypeExists: !!typeEl,
      questionTypeFontSize: typeStyle ? parseFloat(typeStyle.fontSize) : null,
      questionTypeColor: typeStyle ? typeStyle.color : null,
      questionLines: lineCount(q),
      questionOverflowPx: Math.max(0, q.scrollWidth - q.clientWidth),
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
      docOverflowPx: Math.max(
        0,
        document.documentElement.scrollWidth - window.innerWidth
      ),
      optionCount: document.querySelectorAll('button.option').length,
      optionTexts: optTexts.map((el) => ({
        text: el.textContent,
        lines: lineCount(el).lines,
        overflowPx: Math.max(0, el.scrollWidth - el.clientWidth),
      })),
      fadeClass:
        document.getElementById('quiz').className.indexOf('fade') !== -1,
      progressExists: !!document.getElementById('progress'),
      barExists: !!document.querySelector('.bar'),
    };
  });
}

async function findLongCandidates(page) {
  return page.evaluate(() => {
    const bank = window.QUESTION_BANK;
    let optionsHeavy = null;
    let stemHeavy = null;
    for (const item of bank) {
      const maxOpt = Math.max(...item.options.map((o) => o.length));
      const combined = item.q.length + maxOpt;
      if (!optionsHeavy || combined > optionsHeavy.combined) {
        optionsHeavy = {
          id: item.id,
          q: item.q,
          combined,
          stemLen: item.q.length,
          maxOptLen: maxOpt,
        };
      }
      if (!stemHeavy || item.q.length > stemHeavy.stemLen) {
        stemHeavy = {
          id: item.id,
          q: item.q,
          combined,
          stemLen: item.q.length,
          maxOptLen: maxOpt,
        };
      }
    }
    const ranked = bank
      .map((item) => ({
        id: item.id,
        q: item.q,
        stemLen: item.q.length,
        totalLen:
          item.q.length + item.options.reduce((s, o) => s + o.length, 0),
      }))
      .sort((a, b) => b.totalLen - a.totalLen);
    return { optionsHeavy, stemHeavy, tallest: ranked.slice(0, 3) };
  });
}

// ---------------- 迁移断言工具 ----------------

function buildMigrationExpected(plan, meta, nowMin, nowMax, maxBox) {
  const q = {};
  const log = [];
  const ids = [];
  plan.forEach((answer, index) => {
    const item = meta.byId[answer.id];
    const correct = answer.choice === item.answer;
    const step = index + 1;
    const prev = q[answer.id];
    const seen = (prev ? prev.seen : 0) + 1;
    const wrong = (prev ? prev.wrong : 0) + (correct ? 0 : 1);
    let box;
    if (!correct) box = 0;
    else if (!prev || prev.seen === 0) box = 2;
    else box = Math.min(maxBox, prev.box + 1);
    q[answer.id] = {
      seen,
      wrong,
      box,
      lastStep: step,
      due: box === 0 ? 0 : [nowMin + 3 * DAY_MS, nowMax + 3 * DAY_MS],
    };
    if (!ids.includes(answer.id)) ids.push(answer.id);
    log.push({ id: answer.id, type: item.type, ok: correct, step });
  });
  return { q, log, ids };
}

function compareMigratedQ(actualQ, expected) {
  const problems = [];
  if (!actualQ || typeof actualQ !== 'object') {
    return ['v3.q 不是对象'];
  }
  const actualKeys = Object.keys(actualQ);
  if (actualKeys.length !== expected.ids.length) {
    problems.push(`q 条目数 ${actualKeys.length} != ${expected.ids.length}`);
  }
  for (const id of expected.ids) {
    const e = expected.q[id];
    const a = actualQ[id];
    if (!a) {
      problems.push(`${id}: 缺失`);
      continue;
    }
    if (a.seen !== e.seen) problems.push(`${id}.seen=${a.seen}!=${e.seen}`);
    if (a.wrong !== e.wrong) problems.push(`${id}.wrong=${a.wrong}!=${e.wrong}`);
    if (a.box !== e.box) problems.push(`${id}.box=${a.box}!=${e.box}`);
    if (a.lastStep !== e.lastStep) {
      problems.push(`${id}.lastStep=${a.lastStep}!=${e.lastStep}`);
    }
    if (e.due === 0) {
      if (a.due !== 0) problems.push(`${id}.due=${a.due}!=0`);
    } else if (
      typeof a.due !== 'number' ||
      a.due < e.due[0] ||
      a.due > e.due[1]
    ) {
      problems.push(`${id}.due=${a.due} 不在 [${e.due[0]}, ${e.due[1]}]`);
    }
  }
  return problems;
}

function compareMigratedLog(actualLog, expectedLog) {
  const problems = [];
  if (!Array.isArray(actualLog)) return ['v3.log 不是数组'];
  if (actualLog.length !== expectedLog.length) {
    problems.push(`log 长度 ${actualLog.length} != ${expectedLog.length}`);
  }
  const n = Math.min(actualLog.length, expectedLog.length);
  for (let i = 0; i < n; i += 1) {
    const a = actualLog[i];
    const e = expectedLog[i];
    if (!a || typeof a !== 'object') {
      problems.push(`log[${i}] 不是对象`);
      continue;
    }
    if (a.id !== e.id) problems.push(`log[${i}].id=${a.id}!=${e.id}`);
    if (a.type !== e.type) problems.push(`log[${i}].type=${a.type}!=${e.type}`);
    if (a.ok !== e.ok) problems.push(`log[${i}].ok=${a.ok}!=${e.ok}`);
    if (a.step !== e.step) problems.push(`log[${i}].step=${a.step}!=${e.step}`);
  }
  return problems;
}

// ---------------- 单视口完整验收 ----------------

async function testViewport(browser, vp) {
  const tag = `${vp.width}x${vp.height}`;
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  const watch = { console: [], pageerror: [], requestfailed: [] };
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      const entry = {
        viewport: tag,
        kind: `console.${m.type()}`,
        text: m.text(),
      };
      watch.console.push(entry);
      consoleErrors.push(entry);
    }
  });
  page.on('pageerror', (e) => {
    const entry = { viewport: tag, kind: 'pageerror', text: e.message };
    watch.pageerror.push(entry);
    consoleErrors.push(entry);
  });
  page.on('requestfailed', (r) => {
    const entry = {
      viewport: tag,
      kind: 'requestfailed',
      text: `${r.url()} ${r.failure() && r.failure().errorText}`,
    };
    watch.requestfailed.push(entry);
    consoleErrors.push(entry);
  });
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('file:') && !u.startsWith('data:')) {
      warnings.push(`外部请求(非 file:)：${u}`);
    }
  });

  // ---- 初始加载（等待动态 selector 就绪） ----
  console.log(`\n=== 视口 ${tag}：初始加载 ===`);
  const state0 = await gotoApp(page, tag, 'initial');
  const meta = await readBankMeta(page);
  const bankIds = meta.ids;
  eq(`${tag}/bank-length`, 'window.QUESTION_BANK.length', TOTAL, meta.length);

  // F2：box 上限与 log 上限都从页面 CONFIG 派生，避免契约参数变化后断言失效。
  const config = await readSelectorConfig(page);
  ok(
    `${tag}/selector-config`,
    'window.AstroSelector.CONFIG 可读，box 上限 = intervalsDays.length - 1',
    !!config &&
      Array.isArray(config.intervalsDays) &&
      config.intervalsDays.length >= 2 &&
      Number.isInteger(config.maxBox) &&
      config.maxBox === config.intervalsDays.length - 1 &&
      config.maxBox >= 1,
    config
      ? `intervalsDays=[${config.intervalsDays.join(',')}], maxBox=${config.maxBox}, logLimit=${config.logLimit}`
      : 'CONFIG 不可读'
  );
  const maxBox = config && Number.isInteger(config.maxBox) ? config.maxBox : 0;

  const init = await layoutMetrics(page);
  ok(
    `${tag}/no-progress-text`,
    '没有题号进度文字（#progress）',
    !init.progressExists,
    `#progress=${init.progressExists}`
  );
  ok(
    `${tag}/no-progress-bar`,
    '没有进度条（.bar）',
    !init.barExists,
    `.bar=${init.barExists}`
  );
  ok(
    `${tag}/question-nonempty`,
    '题目文字非空（动态加载 selector 后已初始化）',
    init.questionText.trim().length > 0,
    init.questionText.slice(0, 40)
  );

  const initialType = meta.byId[state0.currentId].type;
  eq(
    `${tag}/question-type-text`,
    '题目下方灰色小字显示当前题目类别',
    `类别：${initialType}`,
    init.questionTypeText
  );
  ok(
    `${tag}/question-type-small-gray`,
    '类别小字：字号 ≤ 14px 且为灰色系',
    init.questionTypeExists &&
      init.questionTypeFontSize > 0 &&
      init.questionTypeFontSize <= 14 &&
      isGrayish(parseCssRgb(init.questionTypeColor)),
    `fontSize=${init.questionTypeFontSize}px, color=${init.questionTypeColor}`
  );

  eq(`${tag}/option-count`, '选项按钮数量', 4, await optionCount(page));
  const letters = await page.$$eval('#options .letter', (els) =>
    els.map((e) => e.textContent)
  );
  eq(`${tag}/option-letters`, '选项字母 A B C D', 'A,B,C,D', letters.join(','));
  const optionTexts = await page.$$eval('#options .option-text', (els) =>
    els.map((e) => e.textContent.trim())
  );
  ok(
    `${tag}/option-text-nonempty`,
    '4 个选项文字均非空',
    optionTexts.length === 4 && optionTexts.every((t) => t.length > 0),
    JSON.stringify(optionTexts.map((t) => t.slice(0, 20)))
  );

  ok(
    `${tag}/state-initial-v3`,
    '初始 localStorage v3 合法（currentId 在题库、step=0、q/log 为空）',
    !!state0 &&
      bankIds.includes(state0.currentId) &&
      state0.step === 0 &&
      Object.keys(state0.q || {}).length === 0 &&
      Array.isArray(state0.log) &&
      state0.log.length === 0,
    state0
      ? `currentId=${state0.currentId}, step=${state0.step}, q=${Object.keys(
          state0.q || {}
        ).length}, log=${state0.log ? state0.log.length : 'null'}`
      : 'null'
  );

  ok(
    `${tag}/initial-no-h-overflow`,
    '初始界面无横向溢出',
    init.docOverflowPx === 0,
    `scrollWidth=${init.docScrollWidth}, innerWidth=${init.innerWidth}, overflow=${init.docOverflowPx}px`
  );

  const shotInit = await screenshot(page, `${tag}-initial.png`, tag);
  eq(
    `${tag}/shot-initial-size`,
    '初始截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotInit.width}x${shotInit.height}`
  );

  // ---- 自然首题：反馈 → v3 落盘 → 切题 → 刷新续做 ----
  console.log(`=== 视口 ${tag}：作答 / 反馈 / v3 / 续做 ===`);
  const before1 = await readV3(page);
  const oldId1 = before1.currentId;
  const item1 = meta.byId[oldId1];
  const oldText1 = await readQuestion(page);
  const correct1 = true;

  await page.locator(OPTION_SEL).nth(item1.answer).click();
  await page.waitForTimeout(250); // 反馈期间（600ms 内）

  const fb1 = await readFeedback(page);
  eq(
    `${tag}/feedback-progress`,
    '反馈期间仍停留在当前题（600ms 反馈，未提前切题）',
    oldText1,
    await readQuestion(page)
  );
  eq(
    `${tag}/feedback-correct-marked`,
    '反馈：正确项被标记为绿色（.correct）',
    JSON.stringify([item1.answer]),
    JSON.stringify(fb1.correct)
  );
  eq(
    `${tag}/feedback-wrong-marked`,
    '反馈：答对时没有红色标记（.wrong）',
    '[]',
    JSON.stringify(fb1.wrong)
  );
  const explain1 = await readExplanation(page);
  ok(
    `${tag}/feedback-correct-no-explanation`,
    '答对时不显示解析面板',
    explain1.hidden === true,
    `hidden=${explain1.hidden}`
  );
  const shotFeedback = await screenshot(page, `${tag}-feedback.png`, tag);
  eq(
    `${tag}/shot-feedback-size`,
    '反馈截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotFeedback.width}x${shotFeedback.height}`
  );

  const during1 = await readV3(page);
  checkAnswerV3({
    tag,
    label: 'natural',
    before: before1,
    after: during1,
    oldId: oldId1,
    item: item1,
    correct: correct1,
    bankIds,
    maxBox,
  });

  const changed1 = await waitForNextRendered(page, oldId1);
  ok(
    `${tag}/after-answer-question-changed`,
    '约 600ms 反馈 + 淡出后切换到 v3.currentId 对应的新题',
    changed1,
    changed1 ? (await readQuestion(page)).slice(0, 40) : '超时未切题'
  );
  eq(
    `${tag}/after-answer-option-count`,
    '换题后选项按钮数量',
    4,
    await optionCount(page)
  );
  const metricsAfter = await layoutMetrics(page);
  ok(
    `${tag}/after-answer-fade-cleared`,
    '淡入淡出结束（fade class 移除）',
    !metricsAfter.fadeClass,
    `fade=${metricsAfter.fadeClass}`
  );
  ok(
    `${tag}/after-answer-still-no-progress`,
    '切题后仍然没有进度 UI',
    !metricsAfter.progressExists && !metricsAfter.barExists,
    `progress=${metricsAfter.progressExists}, bar=${metricsAfter.barExists}`
  );
  const afterAnswerType = meta.byId[(await readV3(page)).currentId].type;
  eq(
    `${tag}/question-type-updated`,
    '切题后类别小字同步更新为新题类型',
    `类别：${afterAnswerType}`,
    metricsAfter.questionTypeText
  );
  const shotAfter = await screenshot(page, `${tag}-after-answer.png`, tag);
  eq(
    `${tag}/shot-after-answer-size`,
    '作答后截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotAfter.width}x${shotAfter.height}`
  );

  // 刷新续做同一题
  const resumeState = await readV3(page);
  const resumeQuestion = await readQuestion(page);
  await reloadApp(page, tag, 'resume');
  const stResume = await readV3(page);
  eq(
    `${tag}/resume-question`,
    '刷新后恢复到同一道题',
    resumeQuestion,
    await readQuestion(page)
  );
  ok(
    `${tag}/resume-state`,
    '刷新后 v3 currentId/step/log 不丢',
    !!stResume &&
      stResume.currentId === resumeState.currentId &&
      stResume.step === resumeState.step &&
      Array.isArray(stResume.log) &&
      stResume.log.length === resumeState.log.length &&
      stResume.log[stResume.log.length - 1].id ===
        resumeState.log[resumeState.log.length - 1].id,
    stResume
      ? `currentId=${stResume.currentId}, step=${stResume.step}, log=${stResume.log.length}`
      : 'null'
  );
  const resumeMetrics = await layoutMetrics(page);
  ok(
    `${tag}/resume-no-h-overflow`,
    '刷新后无横向溢出',
    resumeMetrics.docOverflowPx === 0,
    `overflow=${resumeMetrics.docOverflowPx}px`
  );
  eq(
    `${tag}/resume-option-count`,
    '刷新后选项按钮数量',
    4,
    resumeMetrics.optionCount
  );
  const shotResume = await screenshot(page, `${tag}-resume.png`, tag);
  eq(
    `${tag}/shot-resume-size`,
    '续做截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotResume.width}x${shotResume.height}`
  );

  // ---- 确定性选错：颜色反馈 + explain 解析 + 轻触继续 ----
  console.log(`=== 视口 ${tag}：确定性选错 / 解析 / 选对 ===`);
  const wrongId =
    bankIds.find(
      (id) =>
        meta.byId[id].answer !== 0 && meta.byId[id].explain.includes('**')
    ) || bankIds.find((id) => meta.byId[id].answer !== 0);
  const wrongItem = meta.byId[wrongId];
  const expectedStrongTexts = wrongItem.explain
    .split('**')
    .filter((_, index) => index % 2 === 1);
  await injectV3(page, tag, wrongId, 'inject-wrong');
  const beforeWrong = await readV3(page);
  const wrongText = await readQuestion(page);
  await page.locator(OPTION_SEL).first().click();
  await page.waitForTimeout(250);
  const fbWrong = await readFeedback(page);
  eq(
    `${tag}/feedback-wrong-case-correct-marked`,
    '确定性选错：正确项标绿',
    JSON.stringify([wrongItem.answer]),
    JSON.stringify(fbWrong.correct)
  );
  eq(
    `${tag}/feedback-wrong-case-selected-marked`,
    '确定性选错：选中项标红',
    JSON.stringify([0]),
    JSON.stringify(fbWrong.wrong)
  );
  ok(
    `${tag}/feedback-wrong-case-green`,
    '确定性选错：正确项边框为绿色系（计算样式）',
    fbWrong.colors[wrongItem.answer] &&
      isGreenColor(fbWrong.colors[wrongItem.answer].parsed),
    fbWrong.colors[wrongItem.answer]
      ? fbWrong.colors[wrongItem.answer].border
      : 'missing'
  );
  ok(
    `${tag}/feedback-wrong-case-red`,
    '确定性选错：选中项边框为红色系（计算样式）',
    fbWrong.colors[0] && isRedColor(fbWrong.colors[0].parsed),
    fbWrong.colors[0] ? fbWrong.colors[0].border : 'missing'
  );

  const explainAt250 = await readExplanation(page);
  ok(
    `${tag}/explain-visible-wrong`,
    '答错后显示解析面板（#explain）',
    explainAt250.hidden === false,
    `hidden=${explainAt250.hidden}`
  );
  eq(
    `${tag}/explain-text`,
    '解析文本与题库 explain 一致（去掉 ** 标记）',
    wrongItem.explain.replace(/\*\*/g, ''),
    explainAt250.text
  );
  eq(
    `${tag}/explain-bold`,
    '解析中的 **加粗** 渲染为 <strong>',
    JSON.stringify(expectedStrongTexts),
    JSON.stringify(explainAt250.strongTexts)
  );
  ok(
    `${tag}/explain-hint-hidden-initially`,
    '600ms 反馈期间暂不显示“轻触继续”',
    explainAt250.hintHidden === true,
    `hintHidden=${explainAt250.hintHidden}`
  );

  const duringWrong = await readV3(page);
  checkAnswerV3({
    tag,
    label: 'wrong',
    before: beforeWrong,
    after: duringWrong,
    oldId: wrongId,
    item: wrongItem,
    correct: false,
    bankIds,
    maxBox,
  });

  await page.waitForTimeout(500); // 总约 750ms：反馈结束，进入“等待继续”
  const explainAfter = await readExplanation(page);
  ok(
    `${tag}/explain-hint-visible`,
    '反馈结束后显示“轻触继续”提示',
    explainAfter.hintHidden === false,
    `hintHidden=${explainAfter.hintHidden}`
  );
  ok(
    `${tag}/explain-no-auto-advance`,
    '答错后不自动切题，等待用户阅读解析',
    (await readQuestion(page)) === wrongText,
    `questionChanged=${(await readQuestion(page)) !== wrongText}`
  );
  const shotFbWrong = await screenshot(page, `${tag}-feedback-wrong.png`, tag);
  eq(
    `${tag}/shot-feedback-wrong-size`,
    '选错解析截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotFbWrong.width}x${shotFbWrong.height}`
  );

  // 轻触解析（任意 pointerdown 均可继续）
  await page.locator('#explain').click({ position: { x: 12, y: 12 } });
  const changedWrong = await waitForNextRendered(page, wrongId);
  ok(
    `${tag}/feedback-wrong-case-next`,
    '轻触继续后进入下一题，v3.currentId 与页面一致',
    changedWrong &&
      duringWrong.currentId !== wrongId &&
      (await readQuestion(page)) ===
        meta.byId[(await readV3(page)).currentId].q,
    changedWrong ? `next=${(await readV3(page)).currentId}` : '超时未切题'
  );
  const explainAfterNext = await readExplanation(page);
  ok(
    `${tag}/explain-hidden-after-next`,
    '切题后解析面板隐藏',
    explainAfterNext.hidden === true,
    `hidden=${explainAfterNext.hidden}`
  );

  // ---- 确定性选对反馈（点击 A，正确项就是 A） ----
  const rightId = bankIds.find((id) => meta.byId[id].answer === 0);
  const rightItem = meta.byId[rightId];
  await injectV3(page, tag, rightId, 'inject-right');
  const beforeRight = await readV3(page);
  await page.locator(OPTION_SEL).first().click();
  await page.waitForTimeout(250);
  const fbRight = await readFeedback(page);
  eq(
    `${tag}/feedback-right-case-correct-marked`,
    '确定性选对：选中项标绿',
    JSON.stringify([0]),
    JSON.stringify(fbRight.correct)
  );
  eq(
    `${tag}/feedback-right-case-no-wrong`,
    '确定性选对：没有红色标记',
    '[]',
    JSON.stringify(fbRight.wrong)
  );
  ok(
    `${tag}/feedback-right-case-green`,
    '确定性选对：正确项边框为绿色系（计算样式）',
    fbRight.colors[0] && isGreenColor(fbRight.colors[0].parsed),
    fbRight.colors[0] ? fbRight.colors[0].border : 'missing'
  );
  const explainRight = await readExplanation(page);
  ok(
    `${tag}/feedback-right-case-no-explanation`,
    '确定性选对：不显示解析面板',
    explainRight.hidden === true,
    `hidden=${explainRight.hidden}`
  );
  const shotFbRight = await screenshot(page, `${tag}-feedback-correct.png`, tag);
  eq(
    `${tag}/shot-feedback-correct-size`,
    '选对反馈截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotFbRight.width}x${shotFbRight.height}`
  );
  const duringRight = await readV3(page);
  checkAnswerV3({
    tag,
    label: 'right',
    before: beforeRight,
    after: duringRight,
    oldId: rightId,
    item: rightItem,
    correct: true,
    bankIds,
    maxBox,
  });
  const changedRight = await waitForNextRendered(page, rightId);
  ok(
    `${tag}/feedback-right-case-next`,
    '选对反馈结束后进入下一题，v3.currentId 与页面一致',
    changedRight &&
      duringRight.currentId !== rightId &&
      (await readQuestion(page)) ===
        meta.byId[(await readV3(page)).currentId].q,
    changedRight ? `next=${duringRight.currentId}` : '超时未切题'
  );

  // ---- 长题目 / 长题干 ----
  console.log(`=== 视口 ${tag}：长题目 / 垂直可达性 ===`);
  const cand = await findLongCandidates(page);
  if (!longSummary) {
    longSummary = {
      optionsHeavy: {
        id: cand.optionsHeavy.id,
        stemLen: cand.optionsHeavy.stemLen,
        maxOptLen: cand.optionsHeavy.maxOptLen,
      },
      stemHeavy: {
        id: cand.stemHeavy.id,
        stemLen: cand.stemHeavy.stemLen,
      },
    };
  }

  await injectV3(page, tag, cand.optionsHeavy.id, 'inject-long-opt');
  const longOpt = await layoutMetrics(page);
  eq(
    `${tag}/long-opt-question`,
    '长题场景定位到目标题',
    cand.optionsHeavy.q,
    longOpt.questionText
  );
  ok(
    `${tag}/long-opt-h-overflow`,
    '长题（题干+选项最长）文档无横向溢出',
    longOpt.docOverflowPx === 0,
    `scrollWidth=${longOpt.docScrollWidth}, innerWidth=${longOpt.innerWidth}, overflow=${longOpt.docOverflowPx}px`
  );
  ok(
    `${tag}/long-opt-question-wrap`,
    '长题题干发生换行（行数 ≥ 2）',
    longOpt.questionLines.lines >= 2,
    `lines=${longOpt.questionLines.lines} (byHeight=${longOpt.questionLines.byHeight}, byRange=${longOpt.questionLines.byRange})`
  );
  const wrappedOpts = longOpt.optionTexts.filter((o) => o.lines >= 2);
  ok(
    `${tag}/long-opt-option-wrap`,
    '长选项文字发生换行（≥1 个选项行数 ≥ 2）',
    wrappedOpts.length >= 1,
    `换行选项数=${wrappedOpts.length}, 各选项行数=${JSON.stringify(
      longOpt.optionTexts.map((o) => o.lines)
    )}`
  );
  ok(
    `${tag}/long-opt-option-no-overflow`,
    '选项文字无横向溢出（scrollWidth ≤ clientWidth）',
    longOpt.optionTexts.every((o) => o.overflowPx === 0),
    `各选项溢出=${JSON.stringify(
      longOpt.optionTexts.map((o) => o.overflowPx)
    )}`
  );
  eq(
    `${tag}/long-opt-option-count`,
    '长题选项按钮数量',
    4,
    longOpt.optionCount
  );
  const shotLong = await screenshot(page, `${tag}-long-question.png`, tag);
  eq(
    `${tag}/shot-long-size`,
    '长题截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotLong.width}x${shotLong.height}`
  );

  await injectV3(page, tag, cand.stemHeavy.id, 'inject-long-stem');
  const longStem = await layoutMetrics(page);
  eq(
    `${tag}/long-stem-question`,
    '最长题干场景定位到目标题',
    cand.stemHeavy.q,
    longStem.questionText
  );
  ok(
    `${tag}/long-stem-h-overflow`,
    '最长题干无横向溢出',
    longStem.docOverflowPx === 0,
    `overflow=${longStem.docOverflowPx}px`
  );
  ok(
    `${tag}/long-stem-wrap`,
    '最长题干发生换行（行数 ≥ 3）',
    longStem.questionLines.lines >= 3,
    `lines=${longStem.questionLines.lines}`
  );
  const shotStem = await screenshot(page, `${tag}-long-stem.png`, tag);
  ok(
    `${tag}/shot-long-stem-size`,
    '最长题干截图尺寸',
    `${shotStem.width}x${shotStem.height}` === `${vp.width}x${vp.height}`,
    `${shotStem.width}x${shotStem.height}`
  );

  // ---- 内容最多的前 3 道题垂直可达性 ----
  const tallestInfo = [];
  for (let i = 0; i < cand.tallest.length; i += 1) {
    const item = cand.tallest[i];
    await injectV3(page, tag, item.id, `inject-tallest-${i + 1}`);
    const h = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      quizTop: document.getElementById('quiz').getBoundingClientRect().top,
    }));
    const reach = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const opts = [...document.querySelectorAll('button.option')];
      const r = {
        maxScroll: window.scrollY,
        lastBottom: opts[opts.length - 1].getBoundingClientRect().bottom,
        optionCount: opts.length,
      };
      window.scrollTo(0, 0);
      return r;
    });
    tallestInfo.push({ id: item.id, ...h, ...reach });
    ok(
      `${tag}/tallest-${i + 1}-top-reachable`,
      `内容最多题 ${item.id} 顶部未被裁切（quizTop ≥ 0）`,
      h.quizTop >= 0,
      `quizTop=${h.quizTop.toFixed(1)}, scrollHeight=${h.scrollHeight}, innerHeight=${h.innerHeight}`
    );
    ok(
      `${tag}/tallest-${i + 1}-bottom-reachable`,
      `内容最多题 ${item.id} 滚动到底后末选项可见（可达）`,
      reach.optionCount === 4 && reach.lastBottom <= h.innerHeight + 1,
      `maxScroll=${reach.maxScroll}, lastOptionBottom=${reach.lastBottom.toFixed(
        1
      )}, innerHeight=${h.innerHeight}`
    );
  }
  tallestSummary.push({ viewport: tag, items: tallestInfo });

  // ---- 最近 10 题排除（连续作答 12 次，用 v3 log 校验） ----
  console.log(`=== 视口 ${tag}：最近 10 题排除 ===`);
  await injectV3(page, tag, cand.optionsHeavy.id, 'inject-recent');
  const picked = [];
  let recentCompleted = true;
  for (let i = 0; i < 12; i += 1) {
    const st = await readV3(page);
    if (!st || typeof st.currentId !== 'string') {
      recentCompleted = false;
      break;
    }
    picked.push(st.currentId);
    const oldText = await readQuestion(page);
    const currentItem = meta.byId[st.currentId];
    await page.locator(OPTION_SEL).nth(currentItem.answer).click();
    await page.waitForTimeout(200);
    const changed = await waitForNextRendered(page, st.currentId);
    if (!changed) {
      recentCompleted = false;
      break;
    }
    // 每轮确认反馈期间状态与 DOM 分属两题
    if ((await readQuestion(page)) === oldText) {
      /* 重复题干文本不视为失败：下面用 currentId 校验 */
    }
  }
  const stRecent = await readV3(page);
  ok(
    `${tag}/recent-exclude-completed`,
    '连续作答 12 题全部完成并切题',
    recentCompleted,
    recentCompleted ? '12/12' : `仅完成 ${picked.length}`
  );
  eq(
    `${tag}/recent-step`,
    '连续作答后 v3.step 与 log 长度一致（12）',
    JSON.stringify({ step: 12, log: 12 }),
    JSON.stringify({
      step: stRecent ? stRecent.step : null,
      log: stRecent && Array.isArray(stRecent.log) ? stRecent.log.length : null,
    })
  );

  const adjacentRepeats = [];
  const recentProblems = [];
  const recentIds = stRecent && Array.isArray(stRecent.log) ? stRecent.log.map((e) => e.id) : [];
  for (let i = 1; i < recentIds.length; i += 1) {
    if (recentIds[i] === recentIds[i - 1]) {
      adjacentRepeats.push(`${i - 1}->${i}`);
    }
  }
  for (let i = 0; i < recentIds.length; i += 1) {
    const previous = recentIds.slice(Math.max(0, i - 10), i);
    if (previous.includes(recentIds[i])) {
      recentProblems.push(`log[${i}] ${recentIds[i]} 在最近 10 题内重复`);
    }
  }
  if (
    stRecent &&
    stRecent.currentId &&
    recentIds.slice(-10).includes(stRecent.currentId)
  ) {
    recentProblems.push(`当前题 ${stRecent.currentId} 在最近 10 题内`);
  }
  eq(
    `${tag}/recent-adjacent-no-repeat`,
    '连续作答的相邻题目不重复',
    '[]',
    JSON.stringify(adjacentRepeats)
  );
  ok(
    `${tag}/recent-10-exclusion`,
    '每道新题都不在之前最近 10 题中（含当前题）',
    recentProblems.length === 0,
    recentProblems.length ? recentProblems.join('; ') : '最近 10 题均无重复'
  );
  ok(
    `${tag}/recent-current-valid`,
    '连续作答后当前题仍是题库中的有效题',
    !!stRecent && bankIds.includes(stRecent.currentId),
    stRecent ? `currentId=${stRecent.currentId}` : 'null'
  );

  // ---- 防连点 ----
  console.log(`=== 视口 ${tag}：防连点 ===`);
  await injectV3(page, tag, cand.optionsHeavy.id, 'inject-double');
  const beforeD1 = await readV3(page);
  const answerD1 = meta.byId[beforeD1.currentId].answer;
  await page.evaluate(({ answer }) => {
    const btns = [...document.querySelectorAll('#options button.option')];
    btns[answer].click();
    btns[(answer + 1) % 4].click();
  }, { answer: answerD1 });
  const d1Rendered = await waitForNextRendered(page, beforeD1.currentId);
  await page.waitForTimeout(100);
  const stD1 = await readV3(page);
  eq(
    `${tag}/double-click-different-step`,
    '同步连点两个不同选项只前进 1 题',
    beforeD1.step + 1,
    stD1.step
  );
  eq(
    `${tag}/double-click-different-log`,
    '同步连点不同选项只记录 1 条作答（第一次点击的题）',
    1,
    stD1.log.length - beforeD1.log.length
  );
  eq(
    `${tag}/double-click-different-current`,
    '同步连点只出一次下一题（currentId 变化）',
    true,
    stD1.currentId !== beforeD1.currentId
  );

  const beforeD2 = stD1;
  const answerD2 = meta.byId[beforeD2.currentId].answer;
  await page.evaluate(({ answer }) => {
    const btns = [...document.querySelectorAll('#options button.option')];
    btns[answer].click();
    btns[answer].click();
  }, { answer: answerD2 });
  await waitForNextRendered(page, beforeD2.currentId);
  await page.waitForTimeout(100);
  const stD2 = await readV3(page);
  eq(
    `${tag}/double-click-same-step`,
    '同步连点同一选项两次只前进 1 题',
    beforeD2.step + 1,
    stD2.step
  );
  eq(
    `${tag}/double-click-same-current`,
    '同步连点同一选项只出一次下一题',
    true,
    stD2.currentId !== beforeD2.currentId
  );

  const beforeD3 = stD2;
  const answerD3 = meta.byId[beforeD3.currentId].answer;
  await page.evaluate(({ answer }) => {
    const btns = [...document.querySelectorAll('#options button.option')];
    btns[answer].click();
    setTimeout(() => btns[(answer + 1) % 4].click(), 50);
  }, { answer: answerD3 });
  await waitForNextRendered(page, beforeD3.currentId);
  await page.waitForTimeout(100);
  const stD3 = await readV3(page);
  eq(
    `${tag}/double-click-50ms-step`,
    '间隔 50ms 连点两次只前进 1 题',
    beforeD3.step + 1,
    stD3.step
  );
  eq(
    `${tag}/double-click-50ms-current`,
    '间隔 50ms 连点只出一次下一题',
    true,
    stD3.currentId !== beforeD3.currentId
  );
  const shotDbl = await screenshot(page, `${tag}-double-click.png`, tag);
  ok(
    `${tag}/shot-double-click-size`,
    '防连点截图尺寸',
    `${shotDbl.width}x${shotDbl.height}` === `${vp.width}x${vp.height}`,
    `${shotDbl.width}x${shotDbl.height}`
  );

  // ---- 键盘作答（A / 2，均选择正确项以走自动切题路径） ----
  console.log(`=== 视口 ${tag}：键盘作答 ===`);
  await injectV3(page, tag, rightId, 'inject-keyboard');
  const beforeKb = await readV3(page);
  await page.keyboard.press('a');
  await page.waitForTimeout(250);
  const fbKb = await readFeedback(page);
  eq(
    `${tag}/keyboard-a-feedback`,
    '键盘 A 键选择第 1 项（正确）并显示绿色反馈',
    JSON.stringify({ correct: [0], wrong: [] }),
    JSON.stringify({ correct: fbKb.correct, wrong: fbKb.wrong })
  );
  const duringKb = await readV3(page);
  checkAnswerV3({
    tag,
    label: 'keyboard-a',
    before: beforeKb,
    after: duringKb,
    oldId: rightId,
    item: rightItem,
    correct: true,
    bankIds,
    maxBox,
  });
  const kbNext = await waitForNextRendered(page, rightId);
  ok(`${tag}/keyboard-a-next`, '键盘 A 键答对后自动切题', kbNext, kbNext ? '已切题' : '超时');

  const kb2Id = bankIds.find((id) => meta.byId[id].answer === 1);
  const kbItem2 = meta.byId[kb2Id];
  await injectV3(page, tag, kb2Id, 'inject-keyboard-2');
  const beforeKb2 = await readV3(page);
  await page.keyboard.press('2');
  await page.waitForTimeout(250);
  const fbKb2 = await readFeedback(page);
  eq(
    `${tag}/keyboard-2-feedback`,
    '键盘 2 键选择第 2 项（正确）并显示绿色反馈',
    JSON.stringify({ correct: [1], wrong: [] }),
    JSON.stringify({ correct: fbKb2.correct, wrong: fbKb2.wrong })
  );
  const duringKb2 = await readV3(page);
  checkAnswerV3({
    tag,
    label: 'keyboard-2',
    before: beforeKb2,
    after: duringKb2,
    oldId: kb2Id,
    item: kbItem2,
    correct: true,
    bankIds,
    maxBox,
  });
  const kbNext2 = await waitForNextRendered(page, kb2Id);
  ok(
    `${tag}/keyboard-2-next`,
    '数字键 2 答对后自动切题',
    kbNext2,
    kbNext2 ? '已切题' : '超时'
  );

  // ---- v2 → v3 迁移 ----
  console.log(`=== 视口 ${tag}：v2 → v3 迁移 ===`);
  const v2Plan = [
    { id: bankIds[0], choice: (meta.byId[bankIds[0]].answer + 1) % 4 }, // 错
    { id: bankIds[1], choice: meta.byId[bankIds[1]].answer }, // 对
    { id: bankIds[2], choice: (meta.byId[bankIds[2]].answer + 1) % 4 }, // 错
  ];
  const v2CurrentId = bankIds[2];
  await page.evaluate(
    ({ v3Key, v2Key, v1Key, currentId, answers }) => {
      localStorage.removeItem(v3Key);
      localStorage.removeItem(v1Key);
      localStorage.setItem(
        v2Key,
        JSON.stringify({ currentId, answers })
      );
    },
    {
      v3Key: V3_KEY,
      v2Key: V2_KEY,
      v1Key: V1_KEY,
      currentId: v2CurrentId,
      answers: v2Plan,
    }
  );
  const v2Raw = await readStorageRaw(page, V2_KEY);
  const v2NowMin = Date.now();
  await reloadApp(page, tag, 'v2-migration');
  const v2NowMax = Date.now();
  const stV2 = await readV3(page);
  const expectedV2 = buildMigrationExpected(
    v2Plan,
    meta,
    v2NowMin,
    v2NowMax,
    maxBox
  );

  eq(
    `${tag}/v2-migration-step`,
    'v2 迁移后 v3.step = v2.answers.length',
    v2Plan.length,
    stV2 ? stV2.step : null
  );
  eq(
    `${tag}/v2-migration-currentId`,
    'v2 迁移后 v3.currentId = v2.currentId',
    v2CurrentId,
    stV2 ? stV2.currentId : null
  );
  const v2QProblems = stV2
    ? compareMigratedQ(stV2.q, expectedV2)
    : ['v3 缺失'];
  ok(
    `${tag}/v2-migration-q`,
    'v2 迁移后 v3.q 正确（seen/wrong/box/lastStep/due）',
    v2QProblems.length === 0,
    v2QProblems.length ? v2QProblems.join('; ') : '全部匹配'
  );
  const v2LogProblems = stV2
    ? compareMigratedLog(stV2.log, expectedV2.log)
    : ['v3 缺失'];
  ok(
    `${tag}/v2-migration-log`,
    'v2 迁移后 v3.log 按 v2.answers 顺序与 step 正确',
    v2LogProblems.length === 0,
    v2LogProblems.length ? v2LogProblems.join('; ') : '全部匹配'
  );
  const v2RawAfter = await readStorageRaw(page, V2_KEY);
  rec(
    `${tag}/v2-key-preserved`,
    'v2 迁移后 astroQuizState.v2 原样保留',
    `${v2Raw ? v2Raw.length : 0} 字节`,
    `${v2RawAfter ? v2RawAfter.length : 0} 字节`,
    v2Raw === v2RawAfter
  );
  eq(
    `${tag}/v2-migration-question`,
    'v2 迁移后展示 v2.currentId 对应题目',
    meta.byId[v2CurrentId].q,
    await readQuestion(page)
  );

  // ---- v1 → v3 迁移 ----
  console.log(`=== 视口 ${tag}：v1 → v3 迁移 ===`);
  const v1Plan = [
    { id: bankIds[3], choice: meta.byId[bankIds[3]].answer }, // 对
    { id: bankIds[4], choice: (meta.byId[bankIds[4]].answer + 1) % 4 }, // 错
  ];
  const v1Order = bankIds.slice();
  const v1Index = 5;
  const v1CurrentId = v1Order[v1Index];
  await page.evaluate(
    ({ v3Key, v2Key, v1Key, order, index, answers }) => {
      localStorage.removeItem(v3Key);
      localStorage.removeItem(v2Key);
      localStorage.setItem(
        v1Key,
        JSON.stringify({ order, index, answers })
      );
    },
    {
      v3Key: V3_KEY,
      v2Key: V2_KEY,
      v1Key: V1_KEY,
      order: v1Order,
      index: v1Index,
      answers: v1Plan,
    }
  );
  const v1Raw = await readStorageRaw(page, V1_KEY);
  const v1NowMin = Date.now();
  await reloadApp(page, tag, 'v1-migration');
  const v1NowMax = Date.now();
  const stV1 = await readV3(page);
  const expectedV1 = buildMigrationExpected(
    v1Plan,
    meta,
    v1NowMin,
    v1NowMax,
    maxBox
  );

  eq(
    `${tag}/v1-migration-step`,
    'v1 迁移后 v3.step = v1.answers.length',
    v1Plan.length,
    stV1 ? stV1.step : null
  );
  eq(
    `${tag}/v1-migration-currentId`,
    'v1 迁移后 v3.currentId = order[index]',
    v1CurrentId,
    stV1 ? stV1.currentId : null
  );
  const v1QProblems = stV1
    ? compareMigratedQ(stV1.q, expectedV1)
    : ['v3 缺失'];
  ok(
    `${tag}/v1-migration-q`,
    'v1 迁移后 v3.q 正确（seen/wrong/box/lastStep/due）',
    v1QProblems.length === 0,
    v1QProblems.length ? v1QProblems.join('; ') : '全部匹配'
  );
  const v1LogProblems = stV1
    ? compareMigratedLog(stV1.log, expectedV1.log)
    : ['v3 缺失'];
  ok(
    `${tag}/v1-migration-log`,
    'v1 迁移后 v3.log 按 v1.answers 顺序与 step 正确',
    v1LogProblems.length === 0,
    v1LogProblems.length ? v1LogProblems.join('; ') : '全部匹配'
  );
  const v1RawAfter = await readStorageRaw(page, V1_KEY);
  rec(
    `${tag}/v1-key-preserved`,
    'v1 迁移后 astroQuizState.v1 原样保留',
    `${v1Raw ? v1Raw.length : 0} 字节`,
    `${v1RawAfter ? v1RawAfter.length : 0} 字节`,
    v1Raw === v1RawAfter
  );
  eq(
    `${tag}/v1-migration-question`,
    'v1 迁移后展示 order[index] 对应题目',
    meta.byId[v1CurrentId].q,
    await readQuestion(page)
  );

  // ---- v3 零容忍校验回退（题库题目 ID 变更/删除的已知限制） ----
  console.log(`=== 视口 ${tag}：v3 校验失败回退 ===`);
  const bogusId = '9999-99';
  await page.evaluate(
    ({ v3Key, v1Key, v2Key, bogusId }) => {
      localStorage.removeItem(v1Key);
      localStorage.removeItem(v2Key);
      localStorage.setItem(
        v3Key,
        JSON.stringify({
          currentId: bogusId,
          step: 7,
          q: {
            [bogusId]: { seen: 1, wrong: 0, box: 2, lastStep: 7, due: 1 },
          },
          log: [{ id: bogusId, type: '恒星与星座', ok: true, step: 7 }],
        })
      );
    },
    { v3Key: V3_KEY, v1Key: V1_KEY, v2Key: V2_KEY, bogusId }
  );
  await reloadApp(page, tag, 'v3-invalid');
  const stInvalid = await readV3(page);
  ok(
    `${tag}/v3-invalid-fallback-state`,
    'v3 含题库外 id 时整份判非法并回退为空 v3（step=0、q/log 空、currentId 合法）',
    !!stInvalid &&
      stInvalid.step === 0 &&
      Object.keys(stInvalid.q || {}).length === 0 &&
      Array.isArray(stInvalid.log) &&
      stInvalid.log.length === 0 &&
      bankIds.includes(stInvalid.currentId),
    stInvalid
      ? `currentId=${stInvalid.currentId}, step=${stInvalid.step}, q=${
          Object.keys(stInvalid.q || {}).length
        }, log=${stInvalid.log ? stInvalid.log.length : 'null'}`
      : 'null'
  );
  const invalidQuestion = await readQuestion(page);
  ok(
    `${tag}/v3-invalid-fallback-question`,
    '回退后页面仍展示有效题目（未显示题库加载失败）',
    !!stInvalid &&
      bankIds.includes(stInvalid.currentId) &&
      meta.byId[stInvalid.currentId].q.trim() === invalidQuestion,
    invalidQuestion.slice(0, 40)
  );

  // ---- F2：v3.currentId 合法、但 q key / log id 含题库外 id 的非法 v3 ----
  // 分三个隔离场景：
  //   A. 无任何旧数据 → 回退为空 v3（页面仍启动）；
  //   B. 存在合法 v2 → 按 v2 迁移到 v3，且 v2 原 key 保留；
  //   C. 存在合法 v1 → 按 v1 迁移到 v3，且 v1 原 key 保留。
  console.log(
    `=== 视口 ${tag}：v3.currentId 合法但 q/log 含题库外 id 的隔离场景 ===`
  );
  const bogusQId = '9999-97';
  const bogusLogId = '9999-96';
  const validA = bankIds[7];
  const typeA = meta.byId[validA].type;

  // A. 非法 v3 + 无旧数据 → 空状态回退（currentId 合法、step=0、q/log 为空）
  await page.evaluate(
    ({ v3Key, v1Key, v2Key, validId, bogusQId, bogusLogId, type }) => {
      localStorage.removeItem(v1Key);
      localStorage.removeItem(v2Key);
      localStorage.setItem(
        v3Key,
        JSON.stringify({
          currentId: validId,
          step: 2,
          q: {
            [validId]: {
              seen: 2,
              wrong: 0,
              box: 2,
              lastStep: 2,
              due: Date.now() + 86400000,
            },
            [bogusQId]: {
              seen: 1,
              wrong: 0,
              box: 2,
              lastStep: 1,
              due: Date.now() + 86400000,
            },
          },
          log: [
            { id: validId, type, ok: true, step: 1 },
            { id: bogusLogId, type, ok: true, step: 2 },
          ],
        })
      );
    },
    {
      v3Key: V3_KEY,
      v1Key: V1_KEY,
      v2Key: V2_KEY,
      validId: validA,
      bogusQId,
      bogusLogId,
      type: typeA,
    }
  );
  await reloadApp(page, tag, 'v3-invalid-q-no-legacy');
  const stA = await readV3(page);
  ok(
    `${tag}/v3-invalid-valid-currentid-q-fallback`,
    'v3.currentId 合法但 q key / log id 含题库外 id → 判非法并回退为空 v3（页面仍出题）',
    !!stA &&
      stA.step === 0 &&
      Object.keys(stA.q || {}).length === 0 &&
      Array.isArray(stA.log) &&
      stA.log.length === 0 &&
      bankIds.includes(stA.currentId) &&
      !(stA.q && stA.q[bogusQId]) &&
      !(stA.log || []).some((e) => e.id === bogusLogId),
    stA
      ? `currentId=${stA.currentId}, step=${stA.step}, q=${
          Object.keys(stA.q || {}).length
        }, log=${stA.log ? stA.log.length : 'null'}`
      : 'null'
  );
  const stAQuestion = await readQuestion(page);
  ok(
    `${tag}/v3-invalid-valid-currentid-q-question`,
    '非法 v3（currentId 合法）回退后页面展示有效题目，未显示题库加载失败',
    !!stA &&
      bankIds.includes(stA.currentId) &&
      meta.byId[stA.currentId].q.trim() === stAQuestion,
    stAQuestion.slice(0, 40)
  );

  // B. 非法 v3（q 合法、log id 非法）+ 合法 v2 → 迁移 v2，v2 原 key 保留
  const v2PlanB = [
    { id: bankIds[8], choice: meta.byId[bankIds[8]].answer }, // 对
    { id: bankIds[9], choice: (meta.byId[bankIds[9]].answer + 1) % 4 }, // 错
  ];
  const v2CurrentB = bankIds[10];
  const validB = bankIds[11];
  const typeB = meta.byId[validB].type;
  await page.evaluate(
    ({ v3Key, v2Key, v1Key, validId, bogusLogId, type, currentId, answers }) => {
      localStorage.removeItem(v1Key);
      localStorage.removeItem(v3Key);
      localStorage.setItem(
        v3Key,
        JSON.stringify({
          currentId: validId,
          step: 1,
          q: {
            [validId]: {
              seen: 1,
              wrong: 0,
              box: 2,
              lastStep: 1,
              due: Date.now() + 86400000,
            },
          },
          log: [{ id: bogusLogId, type, ok: true, step: 1 }],
        })
      );
      localStorage.setItem(
        v2Key,
        JSON.stringify({ currentId, answers })
      );
    },
    {
      v3Key: V3_KEY,
      v2Key: V2_KEY,
      v1Key: V1_KEY,
      validId: validB,
      bogusLogId,
      type: typeB,
      currentId: v2CurrentB,
      answers: v2PlanB,
    }
  );
  const v2RawB = await readStorageRaw(page, V2_KEY);
  const v2NowMinB = Date.now();
  await reloadApp(page, tag, 'v3-invalid-q-v2-migration');
  const v2NowMaxB = Date.now();
  const stB = await readV3(page);
  const expectedV2B = buildMigrationExpected(
    v2PlanB,
    meta,
    v2NowMinB,
    v2NowMaxB,
    maxBox
  );
  const v2BProblems = [];
  if (!stB) {
    v2BProblems.push('v3 缺失');
  } else {
    if (stB.step !== v2PlanB.length) {
      v2BProblems.push(`step=${stB.step}(期望 ${v2PlanB.length})`);
    }
    if (stB.currentId !== v2CurrentB) {
      v2BProblems.push(`currentId=${stB.currentId}(期望 ${v2CurrentB})`);
    }
    v2BProblems.push(...compareMigratedQ(stB.q, expectedV2B));
    v2BProblems.push(...compareMigratedLog(stB.log, expectedV2B.log));
    if ((stB.log || []).some((e) => e.id === bogusLogId)) {
      v2BProblems.push(`v3.log 仍含题库外 id ${bogusLogId}`);
    }
  }
  ok(
    `${tag}/v3-invalid-valid-currentid-v2-migration`,
    'v3（currentId 合法、log id 非法）判非法后按合法 v2 迁移到 v3',
    v2BProblems.length === 0,
    v2BProblems.length ? v2BProblems.join('; ') : 'step/q/log 与 v2 一致'
  );
  const v2RawAfterB = await readStorageRaw(page, V2_KEY);
  rec(
    `${tag}/v3-invalid-v2-key-preserved`,
    'v3 非法时按 v2 迁移后 astroQuizState.v2 原样保留',
    `${v2RawB ? v2RawB.length : 0} 字节`,
    `${v2RawAfterB ? v2RawAfterB.length : 0} 字节`,
    v2RawB === v2RawAfterB
  );
  eq(
    `${tag}/v3-invalid-v2-migration-question`,
    'v3 非法 → v2 迁移后展示 v2.currentId 对应题目',
    meta.byId[v2CurrentB].q,
    await readQuestion(page)
  );

  // C. 非法 v3（q key 非法）+ 合法 v1 → 迁移 v1，v1 原 key 保留
  const v1PlanC = [
    { id: bankIds[12], choice: meta.byId[bankIds[12]].answer }, // 对
    { id: bankIds[13], choice: (meta.byId[bankIds[13]].answer + 1) % 4 }, // 错
  ];
  const v1OrderC = bankIds.slice();
  const v1IndexC = 14;
  const v1CurrentC = v1OrderC[v1IndexC];
  const validC = bankIds[15];
  const typeC = meta.byId[validC].type;
  const bogusQCId = '9999-95';
  await page.evaluate(
    ({ v3Key, v2Key, v1Key, validId, bogusQId, type, order, index, answers }) => {
      localStorage.removeItem(v2Key);
      localStorage.removeItem(v3Key);
      localStorage.setItem(
        v3Key,
        JSON.stringify({
          currentId: validId,
          step: 1,
          q: {
            [validId]: {
              seen: 1,
              wrong: 0,
              box: 2,
              lastStep: 1,
              due: Date.now() + 86400000,
            },
            [bogusQId]: {
              seen: 1,
              wrong: 0,
              box: 2,
              lastStep: 1,
              due: Date.now() + 86400000,
            },
          },
          log: [{ id: validId, type, ok: true, step: 1 }],
        })
      );
      localStorage.setItem(
        v1Key,
        JSON.stringify({ order, index, answers })
      );
    },
    {
      v3Key: V3_KEY,
      v2Key: V2_KEY,
      v1Key: V1_KEY,
      validId: validC,
      bogusQId: bogusQCId,
      type: typeC,
      order: v1OrderC,
      index: v1IndexC,
      answers: v1PlanC,
    }
  );
  const v1RawC = await readStorageRaw(page, V1_KEY);
  const v1NowMinC = Date.now();
  await reloadApp(page, tag, 'v3-invalid-q-v1-migration');
  const v1NowMaxC = Date.now();
  const stC = await readV3(page);
  const expectedV1C = buildMigrationExpected(
    v1PlanC,
    meta,
    v1NowMinC,
    v1NowMaxC,
    maxBox
  );
  const v1CProblems = [];
  if (!stC) {
    v1CProblems.push('v3 缺失');
  } else {
    if (stC.step !== v1PlanC.length) {
      v1CProblems.push(`step=${stC.step}(期望 ${v1PlanC.length})`);
    }
    if (stC.currentId !== v1CurrentC) {
      v1CProblems.push(`currentId=${stC.currentId}(期望 ${v1CurrentC})`);
    }
    v1CProblems.push(...compareMigratedQ(stC.q, expectedV1C));
    v1CProblems.push(...compareMigratedLog(stC.log, expectedV1C.log));
    if (stC.q && stC.q[bogusQCId]) {
      v1CProblems.push(`v3.q 仍含题库外 id ${bogusQCId}`);
    }
  }
  ok(
    `${tag}/v3-invalid-valid-currentid-v1-migration`,
    'v3（currentId 合法、q key 非法）判非法后按合法 v1 迁移到 v3',
    v1CProblems.length === 0,
    v1CProblems.length ? v1CProblems.join('; ') : 'step/q/log 与 v1 一致'
  );
  const v1RawAfterC = await readStorageRaw(page, V1_KEY);
  rec(
    `${tag}/v3-invalid-v1-key-preserved`,
    'v3 非法时按 v1 迁移后 astroQuizState.v1 原样保留',
    `${v1RawC ? v1RawC.length : 0} 字节`,
    `${v1RawAfterC ? v1RawAfterC.length : 0} 字节`,
    v1RawC === v1RawAfterC
  );
  eq(
    `${tag}/v3-invalid-v1-migration-question`,
    'v3 非法 → v1 迁移后展示 order[index] 对应题目',
    meta.byId[v1CurrentC].q,
    await readQuestion(page)
  );

  // ---- console / 网络错误 ----
  ok(
    `${tag}/no-console-errors`,
    '页面无 console error / warning / pageerror / 请求失败',
    watch.console.length === 0 &&
      watch.pageerror.length === 0 &&
      watch.requestfailed.length === 0,
    JSON.stringify(
      watch.console.length || watch.pageerror.length || watch.requestfailed.length
        ? watch
        : warnings.length
          ? warnings
          : '0 条'
    )
  );

  await ctx.close();
  return cand;
}

// ---- 全局：冷启动类型轮转（空状态 + 全部答对，期望无到期复习） ----
// 冷启动「每类 2 题」是尽力而为：到期复习优先。这里让 16 题全部答对（box 2、3 天后
// 才到期），从而稳定验证理想情况下的轮转；因到期复习而偏移的路径不在浏览器端确定性复现。
async function testColdStart(browser) {
  const tag = 'cold-start';
  console.log(`\n=== 全局：冷启动类型轮转（空状态，连续 16 题全部答对） ===`);
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      errors.push(`console.${m.type()}: ${m.text()}`);
    }
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await gotoApp(page, tag, 'cold-start');
  const meta = await readBankMeta(page);
  const typeOrder = await page.evaluate(() =>
    window.AstroSelector.TYPE_ORDER.slice()
  );
  const expectedTypes = typeOrder.flatMap((t) => [t, t]);
  const answeredTypes = [];
  let completed = 0;

  for (let i = 0; i < expectedTypes.length; i += 1) {
    const st = await readV3(page);
    const item = st && meta.byId[st.currentId];
    if (!item) break;
    answeredTypes.push(item.type);
    await page.locator(OPTION_SEL).nth(item.answer).click();
    const changed = await waitForNextRendered(page, st.currentId);
    if (!changed) break;
    completed += 1;
  }

  eq(
    `${tag}/completed`,
    '空状态连续作答 16 题全部完成并切题',
    expectedTypes.length,
    completed
  );
  eq(
    `${tag}/type-sequence`,
    '冷启动类型序列 = TYPE_ORDER 每类 2 题（无到期复习时）',
    JSON.stringify(expectedTypes),
    JSON.stringify(answeredTypes)
  );
  const stCold = await readV3(page);
  eq(
    `${tag}/step`,
    '冷启动 16 题后 v3.step',
    expectedTypes.length,
    stCold ? stCold.step : null
  );
  ok(
    `${tag}/no-errors`,
    '冷启动过程无 console error / warning / pageerror',
    errors.length === 0,
    errors.length ? errors.join(' | ') : '0 条'
  );

  await ctx.close();
}

// ---- 全局静态检查：www/ 无外部 URL ----
function staticChecks() {
  const files = fs
    .readdirSync(path.join(ROOT, 'www'))
    .filter((f) => /\.(html|css|js|json)$/.test(f));
  const hits = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(ROOT, 'www', f), 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (/https?:\/\//.test(line)) {
        hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 160)}`);
      }
    });
  }
  eq(
    'global/www-no-external-url',
    'www/ 内无任何 http(s) 外部 URL',
    '0 处',
    `${hits.length} 处${hits.length ? ' → ' + hits.join(' | ') : ''}`
  );
  eq(
    'global/www-index-exists',
    'www/index.html 存在',
    true,
    fs.existsSync(WWW)
  );
  eq(
    'global/www-questions-exists',
    'www/questions.js 存在',
    true,
    fs.existsSync(path.join(ROOT, 'www', 'questions.js'))
  );
  return hits;
}

// ---- 报告 ----
function writeReport({ browserVersion, pwVersion, gitHead, launchError, wwwHits }) {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  const now = new Date().toISOString();
  const lines = [];
  lines.push('# Web 端验收报告（qa/verify.mjs）');
  lines.push('');
  lines.push(`- 生成时间：${now}`);
  lines.push(`- 被测页面：\`${WWW}\`（file:// 打开，未启动服务器）`);
  lines.push(
    `- 浏览器：Chromium ${browserVersion || '未知'}（playwright-core ${pwVersion}）`
  );
  lines.push(
    `- 视口：360×640、412×915（deviceScaleFactor=1，isMobile+hasTouch）`
  );
  lines.push(`- git HEAD：${gitHead || '未知'}`);
  lines.push(
    `- 结论：**${
      failed.length === 0 ? '全部通过' : failed.length + ' 条失败'
    }**（共 ${total} 条断言，通过 ${passed}）`
  );
  lines.push('');
  lines.push('## 断言明细');
  lines.push('');
  lines.push('| # | 断言 ID | 描述 | 期望 | 实际 | 结果 |');
  lines.push('|---|---|---|---|---|---|');
  results.forEach((r, i) => {
    const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(
      `| ${i + 1} | ${r.id} | ${r.title} | ${esc(r.expected)} | ${esc(
        r.actual
      )} | ${r.pass ? 'PASS' : '**FAIL**'} |`
    );
  });
  lines.push('');
  lines.push('## 截图');
  lines.push('');
  lines.push('| 文件 | 视口 | 尺寸 | 大小 |');
  lines.push('|---|---|---|---|');
  for (const s of screenshots) {
    lines.push(
      `| ${path.basename(s.file)} | ${s.viewport} | ${s.width}×${s.height} | ${(
        s.size / 1024
      ).toFixed(1)} KiB |`
    );
  }
  lines.push('');
  lines.push('## v3 状态与集成断言');
  lines.push('');
  lines.push(
    '- app.js 动态加载 `selector.js` 后才初始化；脚本轮询 `#question` 非空且 `localStorage["astroQuizState.v3"]` 出现，最长 **5 秒**，超时记为失败。'
  );
  lines.push(
    '- 每次作答后校验：`v3.step` +1、`v3.currentId` 变化且仍是题库题目、`v3.q[oldId]` 的 `seen/wrong/box/lastStep/due`、`v3.log` 最后一条的 `{id,type,ok,step}`。'
  );
  lines.push(
    '- 点击后仅约 250ms（反馈尚未结束）就读取 v3，验证“先保存下一题、再播放反馈/切题动画”。'
  );
  lines.push(
    '- 刷新后校验 `#question` 与 `v3.currentId` 均恢复到同一题，`step` / `log` 不丢。'
  );
  lines.push(
    '- 连续作答 12 次，用 `v3.log` 校验相邻不重复，并校验每个新题都不在之前最近 10 题中（含当前题）。'
  );
  lines.push(
    '- v2 → v3：写入合法 `astroQuizState.v2`（含 3 条 answers）并移除 v3，刷新后校验 `step/q/log` 与旧数据一致，且 v2 原始字符串保留。'
  );
  lines.push(
    '- v1 → v3：写入合法 `astroQuizState.v1`（`order/index/answers`）并移除 v3/v2，刷新后校验 `step/q/log` 与旧数据一致，且 v1 原始字符串保留。'
  );
  lines.push(
    '- 冷启动：新浏览器上下文（localStorage 为空），连续 16 题全部点正确选项（box 2、3 天后才到期，不触发到期复习），用 `v3.log` 校验类型序列严格等于 `TYPE_ORDER` 每类 2 题。'
  );
  lines.push(
    '- v3 零容忍回退：注入 `currentId`/`q`/`log` 均含题库外 id 的 v3（并移除 v1/v2），刷新后校验整份 v3 被判非法并重写为空状态（step=0、q/log 空、currentId 合法），页面仍正常出题。对应 README 记录的“题库 ID 变更/删除 → 回退”已知限制。'
  );
  lines.push(
    '- v3 非法但旧数据可迁移（F2 风险修正，三个隔离场景）：① `currentId` 合法、`q` key 与 `log` id 含题库外 id 且无 v1/v2 → 回退为空 v3；② `currentId` 合法、`log` id 非法但存在合法 v2 → 按 v2 迁移到 v3，且 v2 原始字符串保留；③ `currentId` 合法、`q` key 非法但存在合法 v1 → 按 v1 迁移到 v3，且 v1 原始字符串保留。'
  );
  lines.push(
    '- `box` 上限从页面 `window.AstroSelector.CONFIG.intervalsDays.length - 1` 派生（当前为 5），`q[oldId]` 的 box 校验与迁移期望均不硬编码 5。'
  );
  lines.push(
    '- 本脚本**不做纯随机断言**；掌握度、softmax、Leitner 到期等算法细节由 `qa/selector.test.mjs` 与 `scripts/simulate.mjs` 覆盖。'
  );
  lines.push('');
  lines.push('## 交互与非功能断言');
  lines.push('');
  lines.push(
    '- 界面只有题目 + 类别小字 + 4 个选项，无 `#progress` 题号文字、无 `.bar` 进度条。'
  );
  lines.push(
    '- 题目下方 `#questionType` 灰色小字显示 `类别：<type>`：校验文本与当前题 `type` 一致、字号 ≤ 14px、颜色为灰色系，并随切题更新。'
  );
  lines.push(
    '- 对错反馈：正确项 `.correct` 绿色边框、选错项 `.wrong` 红色边框（同时校验计算样式 RGB）；答对约 600ms 后自动淡出/淡入切到下一题。'
  );
  lines.push(
    '- 答错解析：答错后 `#explain` 展开题库 `explain` 文本（`**加粗**` 已渲染为 `<strong>`，不显示字面量）；600ms 反馈结束后出现“轻触继续”，页面不自动切题；轻触后淡出切到下一题；答对时不显示解析。'
  );
  lines.push(
    '- 防连点：同步双点不同选项、同步双点同一选项、间隔 50ms 双点，均只前进 1 题、只保存 1 条 log。'
  );
  lines.push(
    '- 键盘：`A` 与 `2` 键均可选答，反馈与 v3 落盘正确。'
  );
  lines.push(
    '- 长题干 / 长选项正常换行、无横向溢出；内容最多的前 3 道题在小屏可滚动到底、末选项可见。'
  );
  lines.push('');
  lines.push('## 控制台错误 / 页面异常 / 请求失败');
  lines.push('');
  if (consoleErrors.length === 0) {
    lines.push(
      '无（两个视口全程 0 条 console error / warning / pageerror / requestfailed）。'
    );
  } else {
    lines.push('| 视口 | 类型 | 内容 |');
    lines.push('|---|---|---|');
    for (const e of consoleErrors) {
      lines.push(
        `| ${e.viewport} | ${e.kind} | ${String(e.text).replace(/\|/g, '\\|')} |`
      );
    }
  }
  lines.push('');
  lines.push('## www/ 外部 URL 检查');
  lines.push('');
  if (wwwHits.length === 0) {
    lines.push(
      'grep 检查 `www/*.html|css|js|json` 中 `http://` / `https://`：0 处，全部资源本地引用。'
    );
  } else {
    lines.push('发现外部 URL：');
    for (const h of wwwHits) lines.push(`- \`${h}\``);
  }
  lines.push('');
  lines.push('## 长题目场景');
  lines.push('');
  lines.push(
    '动态从 `window.QUESTION_BANK` 计算候选，并注入 localStorage（currentId=目标题、step=0、q/log 为空）后刷新：'
  );
  lines.push('');
  if (longSummary) {
    lines.push(
      `- 综合最长（题干长度 + 最长选项长度）：\`${longSummary.optionsHeavy.id}\`（题干 ${longSummary.optionsHeavy.stemLen} 字，最长选项 ${longSummary.optionsHeavy.maxOptLen} 字）；`
    );
    lines.push(
      `- 最长题干：\`${longSummary.stemHeavy.id}\`（${longSummary.stemHeavy.stemLen} 字）；`
    );
  } else {
    lines.push('- 长题目候选在运行时动态计算。');
  }
  lines.push('');
  if (tallestSummary.length) {
    lines.push(
      '### 内容最多题的垂直可达性（防 flex 居中裁切 / 底部不可滚动）'
    );
    lines.push('');
    lines.push(
      '| 视口 | 题 ID | innerHeight | scrollHeight | quizTop | 最大 scrollY | 末选项底部 | 结果 |'
    );
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const vs of tallestSummary) {
      for (const it of vs.items) {
        const pass = it.quizTop >= 0 && it.lastBottom <= it.innerHeight + 1;
        lines.push(
          `| ${vs.viewport} | ${it.id} | ${it.innerHeight} | ${it.scrollHeight} | ${it.quizTop.toFixed(
            1
          )} | ${it.maxScroll} | ${it.lastBottom.toFixed(1)} | ${
            pass ? 'PASS' : '**FAIL**'
          } |`
        );
      }
    }
    lines.push('');
  }
  lines.push('## 未验证项 / 限制');
  lines.push('');
  lines.push(
    '- 仅桌面无头 Chromium 的 file:// 环境，未覆盖真机 Android WebView 与 Capacitor SystemBars 注入的 safe-area（本机模拟器不可用）。'
  );
  lines.push(
    '- 未验证 APK 包内资源、Android 启动页与系统栏在真机上的实际渲染（包内资源由打包步骤用 unzip/aapt2 静态校验）。'
  );
  lines.push(
    '- 未验证屏幕阅读器无障碍；键盘仅验证 `A` / `2` 两条路径（代码路径与 A-D / 1-4 同一处理）。'
  );
  lines.push(
    '- 未验证低端设备动画掉帧、真机触屏长按/双击缩放行为。'
  );
  lines.push(
    '- `@media (hover:hover)` 触屏分支无法在桌面无头 Chromium 中真实复现（依赖 isMobile/hasTouch 模拟）。'
  );
  lines.push(
    '- 自适应差异（低掌握度类型更常出现、softmax 抽样等）不在浏览器验收中做随机断言，由单元测试与四场景模拟覆盖。'
  );
  lines.push(
    '- README 所述“冷启动因到期复习插入而偏移”的异常路径未在浏览器验收中确定性复现（依赖随机题目与到期时间）；浏览器只验证无到期复习时的理想轮转，偏移场景由单元测试 / 模拟覆盖。'
  );
  lines.push(
    '- F2 修正后仍属“整份回退”：契约零容忍，应用不会逐题清洗 v3；“v3.currentId 合法但 q key / log id 非法”的三个场景使用合成数据，未覆盖真实题库 ID 大批变更后的用户数据。'
  );
  lines.push('');
  lines.push('## 失败断言');
  lines.push('');
  if (failed.length === 0) {
    lines.push('无。');
  } else {
    for (const f of failed) {
      lines.push(
        `- **${f.id}** ${f.title}：期望 \`${f.expected}\`，实际 \`${f.actual}\``
      );
    }
  }
  lines.push('');
  if (launchError) {
    lines.push('## 执行异常');
    lines.push('');
    lines.push('```');
    lines.push(launchError);
    lines.push('```');
  }
  fs.writeFileSync(
    path.join(QA_DIR, 'report.md'),
    lines.join('\n') + '\n',
    'utf8'
  );
}

// ---- main ----
let browserVersion;
let pwVersion;
let launchError;
try {
  pwVersion = require(PLAYWRIGHT_PATH + '/package.json').version;
} catch (e) {
  pwVersion = '?';
}
let gitHead;
try {
  gitHead = execSync('git -C ' + JSON.stringify(ROOT) + ' rev-parse --short HEAD', {
    encoding: 'utf8',
  }).trim();
} catch (e) {
  gitHead = '?';
}

const wwwHits = staticChecks();
let browser;
try {
  console.log(`\n=== 启动 Chromium（${CHROME}）===`);
  browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  browserVersion = browser.version();
  for (const vp of VIEWPORTS) {
    console.log(`\n=== 视口 ${vp.width}x${vp.height} ===`);
    await testViewport(browser, vp);
  }
  await testColdStart(browser);
} catch (err) {
  launchError = String(err && err.stack ? err.stack : err);
  console.error('执行异常:', launchError);
  rec(
    'global/execution',
    '测试脚本完整执行',
    '无异常',
    '异常: ' + String(err).slice(0, 300),
    false
  );
} finally {
  if (browser) await browser.close().catch(() => {});
  writeReport({ browserVersion, pwVersion, gitHead, launchError, wwwHits });
  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n=== 完成：${results.length} 条断言，${
      results.length - failed.length
    } 通过，${failed.length} 失败 ===`
  );
  console.log('报告与截图目录:', QA_DIR);
  if (failed.length > 0 || launchError) process.exitCode = 1;
}
