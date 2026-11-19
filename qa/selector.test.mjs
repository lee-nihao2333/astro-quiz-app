// qa/selector.test.mjs
// C 智能体单元测试，对应 qa/CONTRACT.md 第 5、6、9 节。
// 运行方式：node qa/selector.test.mjs
// 失败时 node:test 会把退出码置为非 0。
//
// 说明：
// - 只从 src/selector.js 取实现与 CONFIG/TYPE_ORDER，不复制算法参数；
// - 用自造的 8 类 × 4 题 bank（32 题）与固定种子 rng，保证可重复。

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELECTOR_PATH = path.resolve(HERE, '..', 'src', 'selector.js');

let selector;
try {
  selector = require(SELECTOR_PATH);
} catch (err) {
  console.error(`[fatal] 无法加载 ${SELECTOR_PATH}: ${err && err.message}`);
  process.exit(1);
}

const { CONFIG, TYPE_ORDER, nextQuestion, applyAnswer, typeMastery } = selector;
for (const [name, value] of [
  ['CONFIG', CONFIG],
  ['TYPE_ORDER', TYPE_ORDER],
  ['nextQuestion', nextQuestion],
  ['applyAnswer', applyAnswer],
  ['typeMastery', typeMastery],
]) {
  if (value === undefined) {
    console.error(`[fatal] src/selector.js 未导出 ${name}`);
    process.exit(1);
  }
}
if (typeof nextQuestion !== 'function' || typeof applyAnswer !== 'function' || typeof typeMastery !== 'function') {
  console.error('[fatal] src/selector.js 的 nextQuestion/applyAnswer/typeMastery 必须是函数');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 测试基础设施
// ---------------------------------------------------------------------------

const DAY = 86400000; // CONTRACT 允许测试使用 86400000 字面量
const NOW = Date.UTC(2026, 0, 1); // 固定“当前时间”

/** 自造题库：8 个类型各 4 题，ai 标记在第 4 题上。 */
function buildBank() {
  const bank = [];
  TYPE_ORDER.forEach((type, typeIndex) => {
    for (let k = 1; k <= 4; k += 1) {
      bank.push({
        id: `t${typeIndex}q${k}`,
        q: `第 ${typeIndex} 类第 ${k} 题`,
        options: ['A', 'B', 'C', 'D'],
        answer: 0,
        type,
        ai: k === 4,
      });
    }
  });
  return bank;
}

const BANK = buildBank();
const BANK_BY_ID = new Map(BANK.map((item) => [item.id, item]));
const BANK_IDS = new Set(BANK.map((item) => item.id));

function getItem(id) {
  const item = BANK_BY_ID.get(id);
  assert.ok(item, `测试构造的 id 必须在 bank 中: ${id}`);
  return item;
}
function typeOf(id) {
  return getItem(id).type;
}

/** mulberry32：固定种子、可重复的 [0,1) 随机流。 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 包一层以统计 rng 调用次数（契约 6.8 对调用次数有约定）。 */
function makeRng(seed = 1) {
  const base = mulberry32(seed);
  let calls = 0;
  const rng = () => {
    calls += 1;
    return base();
  };
  rng.calls = () => calls;
  return rng;
}

/** 空 v3 状态。 */
function emptyV3(currentId = BANK[0].id) {
  return { currentId, step: 0, q: {}, log: [] };
}

/** 构造一个“已做过”的题的状态，box 给定，due 设为较远未来（box0 除外）。 */
function stateWithBox(id, box, step = 7) {
  return {
    currentId: id,
    step,
    q: {
      [id]: {
        seen: 3,
        wrong: 1,
        box,
        lastStep: step,
        due: box === 0 ? 0 : NOW + 100 * DAY,
      },
    },
    log: [{ id, type: typeOf(id), ok: true, step }],
  };
}

function assertClose(actual, expected, message, epsilon = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `${message || '数值不接近'}：actual=${actual} expected=${expected}`,
  );
}

/** 按顺序吐出给定值的 rng，用于确定性地走 softmax + 新题随机。 */
function fixedRng(values) {
  let index = 0;
  const rng = () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
  rng.calls = () => index;
  return rng;
}

// ---------------------------------------------------------------------------
// 0. 契约常量（防“假绿”）与确定性 priority / softmax
// ---------------------------------------------------------------------------

test('契约常量: CONFIG 与 CONTRACT §2 字面值完全一致', () => {
  // 这一处刻意重复字面值（CONTRACT §9 允许）：selector 内参数被改坏/增删字段时，
  // 依赖 CONFIG 的其它测试会“跟着一起变”从而假绿，本测试把它们钉死。
  // 覆盖 intervalsDays / recentExclude / logLimit / box0Steps / reviewRatio* 等全部 16 个字段。
  const expected = {
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
  assert.deepEqual(CONFIG, expected);
});

test('契约常量: TYPE_ORDER 与 CONTRACT §1 字面顺序完全一致', () => {
  // 这一处刻意重复字面值（CONTRACT §9 允许）：冷启动轮转、统计、报告都依赖该顺序。
  assert.deepEqual(TYPE_ORDER, [
    '天象与时间历法',
    '恒星与星座',
    '太阳系与月球',
    '天文观测与望远镜',
    '时事与新闻',
    '天文史、人物与综合常识',
    '航天与空间探测',
    '星系与宇宙',
  ]);
  assert.equal(TYPE_ORDER.length, 8);
});

// --- 确定性 priority / softmax 用的两类小题库 ---
// A 类 3 题（share = 3/4），B 类 1 题（share = 1/4）；A 类 typeCount=4，B 类 typeCount=0。
const SOFTMAX_TYPE_A = TYPE_ORDER[0];
const SOFTMAX_TYPE_B = TYPE_ORDER[1];
const SOFTMAX_BANK = [
  { id: 'a1', q: 'A1', options: ['A', 'B', 'C', 'D'], answer: 0, type: SOFTMAX_TYPE_A, ai: false },
  { id: 'a2', q: 'A2', options: ['A', 'B', 'C', 'D'], answer: 0, type: SOFTMAX_TYPE_A, ai: false },
  { id: 'a3', q: 'A3', options: ['A', 'B', 'C', 'D'], answer: 0, type: SOFTMAX_TYPE_A, ai: false },
  { id: 'b1', q: 'B1', options: ['A', 'B', 'C', 'D'], answer: 0, type: SOFTMAX_TYPE_B, ai: false },
];
const SOFTMAX_BY_ID = new Map(SOFTMAX_BANK.map((item) => [item.id, item]));
// 非冷启动（step >= coldStartTotal）且比冷启动多 1，避免 16 正好卡在边界上产生歧义。
const SOFTMAX_STEP = CONFIG.coldStartTotal + 1;

/** 非冷启动、无到期题、两类 share/typeCount 不同的固定状态。 */
function softmaxState() {
  return {
    currentId: 'a1',
    step: SOFTMAX_STEP,
    q: {
      a1: { seen: 2, wrong: 1, box: 2, lastStep: 15, due: NOW + 100 * DAY },
      a2: { seen: 2, wrong: 0, box: 2, lastStep: 16, due: NOW + 100 * DAY },
    },
    // A 类 log（旧→新）：A1 错、A2 对、A1 错、A2 对
    log: [
      { id: 'a1', type: SOFTMAX_TYPE_A, ok: false, step: 13 },
      { id: 'a2', type: SOFTMAX_TYPE_A, ok: true, step: 14 },
      { id: 'a1', type: SOFTMAX_TYPE_A, ok: false, step: 15 },
      { id: 'a2', type: SOFTMAX_TYPE_A, ok: true, step: 16 },
      // 尾部补一条“bank 外 id”的异类 log，仅用于避免最后 3 条连续同类型锁定 A 类
      // （否则 A 会被 §6.2 连击限制排除，测不到 softmax）；typeMastery 会忽略
      // bank 中不存在的 id，因此不影响上面的手算掌握度。
      { id: 'ghost-tail', type: SOFTMAX_TYPE_B, ok: true, step: SOFTMAX_STEP },
    ],
  };
}

/** 手算 CONTRACT §6.2 的 priority 与 softmax 概率（exploreCoef 可指定）。 */
function handSoftmaxProbabilities(exploreCoef) {
  const step = SOFTMAX_STEP;
  const shareA = 3 / 4; // A 类 3 题 / 4 题
  const shareB = 1 / 4; // B 类 1 题 / 4 题
  const typeCountA = 4; // q 中 A 类 seen 之和
  const typeCountB = 0;

  // A 类掌握度（§6.7）：从末尾往前，k = 0..3
  const decay = CONFIG.decay;
  const num = 1 + Math.pow(decay, 2); // k=0 A2 对；k=2 A2 对
  const den = 1 + decay + Math.pow(decay, 2) + Math.pow(decay, 3);
  const mA = (CONFIG.priorCorrect + num) / (CONFIG.priorTotal + den);
  const mB = CONFIG.priorCorrect / CONFIG.priorTotal; // B 类无记录

  const priorityA =
    (1 - mA) * Math.pow(shareA, CONFIG.examWeightPower) +
    exploreCoef * Math.sqrt(Math.log(step + 1) / (typeCountA + 1));
  const priorityB =
    (1 - mB) * Math.pow(shareB, CONFIG.examWeightPower) +
    exploreCoef * Math.sqrt(Math.log(step + 1) / (typeCountB + 1));

  const maxPriority = Math.max(priorityA, priorityB);
  const wA = Math.exp((priorityA - maxPriority) / CONFIG.softmaxTemp);
  const wB = Math.exp((priorityB - maxPriority) / CONFIG.softmaxTemp);
  return {
    priorityA,
    priorityB,
    probA: wA / (wA + wB),
    probB: wB / (wA + wB),
  };
}

/** 固定 rng 调 nextQuestion，返回选中题目的类型与 rng 调用次数。 */
function pickSoftmaxType(r) {
  const rng = fixedRng([r, 0.5]);
  const id = nextQuestion(SOFTMAX_BANK, softmaxState(), NOW, rng);
  const item = SOFTMAX_BY_ID.get(id);
  assert.ok(item, `返回的 id 应属于自造 softmax 题库: ${id}`);
  return { type: item.type, calls: rng.calls() };
}

test('确定性 priority/softmax: 选中类型符合手算概率', () => {
  const { priorityA, priorityB, probA, probB } = handSoftmaxProbabilities(CONFIG.exploreCoef);

  assert.ok(priorityB > priorityA, `手算应 B 类优先级更高：pA=${priorityA} pB=${priorityB}`);
  assertClose(probA + probB, 1, 'softmax 概率之和', 1e-12);
  assert.ok(probB > probA, `手算应 B 类概率更大：probA=${probA} probB=${probB}`);
  assert.ok(probA > 0.1 && probA < 0.5, `手算 probA 应约为 0.337，实际 ${probA}`);

  // rng=0.5 落在 B 的概率区间 → 选 B；消耗 rng：softmax 1 次 + 类型内新题随机 1 次
  const mid = pickSoftmaxType(0.5);
  assert.equal(mid.type, SOFTMAX_TYPE_B, 'rng=0.5 应选中手算概率更大的 B 类');
  assert.equal(mid.calls, 2, 'softmax 1 次 + 新题随机 1 次');

  // 用 P(A) 边界钉死 softmax 概率：略小于 P(A) 选 A，略大于选 B
  assert.equal(
    pickSoftmaxType(Math.max(0, probA - 1e-6)).type,
    SOFTMAX_TYPE_A,
    'rng 略小于 P(A) 时应选 A 类',
  );
  assert.equal(
    pickSoftmaxType(probA + 1e-6).type,
    SOFTMAX_TYPE_B,
    'rng 略大于 P(A) 时应选 B 类',
  );
});

test('确定性 priority/softmax: 改 CONFIG.exploreCoef 会改变选择（公式参数确实生效）', () => {
  const original = CONFIG.exploreCoef;
  try {
    assert.equal(pickSoftmaxType(0.1).type, SOFTMAX_TYPE_A, '默认 exploreCoef 下 rng=0.1 应选 A');
    assert.equal(pickSoftmaxType(0.5).type, SOFTMAX_TYPE_B, '默认 exploreCoef 下 rng=0.5 应选 B');

    // exploreCoef=0：探索项消失，A 类（掌握度/占比占优）反超 → rng=0.5 由 B 变 A
    CONFIG.exploreCoef = 0;
    assert.equal(
      pickSoftmaxType(0.5).type,
      SOFTMAX_TYPE_A,
      'exploreCoef=0 后 rng=0.5 应选 A（选择应发生变化）',
    );

    // exploreCoef=10：探索项放大，typeCount 更小的 B 类垄断概率 → rng=0.1 由 A 变 B
    CONFIG.exploreCoef = 10;
    assert.equal(
      pickSoftmaxType(0.1).type,
      SOFTMAX_TYPE_B,
      'exploreCoef=10 后 rng=0.1 应选 B（选择应发生变化）',
    );
  } finally {
    CONFIG.exploreCoef = original;
  }
  assert.equal(CONFIG.exploreCoef, 0.3, '测试结束必须恢复 CONFIG.exploreCoef');
});

// ---------------------------------------------------------------------------
// 1. box 升降与 due / step / seen / wrong / lastStep / log 裁剪
// ---------------------------------------------------------------------------

test('box: 新题答错 → box0 / due=0', () => {
  const id = 't0q1';
  const item = getItem(id);
  const state = emptyV3();
  const next = applyAnswer(state, item, false, NOW);

  const entry = next.q[id];
  assert.equal(entry.box, 0);
  assert.equal(entry.due, 0);
  assert.equal(entry.seen, 1);
  assert.equal(entry.wrong, 1);
  assert.equal(entry.lastStep, 1);
  assert.equal(next.step, 1);
  assert.equal(next.currentId, state.currentId);
  assert.deepEqual(next.log, [{ id, type: item.type, ok: false, step: 1 }]);
});

test('box: 新题答对 → box2，due = now + 3d', () => {
  const id = 't0q2';
  const item = getItem(id);
  const state = emptyV3();
  const next = applyAnswer(state, item, true, NOW);

  const entry = next.q[id];
  assert.equal(entry.box, 2);
  assert.equal(entry.due, NOW + CONFIG.intervalsDays[2] * DAY);
  assert.equal(entry.seen, 1);
  assert.equal(entry.wrong, 0);
  assert.equal(entry.lastStep, 1);
  assert.equal(next.step, 1);
  assert.equal(next.currentId, state.currentId);
  assert.deepEqual(next.log, [{ id, type: item.type, ok: true, step: 1 }]);
});

test('box: prev.seen === 0 视同新题（答对 → box2）', () => {
  const id = 't0q3';
  const item = getItem(id);
  const state = {
    currentId: id,
    step: 0,
    q: { [id]: { seen: 0, wrong: 0, box: 0, lastStep: 0, due: 0 } },
    log: [],
  };
  const next = applyAnswer(state, item, true, NOW);
  assert.equal(next.q[id].box, 2);
  assert.equal(next.q[id].seen, 1);
  assert.equal(next.q[id].due, NOW + CONFIG.intervalsDays[2] * DAY);
});

test('box: 答对升级链 box0→1(1d) / 1→2(3d) / 2→3(7d) / 3→4(21d) / 4→5(60d)', () => {
  const cases = [
    [0, 1, 1],
    [1, 2, 2],
    [2, 3, 3],
    [3, 4, 4],
    [4, 5, 5],
  ];
  for (const [fromBox, toBox, intervalIdx] of cases) {
    const id = 't2q1';
    const state = stateWithBox(id, fromBox);
    const next = applyAnswer(state, getItem(id), true, NOW);
    const entry = next.q[id];

    assert.equal(entry.box, toBox, `box ${fromBox} 答对应升到 ${toBox}`);
    assert.equal(
      entry.due,
      NOW + CONFIG.intervalsDays[intervalIdx] * DAY,
      `box ${toBox} 的 due 应为 now + intervalsDays[${intervalIdx}] 天`,
    );
    assert.equal(entry.seen, 4);
    assert.equal(entry.wrong, 1);
    assert.equal(entry.lastStep, state.step + 1);
    assert.equal(next.step, state.step + 1);
    assert.equal(next.currentId, id);
    assert.deepEqual(next.log.at(-1), { id, type: typeOf(id), ok: true, step: state.step + 1 });

    // 入参未被修改
    assert.equal(state.q[id].box, fromBox);
    assert.equal(state.step, 7);
    assert.equal(state.log.length, 1);
  }
});

test('box: box5 答对保持 5，due = now + 60d（仍不复习）', () => {
  const id = 't4q1';
  const state = stateWithBox(id, 5);
  const next = applyAnswer(state, getItem(id), true, NOW);
  assert.equal(next.q[id].box, 5);
  assert.equal(next.q[id].due, NOW + CONFIG.intervalsDays[5] * DAY);
  assert.equal(next.q[id].seen, 4);
});

test('box: 任意旧 box 答错 → box0 / due=0', () => {
  for (let box = 0; box <= 5; box += 1) {
    const id = 't3q2';
    const state = stateWithBox(id, box, 12);
    const next = applyAnswer(state, getItem(id), false, NOW);
    const entry = next.q[id];

    assert.equal(entry.box, 0, `box ${box} 答错后应回到 0`);
    assert.equal(entry.due, 0, `box ${box} 答错后 due 应为 0`);
    assert.equal(entry.seen, 4);
    assert.equal(entry.wrong, 2);
    assert.equal(entry.lastStep, 13);
    assert.equal(next.step, 13);
  }
});

test('box/step/log: log 只保留最近 CONFIG.logLimit 条，step 递增', () => {
  const limit = CONFIG.logLimit;
  const oldLog = Array.from({ length: limit }, (_, i) => ({
    id: `log-${i}`,
    type: TYPE_ORDER[i % TYPE_ORDER.length],
    ok: i % 2 === 0,
    step: i + 1,
  }));
  const id = 't0q1';
  const state = { currentId: id, step: limit, q: {}, log: oldLog };

  const next = applyAnswer(state, getItem(id), false, NOW);

  assert.equal(next.step, limit + 1);
  assert.equal(next.log.length, limit, 'log 长度不应超过 logLimit');
  assert.equal(next.log[0].id, 'log-1', '最旧一条应被裁掉');
  assert.deepEqual(next.log.at(-1), { id, type: typeOf(id), ok: false, step: limit + 1 });
  assert.equal(next.q[id].lastStep, limit + 1);

  // 入参 log 未被原地修改
  assert.equal(state.log.length, limit);
  assert.equal(state.log[0].id, 'log-0');
});

// ---------------------------------------------------------------------------
// 2. 到期复习
// ---------------------------------------------------------------------------

test('复习: box0 需 step >= lastStep + box0Steps 才到期', () => {
  const id = 't2q1'; // 冷启动 step=4 时按轮转为 TYPE_ORDER[2]，与本题类型一致
  const makeState = (step) => ({
    currentId: BANK[0].id,
    step,
    q: { [id]: { seen: 1, wrong: 1, box: 0, lastStep: 0, due: 0 } },
    log: [],
  });

  const notDueStep = CONFIG.box0Steps - 1;
  assert.ok(notDueStep < CONFIG.coldStartTotal, '该断言依赖未到期场景处于冷启动');

  // 未到期 → 进入冷启动选类型（0 次 rng）+ 类型内新题随机（1 次 rng）
  const rngNotDue = makeRng(11);
  const notDue = nextQuestion(BANK, makeState(notDueStep), NOW, rngNotDue);
  assert.notEqual(notDue, id, '未到 box0 复习间隔时不应优先返回该题');
  assert.equal(rngNotDue.calls(), 1, '未到期时走冷启动 + 新题随机，应消耗 1 次 rng');

  // 到期 → 步骤 1 直接复习，不消耗 rng
  const rngDue = makeRng(11);
  const due = nextQuestion(BANK, makeState(CONFIG.box0Steps), NOW, rngDue);
  assert.equal(due, id, '达到 box0 复习间隔后应优先返回到期题');
  assert.equal(rngDue.calls(), 0, '复习选中不应消耗 rng');
});

test('复习: box1+ 按 now >= due 到期，box5 不复习', () => {
  const id = 't7q1'; // 冷启动 step=15 时轮转为 TYPE_ORDER[7]
  const makeState = (box, due) => ({
    currentId: BANK[0].id,
    step: 15,
    q: { [id]: { seen: 1, wrong: 1, box, lastStep: 0, due } },
    log: [],
  });

  assert.notEqual(nextQuestion(BANK, makeState(1, NOW + 1), NOW, makeRng(5)), id, 'box1 未到期不应复习');
  assert.equal(nextQuestion(BANK, makeState(1, NOW - 1), NOW, makeRng(5)), id, 'box1 到期应复习');
  assert.equal(nextQuestion(BANK, makeState(2, NOW - DAY), NOW, makeRng(5)), id, 'box2 到期应复习');
  assert.equal(nextQuestion(BANK, makeState(4, NOW), NOW, makeRng(5)), id, 'box4 到期应复习');
  assert.notEqual(
    nextQuestion(BANK, makeState(5, NOW - DAY), NOW, makeRng(5)),
    id,
    'box5 视为已掌握，即使已过 due 也不复习',
  );
});

test('复习: 多个到期候选按 box0 优先 → due 升序 → id 字典序', () => {
  const makeBox1 = (due) => ({ seen: 1, wrong: 1, box: 1, lastStep: 1, due });
  const earlyId = 't3q1';
  const lateId = 't4q1';
  const box0Id = 't5q1';

  const nonBox0Q = {
    [earlyId]: makeBox1(NOW - 2000),
    [lateId]: makeBox1(NOW - 1000),
  };

  // box0 候选（step 到期）排在最前
  const withBox0 = {
    currentId: BANK[0].id,
    step: 20,
    q: {
      ...nonBox0Q,
      [box0Id]: { seen: 1, wrong: 1, box: 0, lastStep: 1, due: 0 },
    },
    log: [],
  };
  const rng = makeRng(9);
  assert.equal(nextQuestion(BANK, withBox0, NOW, rng), box0Id, 'box0 候选应最优先');
  assert.equal(rng.calls(), 0, '复习选中不应消耗 rng');

  // 无 box0 时按 due 升序
  const noBox0 = { ...withBox0, q: nonBox0Q };
  assert.equal(nextQuestion(BANK, noBox0, NOW, makeRng(9)), earlyId, 'due 更早的候选优先');

  // due 相同按 id 字典序
  const tieState = {
    currentId: BANK[0].id,
    step: 20,
    q: {
      t2q1: makeBox1(NOW - 500),
      t1q1: makeBox1(NOW - 500),
    },
    log: [],
  };
  assert.equal(nextQuestion(BANK, tieState, NOW, makeRng(9)), 't1q1', 'due 相同时按 id 升序');
});

test('复习: 复习比例 < 0.4 才允许复习（0.2 允许 / 0.4 与 0.8 阻止）', () => {
  const candidate = 't0q1';
  const candidateQ = { seen: 1, wrong: 1, box: 1, lastStep: 0, due: NOW - 1000 };

  function ratioState(logIds) {
    const counts = new Map();
    for (const id of logIds) counts.set(id, (counts.get(id) || 0) + 1);
    const q = { [candidate]: { ...candidateQ } };
    logIds.forEach((id, i) => {
      q[id] = { seen: counts.get(id), wrong: 0, box: 2, lastStep: i, due: NOW + 50 * DAY };
    });
    return {
      currentId: BANK[0].id,
      step: 20,
      q,
      log: logIds.map((id, i) => ({ id, type: typeOf(id), ok: true, step: i + 1 })),
    };
  }

  // 5 条 log / 4 个不同 id = 0.2 < 0.4 → 返回到期题
  const low = ratioState(['t1q1', 't2q1', 't3q1', 't4q1', 't1q1']);
  const lowRng = makeRng(13);
  assert.equal(nextQuestion(BANK, low, NOW, lowRng), candidate, '复习比例 0.2 时应优先复习');
  assert.equal(lowRng.calls(), 0, '复习选中不应消耗 rng');

  // 5 条 log / 3 个不同 id = 0.4，严格小于才允许 → 不复习
  const atCap = ratioState(['t1q1', 't2q1', 't3q1', 't2q1', 't1q1']);
  const rAtCap = nextQuestion(BANK, atCap, NOW, makeRng(13));
  assert.notEqual(rAtCap, candidate, '复习比例恰好 0.4 时不应复习（要求严格小于）');
  assert.ok(BANK_IDS.has(rAtCap));

  // 5 条 log / 1 个不同 id = 0.8 > 0.4 → 不复习
  const high = ratioState(['t1q1', 't1q1', 't1q1', 't1q1', 't1q1']);
  const rHigh = nextQuestion(BANK, high, NOW, makeRng(13));
  assert.notEqual(rHigh, candidate, '复习比例 0.8 时不应复习');
  assert.ok(BANK_IDS.has(rHigh));
});

test('复习: 最近 10 题内的到期题不参与复习候选', () => {
  const candidate = 't0q1';
  const recentIds = [
    't1q1',
    't2q1',
    't3q1',
    't4q1',
    't5q1',
    't6q1',
    't7q1',
    't1q2',
    't2q2',
    candidate,
  ];
  const q = { [candidate]: { seen: 1, wrong: 1, box: 1, lastStep: 0, due: NOW - 1000 } };
  recentIds.forEach((id, i) => {
    if (id === candidate) return;
    q[id] = { seen: 1, wrong: 0, box: 2, lastStep: i, due: NOW + 50 * DAY };
  });
  const state = {
    currentId: candidate,
    step: 20,
    q,
    log: recentIds.map((id, i) => ({ id, type: typeOf(id), ok: true, step: i + 1 })),
  };

  const r = nextQuestion(BANK, state, NOW, makeRng(17));
  assert.ok(BANK_IDS.has(r));
  assert.notEqual(r, candidate, '到期题落在最近 10 题内时应被排除');
});

// ---------------------------------------------------------------------------
// 3. 冷启动
// ---------------------------------------------------------------------------

test('冷启动: 空状态连续 16 题按 TYPE_ORDER 每类 2 题', () => {
  const expectedTypes = [];
  for (let i = 0; i < CONFIG.coldStartTotal; i += 1) {
    expectedTypes.push(TYPE_ORDER[Math.floor(i / CONFIG.coldStartPerType)]);
  }

  let state = emptyV3();
  const picked = [];
  const rng = makeRng(2026);

  for (let i = 0; i < CONFIG.coldStartTotal; i += 1) {
    assert.equal(state.step, i, `第 ${i} 次 nextQuestion 前 step 应为 ${i}`);
    const now = NOW + i * 60_000;
    const id = nextQuestion(BANK, state, now, rng);
    assert.ok(BANK_IDS.has(id), `返回的 id 必须在题库中: ${id}`);

    const item = getItem(id);
    assert.equal(
      item.type,
      expectedTypes[i],
      `冷启动第 ${i} 题类型应为 ${expectedTypes[i]}，实际 ${item.type}`,
    );
    picked.push(id);

    state = applyAnswer(state, item, true, now);
    state.currentId = id;
  }

  assert.equal(state.step, CONFIG.coldStartTotal);
  assert.equal(new Set(picked).size, picked.length, '冷启动期间不应重复出题');
  assert.equal(rng.calls(), CONFIG.coldStartTotal, '冷启动每题只应消耗 1 次 rng（新题随机）');
  for (const type of TYPE_ORDER) {
    const count = picked.filter((id) => typeOf(id) === type).length;
    assert.equal(count, CONFIG.coldStartPerType, `类型 ${type} 的冷启动题数应为 ${CONFIG.coldStartPerType}`);
  }
});

// ---------------------------------------------------------------------------
// 4. 同类型连续 3 题限制
// ---------------------------------------------------------------------------

test('同类型连续: 尾部 3 条同类型时本轮排除该类型', () => {
  const banned = TYPE_ORDER[0];
  const bannedIds = BANK.filter((item) => item.type === banned).map((item) => item.id);
  assert.ok(bannedIds.length >= CONFIG.maxSameTypeStreak + 1, 'bank 需留出该类型的可用题');

  const log = [];
  let step = 0;
  // 按类型轮转铺 17 条其他类型的 log，确保最近 10 条不会覆盖掉某个类型的全部 4 题
  // （否则契约允许的“全库兜底”可能返回被排除类型，造成测试误报）。
  const otherTypes = TYPE_ORDER.filter((type) => type !== banned);
  for (let i = 0; i < 17; i += 1) {
    const type = otherTypes[i % otherTypes.length];
    const k = Math.floor(i / otherTypes.length) + 1;
    const item = getItem(`t${TYPE_ORDER.indexOf(type)}q${k}`);
    step += 1;
    log.push({ id: item.id, type, ok: true, step });
  }
  for (const id of bannedIds.slice(0, CONFIG.maxSameTypeStreak)) {
    step += 1;
    log.push({ id, type: banned, ok: true, step });
  }

  assert.ok(step >= CONFIG.coldStartTotal, '该场景必须处于非冷启动');
  assert.equal(log.at(-1).type, banned);
  assert.equal(log.at(-2).type, banned);
  assert.equal(log.at(-3).type, banned);

  const state = { currentId: BANK[0].id, step, q: {}, log };

  // 确定性 rng：softmax 调用返回 0 → 必选 eligible pool 的第一项。
  // 正确排除锁定类型时 eligible = [TYPE_ORDER[1], TYPE_ORDER[2], ...]，pool 第一项是 TYPE_ORDER[1]；
  // 若 chooseType 的排除行被删掉，pool 第一项会变回被禁的 TYPE_ORDER[0]（banned），本断言即失败。
  const expectedType = TYPE_ORDER[1];
  const rng = fixedRng([0, 0]);
  const id = nextQuestion(BANK, state, NOW, rng);
  assert.ok(BANK_IDS.has(id), '返回的 id 必须在题库中');
  assert.notEqual(typeOf(id), banned, '尾部 3 条同类型时应把该类型从抽样中排除');
  assert.equal(
    typeOf(id),
    expectedType,
    `rng=0 时应选中 eligible pool 第一项（${expectedType}），实际 ${typeOf(id)}`,
  );
  assert.equal(rng.calls(), 2, 'softmax 1 次 + 新题随机 1 次');
});

/**
 * 构造“最近 CONFIG.maxSameTypeStreak 条连续同一类型（TYPE_ORDER[0]）”的非冷启动状态。
 * 用 TYPE_ORDER[2..] 的题按类型轮转填 17 条 log（避免最近 10 题覆盖某类型全部题，
 * 从而避免触发契约允许的全库兜底），q 由调用方给定。
 */
function lockedStreakState(q) {
  const locked = TYPE_ORDER[0];
  const fillerTypes = TYPE_ORDER.slice(2);
  const log = [];
  let step = 0;
  for (let i = 0; i < 17; i += 1) {
    const type = fillerTypes[i % fillerTypes.length];
    const k = Math.floor(i / fillerTypes.length) + 1;
    const item = getItem(`t${TYPE_ORDER.indexOf(type)}q${k}`);
    step += 1;
    log.push({ id: item.id, type, ok: true, step });
  }
  const lockedIds = BANK.filter((item) => item.type === locked)
    .slice(0, CONFIG.maxSameTypeStreak)
    .map((item) => item.id);
  for (const id of lockedIds) {
    step += 1;
    log.push({ id, type: locked, ok: false, step });
  }
  return { currentId: lockedIds[0], step, q, log };
}

test('同类型连续: 该限制也适用于到期复习候选（CONTRACT §6.1 更新）', () => {
  const locked = TYPE_ORDER[0];
  const other = TYPE_ORDER[1];
  const lockedCandidate = 't0q4'; // 锁定类型、到期，且不在最近 10 题 / log 中
  const otherCandidate = 't1q1'; // 其他类型、到期更晚

  // 场景 A：唯一的到期候选属于锁定类型 → 跳过复习进入步骤 2，不得制造第 4 连
  const stateA = lockedStreakState({
    [lockedCandidate]: { seen: 3, wrong: 1, box: 1, lastStep: 0, due: NOW - 3000 },
  });
  assert.equal(stateA.step, 20);
  assert.ok(stateA.step >= CONFIG.coldStartTotal, '必须处于非冷启动');
  for (const entry of stateA.log.slice(-CONFIG.maxSameTypeStreak)) {
    assert.equal(entry.type, locked);
  }
  const rngA = makeRng(23);
  const idA = nextQuestion(BANK, stateA, NOW, rngA);
  assert.ok(BANK_IDS.has(idA), `返回的 id 必须在题库中: ${idA}`);
  assert.notEqual(idA, lockedCandidate, '锁定类型的到期题不应被复习选中');
  assert.notEqual(typeOf(idA), locked, '不应制造同类型第 4 连（步骤 2 同样排除该类型）');
  const recentA = new Set(stateA.log.slice(-CONFIG.recentExclude).map((entry) => entry.id));
  assert.ok(!recentA.has(idA), '返回 id 仍需满足最近 10 题排除');
  assert.equal(rngA.calls(), 2, '跳过复习后：softmax 1 次 + 新题随机 1 次');

  // 场景 B：锁定类型之外还有更晚到期的候选 → 排除锁定类型后改复习其他类型
  const stateB = lockedStreakState({
    [lockedCandidate]: { seen: 3, wrong: 1, box: 1, lastStep: 0, due: NOW - 3000 },
    [otherCandidate]: { seen: 3, wrong: 1, box: 1, lastStep: 0, due: NOW - 1000 },
  });
  const rngB = makeRng(23);
  const idB = nextQuestion(BANK, stateB, NOW, rngB);
  assert.equal(idB, otherCandidate, '应排除锁定类型，改复习其他类型的到期题');
  assert.equal(typeOf(idB), other);
  assert.equal(rngB.calls(), 0, '复习选中不应消耗 rng');
});

// ---------------------------------------------------------------------------
// 5. 最近 10 题排除
// ---------------------------------------------------------------------------

test('最近 10 题: 返回 id 不在最近 10 条 log 中', () => {
  const recentIds = BANK.slice(0, CONFIG.recentExclude).map((item) => item.id);
  assert.equal(recentIds.length, CONFIG.recentExclude);
  const recentSet = new Set(recentIds);
  const state = {
    currentId: recentIds[recentIds.length - 1],
    step: 20,
    q: {},
    log: recentIds.map((id, i) => ({ id, type: typeOf(id), ok: true, step: i + 1 })),
  };

  for (let seed = 1; seed <= 10; seed += 1) {
    const id = nextQuestion(BANK, state, NOW, makeRng(seed));
    assert.ok(BANK_IDS.has(id), `seed=${seed} 返回的 id 必须有效: ${id}`);
    assert.ok(!recentSet.has(id), `seed=${seed} 返回 ${id} 不应在最近 10 题内`);
  }
});

// ---------------------------------------------------------------------------
// 6. AI 权重 / typeMastery
// ---------------------------------------------------------------------------

test('typeMastery: 空 bank / 非数组 bank 返回 {}', () => {
  assert.deepEqual(typeMastery([], {}), {});
  assert.deepEqual(typeMastery(null, {}), {});
  assert.deepEqual(typeMastery(undefined, {}), {});
});

test('typeMastery: 空状态各活跃类型 0.5，且键按 TYPE_ORDER 顺序', () => {
  const mastery = typeMastery(BANK, {});
  assert.deepEqual(Object.keys(mastery), TYPE_ORDER);
  for (const type of TYPE_ORDER) {
    assertClose(mastery[type], CONFIG.priorCorrect / CONFIG.priorTotal, `${type} 空状态掌握度`);
    assertClose(mastery[type], 0.5, `${type} 空状态掌握度应为 0.5`);
  }
});

test('typeMastery: 只返回 bank 中存在的活跃类型', () => {
  const active = [TYPE_ORDER[0], TYPE_ORDER[3]];
  const bank = BANK.filter((item) => active.includes(item.type));
  const mastery = typeMastery(bank, {});
  assert.deepEqual(Object.keys(mastery), active);
});

test('typeMastery: 与手算公式一致（含 decay 与 aiWeight）', () => {
  const type = TYPE_ORDER[2];
  const plainId = 't2q1'; // ai === false
  const plainId2 = 't2q2'; // ai === false
  const aiId = 't2q4'; // ai === true
  const log = [
    { id: aiId, type, ok: true, step: 1 }, // 倒数第 4（laterSameType=3）
    { id: plainId2, type, ok: false, step: 2 }, // 倒数第 3（laterSameType=2）
    { id: aiId, type, ok: false, step: 3 }, // 倒数第 2（laterSameType=1）
    { id: plainId, type, ok: true, step: 4 }, // 最新（laterSameType=0）
  ];
  const mastery = typeMastery(BANK, { currentId: plainId, step: 4, q: {}, log });

  const num =
    1 * 1 + // 最新：plain correct，decay^0
    Math.pow(CONFIG.decay, 3) * CONFIG.aiWeight * 1; // 最旧：ai correct，decay^3 * aiWeight
  const den =
    1 + // 最新 plain correct
    CONFIG.decay * CONFIG.aiWeight + // ai wrong
    Math.pow(CONFIG.decay, 2) + // plain wrong
    Math.pow(CONFIG.decay, 3) * CONFIG.aiWeight; // ai correct
  const expected = (CONFIG.priorCorrect + num) / (CONFIG.priorTotal + den);

  assertClose(mastery[type], expected, '含 AI 权重的掌握度');
  // 未出现在 log 中的活跃类型仍为 0.5
  assertClose(mastery[TYPE_ORDER[0]], 0.5, '无记录类型掌握度');
});

test('typeMastery: AI 正确答案的贡献约为非 AI 的一半', () => {
  const type = TYPE_ORDER[1];
  const aiId = 't1q4';
  const plainId = 't1q1';

  const aiOnly = typeMastery(BANK, {
    currentId: aiId,
    step: 1,
    q: {},
    log: [{ id: aiId, type, ok: true, step: 1 }],
  })[type];
  const plainOnly = typeMastery(BANK, {
    currentId: plainId,
    step: 1,
    q: {},
    log: [{ id: plainId, type, ok: true, step: 1 }],
  })[type];

  // 相对先验 0.5 的提升：AI 条目权重被乘 aiWeight，贡献应约为一半
  const aiDelta = aiOnly - CONFIG.priorCorrect / CONFIG.priorTotal;
  const plainDelta = plainOnly - CONFIG.priorCorrect / CONFIG.priorTotal;
  assert.ok(plainDelta > 0, '非 AI 正确答案应提升掌握度');
  const ratio = aiDelta / plainDelta;
  assert.ok(
    ratio > 0.45 && ratio < 0.6,
    `AI 正确贡献约为非 AI 的一半，实际比例 ${ratio}`,
  );

  // 直接手算：单条 AI 正确 = (priorCorrect + aiWeight) / (priorTotal + aiWeight)
  const expectedAi =
    (CONFIG.priorCorrect + CONFIG.aiWeight) / (CONFIG.priorTotal + CONFIG.aiWeight);
  assertClose(aiOnly, expectedAi, '单条 AI 正确答案的掌握度');
});

test('typeMastery: 忽略 bank 中不存在的 id（部分状态）', () => {
  const type = TYPE_ORDER[0];
  const mastery = typeMastery(BANK, {
    currentId: 'ghost',
    step: 2,
    q: {},
    log: [
      { id: 'ghost', type, ok: true, step: 1 },
      { id: 'ghost-2', type, ok: true, step: 2 },
    ],
  });
  assertClose(mastery[type], 0.5, 'bank 中不存在的 id 不应贡献掌握度');
});

// ---------------------------------------------------------------------------
// 7. 空状态 / 部分状态 / applyAnswer 不修改入参
// ---------------------------------------------------------------------------

test('空/部分状态: 空 state 的 nextQuestion 返回有效 id', () => {
  const partialStates = [
    {},
    { step: 0 },
    { step: 20 },
    { step: 20, q: {} },
    { step: 20, log: [] },
    { currentId: BANK[0].id, step: 0, q: {}, log: [] },
  ];
  for (const state of partialStates) {
    const id = nextQuestion(BANK, state, NOW, makeRng(3));
    assert.ok(BANK_IDS.has(id), `部分状态 ${JSON.stringify(state)} 应返回有效 id`);
  }
});

test('空/部分状态: nextQuestion 输入校验（空 bank 抛 Error，缺 rng 抛 TypeError）', () => {
  assert.throws(() => nextQuestion([], emptyV3(), NOW, makeRng(1)), Error, '空 bank 应抛 Error');
  assert.throws(() => nextQuestion(BANK, emptyV3(), NOW), TypeError, '缺 rng 应抛 TypeError');
  assert.throws(() => nextQuestion(BANK, emptyV3(), NOW, null), TypeError, 'rng 非函数应抛 TypeError');
  assert.throws(() => nextQuestion(BANK, emptyV3(), NOW, 42), TypeError, 'rng 非函数应抛 TypeError');
});

test('空/部分状态: applyAnswer 输入校验（ok 严格 boolean，type 必须合法）', () => {
  assert.throws(() => applyAnswer(emptyV3(), getItem('t0q1'), 1, NOW), TypeError, 'ok 非 boolean 应抛 TypeError');
  assert.throws(() => applyAnswer(emptyV3(), getItem('t0q1'), 'true', NOW), TypeError, 'ok 非 boolean 应抛 TypeError');
  assert.throws(() => applyAnswer(emptyV3(), getItem('t0q1'), null, NOW), TypeError, 'ok 非 boolean 应抛 TypeError');
  assert.throws(
    () => applyAnswer(emptyV3(), { id: 'bad-id', type: '不存在的类型' }, true, NOW),
    (err) => err instanceof Error && String(err.message).includes('bad-id') && String(err.message).includes('不存在的类型'),
    'type 非法时应抛包含 id/type 的 Error',
  );
});

test('空/部分状态: applyAnswer 的 now 非有限 number 时抛 TypeError（严格类型）', () => {
  const item = getItem('t0q1');
  // now 必须是有限 number：NaN/Infinity、undefined、数字字符串、boolean、null、数组/对象都必须拒绝。
  const invalidNows = [
    NaN,
    Infinity,
    -Infinity,
    undefined,
    '123', // 数字字符串也不能被隐式转换
    'abc',
    true,
    false,
    null,
    [],
    {},
  ];
  for (const now of invalidNows) {
    assert.throws(
      () => applyAnswer(emptyV3(), item, true, now),
      TypeError,
      `now=${String(now)}（typeof ${typeof now}）时应抛 TypeError`,
    );
  }
  // 合法 now 仍应正常推进（防止校验过严）
  const next = applyAnswer(emptyV3(), item, true, NOW);
  assert.equal(next.step, 1);
  assert.equal(next.q[item.id].due, NOW + CONFIG.intervalsDays[2] * DAY);
  for (const validNow of [0, 1.5, NOW]) {
    const validState = applyAnswer(emptyV3(), item, true, validNow);
    assert.equal(validState.step, 1, `合法 now=${validNow} 应正常推进`);
  }
});

test('空/部分状态: applyAnswer 不修改入参，且返回的新对象引用独立', () => {
  const existingId = 't1q1';
  const newId = 't1q2';
  const state = {
    currentId: existingId,
    step: 3,
    q: {
      [existingId]: { seen: 2, wrong: 1, box: 1, lastStep: 2, due: NOW + DAY },
    },
    log: [{ id: existingId, type: typeOf(existingId), ok: false, step: 2 }],
  };
  const snapshot = structuredClone(state);
  const next = applyAnswer(state, getItem(newId), true, NOW);

  // 入参完全未被修改
  assert.deepEqual(state, snapshot);
  // 顶层与内层引用全部独立
  assert.notEqual(next, state);
  assert.notEqual(next.q, state.q);
  assert.notEqual(next.log, state.log);
  assert.notEqual(next.q[existingId], state.q[existingId]);
  assert.notEqual(next.log[0], state.log[0]);
  // 已有条目内容不变
  assert.deepEqual(next.q[existingId], state.q[existingId]);
  assert.deepEqual(next.log[0], state.log[0]);
  // 新条目正确
  assert.equal(next.q[newId].box, 2, '新题答对应为 box2');
  assert.equal(next.q[newId].due, NOW + CONFIG.intervalsDays[2] * DAY);
  assert.equal(next.currentId, existingId, 'currentId 应原样保留');
  assert.equal(next.step, 4);
  assert.deepEqual(next.log[1], { id: newId, type: typeOf(newId), ok: true, step: 4 });
});

test('空/部分状态: 部分 q/log 不影响其他条目，typeMastery 可计算', () => {
  const existingId = 't2q1';
  const state = {
    currentId: existingId,
    step: 2,
    q: { [existingId]: { seen: 1, wrong: 1, box: 0, lastStep: 2, due: 0 } },
    log: [{ id: existingId, type: typeOf(existingId), ok: false, step: 2 }],
  };

  const mastery = typeMastery(BANK, state);
  assert.equal(Object.keys(mastery).length, TYPE_ORDER.length);
  assert.ok(Number.isFinite(mastery[typeOf(existingId)]));

  const next = applyAnswer(state, getItem('t2q2'), false, NOW);
  assert.deepEqual(next.q[existingId], state.q[existingId]);
  assert.equal(next.q[existingId].box, 0);
  assert.equal(next.log.length, 2);
  assert.equal(next.step, 3);
});
