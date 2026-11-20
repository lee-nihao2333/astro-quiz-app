# 天文知识竞赛 · 离线刷题应用

一个纯前端（HTML / CSS / JavaScript）的天文知识竞赛刷题应用，使用 Capacitor 8 打包成离线 Android APK。

- 题库：2009–2020 年共 12 个文件、485 道题
- 模式：**自适应刷题 + 每日目标**。题目上方显示「今日目标」进度条（答对 0 / 10），达标后自动进入**自由刷题**（隐藏进度条，可继续无限刷题）
- 每日目标：每天需答对 **10** 道题，答错不推进；完成时手机震动一下并播放彩带 + 发光特效；第二天自动从 0 / 10 重新开始
- 交互：点击选项后先显示约 0.6 秒对错反馈（正确项绿、选错项红）；答对自动进入下一题，答错展示该题解析并轻触继续
- 出题：按 Leitner 到期复习 + 掌握度 + 类型优先级 softmax 自适应选题；同一类型最多连续 3 题，最近 10 题不重复
- 续做：当前题目与作答记录保存在 `localStorage`（v3），关闭应用再打开会从上次位置继续；v1 / v2 旧数据自动迁移且原数据保留
- 离线：所有资源都在本地，不引用 CDN、网络字体或任何外部 URL

## 项目结构

```
.
├── data/                     # 题库源数据（只读）
│   ├── index.json            # 题库文件列表（按年份）
│   ├── 2009.json … 2020.json # 每份题库（485 题）
│   ├── *.pdf                 # 原始试卷，仅作资料，不参与打包
│   └── conversion-report.md  # 题库转换报告，不参与打包
├── src/                      # 网页源码（唯一前端源码目录）
│   ├── index.html
│   ├── style.css
│   ├── app.js                # 界面、作答流程、每日目标界面、v3 状态与旧版迁移
│   ├── daily.js              # 每日目标纯函数模块（零依赖 UMD，浏览器/Node 双用）
│   └── selector.js           # 自适应出题选择器（零依赖 UMD，浏览器/Node 双用）
├── scripts/
│   ├── build-web.mjs         # 构建脚本：校验 data/ 并生成 www/
│   ├── simulate.mjs          # 自适应算法四场景模拟，生成 qa/simulation.md
│   └── generate-assets.py    # 用 PIL 绘制图标 / 启动页原图
├── assets/                   # 图标、启动页原图（@capacitor/assets 的输入）
├── www/                      # 构建产物（自动生成，已 gitignore）
├── android/                  # Capacitor Android 原生工程（提交到 git）
├── qa/                       # 接口契约、单元测试、模拟/验收脚本、报告与截图
│   ├── CONTRACT.md           # 自适应出题算法接口契约
│   ├── selector.test.mjs     # 选择器单元测试（node:test）
│   ├── daily.test.mjs        # 每日目标模块单元测试（node:test）
│   ├── simulation.md         # 四场景模拟报告（scripts/simulate.mjs 生成）
│   ├── verify.mjs            # Playwright Web 验收脚本
│   ├── report.md             # Web 验收报告
│   └── *.png                 # 两个视口的验收截图
├── dist/                     # APK 输出目录（已 gitignore）
├── capacitor.config.json
└── package.json
```

题目数据格式（`data/<年份>.json`）：

```json
{
  "no": 12,
  "q": "题干",
  "options": ["A选项", "B选项", "C选项", "D选项"],
  "answer": 1,
  "type": "恒星与星座",
  "explain": "1609年伽利略把望远镜指向天空观测天体，……故选 **C**。",
  "answerSource": "ai"
}
```

- `no`：原卷题号，与年份组成唯一 ID，例如 `2014-12`
- `answer`：正确选项下标，0=A、1=B、2=C、3=D
- `type`：必填，必须是选择器 `TYPE_ORDER` 的 8 类之一（构建时校验）
- `explain`：必填，单行中文解析；用户答错时展示，支持少量 `**加粗**` 标记
- `answerSource`：可选；值为 `"ai"` 表示答案为 AI 给出。构建后每题带 `ai` 布尔字段，算法中 AI 答案权重为 0.5（界面不展示该信息）

## 环境要求

- Node.js **22+**（Capacitor 8 要求）
- JDK **21**
- Android SDK：`platforms;android-36`、`build-tools;36.1.0`（或更新的 36.x）、`platform-tools`
- 首次构建会联网下载 Gradle 8.14.3 和 Android Gradle Plugin 8.13.0 依赖

> 本工程把 Android 各模块的 `buildToolsVersion` 固定为 `36.1.0`（见 `android/build.gradle` 的 `subprojects` 覆盖与 `android/app/build.gradle`），因为 AGP 8.13 默认会找 35.0.0。如果本机没有 36.1.0，请安装该版本，或把这几处改成自己已安装的 build-tools 版本。

Android SDK 路径的配置方式（二选一）：

1. 设置环境变量 `ANDROID_HOME` / `ANDROID_SDK_ROOT`；
2. 在 `android/local.properties` 写入（该文件已在 `.gitignore` 中，不要提交）：
   ```properties
   sdk.dir=/path/to/Android/Sdk
   ```

## 常用命令

```bash
npm install        # 安装依赖

npm run build      # 只构建网页：校验 data/ → 生成 www/
npm run sync       # npm run build + npx cap sync android
npm run apk        # npm run sync + Gradle assembleDebug + 复制 APK 到 dist/
```

`npm run apk` 成功后产物位于：

```
dist/astro-quiz-debug.apk
```

构建出的 `www/` 不依赖 fetch，**直接用浏览器双击打开 `www/index.html` 也能正常做题**（方便在没有 Android 环境时检查界面）。

> 注意：不要直接双击打开 `src/index.html`。`src/` 只是源码，`questions.js` 是构建时由 `scripts/build-web.mjs` 生成到 `www/` 的；直接打开源码目录里的 `index.html` 会因为缺少 `questions.js` 而显示「题库加载失败」。请先 `npm run build`，再打开 `www/index.html`。

## 如何更新题库

1. 把新的题库 JSON 放到 `data/` 下，文件名使用 4 位年份（如 `2021.json`），格式同上。
2. 把文件名加入 `data/index.json` 数组（按需要的顺序）。
3. 执行 `npm run apk`，重新构建网页并打包 APK。

构建时会逐题校验，任何一条不满足都会报错退出，并指出文件名与题号：

- `q` 是非空字符串；
- `options` 恰好 4 个、都是非空字符串；
- `answer` 是 0–3 之间的整数；
- `type` 属于 `src/selector.js` 的 `TYPE_ORDER`（8 类）；
- `年份-题号`（如 `2014-12`）不重复。

`data/` 里的 PDF 与 `conversion-report.md` 不会被打包：构建只读取 `data/index.json` 中列出的 JSON，APK 里只包含 `src/` 与生成的 `questions.js`。

## 安装 APK 到手机

方式一：把 `dist/astro-quiz-debug.apk` 通过数据线、微信/QQ 文件传输、网盘等传到手机，点击文件安装；首次安装需允许「安装未知来源应用」。

方式二：用 adb（手机开启 USB 调试并连接电脑）：

```bash
adb devices                          # 确认设备已连接
adb install -r dist/astro-quiz-debug.apk
```

- `-r` 表示覆盖安装，会保留应用数据（包括做题进度）。
- 卸载会清除进度：`adb uninstall com.example.astroquiz`。
- `dist/astro-quiz-debug.apk` 使用 Android debug keystore 签名，适合侧载测试，不能直接上架应用商店。

## 应用信息与技术方案

| 项目 | 值 |
| --- | --- |
| 应用名 | 天文知识竞赛 |
| 应用 ID | `com.example.astroquiz` |
| 版本 | 1.0.0（versionCode 1） |
| Capacitor | 8.6.2（`@capacitor/core` / `@capacitor/android` / `@capacitor/cli`） |
| 图标工具 | `@capacitor/assets` 4.0.0（devDependency） |
| `webDir` | `www` |
| 最低 / 目标 SDK | minSdk 24 / targetSdk 36 |
| Gradle / AGP | 8.14.3 / 8.13.0 |
| 出题算法 | `src/selector.js`（零依赖 UMD，浏览器 `window.AstroSelector` / Node `require`） |
| 每日目标 | `src/daily.js`（零依赖 UMD，浏览器 `window.AstroDaily` / Node `require`） |

除 Capacitor 核心包和 Android 平台外，**没有引入任何 Capacitor 插件**。

### 自适应出题规则

界面不展示任何算法信息；每次作答后，`app.js` 调用 `src/selector.js` 的 `nextQuestion()` 选下一题。算法契约与测试见 `qa/CONTRACT.md`、`qa/selector.test.mjs`。

**1. 到期复习优先（Leitner）**

- 每个做过的题有熟练度盒子 `box 0–5`；答错进 box 0，新题答对进 box 2，旧题答对升一级，`box 5` 视为「已掌握」。
- 到期条件：`box 0` 在 `step >= lastStep + 5` 时到期；`box 1–4` 在 `now >= due` 时到期；`box 5` **不参与到期复习**。注意：box 5 只免于「到期复习」，若选中类型内没有新题，第 4 节的类型内排序（`box` 升序，box 5 排最后）仍可能抽到 box 5 的题。
- 只有最近 20 条 `log` 中「复习题」占比 **< 40%** 时，才优先出到期题；多个到期题按 box 0 优先、`lastStep` / `due` 升序、id 字典序选择。
- 这个 **`reviewRatio < 0.4` 是最近 20 条 `log` 窗口的局部 gate**（只决定「本轮允不允许出到期复习题」），**不是全局复习题占比上限**。`qa/simulation.md` 里的「已见题占比」（作答前该 id 的 `seen > 0` 的比例）是另一个口径：1000 题跑 485 题题库时它天然 ≥ 51.5%，不代表复习调度超限。二者不可直接比较。
- 同一类型连续限制同样作用于到期复习：若最近 3 条记录都是同一类型，本轮不复习该类型（宁可暂缓）。

**2. 冷启动**

- 总作答数 `step < 16` 时按 `TYPE_ORDER` 轮转出题：8 个类型各连续 2 题，不做 softmax，也不做同类型连续限制。
- 「每类 2 题」是**尽力而为**：到期复习优先于冷启动（CONTRACT §6.1 的裁决），若前 16 题内出现到期复习，复习题会插入轮转，类型序列随之偏移，某类可能不是 2 题。这是契约允许的行为，不是 bug。

**3. 掌握度与类型优先级（非冷启动）**

- 类型掌握度 `m`（0–1，初始 0.5）：
  `m = (2 + Σ w·ok) / (4 + Σ w)`，其中 `w = 0.95^laterSameType`（同类型越早的记录权重越低）；AI 答案再乘 0.5。
- 类型自然占比 `share = 该类型题数 / 485`。
- 类型优先级：
  `priority = (1-m) × sqrt(share) + 0.3 × sqrt(ln(step+1) / (该类型作答数+1))`
  即「没掌握的类型优先」+「探索得分」。
- 用 softmax（温度 0.15）按优先级抽样；若最近 3 条记录同类型，则从本轮候选中排除该类型。

**4. 类型内选题**

1. 优先在选中类型中随机选一道没做过的新题；
2. 否则在类型内按 `box` 升序 → `lastStep` 升序 → id 升序选一道；
3. 类型内都被最近 10 题排除时，退到全库按 `lastStep` 最小（新题视为 -1）兜底。

> `box 5` 的承诺只有「不参与到期复习」（CONTRACT §3 / §6.1）。类型内没有新题时，上面的 `box` 升序排序（box 5 排最后）或全库兜底仍可能抽到 box 5 的题，这是契约允许的行为。

**5. 防连击 / 防重复**

- `log` 最后 3 条为同一类型时，本次不再出该类型（到期复习同样适用）。
- 每次选下一题都排除最近 10 题；连续作答不会出现相同题。

**CONFIG 参数（`src/selector.js` 导出）**

| 参数 | 默认值 | 含义 |
| --- | --- | --- |
| `coldStartPerType` | `2` | 冷启动时每个类型连续出的题数 |
| `coldStartTotal` | `16` | 冷启动总题数（8 类 × 2） |
| `priorCorrect` | `2` | 掌握度公式的先验答对数 |
| `priorTotal` | `4` | 掌握度公式的先验总分母（2/4 = 初始 0.5） |
| `decay` | `0.95` | 同类型历史作答的衰减系数（越早权重越低） |
| `aiWeight` | `0.5` | `ai === true` 的题作答权重 |
| `exploreCoef` | `0.3` | 类型优先级中探索项的系数 |
| `examWeightPower` | `0.5` | 自然占比的幂次（等价于开平方，用于平衡题型占比） |
| `softmaxTemp` | `0.15` | 类型 softmax 温度，越小越偏向高优先级类型 |
| `maxSameTypeStreak` | `3` | 同一类型最多连续题数 |
| `recentExclude` | `10` | 最近多少题不重复出现 |
| `reviewRatioCap` | `0.4` | 最近窗口内复习题占比上限（严格小于才出复习题） |
| `reviewRatioWindow` | `20` | 计算复习比例的最近记录数 |
| `intervalsDays` | `[0, 1, 3, 7, 21, 60]` | 各 box 的复习间隔天数（下标即 box） |
| `box0Steps` | `5` | box 0 经过多少题后到期 |
| `logLimit` | `500` | `log` 最多保留的作答记录数 |

### 进度保存（v3 状态与迁移）

- `localStorage` key：`astroQuizState.v3`
- 状态结构：
  ```js
  {
    currentId: "2014-12",        // 当前题目 ID
    step: 120,                   // 已作答总数（= log 最后一条 step）
    q: {                         // 只记录做过的题
      "2014-12": {
        seen: 3,                 // 做过的总次数
        wrong: 1,                // 答错次数
        box: 2,                  // Leitner 熟练度 0–5
        lastStep: 118,           // 最近一次作答后的 step
        due: 1763500000000       // 到期时间（ms），box 0 固定为 0
      }
    },
    log: [                       // 最近 500 条，按时间从旧到新
      { id: "2014-12", type: "恒星与星座", ok: true, step: 118 }
    ]
  }
  ```
- 每次作答**先写入 v3（含下一题 `currentId`）**，再播放约 600ms 反馈和淡出/淡入，因此反馈期间退出也不会丢进度。
- 启动顺序：合法 v3 → v2 迁移 → v1 迁移 → 新建空 v3。
  - v2：`{ currentId, answers: [{ id, choice }] }`
  - v1：`{ order, index, answers }`
  - 迁移时按旧 `answers` 顺序逐条调用 `applyAnswer` 重建 `q` / `log` / `step`；迁移后 v1 / v2 的原始 key **保留不删**。
- **已知限制（当前契约零容忍）**：v3 校验要求 `currentId`、`q` 的每个 key、`log` 的每条 `id` 都在当前题库中。题库题目 ID 被修改或删除时，整份 v3 会被判为非法并回退：先尝试 v2 → v1 迁移，都不可用则新建空 v3；这次回退会重置 v3 中的做题进度，但 v1 / v2 原始 key 仍保留。契约目前就是零容忍，不做逐题丢弃/局部修复。
- 每日目标进度是独立 key `astroQuizDaily.v1`，不写入 v3，因此 v3 迁移 / 回退不会影响当天的每日进度；反过来每日进度跨天重置也不影响做题记录。
- `due` 依赖设备本地时间；手动修改系统时间会影响复习到期节奏。

### 答题对错反馈与解析

- 题目下方有一行灰色小字显示类别，例如「类别：恒星与星座」，随题目切换更新。
- 点击选项后先停留约 **600ms**：正确选项变绿；选错时选中项变红，同时正确项变绿。
- **答对**：约 600ms 后自动 150ms 淡出、换下一题再淡入。
- **答错**：选项下方展开该题 `explain` 解析（`**加粗**` 会渲染为加粗，不显示星号）；反馈结束后出现「轻触继续」，**不会自动切题**，点击/轻触任意处或按任意键后继续。这样解析可以按自己的速度读完。
- 解析展示与切换期间不响应作答点击，快速连点不会连跳两题。
- 不显示题目出处，也不显示「答案由 AI 给出」的提示。

### 每日目标与自由刷题

- 每天（以设备**本地日期** 00:00 为界）需要答对 **10** 道题；只有答对推进进度，答错不推进。
- 题目上方显示「今日目标」进度条与 `N / 10` 计数，进度条按答对比例填充。
- 答对第 10 题（即完成当天目标）时：
  - 手机震动一下：优先通过 `MainActivity` 注入的原生桥 `window.AstroNativeVibrate.vibrate(200)` 直接驱动 Android `Vibrator`（APK 已声明 `android.permission.VIBRATE`）；桥不可用时回退 `navigator.vibrate(200)`；
  - 进度条走满并发光，随后播放彩带 + 发光 +「今日目标达成！」全屏特效（约 2 秒，轻触可提前跳过）；
  - 特效结束后进入**自由刷题**：隐藏进度条，只显示一行「今日目标已完成 · 自由刷题」，可继续无限刷题；当天不再重复震动或特效。
- 第二天打开应用（或从后台切回前台）自动重置为 0 / 10，重新显示进度条。
- 完成后关闭应用再打开，当天仍保持自由刷题状态。
- 每日进度单独保存在 `localStorage` key `astroQuizDaily.v1`：

  ```js
  { "day": "2026-11-19", "correct": 10, "completedAt": 1795095318418 }
  ```

  `correct` 最大为 10；`completedAt` 为首次达标时间戳（未达标为 `null`）；`day` 不是今天时自动重置为 0 / 10。
- 每日目标与自适应出题互不影响：`astroQuizState.v3`（当前题目与复习状态）逻辑保持不变。
- 桌面浏览器没有可用的震动 API 时静默跳过，进度条与特效照常工作。

### 手机适配要点

- 触屏设备不启用 hover 效果（`@media (hover: hover)` 包裹），避免点完后同位置按钮一直高亮
- 反馈 + 切题动画约 900ms 内锁定点击，快速连点不会连跳两题
- `user-scalable=no` + `touch-action: pan-x pan-y` 禁止双指/双击缩放；禁用长按选中和点击高亮闪烁
- 使用 `viewport-fit=cover` + `env(safe-area-inset-*)` / Capacitor 8 SystemBars 注入的 `--safe-area-inset-*` 适配刘海和底部手势条
- Android 15+ 强制全面屏（edge-to-edge）：原生 `MainActivity` 调用 `EdgeToEdge.enable(...)`，`capacitor.config.json` 配置 `SystemBars.insetsHandling: "css"` 与深色样式；系统栏、导航栏、启动页背景均为深色 `#0b0f1e`
- 按 Android 返回键直接退出应用（单 Activity，无页面历史）

## 图标与启动页

原图由 `scripts/generate-assets.py` 用 Python + Pillow 全程序绘制（无外部素材 / 字体）：

- `assets/icon.png`：1024×1024 图标原图
- `assets/splash.png`：2732×2732 启动页原图
- `assets/splash-logo.png`：1024×1024 透明居中 logo，供 Android 启动页使用
- 另有 `@capacitor/assets` 自定义模式所需的 `icon-only.png`、`icon-foreground.png`、`icon-background.png`、`splash-dark.png`

重新生成 Android 各尺寸资源（需先有 `android/` 工程）：

```bash
python3 scripts/generate-assets.py
npx @capacitor/assets generate --android
```

第一条命令会生成 `assets/` 下的原图，并同步 `android/.../res/drawable-nodpi/splash_background.png` 与 `drawable-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/splash_logo.png`；第二条会生成各密度 `mipmap-*/ic_launcher*.png`、自适应图标 XML（`mipmap-anydpi-v26/`）以及 `drawable*/splash.png`。

> 启动页不使用工具生成的 `drawable*/splash.png`：方形原图被拉到不同屏幕比例时圆形行星会被压扁。启动页改用 `res/drawable/launch_background.xml`（星空底图铺满 + 居中 logo 按原像素显示、不缩放）；Android 12+ 的系统启动画面也使用同一个 `splash_logo`，因此在任何屏幕比例下主体都不会变形。

## 验收与测试

自适应算法的测试分三层：

```bash
# 1. 选择器单元测试（node:test，覆盖 box/due、到期复习、冷启动、连击、最近 10、AI 权重、不可变性）
node qa/selector.test.mjs

# 2. 每日目标单元测试（node:test，覆盖 10 题目标、只统计答对、跨天重置、完成态、不可变性）
node qa/daily.test.mjs

# 3. 四场景模拟（固定种子 20260101，可重复；生成 qa/simulation.md）
node scripts/simulate.mjs
# 也可指定种子：node scripts/simulate.mjs 12345

# 4. Web 端浏览器验收（先构建，再用 file:// 打开 www/index.html）
npm run build
node qa/verify.mjs
```

- `qa/verify.mjs` 使用本机 Chromium + `playwright-core`，在 **360×640 / 412×915** 两个视口下验证：
  - 等待 app 动态加载 `selector.js` 就绪（`#question` 非空 + v3 出现，最长 5 秒）；
  - 485 题、每日目标进度条（独立全新 context 为初始 0 / 10；两个视口回归注入当天已完成状态，进度条隐藏）、题目下方类别灰色小字（内容/字号/颜色/切题更新）、4 选项、长题干/长选项换行、无横向溢出、内容最多题可滚动到底；
  - 对错反馈（答对绿色自动切题；答错红色 + `explain` 解析 + 轻触继续）、防连点、键盘 A–D / 1–4；
  - 作答后 v3 的 `step / currentId / q[oldId] / log` 正确，且反馈期间已保存下一题；
  - 刷新续做、v2 → v3、v1 → v3 迁移（v1/v2 原 key 保留）、最近 10 题排除；
  - 冷启动类型序列（空状态连续 16 题全部答对时 = `TYPE_ORDER` 每类 2 题）与 v3 零容忍回退（v3 含题库外 id → 整份状态丢弃并按 v2/v1/空状态回退）；
  - **每日目标 / 自由刷题**：初始 0 / 10、先答错不推进 / 前 9 道只推进进度、第 10 道完成、刷新保持、跨天重置（刷新 + 前台跨午夜 + 特效播放期间跨午夜）；答对第 10 题触发一次震动（有原生桥时记录 `AstroNativeVibrate.vibrate(200)`、无桥时记录 `navigator.vibrate(200)`）、全屏特效与彩带、特效结束后隐藏进度条进入自由刷题、自由刷题继续作答不再震动/弹特效、刷新后保持自由刷题；
  - console / pageerror / 请求失败为 0、`www/` 无外部 URL。
  - 浏览器验收**不做纯随机断言**；掌握度、softmax、Leitner 到期等细节由单元测试与模拟覆盖。
- `qa/report.md`：最新一次验收的断言明细、截图清单与限制说明。
- `qa/*.png`：两个视口各 9 张截图（initial 为回归上下文中已注入当天完成状态后的自由刷题界面 / feedback / feedback-wrong（含解析）/ feedback-correct / after-answer / resume / long-question / long-stem / double-click），另有每日目标流程 2 张（`daily-goal-celebration.png`、`daily-goal-free-mode.png`）。
- `qa/simulation.md`：四场景模拟报告（偏科 / 全能 / 新手 / 进步），含类型占比、正确率、复习占比、覆盖率与断言结果。

运行浏览器验收需要本机已有 `playwright-core` 与 Chromium（它们只是开发验收依赖，不是应用运行依赖）。脚本会按常见路径回退，也可用环境变量指定：

```bash
PLAYWRIGHT_CORE_PATH=/path/to/playwright-core \
CHROMIUM_PATH=/path/to/chrome \
node qa/verify.mjs
```

## 未实现的功能

以下可选功能未实现：

- 题目出处、AI 答案提示
- 按年份选题、手动错题本、正确率统计页
- 账号 / 云同步（进度只在本机 `localStorage`）

## 已知限制

- 没有在真机或模拟器上运行过（本机无模拟器设备），系统栏 / 启动页 / 返回键等原生表现需要真机确认
- **震动与完成特效未在真机 Android WebView 上验证**：`navigator.vibrate` 在 Android 上会受静音模式 / 用户手势 / WebView 版本影响，失败时可能静默（Blink 仍可能返回 `true`），所以已改为原生桥 `AstroNativeVibrate` 优先（APK 已声明 `android.permission.VIBRATE`），并保留 `navigator.vibrate` 兜底；真机震动强度、静音模式 / 勿扰模式下的实际表现仍需真机确认
- 每日目标按**设备本地日期**重置；手动修改系统日期 / 时区会直接影响跨天重置时机
- 每日目标完成后当天一直是自由刷题状态，第二天才重新出现进度条；没有「跳过今日目标」「手动重新挑战」等入口
- 每日进度与做题进度都依赖 `localStorage`；隐私模式 / 存储被禁用 / 配额已满时写入会被静默忽略，本次运行仍可推进，但刷新后可能回退到上次成功保存的状态
- 超长题目在 360×640 小屏上需要上下滚动才能看全选项（文字会正常换行，不会横向溢出）
- 自适应出题是「按算法调度」而不是把所有题过一遍；同一道题会在到期后再次出现，最近 10 题内不会重复
- 冷启动「每类 2 题」是**尽力而为**：到期复习优先，前 16 题内出现到期复习时类型轮转可能偏移（CONTRACT 已裁决，不是 bug）
- `reviewRatio < 0.4` 只是最近 20 条 `log` 窗口的局部复习 gate，不是全局复习题占比上限；`qa/simulation.md` 的「已见题占比」是另一个口径，二者不可直接比较
- `box 5` 只表示「不参与到期复习」；类型内没有新题时，类型内排序 / 全库兜底仍可能抽到 box 5 的题（契约允许）
- **题库题目 ID 变更/删除会导致整份 v3 校验失败并回退**（当前按契约零容忍）：v3 判非法后按 v2 → v1 → 空状态回退，v3 中的做题进度可能被重置；v1 / v2 原始数据保留
- 复习到期时间依赖设备本地时间；手动改系统时间会影响复习节奏
- `log` 最多保留 500 条；`q` 会保留所有做过的题的累计统计
- 浏览器验收只覆盖桌面无头 Chromium 的 file:// 环境；真机 Android WebView / safe-area / 震动的表现需真机确认
