# 自适应出题算法 · 接口契约（CONTRACT）

> 本文由协调者维护。阶段 1 的 A–E 五个智能体都以本文为准；发现接口不够用或规则冲突，**不要自行改别人的文件**，发消息给协调者，由协调者更新本文并通知相关智能体。
>
> 本文所在项目：`/home/marvin/astro-quiz-app`（git 分支 develop）。
> 禁止执行 `git add` / `git commit` / `git stash`；提交由协调者统一完成。

## 0. 文件归属（只能改自己名下的文件）

| 智能体 | 负责文件 |
|---|---|
| 协调者 | `qa/CONTRACT.md`（以及后续汇总/提交） |
| A 构建 | `scripts/build-web.mjs` |
| B 算法 | `src/selector.js`（新增） |
| C 测试 | `qa/selector.test.mjs`（新增） |
| D 模拟 | `scripts/simulate.mjs`（新增）、`qa/simulation.md`（生成） |
| E 接入 | `src/app.js` |
| F 审查 | 只读，不改任何文件 |
| G 验收 | `qa/verify.mjs`、`qa/report.md`、`qa/360x640-*.png`、`qa/412x915-*.png`、`README.md` |

**不能修改**：`data/`、`src/index.html`、`android/`、`capacitor.config.json`、`package.json`、`package-lock.json`、其他人的文件。
（注意：`src/index.html` 不在允许修改清单中。E 必须在 `src/app.js` 里**动态加载** `selector.js`，不要改 HTML。）

## 1. 题库字段与类型顺序

`www/questions.js` 中每题固定字段：

```js
{
  id: "2014-12",          // 年份-题号，字符串，全库唯一
  q: "题干",               // 非空字符串
  options: ["A", "B", "C", "D"], // 恰好 4 个非空字符串
  answer: 0,              // 0..3
  type: "恒星与星座",       // 必须是下面 8 类之一
  ai: false               // boolean，answerSource === "ai" 时为 true
}
```

类型顺序（`TYPE_ORDER`，冷启动轮转、统计、报告都按这个顺序）：

```js
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
```

题库题数（全库 485）：`139, 102, 98, 50, 27, 26, 23, 20`。自然占比 = 题数 / 485。

## 2. `CONFIG` 常量（必须原样导出，不得把参数散落硬编码）

```js
const CONFIG = {
  coldStartPerType: 2, coldStartTotal: 16,
  priorCorrect: 2, priorTotal: 4, decay: 0.95, aiWeight: 0.5,
  exploreCoef: 0.3, examWeightPower: 0.5, softmaxTemp: 0.15,
  maxSameTypeStreak: 3, recentExclude: 10,
  reviewRatioCap: 0.4, reviewRatioWindow: 20,
  intervalsDays: [0, 1, 3, 7, 21, 60], box0Steps: 5, logLimit: 500,
};
const DAY_MS = 86400000;
```

`CONFIG` 与 `TYPE_ORDER` 都从 `src/selector.js` 导出。代码中不得再出现这些数值的重复硬编码（`DAY_MS` 除外，可在 selector 内定义；测试可用 `86400000`）。

## 3. v3 状态结构（`astroQuizState.v3`）

```js
{
  currentId: "2014-12",     // 当前题目 id，必须是题库中的 id
  step: 120,                // 全局作答计数 = state.log 最后一条的 step = 已作答总数
  q: {                      // 每道做过的题一条；没有做过的题不出现
    "2014-12": {
      seen: 3,              // 做过总次数（>=1）
      wrong: 1,             // 答错次数（0..seen）
      box: 2,               // Leitner 熟练度 0..5
      lastStep: 118,        // 最近一次作答后的 state.step
      due: 1763500000000    // 到期时间戳(ms)；box 0 时固定为 0
    }
  },
  log: [                    // 最近作答日志，按时间从旧到新，最多 CONFIG.logLimit 条
    { id: "2014-12", type: "恒星与星座", ok: true, step: 118 }
  ]
}
```

说明：

- `q[id].due`：box 0 固定为 `0`（用 `step` 判断到期）；box 1–5 为 `now + intervalsDays[box] * DAY_MS`。
- `box 5` 视为已掌握：`due` 仍写入 60 天后的时间戳，但**不参与到期复习选择**。注意步骤 3（类型内没有新题时的 box/lastStep 排序与全库兜底）仍可能抽到 box5 的题；契约只承诺“不参与到期复习”。
- `log` 只保留最近 `logLimit` 条；`step` 从 1 递增。
- `applyAnswer` 返回的新 state 中 `currentId` 保持不变（由调用方随后设置下一题）。
- v3 状态必须允许“部分题”存在（例如只有 3 道题的 q 与 3 条 log）。

## 4. 浏览器 / Node 双用导出（`src/selector.js`）

UMD 形式，**零依赖**，不访问 DOM、不访问 `localStorage`、不自己调用 `Date.now()` 或 `Math.random()`（随机数只能用传入的 `rng`；时间只用传入的 `now`）。

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AstroSelector = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // ...
  return { CONFIG, TYPE_ORDER, nextQuestion, applyAnswer, typeMastery };
});
```

- 浏览器：`window.AstroSelector`。
- Node：`require('/home/marvin/astro-quiz-app/src/selector.js')`。
- `src/selector.js` 使用 CommonJS `require` 时不能报错；`src/app.js` 里通过动态 `<script>` 加载后使用 `window.AstroSelector`。

## 5. 函数签名与语义

### 5.1 `nextQuestion(bank, state, now, rng) -> string`

- `bank`：数组，元素形如第 1 节；必须非空，否则抛 `Error`（正常题库保证非空）。
- `state`：v3 状态（可以是部分状态，缺省按空处理：`step||0`、`q||{}`、`log||[]`）。
- `now`：毫秒时间戳 number。
- `rng`：`() => [0,1)` 随机函数；必须由调用方传入（缺省/非函数抛 `TypeError`）。
- 返回：题库中某个题的 `id` 字符串。正常输入下**不得抛异常**。

算法顺序（必须按此顺序）：

1. **到期复习**（见 6.1）：若存在到期题、且最近复习比例低于 40%，返回最早到期的一题。
2. **选类型**（见 6.2）：冷启动按类型轮转；否则按掌握度/探索度 softmax 抽样。
3. **类型内选题**（见 6.3）：新题随机 → 最低 box + 最久未做 → 全库兜底。
4. 所有步骤都排除最近 10 题（见 6.4）；保证最终返回有效 id。

### 5.2 `applyAnswer(state, question, ok, now) -> newState`

- 不修改入参（state、q、log 都不能被原地修改），返回新的 v3 状态。
- `question`：题库中的题目对象（至少需要 `{id, type}`；`type` 缺失或不在 `TYPE_ORDER` 时抛 `Error`，错误信息包含 id/type）。
- `ok`：boolean（严格 boolean；不合法抛 `TypeError`）。
- `now`：毫秒时间戳，**必须是 number 类型且是有限数字**；非 number（包括数字字符串 `"123"`、null、true、[]）或非有限数字（NaN/Infinity）一律抛 `TypeError`，避免把非法值写进 `due`。
- 更新规则（见 6.5）：`step+1`；`q[id]` 的 seen/wrong/box/lastStep/due；追加 `log` 并裁剪到 `logLimit`。
- 返回对象 `currentId` 原样保留（调用方设置下一题），`step/q/log` 为新值。

### 5.3 `typeMastery(bank, state) -> { [type]: number }`

- 返回**活跃类型**（bank 中存在的类型，按 `TYPE_ORDER` 顺序）的掌握度 0..1。
- 使用 `state.log` 按 6.2 的公式计算（含 AI 权重）；没有作答记录时返回 `priorCorrect/priorTotal = 0.5`。
- 空 bank 返回 `{}`；部分状态可计算。
- 不抛异常（非数组 bank 返回 `{}`）。

## 6. 算法细则（审查会逐条对照）

### 6.1 步骤 1：到期错题复习（Leitner）

- 到期判断：
  - `box === 0`：`state.step >= q[id].lastStep + CONFIG.box0Steps`
  - `box >= 1 && box <= 4`：`now >= q[id].due`
  - `box === 5`：**不到期**（已掌握，不复习）
- 候选必须排除最近 10 题（6.4）。
- **同一类型连续限制也适用于到期复习**：若 `state.log` 最后 `CONFIG.maxSameTypeStreak` 条（连续）的 `type` 全部相同（记为 t），则本次到期复习候选要排除 `type === t` 的题；若排除后没有候选，则直接进入步骤 2（宁可暂缓复习，也不能让同一类型连续超过 3 题）。
- 复习比例 `reviewRatio`（6.6）：必须 `< CONFIG.reviewRatioCap`（严格小于）。只有 `reviewRatio < 0.4` 才允许本轮出复习题。
- 若有多个到期候选，按下面顺序选**最早到期**的一道：
  1. box 0 的候选排在最前（它们是 step 到期，没有绝对时间；组内按 `lastStep` 升序，最久没做的先）；
  2. 其后是 box 1–4 的候选，按 `due` 升序；
  3. 最后按 `id` 字典序（`<`）兜底。
- 不符合条件时进入步骤 2。

> 协调者决策：步骤 1 优先于冷启动，即冷启动期间也先复习到期题。这样保证“先复习到期的错题”严格优先。
> 副作用：冷启动的“每类各 2 题”是**尽力而为**的轮转；若前 16 题内出现到期复习，类型序列会被复习题偏移（到期题属于哪一类就无法完全保证 2 题）。README 必须说明这一点。

### 6.2 步骤 2：选类型

**冷启动**：`state.step < CONFIG.coldStartTotal`：
- 活跃类型 `activeTypes = TYPE_ORDER.filter(t => bank 中有该类型)`。
- `typeIndex = Math.floor(state.step / CONFIG.coldStartPerType) % activeTypes.length`；
- 取 `activeTypes[typeIndex]`，不再做 softmax。
- 冷启动不排除“同类型连续 3 题”限制（每类本来就连续 2 题）。

**非冷启动**：
- 先算每个活跃类型的掌握度 `m`（6.5 的公式，`typeMastery` 提供）。
- 该类型总作答数 `typeCount`：遍历 `state.q`，把 `q[id].seen` 按 bank 中该 id 的 type 求和；没有记录的题不贡献。
- 自然占比 `share = 该类型题数 / bank.length`。
- 优先级：
  ```js
  // examWeightPower = 0.5，Math.pow(share, 0.5) 与 Math.sqrt(share) 等价；用 CONFIG 参数实现
  priority = (1 - m) * Math.pow(share, CONFIG.examWeightPower)
           + CONFIG.exploreCoef * Math.sqrt(Math.log(state.step + 1) / (typeCount + 1));
  ```
- **同类型连续限制**：若 `state.log` 最后 3 条（`maxSameTypeStreak`）的 `type` 全部相同，则把该类型从本次抽样中排除。
- softmax（温度 `CONFIG.softmaxTemp`）：
  ```js
  // 数值稳定：先减去最大 priority
  const e = eligible.map(t => Math.exp((priority[t] - maxPriority) / CONFIG.softmaxTemp));
  const sum = e.reduce((a,b)=>a+b, 0);
  // 用 rng() 抽一个下标；sum<=0 或 temp<=0 时取 priority 最大者（按 TYPE_ORDER）
  ```
- `rng()` 在 softmax 里只调用一次；如果排除后 `eligible` 为空（只可能出现在极端小题库），退回全部活跃类型。
- 选中类型后再进入步骤 3。

### 6.3 步骤 3：类型内选题

`recent` 集合见 6.4。设选中类型为 `t`：

1. **新题**：bank 中 `type === t` 且（`!state.q[id]` 或 `state.q[id].seen === 0`）且 id 不在 recent → 用 `rng()` 均匀随机挑一道。
2. **否则**：bank 中 `type === t` 且 id 不在 recent 的题，按
   - `box` 升序（`state.q[id].box`），
   - `lastStep` 升序（越久没做越前），
   - `id` 字典序升序
   排序取第一道。
3. **兜底**：若类型内选不出（全部被 recent 排除），就在**全题库**里选 id 不在 recent、`lastStep` 最小的一道（没有 lastStep 的新题按 `-1` 处理，会优先被选）；同分按 `id` 升序。
4. 若连全库都因 recent 排除而无候选（题库 ≤ 10 题），忽略 recent 再按 3 排序选一道，保证返回有效 id。

### 6.4 最近 10 题排除

- `recentIds = new Set(state.log.slice(-CONFIG.recentExclude).map(e => e.id))`。
- 步骤 1、2 的候选、步骤 3 的新题/类型内/全库兜底都要排除 recentIds 中的题。
- 只有 6.3 第 4 条的“题库过小”极端兜底可以忽略该限制。

### 6.5 box 升降、到期时间、applyAnswer

新题判定：`prev = state.q[id]`；`isNew = !prev || prev.seen === 0`。

`applyAnswer` 返回的 `q[id]`：

| 情况 | 新 box | due |
|---|---|---|
| `ok === false`（任何旧 box，包括新题） | `0` | `0` |
| `ok === true` 且 `isNew`（新题第一次答对） | `2` | `now + intervalsDays[2] * DAY_MS`（3 天） |
| `ok === true` 且 `prev.box === 0` | `1` | `now + intervalsDays[1] * DAY_MS`（1 天） |
| `ok === true` 且 `prev.box === 1` | `2` | `now + intervalsDays[2] * DAY_MS`（3 天） |
| `ok === true` 且 `prev.box === 2` | `3` | `now + intervalsDays[3] * DAY_MS`（7 天） |
| `ok === true` 且 `prev.box === 3` | `4` | `now + intervalsDays[4] * DAY_MS`（21 天） |
| `ok === true` 且 `prev.box === 4` | `5` | `now + intervalsDays[5] * DAY_MS`（60 天） |
| `ok === true` 且 `prev.box === 5` | `5` | `now + intervalsDays[5] * DAY_MS`（60 天，仍不复习） |

同时：

- `seen = (prev?.seen || 0) + 1`
- `wrong = (prev?.wrong || 0) + (ok ? 0 : 1)`
- `lastStep = state.step + 1`（`state.step` 先 +1 再赋值）
- `log.push({ id, type: question.type, ok, step: lastStep })`，并只保留最后 `CONFIG.logLimit` 条。
- `currentId` 原样保留。
- 所有 q 条目与 log 条目都要复制，不能共享可变引用。

### 6.6 复习比例（reviewRatio）

- 取 `window = state.log.slice(-CONFIG.reviewRatioWindow)`。
- 对 window 中第 i 条（id 为 `x`）：
  - `occurrencesFromHere = window 中从 i 到末尾（含）id === x 的条数`（注意：应该在**完整 state.log** 中也一致；因为 window 是末尾，直接用 window 后缀即可）；
  - `seenBefore = (state.q[x]?.seen || 0) - occurrencesFromHere`；
  - `seenBefore > 0` 表示该次作答是“复习题”。
- `reviewRatio = reviewCount / window.length`（window 为空时 = 0）。
- 该定义不需要在 log 里额外存 review 标志。
- 注意：`q[x].seen` 是当前累计次数，包含该条之后的所有作答；因为 log 只截到当前，`seenBefore` 的重建是精确的。

### 6.7 掌握度公式

对每个活跃类型 `t`：

- 从 `state.log` **末尾往前**遍历，只处理 `entry.type === t` 且 bank 中能找到该 id 的条目；
- `laterSameType` 初始 0；对每条：
  - `w = Math.pow(CONFIG.decay, laterSameType)`；
  - 若该题 `ai === true`，`w *= CONFIG.aiWeight`（0.5）；
  - `num += w * (entry.ok ? 1 : 0)`；`den += w`；
  - `laterSameType += 1`；
- `m = (CONFIG.priorCorrect + num) / (CONFIG.priorTotal + den)`。
- 没有任何该类型记录时 `m = 2/4 = 0.5`。
- `typeMastery` 返回该公式的结果；`nextQuestion` 的类型优先级也用它（不得另写一套）。

### 6.8 随机数

- selector 内部**只能**用传入的 `rng`，不得调用 `Math.random()`。
- 调用次数约定（便于测试固定 rng）：
  - 步骤 1 review 选中：0 次；
  - 冷启动选类型：0 次；
  - softmax 选类型：1 次；
  - 新题随机选一道：1 次；
  - 其余排序/兜底：0 次。
- 均匀取整：`Math.min(len - 1, Math.floor(rng() * len))`。

## 7. 构建脚本（`scripts/build-web.mjs`）

- 输出每题 `{ id, q, options, answer, type, ai }`，其中 `ai = item.answerSource === "ai"`。
- 校验 `type` 必须属于 `TYPE_ORDER`，否则报错退出，错误信息格式沿用现有 `data/xxx.json 第 N 条（题号 M）：...`。
- **单一来源**：`TYPE_ORDER` 从 `src/selector.js` 取得（用 `createRequire(import.meta.url)`），不要复制一份；若 selector 尚不存在/加载失败，给出清晰错误。
- 构建成功时打印全部 8 类的题数（类型名 + 数量），并打印总数。
- 保留原有校验（q/options/answer/ID 唯一）与 `www/` 生成逻辑；`questions.js` 仍是 `window.QUESTION_BANK = [...]`。
- 构建会复制 `src/` 全部文件到 `www/`，因此 `src/selector.js` 会出现在 `www/selector.js`。

## 8. 应用接入（`src/app.js`）

### 8.1 加载 selector

- **不要修改 `src/index.html`**。
- app.js 先创建 `<script src="selector.js">` 插入 `document.head`，`onload` 后再执行应用初始化；`onerror` 时显示“题库加载失败”并 `console.error`。
- 初始化时读取 `window.AstroSelector`；缺失则报错退出。
- 启动时校验题库每道题：`typeof id/q/options/answer` 合法、`type` 在 `TYPE_ORDER`、`typeof ai === "boolean"`。任一不满足：`console.error` 并显示“题库加载失败”，不要静默通过。

### 8.2 状态与迁移

- v3 key：`astroQuizState.v3`；v2 key：`astroQuizState.v2`；v1 key：`astroQuizState.v1`。
- **保留 v1、v2 数据，绝不删除/覆盖它们**。
- 启动顺序：
  1. v3 存在且合法 → 使用；
  2. 否则 v2 存在且结构可用 → 迁移到 v3；
  3. 否则 v1 存在且结构可用 → 迁移到 v3；
  4. 否则新建空 v3。
- v3 合法性至少检查：`currentId` 在 bank、`step` 非负整数、`q`/`log` 结构合法（字段类型、box 范围用 `CONFIG.intervalsDays.length - 1` 派生、log 上限用 `CONFIG.logLimit`、log 的 id 在 bank；**box 0 的 `due` 必须为 0，box>0 的 `due` 必须 >0**）。不得把 5、500 等派生值硬编码。
- 迁移容错：v2 迁移抛异常时仍要尝试 v1；分别 try/catch，不能因 v2 异常直接跳过 v1 并清空。
- v2 迁移：`{currentId, answers:[{id,choice}]}`。用同一 `now = Date.now()`：
  - 从空 v3 开始，按 answers 顺序对每题调用 `applyAnswer(emptyState, bankItem, choice === answer, now)`；
  - 迁移后 `currentId = v2.currentId`（若合法），否则 `nextQuestion`；
  - v2 原对象保留在 localStorage。
- v1 迁移：`{order, index, answers}`；`currentId = order[index]`（若合法），answers 同样逐条迁移；v1 数据保留。
- 迁移后的 step = 旧 answers 数量；log 按旧顺序；q 的 due 用迁移时的 now 计算。
- 迁移后立即写 v3。

### 8.3 作答流程（界面/交互不变）

```js
const item = currentQuestion();
const now = Date.now();
const ok = choice === item.answer;
let next = S.applyAnswer(state, item, ok, now);
next.currentId = S.nextQuestion(bank, next, now, Math.random);
state = next;
saveState();        // 先保存（含下一题 currentId）
showFeedback(item.answer, choice);
// 600ms 反馈 → 150ms 淡出 → render() → 150ms 淡入 → 解锁
```

- 保留 600ms 反馈、150ms 淡出/淡入、锁定点击、键盘 A/B/C/D 与 1–4。
- **界面不增加任何元素/文字**；不显示进度、统计、类型、box。
- 动态加载 selector 期间可以没有题目文本，但不要新增加载提示文字。

## 9. 单元测试（`qa/selector.test.mjs`，C 负责）

- 使用 Node 内置 `node:test` + `node:assert/strict`，运行方式：`node qa/selector.test.mjs`，失败退出码非 0。
- 必须覆盖：
  1. box 升降与 due：
     - 新题答错 → box0/due=0；
     - 新题答对 → box2，due = now+3d；
     - box0 答对 → box1，due=now+1d；
     - box1 答对 → box2，due=now+3d；
     - box2→3（7d）、box3→4（21d）、box4→5（60d）；
     - 任意 box 答错 → box0/due=0；box5 答对保持 5。
     - `step`、`seen`、`wrong`、`lastStep`、log 裁剪（>500）正确。
  2. 到期复习：box0 `step >= lastStep+5` 才到期；box1+ `now >= due`；box5 不复习；有到期题且复习比例 <0.4 时优先返回到期题。
  3. 冷启动：空状态连续 16 次 `nextQuestion`（自行用返回题构造 applyAnswer 推进），类型序列为 8 类各 2 题（按 TYPE_ORDER）。
  4. 同类型连续限制：构造 log 尾部 3 条同类型，`nextQuestion` 返回的题不应属于该类型（题库足够时）。
  5. 最近 10 题排除：构造最近 10 条 log，返回 id 不在其中。
  6. AI 权重：构造同类型同 ok 的两条答案，一条 ai=true 一条 false，断言 `typeMastery` 的掌握度与手算公式一致，且 AI 正确答案贡献约为非 AI 的一半。
  7. 空状态/部分状态：空 bank 返回 `{}`（typeMastery）；空 state 的 `nextQuestion` 返回有效 id；applyAnswer 不修改入参（可用 `structuredClone` 比较）；部分 q/log 不影响其他条目。
- 测试必须通过 `CONFIG`/`TYPE_ORDER` 导入；但**必须额外增加一个“契约常量”测试**：用 CONTRACT §2 的字面值 deepEqual `CONFIG`（这一处允许字面值重复），并用 CONTRACT §1 的字面顺序 deepEqual `TYPE_ORDER`。否则参数/类型顺序被改坏时单测仍会假绿。
- 必须增加一个**确定性 priority/softmax 测试**：构造两类（share/typeCount 不同），固定 rng，断言 `nextQuestion` 选中的类型符合手算 softmax/优先级；并验证改 `CONFIG.exploreCoef`（临时副本）会改变选择结果，防止公式参数没被使用。
- 必须增加 applyAnswer 对 `now=NaN/Infinity/undefined` 抛 TypeError 的测试。
- 不要修改 `src/selector.js`；发现 selector bug 发消息给协调者（B 修）。

## 10. 模拟（`scripts/simulate.mjs`，D 负责）

- 读取 `data/index.json` 与题库 JSON 构造 bank（`{id,q,options,answer,type,ai}`），不依赖 `www/`；校验 type/ai。
- 固定随机种子，可重复：同一 seed 输出完全一致。
  - 建议实现 mulberry32：
    ```js
    function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    ```
  - 选题 rng 与答题对错 rng 使用两个独立种子流，记录 seed 到报告。
- 每个场景 1000 题；`now = Date.UTC(2026, 0, 1) + i * 3600_000`（每题推进 1 小时，让天级间隔能触发）。报告写“每场景从空状态开始”，不要写“每步从空状态开始”。
- 每步：`id = nextQuestion(bank, state, now, selectRng)`；`item = bankById[id]`；`ok = answerRng() < 该场景该类型的正确率`；`state = applyAnswer(state, item, ok, now)`；`state.currentId = id`。
- 场景（正确率 p）：
  1. **偏科**：恒星与星座 0.90，星系与宇宙 0.25，其他 0.60；
  2. **全能**：全部 0.80；
  3. **新手**：全部 0.25；
  4. **进步**：天象与时间历法 `p = min(0.90, 0.30 + 0.60 * (该类型已作答数 / 60))`；其他类型 0.60。
- 报告 `qa/simulation.md` 至少包含每个场景：
  - 各类型出题占比：第 1–200、201–800、801–1000 三段；
  - 总正确率随时间变化（建议每 100 题一段，10 段）；
  - “已见题占比”（作答前该 id 的 seen>0 的比例，报告中请用这个名称，避免与 §6.1 的局部 reviewRatio 混淆；可附加“到期复习步占比/局部 reviewRatio 分布”作为补充）；
  - 覆盖率（做过的不同题数 / 485）。
  - 全局：场景正确率、最大同类型连击、连续相同题次数、无效 id 次数。
- 断言（失败 → `process.exit(1)`）：
  1. 场景 1：星系与宇宙总出题占比 > 2 × 其自然占比；恒星与星座总出题占比 < 其自然占比；阈值必须从 bank 的 `galaxyNatural/starNatural` 计算，不能写死 8.25%/21.03%，打印时再显示数值；
  2. 场景 4：天象与时间历法的第 1–200 题占比 > 第 801–1000 题占比，且差值 ≥ 2 个百分点（只要求验证“随进步回落”的趋势，用户原需求未规定具体幅度）；
  3. 所有场景：连续相同题次数 = 0；同一类型连续 > 3 次 = 0（阈值/统计窗口用 `CONFIG.maxSameTypeStreak`，不得写死 3）；`nextQuestion` 无效/异常 = 0；
  4. 运行 4 个场景全程不得抛异常。
- 报告末尾打印/写入断言 PASS/FAIL 清单与 seed。
- 协调者会运行 `node scripts/simulate.mjs` 复核。

## 11. 验收（`qa/verify.mjs`，G 负责）

- 等待 app 动态加载 selector 完成（例如轮询 `#question` 文本非空 / localStorage v3 出现，最多 5 秒）。
- 去掉“纯随机”断言；保留/更新：
  - 布局、无进度 UI、4 选项、长题换行、无横向溢出、对错反馈、防连点、键盘（可保留）、console/网络错误、www 无外部 URL；
  - 作答后 v3 `q[id]` 存在且 `log` 最后一条匹配（id/type/ok/step），`currentId` 变化；
  - v1→v3、v2→v3 迁移检查，且迁移后 v1/v2 key 仍在；
  - 最近 10 题不重复选择（可从 log 验证连续题不相同；自适应算法细节由单测/模拟覆盖）。
- 重新生成 `qa/report.md` 与两个视口的截图（文件名沿用现有，例如 `360x640-initial.png` 等）。
- 更新 `README.md`：自适应规则、CONFIG 每个参数含义、如何运行模拟/测试。

## 12. 交付与提交（协调者）

- 全部验证通过后由协调者按 4 次本地提交：
  1. 构建字段（`scripts/build-web.mjs`）；
  2. 选择器模块与测试（`src/selector.js`、`qa/selector.test.mjs`、`qa/CONTRACT.md`）；
  3. 应用接入和迁移（`src/app.js`）；
  4. 模拟与验收文档（`scripts/simulate.mjs`、`qa/simulation.md`、`qa/verify.mjs`、`qa/report.md`、`qa/*.png`、`README.md`）。
- **不要 push**。
