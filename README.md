# 天文知识竞赛 · 离线刷题应用

一个纯前端（HTML / CSS / JavaScript）的天文知识竞赛刷题应用，使用 Capacitor 8 打包成离线 Android APK。

- 题库：2009–2020 年共 12 个文件、485 道题
- 模式：**无限刷题**，没有进度条、没有题号进度，界面只有题目和 4 个选项
- 交互：点击选项后先显示约 0.6 秒对错反馈（正确项绿、选错项红），再随机抽下一题
- 出题：每次作答后从全部 485 道题里随机抽下一题（避免连续两题相同），可以一直刷下去
- 续做：当前题目与作答记录保存在 `localStorage`，关闭应用再打开会从上次位置继续
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
│   └── app.js
├── scripts/
│   ├── build-web.mjs         # 构建脚本：校验 data/ 并生成 www/
│   └── generate-assets.py    # 用 PIL 绘制图标 / 启动页原图
├── assets/                   # 图标、启动页原图（@capacitor/assets 的输入）
├── www/                      # 构建产物（自动生成，已 gitignore）
├── android/                  # Capacitor Android 原生工程（提交到 git）
├── qa/                       # Playwright 验收脚本、报告与截图
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
  "answerSource": "ai"
}
```

- `no`：原卷题号，与年份组成唯一 ID，例如 `2014-12`
- `answer`：正确选项下标，0=A、1=B、2=C、3=D
- `answerSource`：可选；值为 `"ai"` 表示答案为 AI 给出（本应用的最小版本不展示该信息）

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

除 Capacitor 核心包和 Android 平台外，**没有引入任何 Capacitor 插件**。

### 无限刷题规则

- 界面上没有进度条，也没有「第 N / 485 题」这类题号进度。
- 每次作答后从全部 485 道题中随机抽下一题，并且不会连续两题抽到同一道。
- 没有轮次和终点，可以一直刷；同一道题可能在之后的随机中再次出现。

### 进度保存

- `localStorage` key：`astroQuizState.v2`
- 保存内容：`{ currentId: 当前题目 ID, answers: [{ id, choice }...] }`
- 每道题 ID 为「年份-题号」，例如 `2014-12`
- 每次作答先落盘（作答记录 + 随机出的下一题），再播放反馈/切题动画，因此过程中退出也不会丢进度
- 从旧版 `astroQuizState.v1`（`order` / `index` / `answers`）升级时，会自动迁移到 v2，保留当前题与作答记录
- 题库变更导致保存的题目 ID 失效时，会自动随机一道新题开始

### 答题对错反馈

- 点击选项后先停留约 **600ms**：正确选项变绿；选错时选中项变红，同时正确项变绿。
- 随后约 150ms 淡出、换下一题再淡入；反馈与切换期间不响应点击，快速连点不会连跳两题。
- 不显示题目出处，也不显示「答案由 AI 给出」的提示。

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

`qa/` 下有本机 Chromium + Playwright 的验收脚本、报告和截图：

- `qa/verify.mjs`：用 file:// 打开 `www/index.html`，在 360×640、412×915 两个视口下验证无限随机抽题、无进度 UI、对错反馈、断点续做、旧版状态迁移、防连点、长题换行、无横向溢出、无 console 错误等
- `qa/report.md`：断言结果与截图清单
- `qa/*.png`：两个视口各 9 张截图（initial / feedback / feedback-wrong / feedback-correct / after-answer / resume / long-question / long-stem / double-click）

运行脚本需要本机已有 playwright-core 与 Chromium（脚本里使用了本机路径，仅用于开发验收，不是应用运行依赖）：

```bash
node qa/verify.mjs
```

## 未实现的功能

以下可选功能未实现：

- 题目出处、AI 答案提示
- 按年份选题、错题重练、统计正确率

## 已知限制

- 没有在真机或模拟器上运行过（本机无模拟器设备），系统栏 / 启动页 / 返回键等原生表现需要真机确认
- 超长题目在 360×640 小屏上需要上下滚动才能看全选项（文字会正常换行，不会横向溢出）
- 无限模式是独立随机抽题，不是「所有题过一遍」；同一道题可能在若干题后再次出现（只保证不连续重复）
