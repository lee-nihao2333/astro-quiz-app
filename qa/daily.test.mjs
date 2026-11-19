// qa/daily.test.mjs
// 每日目标模块（src/daily.js）单元测试：DAILY_GOAL / STORAGE_KEY / dayKey /
// emptyDaily / normalizeDaily / recordAnswer / progress / isCompleted。
// 运行方式：node qa/daily.test.mjs
// 失败时 node:test 会把退出码置为非 0。
//
// 说明：
// - 日期一律用本地时区构造（new Date(y, m, d, ...)），断言与运行机器时区无关；
// - 时间只来自入参 now，测试不依赖系统当前时间，可重复。

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DAILY_PATH = path.resolve(HERE, '..', 'src', 'daily.js');

let daily;
try {
  daily = require(DAILY_PATH);
} catch (err) {
  console.error(`[fatal] 无法加载 ${DAILY_PATH}: ${err && err.message}`);
  process.exit(1);
}

const {
  DAILY_GOAL,
  STORAGE_KEY,
  dayKey,
  emptyDaily,
  normalizeDaily,
  recordAnswer,
  progress,
  isCompleted,
} = daily;

for (const [name, value] of [
  ['dayKey', dayKey],
  ['emptyDaily', emptyDaily],
  ['normalizeDaily', normalizeDaily],
  ['recordAnswer', recordAnswer],
  ['progress', progress],
  ['isCompleted', isCompleted],
]) {
  if (typeof value !== 'function') {
    console.error(`[fatal] src/daily.js 的 ${name} 必须是函数`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 测试用固定的“当前时间”（本地 2026-11-19 12:00）
// ---------------------------------------------------------------------------

const DAY = 86400000;
const TODAY = new Date(2026, 10, 19, 12, 0, 0, 0).getTime();
const TODAY_KEY = '2026-11-19';
const YESTERDAY = TODAY - DAY;
const YESTERDAY_KEY = '2026-11-18';

/** 今天 0/20 的期望值。 */
function resetToday() {
  return { day: TODAY_KEY, correct: 0, completedAt: null };
}

/** 构造今天的合法状态。 */
function todayState(correct, completedAt = null) {
  return { day: TODAY_KEY, correct, completedAt };
}

// ---------------------------------------------------------------------------
// 1. 常量
// ---------------------------------------------------------------------------

test('常量: DAILY_GOAL 为 20、STORAGE_KEY 为 astroQuizDaily.v1', () => {
  assert.equal(DAILY_GOAL, 20, '每日目标必须是 20 道');
  assert.equal(typeof DAILY_GOAL, 'number');
  assert.equal(STORAGE_KEY, 'astroQuizDaily.v1', '存储 key 必须与 app 约定一致');
  assert.equal(typeof STORAGE_KEY, 'string');
});

// ---------------------------------------------------------------------------
// 2. dayKey：设备本地日期
// ---------------------------------------------------------------------------

test('dayKey: 本地日期格式化为 YYYY-MM-DD', () => {
  assert.equal(dayKey(new Date(2026, 10, 19, 23, 59).getTime()), '2026-11-19');
  assert.equal(dayKey(new Date(2026, 10, 19, 0, 0).getTime()), '2026-11-19');
  assert.equal(dayKey(new Date(2026, 10, 19, 23, 59, 59, 999).getTime()), '2026-11-19');
  // 固定的 NOW 与其日期键一致
  assert.equal(dayKey(TODAY), TODAY_KEY);
});

test('dayKey: 跨天在本地 00:00 变化', () => {
  const before = new Date(2026, 10, 19, 23, 59, 59, 999).getTime();
  const at = new Date(2026, 10, 20, 0, 0, 0, 0).getTime();
  assert.equal(dayKey(before), '2026-11-19');
  assert.equal(dayKey(at), '2026-11-20');
  assert.notEqual(dayKey(before), dayKey(at), '跨过本地 00:00 后日期键必须变化');
  // 完整一天后再跨一天
  assert.equal(dayKey(at + DAY), '2026-11-21');
});

test('dayKey: 个位数月/日补零', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 8, 0).getTime()), '2026-01-05');
  assert.equal(dayKey(new Date(2026, 8, 9, 8, 0).getTime()), '2026-09-09');
  assert.equal(dayKey(new Date(2026, 11, 31, 8, 0).getTime()), '2026-12-31');
});

test('dayKey: 非法 now 抛 TypeError', () => {
  const invalidNows = [
    NaN,
    Infinity,
    -Infinity,
    undefined,
    null,
    '2026-11-19',
    '0',
    '',
    true,
    false,
    [],
    {},
    () => {},
    new Date(TODAY),
  ];
  for (const now of invalidNows) {
    assert.throws(
      () => dayKey(now),
      TypeError,
      `now=${String(now)}（typeof ${typeof now}）时应抛 TypeError`,
    );
  }
  // 合法 now 正常：0 也是有限数字
  assert.match(dayKey(0), /^\d{4}-\d{2}-\d{2}$/);
});

test('dayKey: 有限但超出 Date 范围的 now 抛 TypeError', () => {
  // Date 最大可表示时间戳为 ±8.64e15；再大 1 毫秒应判定非法
  assert.throws(() => dayKey(8.64e15 + 1), TypeError);
  assert.throws(() => dayKey(-8.64e15 - 1), TypeError);
  // 边界值本身仍是合法日期（年份 275760，年份位数不再是 4 位）
  assert.match(dayKey(8.64e15), /^275760-\d{2}-\d{2}$/);
});

// ---------------------------------------------------------------------------
// 3. emptyDaily
// ---------------------------------------------------------------------------

test('emptyDaily: 结构为 { day, correct: 0, completedAt: null }', () => {
  assert.deepEqual(emptyDaily(TODAY), resetToday());
  assert.equal(emptyDaily(TODAY).day, TODAY_KEY);
  assert.equal(emptyDaily(TODAY).correct, 0);
  assert.equal(emptyDaily(TODAY).completedAt, null);
  // 昨天时间点得到昨天日期
  assert.equal(emptyDaily(YESTERDAY).day, YESTERDAY_KEY);
});

test('emptyDaily: 每次返回新对象，互不影响', () => {
  const a = emptyDaily(TODAY);
  const b = emptyDaily(TODAY);
  assert.deepEqual(a, b, '内容应相同');
  assert.notEqual(a, b, '不应复用同一对象引用');
  a.correct = 7;
  a.completedAt = TODAY;
  assert.equal(b.correct, 0, '修改一个返回值不应影响另一个');
  assert.equal(b.completedAt, null);
});

// ---------------------------------------------------------------------------
// 4. normalizeDaily
// ---------------------------------------------------------------------------

test('normalizeDaily: null / undefined / 数组 / 字符串 / 数字 → 今天 0/20', () => {
  const invalidStates = [
    null,
    undefined,
    [],
    [TODAY_KEY],
    ['2026-11-19', 5],
    'astro',
    '',
    0,
    42,
    false,
    true,
    () => {},
    new Date(TODAY),
  ];
  for (const state of invalidStates) {
    assert.deepEqual(
      normalizeDaily(state, TODAY),
      resetToday(),
      `状态 ${String(state)}（typeof ${typeof state}）应重置为今天 0/20`,
    );
  }
});

test('normalizeDaily: day 格式非法时重置', () => {
  const invalidDays = [
    '2026-1-1',
    'abc',
    '',
    '2026/11/19',
    '20261119',
    '2026-11-19 ',
    ' 2026-11-19',
    '2026-11-9x',
    20261119,
    null,
    undefined,
    {},
  ];
  for (const day of invalidDays) {
    assert.deepEqual(
      normalizeDaily({ day, correct: 5, completedAt: TODAY }, TODAY),
      resetToday(),
      `day=${String(day)} 非法时应重置为今天 0/20`,
    );
  }
});

test('normalizeDaily: day 不是今天（now - 86400000）时重置为今天 0/20', () => {
  const yesterdayState = {
    day: YESTERDAY_KEY,
    correct: 20,
    completedAt: YESTERDAY,
  };
  assert.deepEqual(normalizeDaily(yesterdayState, TODAY), resetToday(), '跨天后应重置');

  // 未来日期（设备时钟回拨/伪造数据）同样不是今天 → 重置
  assert.deepEqual(
    normalizeDaily({ day: '2026-11-20', correct: 3, completedAt: TODAY }, TODAY),
    resetToday(),
    '非今天的日期键一律重置',
  );
});

test('normalizeDaily: correct 非整数 / 负数时重置', () => {
  const invalidCorrects = [
    1.5,
    -1,
    -20,
    NaN,
    Infinity,
    -Infinity,
    '10',
    null,
    undefined,
    {},
    [],
    true,
  ];
  for (const correct of invalidCorrects) {
    assert.deepEqual(
      normalizeDaily({ day: TODAY_KEY, correct, completedAt: null }, TODAY),
      resetToday(),
      `correct=${String(correct)} 非法时应重置为今天 0/20`,
    );
  }
});

test('normalizeDaily: correct 超过 DAILY_GOAL 时夹到 20', () => {
  assert.deepEqual(
    normalizeDaily(todayState(21), TODAY),
    { day: TODAY_KEY, correct: 20, completedAt: null },
    '21 应夹到 20',
  );
  assert.equal(normalizeDaily(todayState(999), TODAY).correct, 20);
  assert.equal(normalizeDaily(todayState(DAILY_GOAL), TODAY).correct, 20, '20 本身应保留');
  assert.equal(normalizeDaily(todayState(0), TODAY).correct, 0);
});

test('normalizeDaily: completedAt 非法时为 null，合法有限数字保留', () => {
  const invalidCompletedAt = [
    '2026-11-19',
    'abc',
    NaN,
    Infinity,
    -Infinity,
    null,
    undefined,
    true,
    false,
    {},
    [],
  ];
  for (const completedAt of invalidCompletedAt) {
    assert.equal(
      normalizeDaily(todayState(10, completedAt), TODAY).completedAt,
      null,
      `completedAt=${String(completedAt)} 非法时应为 null`,
    );
  }

  for (const completedAt of [0, 1.5, TODAY, -100]) {
    assert.equal(
      normalizeDaily(todayState(10, completedAt), TODAY).completedAt,
      completedAt,
      `completedAt=${completedAt} 是有限数字，应原样保留`,
    );
  }
});

test('normalizeDaily: 合法的今天状态原样返回（值相等但非同一引用）', () => {
  const state = todayState(7, TODAY);
  const normalized = normalizeDaily(state, TODAY);
  assert.deepEqual(normalized, { day: TODAY_KEY, correct: 7, completedAt: TODAY });
  assert.notEqual(normalized, state, '应返回新对象而不是入参引用');
  assert.deepEqual(state, todayState(7, TODAY), '入参不应被修改');
  // 边界值：0 / 20 都合法
  assert.deepEqual(normalizeDaily(todayState(0), TODAY), resetToday());
  assert.deepEqual(normalizeDaily(todayState(20, TODAY), TODAY), {
    day: TODAY_KEY,
    correct: 20,
    completedAt: TODAY,
  });
});

// ---------------------------------------------------------------------------
// 5. recordAnswer
// ---------------------------------------------------------------------------

test('recordAnswer: ok=false 不增加 correct，同一天 changed=false', () => {
  const state = todayState(5);
  const result = recordAnswer(state, false, TODAY);
  assert.deepEqual(result.state, todayState(5), '答错不应推进进度');
  assert.equal(result.changed, false, '同一合法状态答错不应标记 changed');
  assert.equal(result.completedNow, false);
  // 反复答错仍然不推进
  let current = state;
  for (let i = 0; i < 5; i += 1) current = recordAnswer(current, false, TODAY).state;
  assert.equal(current.correct, 5);
});

test('recordAnswer: ok=false 跨天时重置并 changed=true', () => {
  const yesterdayState = {
    day: YESTERDAY_KEY,
    correct: 20,
    completedAt: YESTERDAY,
  };
  const result = recordAnswer(yesterdayState, false, TODAY);
  assert.deepEqual(result.state, resetToday(), '跨天后答错也应显示今天 0/20');
  assert.equal(result.changed, true, '跨天重置必须标记 changed');
  assert.equal(result.completedNow, false);
  assert.equal(result.state.day, dayKey(TODAY));
});

test('recordAnswer: ok=true 每次 +1，changed=true，completedNow 只在 19→20 时为 true', () => {
  let state = emptyDaily(TODAY);
  for (let i = 1; i <= DAILY_GOAL; i += 1) {
    const result = recordAnswer(state, true, TODAY);
    assert.equal(result.state.correct, i, `第 ${i} 次答对后 correct 应为 ${i}`);
    assert.equal(result.changed, true, `第 ${i} 次答对是推进，changed 必须为 true`);
    assert.equal(
      result.completedNow,
      i === DAILY_GOAL,
      `只有第 ${DAILY_GOAL} 次答对时 completedNow 才为 true（当前 i=${i}）`,
    );
    state = result.state;
  }
  assert.equal(state.correct, DAILY_GOAL);
  assert.equal(state.completedAt, TODAY, '刚好达到 20 时 completedAt 等于传入 now');
});

test('recordAnswer: 达到 20 后继续答对不再变化（correct 仍 20、completedNow=false、completedAt 不变、changed=false）', () => {
  const completedAt = TODAY - 60_000;
  const state = todayState(DAILY_GOAL, completedAt);
  const result = recordAnswer(state, true, TODAY);

  assert.equal(result.state.correct, 20, '完成后继续答对不能超过 20');
  assert.equal(result.state.completedAt, completedAt, 'completedAt 必须保持首次完成时间');
  assert.equal(result.completedNow, false, '不应重复庆祝');
  assert.equal(result.changed, false, '状态无变化时 changed 必须为 false');
  assert.notEqual(result.state, state, '仍应返回新对象（不修改入参）');

  // 连续多次仍然稳定
  const again = recordAnswer(result.state, true, TODAY);
  assert.equal(again.state.correct, 20);
  assert.equal(again.state.completedAt, completedAt);
  assert.equal(again.completedNow, false);
  assert.equal(again.changed, false);
});

test('recordAnswer: completedAt 在刚好达到 20 时等于传入 now，未达到时为 null', () => {
  const justBefore = recordAnswer(todayState(DAILY_GOAL - 1), true, TODAY);
  assert.equal(justBefore.state.correct, DAILY_GOAL);
  assert.equal(justBefore.state.completedAt, TODAY);
  assert.equal(justBefore.completedNow, true);

  const notYet = recordAnswer(todayState(DAILY_GOAL - 2), true, TODAY);
  assert.equal(notYet.state.correct, DAILY_GOAL - 1);
  assert.equal(notYet.state.completedAt, null, '未达到 20 时不应写 completedAt');
  assert.equal(notYet.completedNow, false);
});

test('recordAnswer: 旧数据/非法数据被归一化时 changed=true', () => {
  // correct 超上限 → 夹到 20
  const over = recordAnswer(todayState(25), false, TODAY);
  assert.deepEqual(over.state, todayState(20), 'correct 应被夹到 20');
  assert.equal(over.changed, true, '归一化修正必须标记 changed');

  // correct 非整数 → 重置
  const broken = recordAnswer(todayState(5.5), false, TODAY);
  assert.deepEqual(broken.state, resetToday());
  assert.equal(broken.changed, true);

  // 非法 completedAt → 修正为 null
  const badCompletedAt = recordAnswer(todayState(5, '昨天'), false, TODAY);
  assert.deepEqual(badCompletedAt.state, todayState(5), '非法 completedAt 应修正为 null');
  assert.equal(badCompletedAt.changed, true);
});

test('recordAnswer: completedAt 属性缺失时归一化并标记 changed', () => {
  const missing = { day: TODAY_KEY, correct: 3 };
  const result = recordAnswer(missing, false, TODAY);
  assert.deepEqual(result.state, todayState(3));
  assert.equal(result.changed, true, '缺失 completedAt 也需要落盘为规范结构');
});

test('recordAnswer: 不修改入参（前后 JSON 相同）', () => {
  const cases = [
    [todayState(3), true],
    [todayState(19), true],
    [todayState(20, TODAY), true],
    [todayState(5), false],
    [{ day: YESTERDAY_KEY, correct: 20, completedAt: YESTERDAY }, false],
    [{ day: 'abc', correct: 5, completedAt: TODAY }, true],
    [null, true],
    [undefined, false],
  ];
  for (const [state, ok] of cases) {
    const before = JSON.stringify(state);
    const result = recordAnswer(state, ok, TODAY);
    assert.equal(
      JSON.stringify(state),
      before,
      `recordAnswer(${before}, ${ok}) 不应修改入参`,
    );
    assert.notEqual(result.state, state, '返回的 state 不应是入参引用');
  }
});

test('recordAnswer: ok 非 boolean 抛 TypeError', () => {
  const invalidOks = [1, 0, -1, 'true', 'false', '', null, undefined, NaN, {}, [], () => {}];
  for (const ok of invalidOks) {
    assert.throws(
      () => recordAnswer(emptyDaily(TODAY), ok, TODAY),
      TypeError,
      `ok=${String(ok)}（typeof ${typeof ok}）时应抛 TypeError`,
    );
  }
  // 严格 boolean 仍正常工作
  assert.equal(recordAnswer(emptyDaily(TODAY), true, TODAY).state.correct, 1);
  assert.equal(recordAnswer(emptyDaily(TODAY), false, TODAY).state.correct, 0);
});

test('recordAnswer: now 非法时通过 dayKey 链路抛 TypeError', () => {
  const invalidNows = [NaN, Infinity, -Infinity, undefined, null, '2026-11-19', true, false, [], {}, () => {}];
  for (const now of invalidNows) {
    assert.throws(
      () => recordAnswer(emptyDaily(TODAY), true, now),
      TypeError,
      `now=${String(now)}（typeof ${typeof now}）时应抛 TypeError`,
    );
    assert.throws(
      () => recordAnswer(null, false, now),
      TypeError,
      `ok=false 时 now 非法同样应抛 TypeError（now=${String(now)}）`,
    );
  }
  // 合法 now 正常推进
  assert.equal(recordAnswer(null, true, TODAY).state.correct, 1);
});

// ---------------------------------------------------------------------------
// 6. progress / isCompleted
// ---------------------------------------------------------------------------

test('progress: 0 → 0%、10 → 50%、20 → 100% 且 completed 正确', () => {
  assert.deepEqual(progress(todayState(0)), {
    correct: 0,
    goal: 20,
    ratio: 0,
    completed: false,
  });
  assert.deepEqual(progress(todayState(10)), {
    correct: 10,
    goal: 20,
    ratio: 0.5,
    completed: false,
  });
  assert.deepEqual(progress(todayState(20, TODAY)), {
    correct: 20,
    goal: 20,
    ratio: 1,
    completed: true,
  });
  // 其它中间值
  assert.deepEqual(progress(todayState(5)), {
    correct: 5,
    goal: 20,
    ratio: 0.25,
    completed: false,
  });
  assert.equal(progress(todayState(1)).ratio, 0.05);
  assert.equal(progress(todayState(1)).completed, false);
  assert.equal(progress(todayState(19)).completed, false, '19 道尚未完成');
});

test('progress: 超过 20、负数、非法数据被防御到 [0, 20]', () => {
  for (const correct of [21, 50, 1e9]) {
    assert.deepEqual(
      progress(todayState(correct)),
      { correct: 20, goal: 20, ratio: 1, completed: true },
      `correct=${correct} 应夹到 20`,
    );
  }
  for (const correct of [-1, -20, -1e9]) {
    assert.deepEqual(
      progress(todayState(correct)),
      { correct: 0, goal: 20, ratio: 0, completed: false },
      `correct=${correct} 应为 0`,
    );
  }
  const invalidStates = [
    undefined,
    null,
    {},
    'astro',
    42,
    [],
    { correct: 1.5 },
    { correct: NaN },
    { correct: Infinity },
    { correct: -Infinity },
    { correct: '10' },
    { correct: null },
  ];
  for (const state of invalidStates) {
    assert.deepEqual(
      progress(state),
      { correct: 0, goal: 20, ratio: 0, completed: false },
      `progress(${String(state)}) 应防御为 0/20`,
    );
  }
});

test('isCompleted: 与 progress().completed 始终一致', () => {
  const states = [
    undefined,
    null,
    {},
    'astro',
    [],
    { correct: 1.5 },
    { correct: NaN },
    { correct: Infinity },
    { correct: '10' },
    todayState(0),
    todayState(1),
    todayState(10),
    todayState(19),
    todayState(20, TODAY),
    todayState(21),
    todayState(-1),
  ];
  for (const state of states) {
    const expected = progress(state).completed;
    const actual = isCompleted(state);
    assert.equal(typeof actual, 'boolean', `isCompleted(${String(state)}) 应返回 boolean`);
    assert.equal(actual, expected, `isCompleted 应与 progress().completed 一致：${String(state)}`);
  }
  assert.equal(isCompleted(todayState(19)), false);
  assert.equal(isCompleted(todayState(20)), true);
  assert.equal(isCompleted(todayState(21)), true, '超过 20 视为已完成');
});

// ---------------------------------------------------------------------------
// 7. 跨天场景
// ---------------------------------------------------------------------------

test('跨天: 昨天 20/20，今天先答错归零，再答对为 1/20', () => {
  const yesterdayState = {
    day: YESTERDAY_KEY,
    correct: 20,
    completedAt: YESTERDAY,
  };
  const snapshot = structuredClone(yesterdayState);
  // 昨天确实是 20/20 已完成
  assert.equal(isCompleted(yesterdayState), true);
  assert.equal(progress(yesterdayState).ratio, 1);

  // 今天第一题答错：应立刻归零（而不是沿用昨天的 20/20）
  const wrong = recordAnswer(yesterdayState, false, TODAY);
  assert.equal(wrong.state.day, TODAY_KEY, 'state.day 应更新为今天');
  assert.equal(wrong.state.day, dayKey(TODAY));
  assert.equal(wrong.state.correct, 0, '跨天后 correct 归零');
  assert.equal(progress(wrong.state).completed, false, '今天不应显示已完成');
  assert.equal(progress(wrong.state).ratio, 0);
  assert.equal(wrong.state.completedAt, null, '跨天后 completedAt 应清空');
  assert.equal(wrong.changed, true, '跨天重置必须标记 changed');
  assert.equal(wrong.completedNow, false);

  // 今天再答对：1/20
  const right = recordAnswer(wrong.state, true, TODAY);
  assert.equal(right.state.day, TODAY_KEY);
  assert.equal(right.state.correct, 1);
  assert.equal(right.state.completedAt, null);
  assert.equal(right.changed, true);
  assert.equal(right.completedNow, false);
  assert.equal(progress(right.state).ratio, 0.05);
  assert.equal(isCompleted(right.state), false);

  // 昨天的入参自始至终未被修改
  assert.deepEqual(yesterdayState, snapshot);
});

test('跨天: 昨天已完成且今天继续答对，进度从 1/20 重新累计', () => {
  const yesterdayState = { day: YESTERDAY_KEY, correct: 20, completedAt: YESTERDAY };
  let state = recordAnswer(yesterdayState, true, TODAY).state;
  assert.equal(state.correct, 1, '新的一天从 1 开始而不是 21');
  for (let i = 0; i < 4; i += 1) state = recordAnswer(state, true, TODAY).state;
  assert.equal(state.correct, 5);
  assert.equal(state.completedAt, null, '今天尚未完成');
  assert.equal(isCompleted(state), false);
});

// ---------------------------------------------------------------------------
// 8. 不可变性
// ---------------------------------------------------------------------------

test('不可变性: normalizeDaily / recordAnswer / progress 不修改传入对象', () => {
  const state = todayState(19);
  const snapshot = structuredClone(state);

  normalizeDaily(state, TODAY);
  recordAnswer(state, true, TODAY);
  progress(state);
  isCompleted(state);

  assert.deepEqual(state, snapshot, '所有 API 调用后入参应保持不变');
  assert.equal(JSON.stringify(state), JSON.stringify(snapshot));

  // 跨天 + 非法旧数据同样不能被写回
  const legacy = { day: YESTERDAY_KEY, correct: 99, completedAt: 'x' };
  const legacySnapshot = { day: YESTERDAY_KEY, correct: 99, completedAt: 'x' };
  normalizeDaily(legacy, TODAY);
  recordAnswer(legacy, true, TODAY);
  progress(legacy);
  isCompleted(legacy);
  assert.deepEqual(legacy, legacySnapshot, '非法旧数据不应被原地修复');

  // 返回的新对象与入参引用不同
  assert.notEqual(normalizeDaily(state, TODAY), state);
  assert.notEqual(recordAnswer(state, true, TODAY).state, state);
});
