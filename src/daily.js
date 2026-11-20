/*!
 * 每日目标（零依赖 UMD 模块）
 *
 * 规则：
 * - 每天（设备本地日期）需要答对 DAILY_GOAL = 10 道题；
 * - 只统计「答对」，答错不推进；答对达到 10 后当天进入自由刷题模式，进度不再显示；
 * - 第二天（本地日期变化）自动从 0 / 10 重新开始。
 *
 * 本模块只做纯计算，不访问 DOM、不访问存储、不读取系统时钟、不生成随机数：
 * 时间只使用入参 now（毫秒时间戳），存储由 app.js 负责。
 *
 * 浏览器：window.AstroDaily
 * Node：  require("./src/daily.js")
 *
 * API：
 *   DAILY_GOAL                      常量 10
 *   STORAGE_KEY                     localStorage key："astroQuizDaily.v1"
 *   dayKey(now)                     -> "YYYY-MM-DD"（设备本地日期）
 *   emptyDaily(now)                 -> { day, correct: 0, completedAt: null }
 *   normalizeDaily(state, now)      -> 合法且属于今天的每日状态（新对象；跨天/非法自动重置）
 *   recordAnswer(state, ok, now)    -> { state, changed, completedNow }
 *                                      ok 为 false 时只做跨天归一化，不增加计数
 *   progress(state)                 -> { correct, goal, ratio, completed }
 *   isCompleted(state)              -> boolean
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AstroDaily = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DAILY_GOAL = 10;
  const STORAGE_KEY = "astroQuizDaily.v1";
  const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

  // ---------------- 通用小工具 ----------------

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function finiteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function pad2(value) {
    return value < 10 ? "0" + value : String(value);
  }

  // ---------------- 日期 ----------------

  /** 设备本地日期键：使用本地时区，跨天以用户所在时区的 00:00 为界。 */
  function dayKey(now) {
    if (!finiteNumber(now)) {
      throw new TypeError("dayKey(now) 的 now 必须是有限数字时间戳");
    }
    const date = new Date(now);
    if (!Number.isFinite(date.getTime())) {
      throw new TypeError("dayKey(now) 的 now 超出可表示的日期范围");
    }
    return (
      date.getFullYear() +
      "-" +
      pad2(date.getMonth() + 1) +
      "-" +
      pad2(date.getDate())
    );
  }

  // ---------------- 状态归一化 ----------------

  function emptyDaily(now) {
    return { day: dayKey(now), correct: 0, completedAt: null };
  }

  /**
   * 把任意存储值归一化为「今天」的每日状态：
   * - 缺失 / 非对象 / day 格式非法 / correct 非法 → 今天 0/10；
   * - day 与今天不同（跨天）→ 今天 0/10；
   * - correct 超过 DAILY_GOAL（例如旧数据）→ 夹到 DAILY_GOAL；
   * - completedAt 保留有限数字，否则 null（是否完成永远由 correct >= DAILY_GOAL 派生）。
   */
  function normalizeDaily(state, now) {
    const today = dayKey(now);
    if (
      !isObject(state) ||
      typeof state.day !== "string" ||
      !DAY_KEY_RE.test(state.day)
    ) {
      return { day: today, correct: 0, completedAt: null };
    }
    if (state.day !== today) {
      return { day: today, correct: 0, completedAt: null };
    }
    if (!Number.isInteger(state.correct) || state.correct < 0) {
      return { day: today, correct: 0, completedAt: null };
    }
    return {
      day: today,
      correct: Math.min(state.correct, DAILY_GOAL),
      completedAt: finiteNumber(state.completedAt) ? state.completedAt : null,
    };
  }

  // ---------------- 记录作答 ----------------

  /**
   * 记录一次作答。只有答对才推进进度；答错也会做跨天归一化（例如第二天第一题答错，
   * 进度应立即显示 0 / 10 而不是昨天的 10 / 10）。
   *
   * 返回：
   * - state：新的每日状态对象（不修改入参）；
   * - changed：与入参是否不同（跨天重置、非法修复、答对推进都为 true）；
   * - completedNow：本次作答是否刚好让当天答对数达到 DAILY_GOAL（用于只庆祝一次）。
   */
  function recordAnswer(state, ok, now) {
    if (typeof ok !== "boolean") {
      throw new TypeError("recordAnswer(state, ok, now) 的 ok 必须是 boolean");
    }
    const before = normalizeDaily(state, now);
    const next = {
      day: before.day,
      correct: before.correct,
      completedAt: before.completedAt,
    };
    let completedNow = false;
    if (ok && next.correct < DAILY_GOAL) {
      next.correct += 1;
      if (next.correct === DAILY_GOAL) {
        next.completedAt = now;
        completedNow = true;
      }
    }
    const changed =
      !isObject(state) ||
      !Object.prototype.hasOwnProperty.call(state, "completedAt") ||
      state.day !== next.day ||
      state.correct !== next.correct ||
      (state.completedAt === undefined ? null : state.completedAt) !==
        next.completedAt;
    return { state: next, changed, completedNow };
  }

  // ---------------- 进度 ----------------

  function progress(state) {
    const raw = isObject(state) && Number.isInteger(state.correct) ? state.correct : 0;
    const correct = Math.max(0, Math.min(DAILY_GOAL, raw));
    return {
      correct,
      goal: DAILY_GOAL,
      ratio: correct / DAILY_GOAL,
      completed: correct >= DAILY_GOAL,
    };
  }

  function isCompleted(state) {
    return progress(state).completed;
  }

  return {
    DAILY_GOAL,
    STORAGE_KEY,
    dayKey,
    emptyDaily,
    normalizeDaily,
    recordAnswer,
    progress,
    isCompleted,
  };
});
