/*!
 * 自适应出题选择器（零依赖 UMD 模块）
 *
 * 契约：qa/CONTRACT.md §4–§6（v3 状态、Leitner 复习、掌握度、softmax、防连击）。
 *
 * - 浏览器：工厂结果挂到全局 AstroSelector 上
 * - Node：require("./src/selector.js")
 *
 * 本模块不访问 DOM、不访问存储、不读取系统时钟、不生成随机数：
 * 时间只使用入参 now，随机数只使用入参 rng。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AstroSelector = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ---------------- 常量（CONTRACT §2：参数只在此处定义一次） ----------------

  const DAY_MS = 86400000;

  const CONFIG = {
    coldStartPerType: 2,
    coldStartTotal: 16,
    priorCorrect: 2,
    priorTotal: 4,
    decay: 0.95,
    aiWeight: 0.5,
    exploreCoef: 0.3,
    examWeightPower: 0.5,
    softmaxTemp: 0.15,
    maxSameTypeStreak: 3,
    recentExclude: 10,
    reviewRatioCap: 0.4,
    reviewRatioWindow: 20,
    intervalsDays: [0, 1, 3, 7, 21, 60],
    box0Steps: 5,
    logLimit: 500,
  };

  const TYPE_ORDER = [
    "天象与时间历法",
    "恒星与星座",
    "太阳系与月球",
    "天文观测与望远镜",
    "时事与新闻",
    "天文史、人物与综合常识",
    "航天与空间探测",
    "星系与宇宙",
  ];

  // box 上限 = intervalsDays 的最后下标（5）；新题第一次答对进入的 box（CONTRACT §6.5）。
  const MAX_BOX = CONFIG.intervalsDays.length - 1;
  const FIRST_CORRECT_BOX = 2;

  // ---------------- 通用小工具 ----------------

  function isObject(value) {
    return value !== null && typeof value === "object";
  }

  /** 题库中可用于出题/统计的条目：对象且 id 为非空字符串 */
  function isUsableQuestion(item) {
    return isObject(item) && typeof item.id === "string" && item.id !== "";
  }

  function numberOr(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  /**
   * 读取一次 rng。契约要求 rng 是合法函数；这里额外兜底，
   * 保证异常 rng 也不会让 nextQuestion 抛错或卡死（取值夹到 [0, 1]）。
   */
  function readRng(rng) {
    let value;
    try {
      value = rng();
    } catch (err) {
      return 0.5;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) return 0.5;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  /** 把（可能是部分/缺省的）v3 状态归一化，绝不修改入参 */
  function normalizeState(state) {
    const source = isObject(state) ? state : {};
    const rawStep = source.step;
    const step =
      typeof rawStep === "number" && Number.isFinite(rawStep) && rawStep > 0
        ? rawStep
        : 0;
    return {
      currentId: source.currentId,
      step: step,
      q: isObject(source.q) ? source.q : {},
      log: Array.isArray(source.log) ? source.log : [],
    };
  }

  /** id -> 题目（合法条目；重复 id 以后出现者为准） */
  function indexBank(bank) {
    const byId = new Map();
    for (let i = 0; i < bank.length; i += 1) {
      const item = bank[i];
      if (isUsableQuestion(item)) byId.set(item.id, item);
    }
    return byId;
  }

  /** 题库中各类型的题数（分母用 bank.length，见 CONTRACT §6.2） */
  function countBankTypes(bank) {
    const counts = Object.create(null);
    for (let i = 0; i < bank.length; i += 1) {
      const item = bank[i];
      if (isObject(item) && typeof item.type === "string") {
        counts[item.type] = (counts[item.type] || 0) + 1;
      }
    }
    return counts;
  }

  /** 活跃类型：bank 中存在的类型，按 TYPE_ORDER 顺序 */
  function activeTypesOf(bank) {
    const counts = countBankTypes(bank);
    return TYPE_ORDER.filter(function (type) {
      return (counts[type] || 0) > 0;
    });
  }

  /** 最近 CONFIG.recentExclude 题的 id 集合（CONTRACT §6.4） */
  function recentIdSet(log) {
    const recent = new Set();
    const start = Math.max(0, log.length - CONFIG.recentExclude);
    for (let i = start; i < log.length; i += 1) {
      const entry = log[i];
      if (isObject(entry) && typeof entry.id === "string") recent.add(entry.id);
    }
    return recent;
  }

  // ---------------- 掌握度（CONTRACT §6.7，typeMastery 与选题共用） ----------------

  function masteryMap(bank, state) {
    const activeTypes = activeTypesOf(bank);
    const result = {};
    const byId = indexBank(bank);

    const laterSameType = Object.create(null);
    const numerator = Object.create(null);
    const denominator = Object.create(null);
    const activeSet = new Set(activeTypes);
    for (let i = 0; i < activeTypes.length; i += 1) {
      const type = activeTypes[i];
      laterSameType[type] = 0;
      numerator[type] = 0;
      denominator[type] = 0;
    }

    const log = state.log;
    for (let i = log.length - 1; i >= 0; i -= 1) {
      const entry = log[i];
      if (!isObject(entry)) continue;
      const type = entry.type;
      if (!activeSet.has(type)) continue;
      // 只处理 bank 中能找到该 id 的条目（CONTRACT §6.7）
      const item = byId.get(entry.id);
      if (!item) continue;

      let weight = Math.pow(CONFIG.decay, laterSameType[type]);
      if (item.ai === true) weight *= CONFIG.aiWeight;
      numerator[type] += entry.ok === true ? weight : 0;
      denominator[type] += weight;
      laterSameType[type] += 1;
    }

    for (let i = 0; i < activeTypes.length; i += 1) {
      const type = activeTypes[i];
      result[type] =
        (CONFIG.priorCorrect + numerator[type]) /
        (CONFIG.priorTotal + denominator[type]);
    }
    return result;
  }

  // ---------------- 复习比例（CONTRACT §6.6） ----------------

  function reviewRatioOf(q, log) {
    const start = Math.max(0, log.length - CONFIG.reviewRatioWindow);
    const window_ = log.slice(start);
    const total = window_.length;
    if (total === 0) return 0;

    let reviewCount = 0;
    for (let i = 0; i < total; i += 1) {
      const entry = window_[i];
      if (!isObject(entry) || typeof entry.id !== "string") continue;
      const id = entry.id;
      let occurrencesFromHere = 0;
      for (let j = i; j < total; j += 1) {
        const later = window_[j];
        if (isObject(later) && later.id === id) occurrencesFromHere += 1;
      }
      const record = q[id];
      const seen = isObject(record) ? numberOr(record.seen, 0) : 0;
      if (seen - occurrencesFromHere > 0) reviewCount += 1;
    }
    return reviewCount / total;
  }

  // ---------------- 步骤 1：到期复习候选（CONTRACT §6.1） ----------------

  /**
   * 同类型连续限制（CONTRACT §6.1 / §6.2）：
   * state.log 最后 maxSameTypeStreak 条 log 的 type 全部相同则返回该 type，否则返回 null。
   * 注意：最后只有 2 条同类型时不锁定（复习后正好 3 连，不超限）。
   */
  function sameTypeStreakType(log) {
    if (log.length < CONFIG.maxSameTypeStreak) return null;
    const tail = log.slice(-CONFIG.maxSameTypeStreak);
    const first = tail[0];
    if (!isObject(first) || typeof first.type !== "string") return null;
    for (let i = 1; i < tail.length; i += 1) {
      const entry = tail[i];
      if (!isObject(entry) || entry.type !== first.type) return null;
    }
    return first.type;
  }

  function dueReviewCandidates(bank, q, step, now, recentIds, lockedType) {
    const candidates = [];
    for (let i = 0; i < bank.length; i += 1) {
      const item = bank[i];
      if (!isUsableQuestion(item)) continue;
      if (recentIds.has(item.id)) continue; // 6.4：步骤 1 候选排除最近 10 题
      // 6.1：同类型连续限制也适用于到期复习，排除锁定类型的题
      if (lockedType !== null && item.type === lockedType) continue;
      const record = q[item.id];
      if (!isObject(record)) continue;

      const box = record.box;
      if (box === 0) {
        const lastStep = numberOr(record.lastStep, 0);
        if (step >= lastStep + CONFIG.box0Steps) {
          // box 0 用 step 判断到期，没有绝对时间：组内按 lastStep 升序
          candidates.push({ id: item.id, box: 0, order: lastStep });
        }
      } else if (
        typeof box === "number" &&
        box >= 1 &&
        box <= MAX_BOX - 1 // box 5 视为已掌握，不参与到期复习
      ) {
        const due = record.due;
        if (typeof due === "number" && Number.isFinite(due) && now >= due) {
          candidates.push({ id: item.id, box: box, order: due });
        }
      }
    }

    candidates.sort(function (a, b) {
      if (a.box === 0 && b.box !== 0) return -1; // 1) box 0 最前
      if (a.box !== 0 && b.box === 0) return 1;
      if (a.order !== b.order) return a.order - b.order; // 2) 到期时间/lastStep 升序
      if (a.id < b.id) return -1; // 3) id 字典序兜底
      if (a.id > b.id) return 1;
      return 0;
    });
    return candidates;
  }

  // ---------------- 步骤 2：选类型（CONTRACT §6.2） ----------------

  function typeHasSelectableQuestion(bank, type, recentIds) {
    for (let i = 0; i < bank.length; i += 1) {
      const item = bank[i];
      if (
        isUsableQuestion(item) &&
        item.type === type &&
        !recentIds.has(item.id)
      ) {
        return true;
      }
    }
    return false;
  }

  function pickMaxPriorityType(pool, priorityOf) {
    let best = pool[0];
    let bestPriority = priorityOf(best);
    for (let i = 1; i < pool.length; i += 1) {
      const current = pool[i];
      const currentPriority = priorityOf(current);
      if (currentPriority > bestPriority) {
        best = current;
        bestPriority = currentPriority;
      }
    }
    return best;
  }

  function chooseType(bank, state, activeTypes, byId, rng, streakType) {
    const step = state.step;

    // 冷启动：8 类按 TYPE_ORDER 轮流，每类 coldStartPerType 题，不做 softmax / 连击限制
    if (step < CONFIG.coldStartTotal) {
      if (activeTypes.length === 0) return null;
      const typeIndex =
        Math.floor(step / CONFIG.coldStartPerType) % activeTypes.length;
      return activeTypes[typeIndex];
    }

    // 非冷启动：掌握度（与 typeMastery 同一份实现）
    const mastery = masteryMap(bank, state);

    // 该类型总作答数：遍历 state.q，把 q[id].seen 按 bank 中该 id 的 type 求和
    const answeredByType = Object.create(null);
    const q = state.q;
    const ids = Object.keys(q);
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      const record = q[id];
      const item = byId.get(id);
      if (!item || typeof item.type !== "string" || !isObject(record)) continue;
      const seen = numberOr(record.seen, 0);
      answeredByType[item.type] =
        (answeredByType[item.type] || 0) + Math.max(0, seen);
    }

    // 同类型连续限制：最近 maxSameTypeStreak 条 log 的 type 全相同则本轮排除该类型
    const log = state.log;

    // 6.4：步骤 2 的候选也要排除最近 10 题（类型内至少还要有一道未被排除的题）
    const recentIds = recentIdSet(log);
    const eligible = activeTypes.filter(function (type) {
      if (type === streakType) return false;
      return typeHasSelectableQuestion(bank, type, recentIds);
    });
    // 排除后为空（极端小题库）时退回全部活跃类型（CONTRACT §6.2）
    const pool = eligible.length > 0 ? eligible : activeTypes;

    const bankTypeCounts = countBankTypes(bank);
    const priorities = new Map();
    let maxPriority = -Infinity;
    for (let i = 0; i < pool.length; i += 1) {
      const type = pool[i];
      const m = numberOr(mastery[type], CONFIG.priorCorrect / CONFIG.priorTotal);
      const share = (bankTypeCounts[type] || 0) / bank.length;
      const answered = Math.max(0, answeredByType[type] || 0);
      // CONTRACT §6.2 的 sqrt(share) 即 examWeightPower(0.5) 次幂
      const priority =
        (1 - m) * Math.pow(share, CONFIG.examWeightPower) +
        CONFIG.exploreCoef *
          Math.sqrt(Math.log(state.step + 1) / (answered + 1));
      priorities.set(type, priority);
      if (priority > maxPriority) maxPriority = priority;
    }
    const priorityOf = function (type) {
      return priorities.get(type);
    };

    const temperature = CONFIG.softmaxTemp;
    if (!(temperature > 0) || !Number.isFinite(maxPriority)) {
      // sum<=0 / 温度<=0 / 数值异常：取优先级最大者（按 TYPE_ORDER）
      return pickMaxPriorityType(pool, priorityOf);
    }

    // 数值稳定：先减去最大 priority
    const weights = new Array(pool.length);
    let sum = 0;
    for (let i = 0; i < pool.length; i += 1) {
      const weight = Math.exp(
        (priorityOf(pool[i]) - maxPriority) / temperature
      );
      weights[i] = weight;
      sum += weight;
    }
    if (!(sum > 0) || !Number.isFinite(sum)) {
      return pickMaxPriorityType(pool, priorityOf);
    }

    // softmax 里 rng() 只调用一次（CONTRACT §6.8）
    let target = readRng(rng) * sum;
    for (let i = 0; i < pool.length; i += 1) {
      target -= weights[i];
      if (target < 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  // ---------------- 步骤 3：类型内选题（CONTRACT §6.3） ----------------

  /** 全库兜底：id 不在 recent 中、lastStep 最小（新题按 -1），同分 id 升序 */
  function fallbackBankPick(bank, q, recentIds, ignoreRecent) {
    let best = null;
    let bestLastStep = 0;
    for (let i = 0; i < bank.length; i += 1) {
      const item = bank[i];
      if (!isUsableQuestion(item)) continue;
      if (!ignoreRecent && recentIds.has(item.id)) continue;
      const record = isObject(q[item.id]) ? q[item.id] : null;
      const lastStep = record ? numberOr(record.lastStep, -1) : -1;
      if (
        best === null ||
        lastStep < bestLastStep ||
        (lastStep === bestLastStep && item.id < best.id)
      ) {
        best = item;
        bestLastStep = lastStep;
      }
    }
    return best === null ? null : best.id;
  }

  function compareByBoxThenRecency(a, b, q) {
    const recordA = isObject(q[a.id]) ? q[a.id] : null;
    const recordB = isObject(q[b.id]) ? q[b.id] : null;
    const boxA = recordA ? numberOr(recordA.box, 0) : 0;
    const boxB = recordB ? numberOr(recordB.box, 0) : 0;
    if (boxA !== boxB) return boxA - boxB;
    const lastA = recordA ? numberOr(recordA.lastStep, -1) : -1;
    const lastB = recordB ? numberOr(recordB.lastStep, -1) : -1;
    if (lastA !== lastB) return lastA - lastB;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  }

  function pickInType(bank, state, type, recentIds, rng) {
    const q = state.q;

    // 1) 类型内新题：!state.q[id] || state.q[id].seen === 0，且不在 recent → 均匀随机
    const fresh = [];
    for (let i = 0; i < bank.length; i += 1) {
      const item = bank[i];
      if (!isUsableQuestion(item) || item.type !== type) continue;
      if (recentIds.has(item.id)) continue;
      const record = q[item.id];
      if (!isObject(record) || record.seen === 0) fresh.push(item);
    }
    if (fresh.length > 0) {
      const index = Math.min(
        fresh.length - 1,
        Math.floor(readRng(rng) * fresh.length)
      );
      return fresh[index].id;
    }

    // 2) 类型内已做过的题：box 升序 → lastStep 升序 → id 升序
    const seenCandidates = [];
    for (let i = 0; i < bank.length; i += 1) {
      const item = bank[i];
      if (!isUsableQuestion(item) || item.type !== type) continue;
      if (recentIds.has(item.id)) continue;
      seenCandidates.push(item);
    }
    if (seenCandidates.length > 0) {
      seenCandidates.sort(function (a, b) {
        return compareByBoxThenRecency(a, b, q);
      });
      return seenCandidates[0].id;
    }

    // 3) 全库兜底：id 不在 recent、lastStep 最小
    const fallback = fallbackBankPick(bank, q, recentIds, false);
    if (fallback !== null) return fallback;

    // 4) 题库 ≤ recentExclude 的极端情况：忽略 recent 再选，保证返回有效 id
    const loose = fallbackBankPick(bank, q, recentIds, true);
    if (loose !== null) return loose;

    for (let i = 0; i < bank.length; i += 1) {
      if (isUsableQuestion(bank[i])) return bank[i].id;
    }
    return null;
  }

  // ---------------- nextQuestion（CONTRACT §5.1） ----------------

  function nextQuestion(bank, state, now, rng) {
    if (!Array.isArray(bank) || bank.length === 0) {
      throw new Error("nextQuestion: bank 必须是非空数组");
    }
    if (typeof rng !== "function") {
      throw new TypeError("nextQuestion: rng 必须是函数");
    }

    const current = normalizeState(state);
    const recentIds = recentIdSet(current.log);
    // 同类型连续锁定：最近 3 条 log 类型全相同则排除该类型（复习与选类型都适用）
    const streakType = sameTypeStreakType(current.log);

    // 步骤 1：到期复习（优先于冷启动），且最近复习比例严格低于上限；
    // 同类型连续限制也适用于复习：锁定类型的到期题本轮不复习（排除后无候选则进入步骤 2）。
    const due = dueReviewCandidates(
      bank,
      current.q,
      current.step,
      now,
      recentIds,
      streakType
    );
    if (
      due.length > 0 &&
      reviewRatioOf(current.q, current.log) < CONFIG.reviewRatioCap
    ) {
      return due[0].id;
    }

    const activeTypes = activeTypesOf(bank);
    if (activeTypes.length === 0) {
      // 题库中没有 TYPE_ORDER 内的合法类型（非正常题库）：仍保证不抛异常、返回有效 id
      const fallback =
        fallbackBankPick(bank, current.q, recentIds, false) ||
        fallbackBankPick(bank, current.q, recentIds, true);
      if (fallback !== null) return fallback;
      for (let i = 0; i < bank.length; i += 1) {
        if (isUsableQuestion(bank[i])) return bank[i].id;
      }
      return null;
    }

    // 步骤 2：选类型（非冷启动时会排除同类型连续锁定的类型）
    const byId = indexBank(bank);
    const type = chooseType(bank, current, activeTypes, byId, rng, streakType);
    if (type === null) {
      const fallback = fallbackBankPick(bank, current.q, recentIds, false);
      if (fallback !== null) return fallback;
    }

    // 步骤 3：类型内选题（含全库兜底）
    return pickInType(bank, current, type, recentIds, rng);
  }

  // ---------------- applyAnswer（CONTRACT §5.2 / §6.5） ----------------

  function applyAnswer(state, question, ok, now) {
    const current = normalizeState(state);

    if (!isObject(question)) {
      throw new Error("applyAnswer: question 必须是题目对象");
    }
    const id = question.id;
    const type = question.type;
    if (
      typeof id !== "string" ||
      id === "" ||
      typeof type !== "string" ||
      TYPE_ORDER.indexOf(type) === -1
    ) {
      throw new Error(
        "applyAnswer: 题目 id/type 非法（id=" +
          String(id) +
          "，type=" +
          String(type) +
          "）"
      );
    }
    if (typeof ok !== "boolean") {
      throw new TypeError("applyAnswer: ok 必须是 boolean");
    }

    // now 必须是 number 且有限（CONTRACT §5.2），非 number（含数字字符串）一律拒绝，
    // 避免把非法时间写进 due，导致下次启动 app 的 v3 校验拒绝整份状态。
    if (typeof now !== "number" || !Number.isFinite(now)) {
      throw new TypeError("applyAnswer: now 必须是有限数字");
    }
    const nowMs = now;
    const previous = isObject(current.q[id]) ? current.q[id] : null;
    const isNew = !previous || previous.seen === 0;
    const step = current.step + 1;

    let box;
    let due;
    if (!ok) {
      // 任何旧 box（含新题）答错 → box 0，due 固定 0
      box = 0;
      due = 0;
    } else if (isNew) {
      // 新题第一次答对 → box 2（3 天）
      box = FIRST_CORRECT_BOX;
      due = nowMs + CONFIG.intervalsDays[box] * DAY_MS;
    } else {
      // 旧 box 答对 → 升一级；box 5 保持 5
      const previousBox = numberOr(previous.box, 0);
      box = Math.min(
        MAX_BOX,
        Math.max(0, Math.trunc(previousBox)) + 1
      );
      due = nowMs + CONFIG.intervalsDays[box] * DAY_MS;
    }

    const previousSeen = previous ? numberOr(previous.seen, 0) : 0;
    const previousWrong = previous ? numberOr(previous.wrong, 0) : 0;
    const seen = previousSeen + 1;
    const wrong = previousWrong + (ok ? 0 : 1);

    // 所有 q 条目都复制，绝不与入参共享可变引用
    const nextQ = {};
    const qKeys = Object.keys(current.q);
    for (let i = 0; i < qKeys.length; i += 1) {
      const key = qKeys[i];
      const record = current.q[key];
      nextQ[key] = isObject(record) ? Object.assign({}, record) : record;
    }
    nextQ[id] = {
      seen: seen,
      wrong: wrong,
      box: box,
      lastStep: step,
      due: box === 0 ? 0 : due,
    };

    // 所有 log 条目都复制，并追加本次作答，保留最后 logLimit 条
    const nextLog = new Array(current.log.length);
    for (let i = 0; i < current.log.length; i += 1) {
      const entry = current.log[i];
      nextLog[i] = isObject(entry) ? Object.assign({}, entry) : entry;
    }
    nextLog.push({ id: id, type: type, ok: ok, step: step });
    const trimmedLog =
      nextLog.length > CONFIG.logLimit
        ? nextLog.slice(nextLog.length - CONFIG.logLimit)
        : nextLog;

    return {
      currentId: current.currentId,
      step: step,
      q: nextQ,
      log: trimmedLog,
    };
  }

  // ---------------- typeMastery（CONTRACT §5.3） ----------------

  function typeMastery(bank, state) {
    if (!Array.isArray(bank) || bank.length === 0) return {};
    return masteryMap(bank, normalizeState(state));
  }

  return {
    CONFIG: CONFIG,
    TYPE_ORDER: TYPE_ORDER,
    nextQuestion: nextQuestion,
    applyAnswer: applyAnswer,
    typeMastery: typeMastery,
  };
});
