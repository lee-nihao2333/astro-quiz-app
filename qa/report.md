# Web 端验收报告（qa/verify.mjs）

- 生成时间：2026-11-17T08:36:32.718Z
- 被测页面：`/home/marvin/astro-quiz-app/www/index.html`（file:// 打开，未启动服务器）
- 浏览器：Chromium 156.0.8078.4（playwright-core 1.49.0）
- 视口：360×640、412×915（deviceScaleFactor=1，isMobile+hasTouch）
- git HEAD：91fb0af
- 结论：**全部通过**（共 123 条断言，通过 123）

## 断言明细

| # | 断言 ID | 描述 | 期望 | 实际 | 结果 |
|---|---|---|---|---|---|
| 1 | global/www-no-external-url | www/ 内无任何 http(s) 外部 URL | 0 处 | 0 处 | PASS |
| 2 | global/www-index-exists | www/index.html 存在 | true | true | PASS |
| 3 | global/www-questions-exists | www/questions.js 存在 | true | true | PASS |
| 4 | 360x640/bank-length | window.QUESTION_BANK.length | 485 | 485 | PASS |
| 5 | 360x640/progress-format | 初始进度文本 | 第 1 / 485 题 | 第 1 / 485 题 | PASS |
| 6 | 360x640/progress-parse | 初始题号解析 | 1 | 1 | PASS |
| 7 | 360x640/option-count | 选项按钮数量 | 4 | 4 | PASS |
| 8 | 360x640/option-letters | 选项字母 A B C D | A,B,C,D | A,B,C,D | PASS |
| 9 | 360x640/option-text-nonempty | 4 个选项文字均非空 | true | ["21/P Giacobini-Zinne","38P Stephan-Oterma","46P/Wirtanen","64P/Swift-Gehrels"] | PASS |
| 10 | 360x640/state-initial | 初始 localStorage 状态合法（order 485 唯一 / index 0 / answers=[]） | true | order=485, index=0, answers=0 | PASS |
| 11 | 360x640/initial-no-h-overflow | 初始界面无横向溢出 | true | scrollWidth=360, innerWidth=360, overflow=0px | PASS |
| 12 | 360x640/shot-initial-size | 初始截图尺寸 | 360x640 | 360x640 | PASS |
| 13 | 360x640/feedback-progress | 反馈期间仍停留在当前题 | 第 1 / 485 题 | 第 1 / 485 题 | PASS |
| 14 | 360x640/feedback-correct-marked | 反馈：正确项被标记为绿色（.correct） | [2] | [2] | PASS |
| 15 | 360x640/feedback-wrong-marked | 反馈：选错时选中项被标记为红色（.wrong） | [0] | [0] | PASS |
| 16 | 360x640/shot-feedback-size | 反馈截图尺寸 | 360x640 | 360x640 | PASS |
| 17 | 360x640/after-answer-progress | 点击选项后进度前进 1 题 | 第 2 / 485 题 | 第 2 / 485 题 | PASS |
| 18 | 360x640/after-answer-index | 选择题号解析 | 2 | 2 | PASS |
| 19 | 360x640/after-answer-question-changed | 换到下一题（题干变化） | true | 天蝎座 α 心宿二的亮度是 1 等，天王星的亮度比它暗 10 | PASS |
| 20 | 360x640/after-answer-state | 作答落盘（index=1 / answers 1 条 / 记录 choice=0） | true | index=1, answers=[{"id":"2019-21","choice":0}] | PASS |
| 21 | 360x640/after-answer-fade-cleared | 淡入淡出结束（fade class 移除） | true | class=false | PASS |
| 22 | 360x640/after-answer-option-count | 换题后选项按钮数量 | 4 | 4 | PASS |
| 23 | 360x640/shot-after-answer-size | 作答后截图尺寸 | 360x640 | 360x640 | PASS |
| 24 | 360x640/resume-progress | 刷新后恢复进度 | 第 2 / 485 题 | 第 2 / 485 题 | PASS |
| 25 | 360x640/resume-question | 刷新后恢复同一道题（下一道未答题） | 天蝎座 α 心宿二的亮度是 1 等，天王星的亮度比它暗 100 倍，天王星是______。 | 天蝎座 α 心宿二的亮度是 1 等，天王星的亮度比它暗 100 倍，天王星是______。 | PASS |
| 26 | 360x640/resume-state | 刷新后 localStorage 仍为 index=1 / answers=1 | true | index=1, answers=1 | PASS |
| 27 | 360x640/resume-no-h-overflow | 刷新后无横向溢出 | true | overflow=0px | PASS |
| 28 | 360x640/resume-option-count | 刷新后选项按钮数量 | 4 | 4 | PASS |
| 29 | 360x640/shot-resume-size | 续做截图尺寸 | 360x640 | 360x640 | PASS |
| 30 | 360x640/feedback-wrong-case-correct-marked | 确定性选错：正确项标绿 | [2] | [2] | PASS |
| 31 | 360x640/feedback-wrong-case-selected-marked | 确定性选错：选中项标红 | [0] | [0] | PASS |
| 32 | 360x640/shot-feedback-wrong-size | 选错反馈截图尺寸 | 360x640 | 360x640 | PASS |
| 33 | 360x640/feedback-wrong-case-next | 反馈结束后进入下一题 | 第 2 / 485 题 | 第 2 / 485 题 | PASS |
| 34 | 360x640/feedback-right-case-correct-marked | 确定性选对：选中项标绿 | [0] | [0] | PASS |
| 35 | 360x640/feedback-right-case-no-wrong | 确定性选对：没有红色标记 | [] | [] | PASS |
| 36 | 360x640/shot-feedback-correct-size | 选对反馈截图尺寸 | 360x640 | 360x640 | PASS |
| 37 | 360x640/feedback-right-case-next | 反馈结束后进入下一题 | 第 2 / 485 题 | 第 2 / 485 题 | PASS |
| 38 | 360x640/long-opt-question | 长题场景定位到目标题 | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | PASS |
| 39 | 360x640/long-opt-h-overflow | 长题（题干+选项最长）文档无横向溢出 | true | scrollWidth=360, innerWidth=360, overflow=0px | PASS |
| 40 | 360x640/long-opt-question-wrap | 长题题干发生换行（行数 ≥ 2） | true | lines=4 (byHeight=4, byRange=4) | PASS |
| 41 | 360x640/long-opt-option-wrap | 长选项文字发生换行（≥1 个选项行数 ≥ 2） | true | 换行选项数=4, 各选项行数=[6,6,5,5] | PASS |
| 42 | 360x640/long-opt-option-no-overflow | 选项文字无横向溢出（scrollWidth ≤ clientWidth） | true | 各选项溢出=[0,0,0,0] | PASS |
| 43 | 360x640/long-opt-question-no-overflow | 题干元素无横向溢出（scrollWidth ≤ clientWidth） | true | overflow=0px | PASS |
| 44 | 360x640/long-opt-option-count | 长题选项按钮数量 | 4 | 4 | PASS |
| 45 | 360x640/shot-long-size | 长题截图尺寸 | 360x640 | 360x640 | PASS |
| 46 | 360x640/long-stem-question | 最长题干场景定位到目标题 | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | PASS |
| 47 | 360x640/long-stem-h-overflow | 最长题干（2017-21）无横向溢出 | true | overflow=0px | PASS |
| 48 | 360x640/long-stem-wrap | 最长题干发生换行（行数 ≥ 3） | true | lines=8 | PASS |
| 49 | 360x640/shot-long-stem-size | 最长题干截图尺寸 | true | 360x640 | PASS |
| 50 | 360x640/tallest-1-top-reachable | 内容最多题 2020-29 顶部未被裁切（quizTop ≥ 0） | true | quizTop=24.0, progressTop=24.0, scrollHeight=929, innerHeight=640 | PASS |
| 51 | 360x640/tallest-1-bottom-reachable | 内容最多题 2020-29 滚动到底后末选项可见（可达） | true | maxScroll=289, lastOptionBottom=616.1, innerHeight=640 | PASS |
| 52 | 360x640/tallest-2-top-reachable | 内容最多题 2017-21 顶部未被裁切（quizTop ≥ 0） | true | quizTop=24.0, progressTop=24.0, scrollHeight=667, innerHeight=640 | PASS |
| 53 | 360x640/tallest-2-bottom-reachable | 内容最多题 2017-21 滚动到底后末选项可见（可达） | true | maxScroll=27, lastOptionBottom=616.0, innerHeight=640 | PASS |
| 54 | 360x640/tallest-3-top-reachable | 内容最多题 2017-37 顶部未被裁切（quizTop ≥ 0） | true | quizTop=26.5, progressTop=26.5, scrollHeight=640, innerHeight=640 | PASS |
| 55 | 360x640/tallest-3-bottom-reachable | 内容最多题 2017-37 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=613.5, innerHeight=640 | PASS |
| 56 | 360x640/double-click-different | 同步连点两个不同选项只前进 1 题 | 1 | 1 | PASS |
| 57 | 360x640/double-click-different-answers | 同步连点不同选项只记录 1 条作答（且为第一次点击的 A） | {"answers":1,"choice":0} | {"answers":1,"choice":0} | PASS |
| 58 | 360x640/double-click-same | 同步连点同一选项两次只前进 1 题 | 2 | 2 | PASS |
| 59 | 360x640/double-click-same-answers | 同步连点同一选项只记录 1 条作答 | 1 | 1 | PASS |
| 60 | 360x640/double-click-50ms | 间隔 50ms 连点两次只前进 1 题 | 3 | 3 | PASS |
| 61 | 360x640/double-click-50ms-answers | 间隔 50ms 连点只记录 1 条作答 | 1 | 1 | PASS |
| 62 | 360x640/shot-double-click-size | 防连点截图尺寸 | true | 360x640 | PASS |
| 63 | 360x640/no-console-errors | 页面无 console error / pageerror / 请求失败 | true | {"console":[],"pageerror":[],"requestfailed":[]} | PASS |
| 64 | 412x915/bank-length | window.QUESTION_BANK.length | 485 | 485 | PASS |
| 65 | 412x915/progress-format | 初始进度文本 | 第 1 / 485 题 | 第 1 / 485 题 | PASS |
| 66 | 412x915/progress-parse | 初始题号解析 | 1 | 1 | PASS |
| 67 | 412x915/option-count | 选项按钮数量 | 4 | 4 | PASS |
| 68 | 412x915/option-letters | 选项字母 A B C D | A,B,C,D | A,B,C,D | PASS |
| 69 | 412x915/option-text-nonempty | 4 个选项文字均非空 | true | ["-53°，7h","-53°，19h","-37°，7h","-37°，19h"] | PASS |
| 70 | 412x915/state-initial | 初始 localStorage 状态合法（order 485 唯一 / index 0 / answers=[]） | true | order=485, index=0, answers=0 | PASS |
| 71 | 412x915/initial-no-h-overflow | 初始界面无横向溢出 | true | scrollWidth=412, innerWidth=412, overflow=0px | PASS |
| 72 | 412x915/shot-initial-size | 初始截图尺寸 | 412x915 | 412x915 | PASS |
| 73 | 412x915/feedback-progress | 反馈期间仍停留在当前题 | 第 1 / 485 题 | 第 1 / 485 题 | PASS |
| 74 | 412x915/feedback-correct-marked | 反馈：正确项被标记为绿色（.correct） | [0] | [0] | PASS |
| 75 | 412x915/feedback-wrong-marked | 反馈：选错时选中项被标记为红色（.wrong） | [] | [] | PASS |
| 76 | 412x915/shot-feedback-size | 反馈截图尺寸 | 412x915 | 412x915 | PASS |
| 77 | 412x915/after-answer-progress | 点击选项后进度前进 1 题 | 第 2 / 485 题 | 第 2 / 485 题 | PASS |
| 78 | 412x915/after-answer-index | 选择题号解析 | 2 | 2 | PASS |
| 79 | 412x915/after-answer-question-changed | 换到下一题（题干变化） | true | 著名的小行星带位于哪两颗行星之间 | PASS |
| 80 | 412x915/after-answer-state | 作答落盘（index=1 / answers 1 条 / 记录 choice=0） | true | index=1, answers=[{"id":"2016-49","choice":0}] | PASS |
| 81 | 412x915/after-answer-fade-cleared | 淡入淡出结束（fade class 移除） | true | class=false | PASS |
| 82 | 412x915/after-answer-option-count | 换题后选项按钮数量 | 4 | 4 | PASS |
| 83 | 412x915/shot-after-answer-size | 作答后截图尺寸 | 412x915 | 412x915 | PASS |
| 84 | 412x915/resume-progress | 刷新后恢复进度 | 第 2 / 485 题 | 第 2 / 485 题 | PASS |
| 85 | 412x915/resume-question | 刷新后恢复同一道题（下一道未答题） | 著名的小行星带位于哪两颗行星之间 | 著名的小行星带位于哪两颗行星之间 | PASS |
| 86 | 412x915/resume-state | 刷新后 localStorage 仍为 index=1 / answers=1 | true | index=1, answers=1 | PASS |
| 87 | 412x915/resume-no-h-overflow | 刷新后无横向溢出 | true | overflow=0px | PASS |
| 88 | 412x915/resume-option-count | 刷新后选项按钮数量 | 4 | 4 | PASS |
| 89 | 412x915/shot-resume-size | 续做截图尺寸 | 412x915 | 412x915 | PASS |
| 90 | 412x915/feedback-wrong-case-correct-marked | 确定性选错：正确项标绿 | [2] | [2] | PASS |
| 91 | 412x915/feedback-wrong-case-selected-marked | 确定性选错：选中项标红 | [0] | [0] | PASS |
| 92 | 412x915/shot-feedback-wrong-size | 选错反馈截图尺寸 | 412x915 | 412x915 | PASS |
| 93 | 412x915/feedback-wrong-case-next | 反馈结束后进入下一题 | 第 2 / 485 题 | 第 2 / 485 题 | PASS |
| 94 | 412x915/feedback-right-case-correct-marked | 确定性选对：选中项标绿 | [0] | [0] | PASS |
| 95 | 412x915/feedback-right-case-no-wrong | 确定性选对：没有红色标记 | [] | [] | PASS |
| 96 | 412x915/shot-feedback-correct-size | 选对反馈截图尺寸 | 412x915 | 412x915 | PASS |
| 97 | 412x915/feedback-right-case-next | 反馈结束后进入下一题 | 第 2 / 485 题 | 第 2 / 485 题 | PASS |
| 98 | 412x915/long-opt-question | 长题场景定位到目标题 | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | PASS |
| 99 | 412x915/long-opt-h-overflow | 长题（题干+选项最长）文档无横向溢出 | true | scrollWidth=412, innerWidth=412, overflow=0px | PASS |
| 100 | 412x915/long-opt-question-wrap | 长题题干发生换行（行数 ≥ 2） | true | lines=4 (byHeight=4, byRange=4) | PASS |
| 101 | 412x915/long-opt-option-wrap | 长选项文字发生换行（≥1 个选项行数 ≥ 2） | true | 换行选项数=4, 各选项行数=[5,5,4,4] | PASS |
| 102 | 412x915/long-opt-option-no-overflow | 选项文字无横向溢出（scrollWidth ≤ clientWidth） | true | 各选项溢出=[0,0,0,0] | PASS |
| 103 | 412x915/long-opt-question-no-overflow | 题干元素无横向溢出（scrollWidth ≤ clientWidth） | true | overflow=0px | PASS |
| 104 | 412x915/long-opt-option-count | 长题选项按钮数量 | 4 | 4 | PASS |
| 105 | 412x915/shot-long-size | 长题截图尺寸 | 412x915 | 412x915 | PASS |
| 106 | 412x915/long-stem-question | 最长题干场景定位到目标题 | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | PASS |
| 107 | 412x915/long-stem-h-overflow | 最长题干（2017-21）无横向溢出 | true | overflow=0px | PASS |
| 108 | 412x915/long-stem-wrap | 最长题干发生换行（行数 ≥ 3） | true | lines=7 | PASS |
| 109 | 412x915/shot-long-stem-size | 最长题干截图尺寸 | true | 412x915 | PASS |
| 110 | 412x915/tallest-1-top-reachable | 内容最多题 2020-29 顶部未被裁切（quizTop ≥ 0） | true | quizTop=28.9, progressTop=28.9, scrollHeight=915, innerHeight=915 | PASS |
| 111 | 412x915/tallest-1-bottom-reachable | 内容最多题 2020-29 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=886.1, innerHeight=915 | PASS |
| 112 | 412x915/tallest-2-top-reachable | 内容最多题 2017-21 顶部未被裁切（quizTop ≥ 0） | true | quizTop=137.8, progressTop=137.8, scrollHeight=915, innerHeight=915 | PASS |
| 113 | 412x915/tallest-2-bottom-reachable | 内容最多题 2017-21 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=777.2, innerHeight=915 | PASS |
| 114 | 412x915/tallest-3-top-reachable | 内容最多题 2017-37 顶部未被裁切（quizTop ≥ 0） | true | quizTop=155.4, progressTop=155.4, scrollHeight=915, innerHeight=915 | PASS |
| 115 | 412x915/tallest-3-bottom-reachable | 内容最多题 2017-37 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=759.6, innerHeight=915 | PASS |
| 116 | 412x915/double-click-different | 同步连点两个不同选项只前进 1 题 | 1 | 1 | PASS |
| 117 | 412x915/double-click-different-answers | 同步连点不同选项只记录 1 条作答（且为第一次点击的 A） | {"answers":1,"choice":0} | {"answers":1,"choice":0} | PASS |
| 118 | 412x915/double-click-same | 同步连点同一选项两次只前进 1 题 | 2 | 2 | PASS |
| 119 | 412x915/double-click-same-answers | 同步连点同一选项只记录 1 条作答 | 1 | 1 | PASS |
| 120 | 412x915/double-click-50ms | 间隔 50ms 连点两次只前进 1 题 | 3 | 3 | PASS |
| 121 | 412x915/double-click-50ms-answers | 间隔 50ms 连点只记录 1 条作答 | 1 | 1 | PASS |
| 122 | 412x915/shot-double-click-size | 防连点截图尺寸 | true | 412x915 | PASS |
| 123 | 412x915/no-console-errors | 页面无 console error / pageerror / 请求失败 | true | {"console":[],"pageerror":[],"requestfailed":[]} | PASS |

## 截图

| 文件 | 视口 | 尺寸 | 大小 |
|---|---|---|---|
| 360x640-initial.png | 360x640 | 360×640 | 107.0 KiB |
| 360x640-feedback.png | 360x640 | 360×640 | 105.8 KiB |
| 360x640-after-answer.png | 360x640 | 360×640 | 104.4 KiB |
| 360x640-resume.png | 360x640 | 360×640 | 104.4 KiB |
| 360x640-feedback-wrong.png | 360x640 | 360×640 | 108.9 KiB |
| 360x640-feedback-correct.png | 360x640 | 360×640 | 99.8 KiB |
| 360x640-long-question.png | 360x640 | 360×640 | 161.5 KiB |
| 360x640-long-stem.png | 360x640 | 360×640 | 140.1 KiB |
| 360x640-double-click.png | 360x640 | 360×640 | 101.1 KiB |
| 412x915-initial.png | 412x915 | 412×915 | 180.9 KiB |
| 412x915-feedback.png | 412x915 | 412×915 | 179.5 KiB |
| 412x915-after-answer.png | 412x915 | 412×915 | 146.3 KiB |
| 412x915-resume.png | 412x915 | 412×915 | 146.3 KiB |
| 412x915-feedback-wrong.png | 412x915 | 412×915 | 155.3 KiB |
| 412x915-feedback-correct.png | 412x915 | 412×915 | 145.9 KiB |
| 412x915-long-question.png | 412x915 | 412×915 | 256.8 KiB |
| 412x915-long-stem.png | 412x915 | 412×915 | 190.6 KiB |
| 412x915-double-click.png | 412x915 | 412×915 | 157.2 KiB |

## 控制台错误 / 页面异常 / 请求失败

无（两个视口全程 0 条 console error / pageerror / requestfailed）。

## www/ 外部 URL 检查

grep 检查 `www/*.html|css|js|json` 中 `http://` / `https://`：0 处，全部资源本地引用。

## 答题对错反馈

- 点击选项后先显示约 600ms 的对错反馈：正确项 `.correct`（绿）、选错时选中项 `.wrong`（红），随后淡出进入下一题；反馈期间不响应点击。
- 每视口截图包含：随机首题反馈、确定性「选错」、确定性「选对」三张，并校验 class 索引与期望答案一致。

## 长题目场景

动态从 `window.QUESTION_BANK` 计算候选，并注入 localStorage（order[0]=目标题、index=0、answers=[]）后刷新：

- 综合最长（题干长度 + 最长选项长度）：`2020-29`，实际页面定位由脚本动态校验；
- 最长题干：`2017-21`（134 字），实际页面定位由脚本动态校验。

### 内容最多题的垂直可达性（防 flex 居中裁切 / 底部不可滚动）

| 视口 | 题 ID | innerHeight | scrollHeight | quizTop | 最大 scrollY | 末选项底部 | 结果 |
|---|---|---|---|---|---|---|---|
| 360x640 | 2020-29 | 640 | 929 | 24.0 | 289 | 616.1 | PASS |
| 360x640 | 2017-21 | 640 | 667 | 24.0 | 27 | 616.0 | PASS |
| 360x640 | 2017-37 | 640 | 640 | 26.5 | 0 | 613.5 | PASS |
| 412x915 | 2020-29 | 915 | 915 | 28.9 | 0 | 886.1 | PASS |
| 412x915 | 2017-21 | 915 | 915 | 137.8 | 0 | 777.2 | PASS |
| 412x915 | 2017-37 | 915 | 915 | 155.4 | 0 | 759.6 | PASS |

## 未验证项 / 限制

- 仅桌面无头 Chromium 的 file:// 环境，未覆盖真机 Android WebView 与 Capacitor SystemBars 注入的 safe-area（模拟器不可用）。
- 未验证 APK 包内资源、Android 启动页与系统栏在真机上的实际渲染（包内资源由打包步骤用 unzip/aapt2 静态校验）。
- 未验证屏幕阅读器/键盘可达性（仅通过 4 个选项按钮存在性推断键盘 A-D 路径存在）。
- 未验证低端设备动画掉帧、真机触屏长按/双击缩放行为。
- `@media (hover:hover)` 触屏分支无法在桌面无头 Chromium 中真实复现（依赖 isMobile/hasTouch 模拟）。

## 失败断言

无。

