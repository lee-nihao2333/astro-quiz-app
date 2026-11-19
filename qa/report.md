# Web 端验收报告（qa/verify.mjs）

- 生成时间：2026-11-19T13:15:39.222Z
- 被测页面：`/home/marvin/astro-quiz-app/www/index.html`（file:// 打开，未启动服务器）
- 浏览器：Chromium 156.0.8078.4（playwright-core 1.64.1）
- 视口：360×640、412×915（deviceScaleFactor=1，isMobile+hasTouch）
- git HEAD：d1aed3d
- 结论：**全部通过**（共 257 条断言，通过 257）

## 断言明细

| # | 断言 ID | 描述 | 期望 | 实际 | 结果 |
|---|---|---|---|---|---|
| 1 | global/www-no-external-url | www/ 内无任何 http(s) 外部 URL | 0 处 | 0 处 | PASS |
| 2 | global/www-index-exists | www/index.html 存在 | true | true | PASS |
| 3 | global/www-questions-exists | www/questions.js 存在 | true | true | PASS |
| 4 | 360x640/bank-length | window.QUESTION_BANK.length | 485 | 485 | PASS |
| 5 | 360x640/selector-config | window.AstroSelector.CONFIG 可读，box 上限 = intervalsDays.length - 1 | true | intervalsDays=[0,1,3,7,21,60], maxBox=5, logLimit=500 | PASS |
| 6 | 360x640/no-progress-text | 没有题号进度文字（#progress） | true | #progress=false | PASS |
| 7 | 360x640/no-progress-bar | 没有进度条（.bar） | true | .bar=false | PASS |
| 8 | 360x640/question-nonempty | 题目文字非空（动态加载 selector 后已初始化） | true | 满月不可能发生在农历哪天？ | PASS |
| 9 | 360x640/question-type-text | 题目下方灰色小字显示当前题目类别 | 类别：天象与时间历法 | 类别：天象与时间历法 | PASS |
| 10 | 360x640/question-type-small-gray | 类别小字：字号 ≤ 14px 且为灰色系 | true | fontSize=12px, color=rgb(138, 147, 178) | PASS |
| 11 | 360x640/option-count | 选项按钮数量 | 4 | 4 | PASS |
| 12 | 360x640/option-letters | 选项字母 A B C D | A,B,C,D | A,B,C,D | PASS |
| 13 | 360x640/option-text-nonempty | 4 个选项文字均非空 | true | ["十五","十六","十七","以上皆可能发生满月"] | PASS |
| 14 | 360x640/state-initial-v3 | 初始 localStorage v3 合法（currentId 在题库、step=0、q/log 为空） | true | currentId=2020-19, step=0, q=0, log=0 | PASS |
| 15 | 360x640/initial-no-h-overflow | 初始界面无横向溢出 | true | scrollWidth=360, innerWidth=360, overflow=0px | PASS |
| 16 | 360x640/shot-initial-size | 初始截图尺寸 | 360x640 | 360x640 | PASS |
| 17 | 360x640/feedback-progress | 反馈期间仍停留在当前题（600ms 反馈，未提前切题） | 满月不可能发生在农历哪天？ | 满月不可能发生在农历哪天？ | PASS |
| 18 | 360x640/feedback-correct-marked | 反馈：正确项被标记为绿色（.correct） | [3] | [3] | PASS |
| 19 | 360x640/feedback-wrong-marked | 反馈：答对时没有红色标记（.wrong） | [] | [] | PASS |
| 20 | 360x640/feedback-correct-no-explanation | 答对时不显示解析面板 | true | hidden=true | PASS |
| 21 | 360x640/shot-feedback-size | 反馈截图尺寸 | 360x640 | 360x640 | PASS |
| 22 | 360x640/natural-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 23 | 360x640/natural-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2011-17 | PASS |
| 24 | 360x640/natural-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795353280969} | PASS |
| 25 | 360x640/natural-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2020-19","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 26 | 360x640/after-answer-question-changed | 约 600ms 反馈 + 淡出后切换到 v3.currentId 对应的新题 | true | 从地球上观测，下列哪个天体不可能出现在黄道附近？ | PASS |
| 27 | 360x640/after-answer-option-count | 换题后选项按钮数量 | 4 | 4 | PASS |
| 28 | 360x640/after-answer-fade-cleared | 淡入淡出结束（fade class 移除） | true | fade=false | PASS |
| 29 | 360x640/after-answer-still-no-progress | 切题后仍然没有进度 UI | true | progress=false, bar=false | PASS |
| 30 | 360x640/question-type-updated | 切题后类别小字同步更新为新题类型 | 类别：天象与时间历法 | 类别：天象与时间历法 | PASS |
| 31 | 360x640/shot-after-answer-size | 作答后截图尺寸 | 360x640 | 360x640 | PASS |
| 32 | 360x640/resume-question | 刷新后恢复到同一道题 | 从地球上观测，下列哪个天体不可能出现在黄道附近？ | 从地球上观测，下列哪个天体不可能出现在黄道附近？ | PASS |
| 33 | 360x640/resume-state | 刷新后 v3 currentId/step/log 不丢 | true | currentId=2011-17, step=1, log=1 | PASS |
| 34 | 360x640/resume-no-h-overflow | 刷新后无横向溢出 | true | overflow=0px | PASS |
| 35 | 360x640/resume-option-count | 刷新后选项按钮数量 | 4 | 4 | PASS |
| 36 | 360x640/shot-resume-size | 续做截图尺寸 | 360x640 | 360x640 | PASS |
| 37 | 360x640/feedback-wrong-case-correct-marked | 确定性选错：正确项标绿 | [2] | [2] | PASS |
| 38 | 360x640/feedback-wrong-case-selected-marked | 确定性选错：选中项标红 | [0] | [0] | PASS |
| 39 | 360x640/feedback-wrong-case-green | 确定性选错：正确项边框为绿色系（计算样式） | true | rgba(94, 220, 154, 0.95) | PASS |
| 40 | 360x640/feedback-wrong-case-red | 确定性选错：选中项边框为红色系（计算样式） | true | rgba(255, 120, 120, 0.95) | PASS |
| 41 | 360x640/explain-visible-wrong | 答错后显示解析面板（#explain） | true | hidden=false | PASS |
| 42 | 360x640/explain-text | 解析文本与题库 explain 一致（去掉 ** 标记） | 1609年伽利略把望远镜指向天空观测天体，2009年国际天文年正是纪念望远镜用于天文观测400周年，故选 C。 | 1609年伽利略把望远镜指向天空观测天体，2009年国际天文年正是纪念望远镜用于天文观测400周年，故选 C。 | PASS |
| 43 | 360x640/explain-bold | 解析中的 **加粗** 渲染为 <strong> | ["C"] | ["C"] | PASS |
| 44 | 360x640/explain-hint-hidden-initially | 600ms 反馈期间暂不显示“轻触继续” | true | hintHidden=true | PASS |
| 45 | 360x640/wrong-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 46 | 360x640/wrong-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2015-9 | PASS |
| 47 | 360x640/wrong-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":1,"box":0,"lastStep":1,"due":0} | PASS |
| 48 | 360x640/wrong-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-1","type":"天文史、人物与综合常识","ok":false,"step":1} | PASS |
| 49 | 360x640/explain-hint-visible | 反馈结束后显示“轻触继续”提示 | true | hintHidden=false | PASS |
| 50 | 360x640/explain-no-auto-advance | 答错后不自动切题，等待用户阅读解析 | true | questionChanged=false | PASS |
| 51 | 360x640/shot-feedback-wrong-size | 选错解析截图尺寸 | 360x640 | 360x640 | PASS |
| 52 | 360x640/feedback-wrong-case-next | 轻触继续后进入下一题，v3.currentId 与页面一致 | true | next=2015-9 | PASS |
| 53 | 360x640/explain-hidden-after-next | 切题后解析面板隐藏 | true | hidden=true | PASS |
| 54 | 360x640/feedback-right-case-correct-marked | 确定性选对：选中项标绿 | [0] | [0] | PASS |
| 55 | 360x640/feedback-right-case-no-wrong | 确定性选对：没有红色标记 | [] | [] | PASS |
| 56 | 360x640/feedback-right-case-green | 确定性选对：正确项边框为绿色系（计算样式） | true | rgba(94, 220, 154, 0.95) | PASS |
| 57 | 360x640/feedback-right-case-no-explanation | 确定性选对：不显示解析面板 | true | hidden=true | PASS |
| 58 | 360x640/shot-feedback-correct-size | 选对反馈截图尺寸 | 360x640 | 360x640 | PASS |
| 59 | 360x640/right-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 60 | 360x640/right-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2010-33 | PASS |
| 61 | 360x640/right-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795353283385} | PASS |
| 62 | 360x640/right-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-2","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 63 | 360x640/feedback-right-case-next | 选对反馈结束后进入下一题，v3.currentId 与页面一致 | true | next=2010-33 | PASS |
| 64 | 360x640/long-opt-question | 长题场景定位到目标题 | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | PASS |
| 65 | 360x640/long-opt-h-overflow | 长题（题干+选项最长）文档无横向溢出 | true | scrollWidth=360, innerWidth=360, overflow=0px | PASS |
| 66 | 360x640/long-opt-question-wrap | 长题题干发生换行（行数 ≥ 2） | true | lines=4 (byHeight=4, byRange=4) | PASS |
| 67 | 360x640/long-opt-option-wrap | 长选项文字发生换行（≥1 个选项行数 ≥ 2） | true | 换行选项数=4, 各选项行数=[6,6,5,5] | PASS |
| 68 | 360x640/long-opt-option-no-overflow | 选项文字无横向溢出（scrollWidth ≤ clientWidth） | true | 各选项溢出=[0,0,0,0] | PASS |
| 69 | 360x640/long-opt-option-count | 长题选项按钮数量 | 4 | 4 | PASS |
| 70 | 360x640/shot-long-size | 长题截图尺寸 | 360x640 | 360x640 | PASS |
| 71 | 360x640/long-stem-question | 最长题干场景定位到目标题 | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | PASS |
| 72 | 360x640/long-stem-h-overflow | 最长题干无横向溢出 | true | overflow=0px | PASS |
| 73 | 360x640/long-stem-wrap | 最长题干发生换行（行数 ≥ 3） | true | lines=8 | PASS |
| 74 | 360x640/shot-long-stem-size | 最长题干截图尺寸 | true | 360x640 | PASS |
| 75 | 360x640/tallest-1-top-reachable | 内容最多题 2020-29 顶部未被裁切（quizTop ≥ 0） | true | quizTop=0.0, scrollHeight=889, innerHeight=640 | PASS |
| 76 | 360x640/tallest-1-bottom-reachable | 内容最多题 2020-29 滚动到底后末选项可见（可达） | true | maxScroll=249, lastOptionBottom=616.1, innerHeight=640 | PASS |
| 77 | 360x640/tallest-2-top-reachable | 内容最多题 2017-21 顶部未被裁切（quizTop ≥ 0） | true | quizTop=30.5, scrollHeight=640, innerHeight=640 | PASS |
| 78 | 360x640/tallest-2-bottom-reachable | 内容最多题 2017-21 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=609.5, innerHeight=640 | PASS |
| 79 | 360x640/tallest-3-top-reachable | 内容最多题 2017-37 顶部未被裁切（quizTop ≥ 0） | true | quizTop=46.5, scrollHeight=640, innerHeight=640 | PASS |
| 80 | 360x640/tallest-3-bottom-reachable | 内容最多题 2017-37 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=593.5, innerHeight=640 | PASS |
| 81 | 360x640/recent-exclude-completed | 连续作答 12 题全部完成并切题 | true | 12/12 | PASS |
| 82 | 360x640/recent-step | 连续作答后 v3.step 与 log 长度一致（12） | {"step":12,"log":12} | {"step":12,"log":12} | PASS |
| 83 | 360x640/recent-adjacent-no-repeat | 连续作答的相邻题目不重复 | [] | [] | PASS |
| 84 | 360x640/recent-10-exclusion | 每道新题都不在之前最近 10 题中（含当前题） | true | 最近 10 题均无重复 | PASS |
| 85 | 360x640/recent-current-valid | 连续作答后当前题仍是题库中的有效题 | true | currentId=2013-6 | PASS |
| 86 | 360x640/double-click-different-step | 同步连点两个不同选项只前进 1 题 | 1 | 1 | PASS |
| 87 | 360x640/double-click-different-log | 同步连点不同选项只记录 1 条作答（第一次点击的题） | 1 | 1 | PASS |
| 88 | 360x640/double-click-different-current | 同步连点只出一次下一题（currentId 变化） | true | true | PASS |
| 89 | 360x640/double-click-same-step | 同步连点同一选项两次只前进 1 题 | 2 | 2 | PASS |
| 90 | 360x640/double-click-same-current | 同步连点同一选项只出一次下一题 | true | true | PASS |
| 91 | 360x640/double-click-50ms-step | 间隔 50ms 连点两次只前进 1 题 | 3 | 3 | PASS |
| 92 | 360x640/double-click-50ms-current | 间隔 50ms 连点只出一次下一题 | true | true | PASS |
| 93 | 360x640/shot-double-click-size | 防连点截图尺寸 | true | 360x640 | PASS |
| 94 | 360x640/keyboard-a-feedback | 键盘 A 键选择第 1 项（正确）并显示绿色反馈 | {"correct":[0],"wrong":[]} | {"correct":[0],"wrong":[]} | PASS |
| 95 | 360x640/keyboard-a-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 96 | 360x640/keyboard-a-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2017-42 | PASS |
| 97 | 360x640/keyboard-a-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795353299687} | PASS |
| 98 | 360x640/keyboard-a-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-2","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 99 | 360x640/keyboard-a-next | 键盘 A 键答对后自动切题 | true | 已切题 | PASS |
| 100 | 360x640/keyboard-2-feedback | 键盘 2 键选择第 2 项（正确）并显示绿色反馈 | {"correct":[1],"wrong":[]} | {"correct":[1],"wrong":[]} | PASS |
| 101 | 360x640/keyboard-2-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 102 | 360x640/keyboard-2-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2016-3 | PASS |
| 103 | 360x640/keyboard-2-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795353300670} | PASS |
| 104 | 360x640/keyboard-2-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-4","type":"太阳系与月球","ok":true,"step":1} | PASS |
| 105 | 360x640/keyboard-2-next | 数字键 2 答对后自动切题 | true | 已切题 | PASS |
| 106 | 360x640/v2-migration-step | v2 迁移后 v3.step = v2.answers.length | 3 | 3 | PASS |
| 107 | 360x640/v2-migration-currentId | v2 迁移后 v3.currentId = v2.currentId | 2009-3 | 2009-3 | PASS |
| 108 | 360x640/v2-migration-q | v2 迁移后 v3.q 正确（seen/wrong/box/lastStep/due） | true | 全部匹配 | PASS |
| 109 | 360x640/v2-migration-log | v2 迁移后 v3.log 按 v2.answers 顺序与 step 正确 | true | 全部匹配 | PASS |
| 110 | 360x640/v2-key-preserved | v2 迁移后 astroQuizState.v2 原样保留 | 115 字节 | 115 字节 | PASS |
| 111 | 360x640/v2-migration-question | v2 迁移后展示 v2.currentId 对应题目 | 光年是天文学中的 | 光年是天文学中的 | PASS |
| 112 | 360x640/v1-migration-step | v1 迁移后 v3.step = v1.answers.length | 2 | 2 | PASS |
| 113 | 360x640/v1-migration-currentId | v1 迁移后 v3.currentId = order[index] | 2009-6 | 2009-6 | PASS |
| 114 | 360x640/v1-migration-q | v1 迁移后 v3.q 正确（seen/wrong/box/lastStep/due） | true | 全部匹配 | PASS |
| 115 | 360x640/v1-migration-log | v1 迁移后 v3.log 按 v1.answers 顺序与 step 正确 | true | 全部匹配 | PASS |
| 116 | 360x640/v1-key-preserved | v1 迁移后 astroQuizState.v1 原样保留 | 4839 字节 | 4839 字节 | PASS |
| 117 | 360x640/v1-migration-question | v1 迁移后展示 order[index] 对应题目 | 除太阳以外，全天最亮的恒星是 | 除太阳以外，全天最亮的恒星是 | PASS |
| 118 | 360x640/v3-invalid-fallback-state | v3 含题库外 id 时整份判非法并回退为空 v3（step=0、q/log 空、currentId 合法） | true | currentId=2011-2, step=0, q=0, log=0 | PASS |
| 119 | 360x640/v3-invalid-fallback-question | 回退后页面仍展示有效题目（未显示题库加载失败） | true | 冲日指的是某颗地外行星、地球、太阳排成一条直线，此时这颗地外行星离地球最近，最适 | PASS |
| 120 | 360x640/v3-invalid-valid-currentid-q-fallback | v3.currentId 合法但 q key / log id 含题库外 id → 判非法并回退为空 v3（页面仍出题） | true | currentId=2009-2, step=0, q=0, log=0 | PASS |
| 121 | 360x640/v3-invalid-valid-currentid-q-question | 非法 v3（currentId 合法）回退后页面展示有效题目，未显示题库加载失败 | true | 2009年7月22日，在北京可以观测到 | PASS |
| 122 | 360x640/v3-invalid-valid-currentid-v2-migration | v3（currentId 合法、log id 非法）判非法后按合法 v2 迁移到 v3 | true | step/q/log 与 v2 一致 | PASS |
| 123 | 360x640/v3-invalid-v2-key-preserved | v3 非法时按 v2 迁移后 astroQuizState.v2 原样保留 | 91 字节 | 91 字节 | PASS |
| 124 | 360x640/v3-invalid-v2-migration-question | v3 非法 → v2 迁移后展示 v2.currentId 对应题目 | 狮子座流星雨每年出现在 | 狮子座流星雨每年出现在 | PASS |
| 125 | 360x640/v3-invalid-valid-currentid-v1-migration | v3（currentId 合法、q key 非法）判非法后按合法 v1 迁移到 v3 | true | step/q/log 与 v1 一致 | PASS |
| 126 | 360x640/v3-invalid-v1-key-preserved | v3 非法时按 v1 迁移后 astroQuizState.v1 原样保留 | 4842 字节 | 4842 字节 | PASS |
| 127 | 360x640/v3-invalid-v1-migration-question | v3 非法 → v1 迁移后展示 order[index] 对应题目 | 金牛座中有一个著名的“七姐妹星团”，指的是 | 金牛座中有一个著名的“七姐妹星团”，指的是 | PASS |
| 128 | 360x640/no-console-errors | 页面无 console error / warning / pageerror / 请求失败 | true | "0 条" | PASS |
| 129 | 412x915/bank-length | window.QUESTION_BANK.length | 485 | 485 | PASS |
| 130 | 412x915/selector-config | window.AstroSelector.CONFIG 可读，box 上限 = intervalsDays.length - 1 | true | intervalsDays=[0,1,3,7,21,60], maxBox=5, logLimit=500 | PASS |
| 131 | 412x915/no-progress-text | 没有题号进度文字（#progress） | true | #progress=false | PASS |
| 132 | 412x915/no-progress-bar | 没有进度条（.bar） | true | .bar=false | PASS |
| 133 | 412x915/question-nonempty | 题目文字非空（动态加载 selector 后已初始化） | true | 2016 年 3 月 9 日会有一次日全食，中国南方可见偏食，请问下列哪个城市能 | PASS |
| 134 | 412x915/question-type-text | 题目下方灰色小字显示当前题目类别 | 类别：天象与时间历法 | 类别：天象与时间历法 | PASS |
| 135 | 412x915/question-type-small-gray | 类别小字：字号 ≤ 14px 且为灰色系 | true | fontSize=13px, color=rgb(138, 147, 178) | PASS |
| 136 | 412x915/option-count | 选项按钮数量 | 4 | 4 | PASS |
| 137 | 412x915/option-letters | 选项字母 A B C D | A,B,C,D | A,B,C,D | PASS |
| 138 | 412x915/option-text-nonempty | 4 个选项文字均非空 | true | ["昆明","广州","贵州","上海"] | PASS |
| 139 | 412x915/state-initial-v3 | 初始 localStorage v3 合法（currentId 在题库、step=0、q/log 为空） | true | currentId=2015-43, step=0, q=0, log=0 | PASS |
| 140 | 412x915/initial-no-h-overflow | 初始界面无横向溢出 | true | scrollWidth=412, innerWidth=412, overflow=0px | PASS |
| 141 | 412x915/shot-initial-size | 初始截图尺寸 | 412x915 | 412x915 | PASS |
| 142 | 412x915/feedback-progress | 反馈期间仍停留在当前题（600ms 反馈，未提前切题） | 2016 年 3 月 9 日会有一次日全食，中国南方可见偏食，请问下列哪个城市能最早看到日食开始？ | 2016 年 3 月 9 日会有一次日全食，中国南方可见偏食，请问下列哪个城市能最早看到日食开始？ | PASS |
| 143 | 412x915/feedback-correct-marked | 反馈：正确项被标记为绿色（.correct） | [0] | [0] | PASS |
| 144 | 412x915/feedback-wrong-marked | 反馈：答对时没有红色标记（.wrong） | [] | [] | PASS |
| 145 | 412x915/feedback-correct-no-explanation | 答对时不显示解析面板 | true | hidden=true | PASS |
| 146 | 412x915/shot-feedback-size | 反馈截图尺寸 | 412x915 | 412x915 | PASS |
| 147 | 412x915/natural-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 148 | 412x915/natural-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2019-29 | PASS |
| 149 | 412x915/natural-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795353302167} | PASS |
| 150 | 412x915/natural-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2015-43","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 151 | 412x915/after-answer-question-changed | 约 600ms 反馈 + 淡出后切换到 v3.currentId 对应的新题 | true | 南方的夜空中有两颗很亮的星，________位于人马座 | PASS |
| 152 | 412x915/after-answer-option-count | 换题后选项按钮数量 | 4 | 4 | PASS |
| 153 | 412x915/after-answer-fade-cleared | 淡入淡出结束（fade class 移除） | true | fade=false | PASS |
| 154 | 412x915/after-answer-still-no-progress | 切题后仍然没有进度 UI | true | progress=false, bar=false | PASS |
| 155 | 412x915/question-type-updated | 切题后类别小字同步更新为新题类型 | 类别：天象与时间历法 | 类别：天象与时间历法 | PASS |
| 156 | 412x915/shot-after-answer-size | 作答后截图尺寸 | 412x915 | 412x915 | PASS |
| 157 | 412x915/resume-question | 刷新后恢复到同一道题 | 南方的夜空中有两颗很亮的星，________位于人马座 | 南方的夜空中有两颗很亮的星，________位于人马座 | PASS |
| 158 | 412x915/resume-state | 刷新后 v3 currentId/step/log 不丢 | true | currentId=2019-29, step=1, log=1 | PASS |
| 159 | 412x915/resume-no-h-overflow | 刷新后无横向溢出 | true | overflow=0px | PASS |
| 160 | 412x915/resume-option-count | 刷新后选项按钮数量 | 4 | 4 | PASS |
| 161 | 412x915/shot-resume-size | 续做截图尺寸 | 412x915 | 412x915 | PASS |
| 162 | 412x915/feedback-wrong-case-correct-marked | 确定性选错：正确项标绿 | [2] | [2] | PASS |
| 163 | 412x915/feedback-wrong-case-selected-marked | 确定性选错：选中项标红 | [0] | [0] | PASS |
| 164 | 412x915/feedback-wrong-case-green | 确定性选错：正确项边框为绿色系（计算样式） | true | rgba(94, 220, 154, 0.95) | PASS |
| 165 | 412x915/feedback-wrong-case-red | 确定性选错：选中项边框为红色系（计算样式） | true | rgba(255, 120, 120, 0.95) | PASS |
| 166 | 412x915/explain-visible-wrong | 答错后显示解析面板（#explain） | true | hidden=false | PASS |
| 167 | 412x915/explain-text | 解析文本与题库 explain 一致（去掉 ** 标记） | 1609年伽利略把望远镜指向天空观测天体，2009年国际天文年正是纪念望远镜用于天文观测400周年，故选 C。 | 1609年伽利略把望远镜指向天空观测天体，2009年国际天文年正是纪念望远镜用于天文观测400周年，故选 C。 | PASS |
| 168 | 412x915/explain-bold | 解析中的 **加粗** 渲染为 <strong> | ["C"] | ["C"] | PASS |
| 169 | 412x915/explain-hint-hidden-initially | 600ms 反馈期间暂不显示“轻触继续” | true | hintHidden=true | PASS |
| 170 | 412x915/wrong-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 171 | 412x915/wrong-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2018-44 | PASS |
| 172 | 412x915/wrong-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":1,"box":0,"lastStep":1,"due":0} | PASS |
| 173 | 412x915/wrong-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-1","type":"天文史、人物与综合常识","ok":false,"step":1} | PASS |
| 174 | 412x915/explain-hint-visible | 反馈结束后显示“轻触继续”提示 | true | hintHidden=false | PASS |
| 175 | 412x915/explain-no-auto-advance | 答错后不自动切题，等待用户阅读解析 | true | questionChanged=false | PASS |
| 176 | 412x915/shot-feedback-wrong-size | 选错解析截图尺寸 | 412x915 | 412x915 | PASS |
| 177 | 412x915/feedback-wrong-case-next | 轻触继续后进入下一题，v3.currentId 与页面一致 | true | next=2018-44 | PASS |
| 178 | 412x915/explain-hidden-after-next | 切题后解析面板隐藏 | true | hidden=true | PASS |
| 179 | 412x915/feedback-right-case-correct-marked | 确定性选对：选中项标绿 | [0] | [0] | PASS |
| 180 | 412x915/feedback-right-case-no-wrong | 确定性选对：没有红色标记 | [] | [] | PASS |
| 181 | 412x915/feedback-right-case-green | 确定性选对：正确项边框为绿色系（计算样式） | true | rgba(94, 220, 154, 0.95) | PASS |
| 182 | 412x915/feedback-right-case-no-explanation | 确定性选对：不显示解析面板 | true | hidden=true | PASS |
| 183 | 412x915/shot-feedback-correct-size | 选对反馈截图尺寸 | 412x915 | 412x915 | PASS |
| 184 | 412x915/right-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 185 | 412x915/right-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2014-23 | PASS |
| 186 | 412x915/right-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795353304649} | PASS |
| 187 | 412x915/right-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-2","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 188 | 412x915/feedback-right-case-next | 选对反馈结束后进入下一题，v3.currentId 与页面一致 | true | next=2014-23 | PASS |
| 189 | 412x915/long-opt-question | 长题场景定位到目标题 | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | PASS |
| 190 | 412x915/long-opt-h-overflow | 长题（题干+选项最长）文档无横向溢出 | true | scrollWidth=412, innerWidth=412, overflow=0px | PASS |
| 191 | 412x915/long-opt-question-wrap | 长题题干发生换行（行数 ≥ 2） | true | lines=4 (byHeight=4, byRange=4) | PASS |
| 192 | 412x915/long-opt-option-wrap | 长选项文字发生换行（≥1 个选项行数 ≥ 2） | true | 换行选项数=4, 各选项行数=[5,5,4,4] | PASS |
| 193 | 412x915/long-opt-option-no-overflow | 选项文字无横向溢出（scrollWidth ≤ clientWidth） | true | 各选项溢出=[0,0,0,0] | PASS |
| 194 | 412x915/long-opt-option-count | 长题选项按钮数量 | 4 | 4 | PASS |
| 195 | 412x915/shot-long-size | 长题截图尺寸 | 412x915 | 412x915 | PASS |
| 196 | 412x915/long-stem-question | 最长题干场景定位到目标题 | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | PASS |
| 197 | 412x915/long-stem-h-overflow | 最长题干无横向溢出 | true | overflow=0px | PASS |
| 198 | 412x915/long-stem-wrap | 最长题干发生换行（行数 ≥ 3） | true | lines=7 | PASS |
| 199 | 412x915/shot-long-stem-size | 最长题干截图尺寸 | true | 412x915 | PASS |
| 200 | 412x915/tallest-1-top-reachable | 内容最多题 2020-29 顶部未被裁切（quizTop ≥ 0） | true | quizTop=51.9, scrollHeight=915, innerHeight=915 | PASS |
| 201 | 412x915/tallest-1-bottom-reachable | 内容最多题 2020-29 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=863.1, innerHeight=915 | PASS |
| 202 | 412x915/tallest-2-top-reachable | 内容最多题 2017-21 顶部未被裁切（quizTop ≥ 0） | true | quizTop=160.8, scrollHeight=915, innerHeight=915 | PASS |
| 203 | 412x915/tallest-2-bottom-reachable | 内容最多题 2017-21 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=754.2, innerHeight=915 | PASS |
| 204 | 412x915/tallest-3-top-reachable | 内容最多题 2017-37 顶部未被裁切（quizTop ≥ 0） | true | quizTop=178.4, scrollHeight=915, innerHeight=915 | PASS |
| 205 | 412x915/tallest-3-bottom-reachable | 内容最多题 2017-37 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=736.6, innerHeight=915 | PASS |
| 206 | 412x915/recent-exclude-completed | 连续作答 12 题全部完成并切题 | true | 12/12 | PASS |
| 207 | 412x915/recent-step | 连续作答后 v3.step 与 log 长度一致（12） | {"step":12,"log":12} | {"step":12,"log":12} | PASS |
| 208 | 412x915/recent-adjacent-no-repeat | 连续作答的相邻题目不重复 | [] | [] | PASS |
| 209 | 412x915/recent-10-exclusion | 每道新题都不在之前最近 10 题中（含当前题） | true | 最近 10 题均无重复 | PASS |
| 210 | 412x915/recent-current-valid | 连续作答后当前题仍是题库中的有效题 | true | currentId=2019-12 | PASS |
| 211 | 412x915/double-click-different-step | 同步连点两个不同选项只前进 1 题 | 1 | 1 | PASS |
| 212 | 412x915/double-click-different-log | 同步连点不同选项只记录 1 条作答（第一次点击的题） | 1 | 1 | PASS |
| 213 | 412x915/double-click-different-current | 同步连点只出一次下一题（currentId 变化） | true | true | PASS |
| 214 | 412x915/double-click-same-step | 同步连点同一选项两次只前进 1 题 | 2 | 2 | PASS |
| 215 | 412x915/double-click-same-current | 同步连点同一选项只出一次下一题 | true | true | PASS |
| 216 | 412x915/double-click-50ms-step | 间隔 50ms 连点两次只前进 1 题 | 3 | 3 | PASS |
| 217 | 412x915/double-click-50ms-current | 间隔 50ms 连点只出一次下一题 | true | true | PASS |
| 218 | 412x915/shot-double-click-size | 防连点截图尺寸 | true | 412x915 | PASS |
| 219 | 412x915/keyboard-a-feedback | 键盘 A 键选择第 1 项（正确）并显示绿色反馈 | {"correct":[0],"wrong":[]} | {"correct":[0],"wrong":[]} | PASS |
| 220 | 412x915/keyboard-a-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 221 | 412x915/keyboard-a-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2012-33 | PASS |
| 222 | 412x915/keyboard-a-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795353321003} | PASS |
| 223 | 412x915/keyboard-a-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-2","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 224 | 412x915/keyboard-a-next | 键盘 A 键答对后自动切题 | true | 已切题 | PASS |
| 225 | 412x915/keyboard-2-feedback | 键盘 2 键选择第 2 项（正确）并显示绿色反馈 | {"correct":[1],"wrong":[]} | {"correct":[1],"wrong":[]} | PASS |
| 226 | 412x915/keyboard-2-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 227 | 412x915/keyboard-2-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2015-43 | PASS |
| 228 | 412x915/keyboard-2-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795353321986} | PASS |
| 229 | 412x915/keyboard-2-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-4","type":"太阳系与月球","ok":true,"step":1} | PASS |
| 230 | 412x915/keyboard-2-next | 数字键 2 答对后自动切题 | true | 已切题 | PASS |
| 231 | 412x915/v2-migration-step | v2 迁移后 v3.step = v2.answers.length | 3 | 3 | PASS |
| 232 | 412x915/v2-migration-currentId | v2 迁移后 v3.currentId = v2.currentId | 2009-3 | 2009-3 | PASS |
| 233 | 412x915/v2-migration-q | v2 迁移后 v3.q 正确（seen/wrong/box/lastStep/due） | true | 全部匹配 | PASS |
| 234 | 412x915/v2-migration-log | v2 迁移后 v3.log 按 v2.answers 顺序与 step 正确 | true | 全部匹配 | PASS |
| 235 | 412x915/v2-key-preserved | v2 迁移后 astroQuizState.v2 原样保留 | 115 字节 | 115 字节 | PASS |
| 236 | 412x915/v2-migration-question | v2 迁移后展示 v2.currentId 对应题目 | 光年是天文学中的 | 光年是天文学中的 | PASS |
| 237 | 412x915/v1-migration-step | v1 迁移后 v3.step = v1.answers.length | 2 | 2 | PASS |
| 238 | 412x915/v1-migration-currentId | v1 迁移后 v3.currentId = order[index] | 2009-6 | 2009-6 | PASS |
| 239 | 412x915/v1-migration-q | v1 迁移后 v3.q 正确（seen/wrong/box/lastStep/due） | true | 全部匹配 | PASS |
| 240 | 412x915/v1-migration-log | v1 迁移后 v3.log 按 v1.answers 顺序与 step 正确 | true | 全部匹配 | PASS |
| 241 | 412x915/v1-key-preserved | v1 迁移后 astroQuizState.v1 原样保留 | 4839 字节 | 4839 字节 | PASS |
| 242 | 412x915/v1-migration-question | v1 迁移后展示 order[index] 对应题目 | 除太阳以外，全天最亮的恒星是 | 除太阳以外，全天最亮的恒星是 | PASS |
| 243 | 412x915/v3-invalid-fallback-state | v3 含题库外 id 时整份判非法并回退为空 v3（step=0、q/log 空、currentId 合法） | true | currentId=2019-59, step=0, q=0, log=0 | PASS |
| 244 | 412x915/v3-invalid-fallback-question | 回退后页面仍展示有效题目（未显示题库加载失败） | true | 北黄极的赤经和赤纬是？ | PASS |
| 245 | 412x915/v3-invalid-valid-currentid-q-fallback | v3.currentId 合法但 q key / log id 含题库外 id → 判非法并回退为空 v3（页面仍出题） | true | currentId=2010-32, step=0, q=0, log=0 | PASS |
| 246 | 412x915/v3-invalid-valid-currentid-q-question | 非法 v3（currentId 合法）回退后页面展示有效题目，未显示题库加载失败 | true | 以下哪一天，地球离太阳最近______。 | PASS |
| 247 | 412x915/v3-invalid-valid-currentid-v2-migration | v3（currentId 合法、log id 非法）判非法后按合法 v2 迁移到 v3 | true | step/q/log 与 v2 一致 | PASS |
| 248 | 412x915/v3-invalid-v2-key-preserved | v3 非法时按 v2 迁移后 astroQuizState.v2 原样保留 | 91 字节 | 91 字节 | PASS |
| 249 | 412x915/v3-invalid-v2-migration-question | v3 非法 → v2 迁移后展示 v2.currentId 对应题目 | 狮子座流星雨每年出现在 | 狮子座流星雨每年出现在 | PASS |
| 250 | 412x915/v3-invalid-valid-currentid-v1-migration | v3（currentId 合法、q key 非法）判非法后按合法 v1 迁移到 v3 | true | step/q/log 与 v1 一致 | PASS |
| 251 | 412x915/v3-invalid-v1-key-preserved | v3 非法时按 v1 迁移后 astroQuizState.v1 原样保留 | 4842 字节 | 4842 字节 | PASS |
| 252 | 412x915/v3-invalid-v1-migration-question | v3 非法 → v1 迁移后展示 order[index] 对应题目 | 金牛座中有一个著名的“七姐妹星团”，指的是 | 金牛座中有一个著名的“七姐妹星团”，指的是 | PASS |
| 253 | 412x915/no-console-errors | 页面无 console error / warning / pageerror / 请求失败 | true | "0 条" | PASS |
| 254 | cold-start/completed | 空状态连续作答 16 题全部完成并切题 | 16 | 16 | PASS |
| 255 | cold-start/type-sequence | 冷启动类型序列 = TYPE_ORDER 每类 2 题（无到期复习时） | ["天象与时间历法","天象与时间历法","恒星与星座","恒星与星座","太阳系与月球","太阳系与月球","天文观测与望远镜","天文观测与望远镜","时事与新闻","时事与新闻","天文史、人物与综合常识","天文史、人物与综合常识","航天与空间探测","航天与空间探测","星系与宇宙","星系与宇宙"] | ["天象与时间历法","天象与时间历法","恒星与星座","恒星与星座","太阳系与月球","太阳系与月球","天文观测与望远镜","天文观测与望远镜","时事与新闻","时事与新闻","天文史、人物与综合常识","天文史、人物与综合常识","航天与空间探测","航天与空间探测","星系与宇宙","星系与宇宙"] | PASS |
| 256 | cold-start/step | 冷启动 16 题后 v3.step | 16 | 16 | PASS |
| 257 | cold-start/no-errors | 冷启动过程无 console error / warning / pageerror | true | 0 条 | PASS |

## 截图

| 文件 | 视口 | 尺寸 | 大小 |
|---|---|---|---|
| 360x640-initial.png | 360x640 | 360×640 | 100.7 KiB |
| 360x640-feedback.png | 360x640 | 360×640 | 100.0 KiB |
| 360x640-after-answer.png | 360x640 | 360×640 | 103.8 KiB |
| 360x640-resume.png | 360x640 | 360×640 | 103.8 KiB |
| 360x640-feedback-wrong.png | 360x640 | 360×640 | 125.4 KiB |
| 360x640-feedback-correct.png | 360x640 | 360×640 | 100.1 KiB |
| 360x640-long-question.png | 360x640 | 360×640 | 170.5 KiB |
| 360x640-long-stem.png | 360x640 | 360×640 | 141.7 KiB |
| 360x640-double-click.png | 360x640 | 360×640 | 107.5 KiB |
| 412x915-initial.png | 412x915 | 412×915 | 156.3 KiB |
| 412x915-feedback.png | 412x915 | 412×915 | 155.4 KiB |
| 412x915-after-answer.png | 412x915 | 412×915 | 146.8 KiB |
| 412x915-resume.png | 412x915 | 412×915 | 146.8 KiB |
| 412x915-feedback-wrong.png | 412x915 | 412×915 | 175.7 KiB |
| 412x915-feedback-correct.png | 412x915 | 412×915 | 145.8 KiB |
| 412x915-long-question.png | 412x915 | 412×915 | 256.9 KiB |
| 412x915-long-stem.png | 412x915 | 412×915 | 192.7 KiB |
| 412x915-double-click.png | 412x915 | 412×915 | 149.7 KiB |

## v3 状态与集成断言

- app.js 动态加载 `selector.js` 后才初始化；脚本轮询 `#question` 非空且 `localStorage["astroQuizState.v3"]` 出现，最长 **5 秒**，超时记为失败。
- 每次作答后校验：`v3.step` +1、`v3.currentId` 变化且仍是题库题目、`v3.q[oldId]` 的 `seen/wrong/box/lastStep/due`、`v3.log` 最后一条的 `{id,type,ok,step}`。
- 点击后仅约 250ms（反馈尚未结束）就读取 v3，验证“先保存下一题、再播放反馈/切题动画”。
- 刷新后校验 `#question` 与 `v3.currentId` 均恢复到同一题，`step` / `log` 不丢。
- 连续作答 12 次，用 `v3.log` 校验相邻不重复，并校验每个新题都不在之前最近 10 题中（含当前题）。
- v2 → v3：写入合法 `astroQuizState.v2`（含 3 条 answers）并移除 v3，刷新后校验 `step/q/log` 与旧数据一致，且 v2 原始字符串保留。
- v1 → v3：写入合法 `astroQuizState.v1`（`order/index/answers`）并移除 v3/v2，刷新后校验 `step/q/log` 与旧数据一致，且 v1 原始字符串保留。
- 冷启动：新浏览器上下文（localStorage 为空），连续 16 题全部点正确选项（box 2、3 天后才到期，不触发到期复习），用 `v3.log` 校验类型序列严格等于 `TYPE_ORDER` 每类 2 题。
- v3 零容忍回退：注入 `currentId`/`q`/`log` 均含题库外 id 的 v3（并移除 v1/v2），刷新后校验整份 v3 被判非法并重写为空状态（step=0、q/log 空、currentId 合法），页面仍正常出题。对应 README 记录的“题库 ID 变更/删除 → 回退”已知限制。
- v3 非法但旧数据可迁移（F2 风险修正，三个隔离场景）：① `currentId` 合法、`q` key 与 `log` id 含题库外 id 且无 v1/v2 → 回退为空 v3；② `currentId` 合法、`log` id 非法但存在合法 v2 → 按 v2 迁移到 v3，且 v2 原始字符串保留；③ `currentId` 合法、`q` key 非法但存在合法 v1 → 按 v1 迁移到 v3，且 v1 原始字符串保留。
- `box` 上限从页面 `window.AstroSelector.CONFIG.intervalsDays.length - 1` 派生（当前为 5），`q[oldId]` 的 box 校验与迁移期望均不硬编码 5。
- 本脚本**不做纯随机断言**；掌握度、softmax、Leitner 到期等算法细节由 `qa/selector.test.mjs` 与 `scripts/simulate.mjs` 覆盖。

## 交互与非功能断言

- 界面只有题目 + 类别小字 + 4 个选项，无 `#progress` 题号文字、无 `.bar` 进度条。
- 题目下方 `#questionType` 灰色小字显示 `类别：<type>`：校验文本与当前题 `type` 一致、字号 ≤ 14px、颜色为灰色系，并随切题更新。
- 对错反馈：正确项 `.correct` 绿色边框、选错项 `.wrong` 红色边框（同时校验计算样式 RGB）；答对约 600ms 后自动淡出/淡入切到下一题。
- 答错解析：答错后 `#explain` 展开题库 `explain` 文本（`**加粗**` 已渲染为 `<strong>`，不显示字面量）；600ms 反馈结束后出现“轻触继续”，页面不自动切题；轻触后淡出切到下一题；答对时不显示解析。
- 防连点：同步双点不同选项、同步双点同一选项、间隔 50ms 双点，均只前进 1 题、只保存 1 条 log。
- 键盘：`A` 与 `2` 键均可选答，反馈与 v3 落盘正确。
- 长题干 / 长选项正常换行、无横向溢出；内容最多的前 3 道题在小屏可滚动到底、末选项可见。

## 控制台错误 / 页面异常 / 请求失败

无（两个视口全程 0 条 console error / warning / pageerror / requestfailed）。

## www/ 外部 URL 检查

grep 检查 `www/*.html|css|js|json` 中 `http://` / `https://`：0 处，全部资源本地引用。

## 长题目场景

动态从 `window.QUESTION_BANK` 计算候选，并注入 localStorage（currentId=目标题、step=0、q/log 为空）后刷新：

- 综合最长（题干长度 + 最长选项长度）：`2020-29`（题干 60 字，最长选项 93 字）；
- 最长题干：`2017-21`（134 字）；

### 内容最多题的垂直可达性（防 flex 居中裁切 / 底部不可滚动）

| 视口 | 题 ID | innerHeight | scrollHeight | quizTop | 最大 scrollY | 末选项底部 | 结果 |
|---|---|---|---|---|---|---|---|
| 360x640 | 2020-29 | 640 | 889 | 0.0 | 249 | 616.1 | PASS |
| 360x640 | 2017-21 | 640 | 640 | 30.5 | 0 | 609.5 | PASS |
| 360x640 | 2017-37 | 640 | 640 | 46.5 | 0 | 593.5 | PASS |
| 412x915 | 2020-29 | 915 | 915 | 51.9 | 0 | 863.1 | PASS |
| 412x915 | 2017-21 | 915 | 915 | 160.8 | 0 | 754.2 | PASS |
| 412x915 | 2017-37 | 915 | 915 | 178.4 | 0 | 736.6 | PASS |

## 未验证项 / 限制

- 仅桌面无头 Chromium 的 file:// 环境，未覆盖真机 Android WebView 与 Capacitor SystemBars 注入的 safe-area（本机模拟器不可用）。
- 未验证 APK 包内资源、Android 启动页与系统栏在真机上的实际渲染（包内资源由打包步骤用 unzip/aapt2 静态校验）。
- 未验证屏幕阅读器无障碍；键盘仅验证 `A` / `2` 两条路径（代码路径与 A-D / 1-4 同一处理）。
- 未验证低端设备动画掉帧、真机触屏长按/双击缩放行为。
- `@media (hover:hover)` 触屏分支无法在桌面无头 Chromium 中真实复现（依赖 isMobile/hasTouch 模拟）。
- 自适应差异（低掌握度类型更常出现、softmax 抽样等）不在浏览器验收中做随机断言，由单元测试与四场景模拟覆盖。
- README 所述“冷启动因到期复习插入而偏移”的异常路径未在浏览器验收中确定性复现（依赖随机题目与到期时间）；浏览器只验证无到期复习时的理想轮转，偏移场景由单元测试 / 模拟覆盖。
- F2 修正后仍属“整份回退”：契约零容忍，应用不会逐题清洗 v3；“v3.currentId 合法但 q key / log id 非法”的三个场景使用合成数据，未覆盖真实题库 ID 大批变更后的用户数据。

## 失败断言

无。

