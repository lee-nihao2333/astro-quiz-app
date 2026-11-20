# Web 端验收报告（qa/verify.mjs）

- 生成时间：2026-11-20T14:53:36.409Z
- 被测页面：`/home/marvin/astro-quiz-app/www/index.html`（file:// 打开，未启动服务器）
- 浏览器：Chromium 156.0.8078.4（playwright-core 1.64.1）
- 视口：360×640、412×915（deviceScaleFactor=1，isMobile+hasTouch）
- git HEAD：08b901c
- 结论：**全部通过**（共 387 条断言，通过 387）

## 断言明细

| # | 断言 ID | 描述 | 期望 | 实际 | 结果 |
|---|---|---|---|---|---|
| 1 | global/www-no-external-url | www/ 内无任何 http(s) 外部 URL | 0 处 | 0 处 | PASS |
| 2 | global/www-index-exists | www/index.html 存在 | true | true | PASS |
| 3 | global/www-questions-exists | www/questions.js 存在 | true | true | PASS |
| 4 | global/www-daily-exists | www/daily.js 存在（每日目标模块） | true | true | PASS |
| 5 | 360x640/bank-length | window.QUESTION_BANK.length | 485 | 485 | PASS |
| 6 | 360x640/selector-config | window.AstroSelector.CONFIG 可读，box 上限 = intervalsDays.length - 1 | true | intervalsDays=[0,1,3,7,21,60], maxBox=5, logLimit=500 | PASS |
| 7 | 360x640/daily-free-mode-initial | 初始加载（已注入当天完成）：#daily 隐藏、#freeMode 显示 | true | dailyExists=true, dailyHidden=true, freeModeHidden=false | PASS |
| 8 | 360x640/daily-count-initial | 初始加载：#dailyCount 为 10 / 10（已完成，进度条隐藏） | 10 / 10 | 10 / 10 | PASS |
| 9 | 360x640/daily-fill-initial | 自由刷题模式无可见进度条（#dailyFill 可见宽度为 0） | true | fillWidth=0px | PASS |
| 10 | 360x640/daily-aria-initial | 初始加载：#dailyTrack 的 aria-valuenow 为 10 | 10 | 10 | PASS |
| 11 | 360x640/daily-storage-initial | 初始存储为今天 correct=10 且 completedAt 为数字 | true | {"day":"2026-11-20","correct":10,"completedAt":1795186341267} | PASS |
| 12 | 360x640/free-mode-visible-initial | 初始加载：#freeMode 显示「自由刷题」 | true | exists=true, hidden=false, text=今日目标已完成 · 自由刷题 | PASS |
| 13 | 360x640/legacy-progress-absent | 旧版 #progress 题号文字 / .bar 进度条不存在 | true | #progress=false, .bar=false | PASS |
| 14 | 360x640/question-nonempty | 题目文字非空（动态加载 selector 后已初始化） | true | 昨天（2010 年 11 月 13 日）为农历初八，昨天的月相是______。 | PASS |
| 15 | 360x640/question-type-text | 题目下方灰色小字显示当前题目类别 | 类别：天象与时间历法 | 类别：天象与时间历法 | PASS |
| 16 | 360x640/question-type-small-gray | 类别小字：字号 ≤ 14px 且为灰色系 | true | fontSize=12px, color=rgb(138, 147, 178) | PASS |
| 17 | 360x640/option-count | 选项按钮数量 | 4 | 4 | PASS |
| 18 | 360x640/option-letters | 选项字母 A B C D | A,B,C,D | A,B,C,D | PASS |
| 19 | 360x640/option-text-nonempty | 4 个选项文字均非空 | true | ["新月","上弦月","盈凸月","望"] | PASS |
| 20 | 360x640/state-initial-v3 | 初始 localStorage v3 合法（currentId 在题库、step=0、q/log 为空） | true | currentId=2010-2, step=0, q=0, log=0 | PASS |
| 21 | 360x640/initial-no-h-overflow | 初始界面无横向溢出 | true | scrollWidth=360, innerWidth=360, overflow=0px | PASS |
| 22 | 360x640/shot-initial-size | 初始截图尺寸 | 360x640 | 360x640 | PASS |
| 23 | 360x640/feedback-progress | 反馈期间仍停留在当前题（600ms 反馈，未提前切题） | 昨天（2010 年 11 月 13 日）为农历初八，昨天的月相是______。 | 昨天（2010 年 11 月 13 日）为农历初八，昨天的月相是______。 | PASS |
| 24 | 360x640/feedback-correct-marked | 反馈：正确项被标记为绿色（.correct） | [1] | [1] | PASS |
| 25 | 360x640/feedback-wrong-marked | 反馈：答对时没有红色标记（.wrong） | [] | [] | PASS |
| 26 | 360x640/feedback-correct-no-explanation | 答对时不显示解析面板 | true | hidden=true | PASS |
| 27 | 360x640/shot-feedback-size | 反馈截图尺寸 | 360x640 | 360x640 | PASS |
| 28 | 360x640/natural-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 29 | 360x640/natural-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2016-1 | PASS |
| 30 | 360x640/natural-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795445541466} | PASS |
| 31 | 360x640/natural-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2010-2","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 32 | 360x640/after-answer-question-changed | 约 600ms 反馈 + 淡出后切换到 v3.currentId 对应的新题 | true | 对于身处北京的天文爱好者来说，今天太阳从哪个方向升起？ | PASS |
| 33 | 360x640/after-answer-option-count | 换题后选项按钮数量 | 4 | 4 | PASS |
| 34 | 360x640/after-answer-fade-cleared | 淡入淡出结束（fade class 移除） | true | fade=false | PASS |
| 35 | 360x640/after-answer-daily-visible | 自由刷题模式下切题后 #daily 仍隐藏、#freeMode 显示 | true | dailyHidden=true, freeModeHidden=false | PASS |
| 36 | 360x640/after-answer-daily-count | 自由刷题模式下 #dailyCount 保持 10 / 10 | 10 / 10 | 10 / 10 | PASS |
| 37 | 360x640/after-answer-daily-fill | 自由刷题模式无可见进度条（#dailyFill 可见宽度为 0） | true | ratio=-1, fillWidth=0px | PASS |
| 38 | 360x640/question-type-updated | 切题后类别小字同步更新为新题类型 | 类别：天象与时间历法 | 类别：天象与时间历法 | PASS |
| 39 | 360x640/shot-after-answer-size | 作答后截图尺寸 | 360x640 | 360x640 | PASS |
| 40 | 360x640/resume-question | 刷新后恢复到同一道题 | 对于身处北京的天文爱好者来说，今天太阳从哪个方向升起？ | 对于身处北京的天文爱好者来说，今天太阳从哪个方向升起？ | PASS |
| 41 | 360x640/resume-state | 刷新后 v3 currentId/step/log 不丢 | true | currentId=2016-1, step=1, log=1 | PASS |
| 42 | 360x640/resume-no-h-overflow | 刷新后无横向溢出 | true | overflow=0px | PASS |
| 43 | 360x640/resume-option-count | 刷新后选项按钮数量 | 4 | 4 | PASS |
| 44 | 360x640/resume-daily-count | 刷新续做后 #dailyCount 保持 10 / 10（自由刷题已持久化） | 10 / 10 | 10 / 10 | PASS |
| 45 | 360x640/resume-daily-visible | 刷新续做后 #daily 仍隐藏、#freeMode 仍显示 | true | dailyHidden=true, freeModeHidden=false | PASS |
| 46 | 360x640/shot-resume-size | 续做截图尺寸 | 360x640 | 360x640 | PASS |
| 47 | 360x640/wrong-daily-count | 确定性答错后 #dailyCount 保持 10 / 10（自由刷题不推进） | 10 / 10 | 10 / 10 | PASS |
| 48 | 360x640/wrong-daily-storage | 确定性答错后存储 correct 仍为 10 | true | {"day":"2026-11-20","correct":10,"completedAt":1795186341267} | PASS |
| 49 | 360x640/feedback-wrong-case-correct-marked | 确定性选错：正确项标绿 | [2] | [2] | PASS |
| 50 | 360x640/feedback-wrong-case-selected-marked | 确定性选错：选中项标红 | [0] | [0] | PASS |
| 51 | 360x640/feedback-wrong-case-green | 确定性选错：正确项边框为绿色系（计算样式） | true | rgba(94, 220, 154, 0.95) | PASS |
| 52 | 360x640/feedback-wrong-case-red | 确定性选错：选中项边框为红色系（计算样式） | true | rgba(255, 120, 120, 0.95) | PASS |
| 53 | 360x640/explain-visible-wrong | 答错后显示解析面板（#explain） | true | hidden=false | PASS |
| 54 | 360x640/explain-text | 解析文本与题库 explain 一致（去掉 ** 标记） | 1609年伽利略把望远镜指向天空观测天体，2009年国际天文年正是纪念望远镜用于天文观测400周年，故选 C。 | 1609年伽利略把望远镜指向天空观测天体，2009年国际天文年正是纪念望远镜用于天文观测400周年，故选 C。 | PASS |
| 55 | 360x640/explain-bold | 解析中的 **加粗** 渲染为 <strong> | ["C"] | ["C"] | PASS |
| 56 | 360x640/explain-hint-hidden-initially | 600ms 反馈期间暂不显示“轻触继续” | true | hintHidden=true | PASS |
| 57 | 360x640/wrong-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 58 | 360x640/wrong-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2011-35 | PASS |
| 59 | 360x640/wrong-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":1,"box":0,"lastStep":1,"due":0} | PASS |
| 60 | 360x640/wrong-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-1","type":"天文史、人物与综合常识","ok":false,"step":1} | PASS |
| 61 | 360x640/explain-hint-visible | 反馈结束后显示“轻触继续”提示 | true | hintHidden=false | PASS |
| 62 | 360x640/explain-no-auto-advance | 答错后不自动切题，等待用户阅读解析 | true | questionChanged=false | PASS |
| 63 | 360x640/shot-feedback-wrong-size | 选错解析截图尺寸 | 360x640 | 360x640 | PASS |
| 64 | 360x640/feedback-wrong-case-next | 轻触继续后进入下一题，v3.currentId 与页面一致 | true | next=2011-35 | PASS |
| 65 | 360x640/explain-hidden-after-next | 切题后解析面板隐藏 | true | hidden=true | PASS |
| 66 | 360x640/right-daily-count | 自由刷题模式下确定性答对后 #dailyCount 仍为 10 / 10 | 10 / 10 | 10 / 10 | PASS |
| 67 | 360x640/right-daily-free-mode | 自由刷题模式下继续答对：#daily 隐藏、#freeMode 显示、aria-valuenow 为 goal | true | dailyHidden=true, freeModeHidden=false, aria=10 | PASS |
| 68 | 360x640/feedback-right-case-correct-marked | 确定性选对：选中项标绿 | [0] | [0] | PASS |
| 69 | 360x640/feedback-right-case-no-wrong | 确定性选对：没有红色标记 | [] | [] | PASS |
| 70 | 360x640/feedback-right-case-green | 确定性选对：正确项边框为绿色系（计算样式） | true | rgba(94, 220, 154, 0.95) | PASS |
| 71 | 360x640/feedback-right-case-no-explanation | 确定性选对：不显示解析面板 | true | hidden=true | PASS |
| 72 | 360x640/shot-feedback-correct-size | 选对反馈截图尺寸 | 360x640 | 360x640 | PASS |
| 73 | 360x640/right-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 74 | 360x640/right-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2020-15 | PASS |
| 75 | 360x640/right-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795445543894} | PASS |
| 76 | 360x640/right-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-2","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 77 | 360x640/feedback-right-case-next | 选对反馈结束后进入下一题，v3.currentId 与页面一致 | true | next=2020-15 | PASS |
| 78 | 360x640/long-opt-question | 长题场景定位到目标题 | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | PASS |
| 79 | 360x640/long-opt-h-overflow | 长题（题干+选项最长）文档无横向溢出 | true | scrollWidth=360, innerWidth=360, overflow=0px | PASS |
| 80 | 360x640/long-opt-question-wrap | 长题题干发生换行（行数 ≥ 2） | true | lines=4 (byHeight=4, byRange=4) | PASS |
| 81 | 360x640/long-opt-option-wrap | 长选项文字发生换行（≥1 个选项行数 ≥ 2） | true | 换行选项数=4, 各选项行数=[6,6,5,5] | PASS |
| 82 | 360x640/long-opt-option-no-overflow | 选项文字无横向溢出（scrollWidth ≤ clientWidth） | true | 各选项溢出=[0,0,0,0] | PASS |
| 83 | 360x640/long-opt-option-count | 长题选项按钮数量 | 4 | 4 | PASS |
| 84 | 360x640/shot-long-size | 长题截图尺寸 | 360x640 | 360x640 | PASS |
| 85 | 360x640/long-stem-question | 最长题干场景定位到目标题 | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | PASS |
| 86 | 360x640/long-stem-h-overflow | 最长题干无横向溢出 | true | overflow=0px | PASS |
| 87 | 360x640/long-stem-wrap | 最长题干发生换行（行数 ≥ 3） | true | lines=8 | PASS |
| 88 | 360x640/shot-long-stem-size | 最长题干截图尺寸 | true | 360x640 | PASS |
| 89 | 360x640/tallest-1-top-reachable | 内容最多题 2020-29 顶部未被裁切（quizTop ≥ 0） | true | quizTop=24.0, scrollHeight=922, innerHeight=640 | PASS |
| 90 | 360x640/tallest-1-bottom-reachable | 内容最多题 2020-29 滚动到底后末选项可见（可达） | true | maxScroll=282, lastOptionBottom=616.1, innerHeight=640 | PASS |
| 91 | 360x640/tallest-2-top-reachable | 内容最多题 2017-21 顶部未被裁切（quizTop ≥ 0） | true | quizTop=24.0, scrollHeight=660, innerHeight=640 | PASS |
| 92 | 360x640/tallest-2-bottom-reachable | 内容最多题 2017-21 滚动到底后末选项可见（可达） | true | maxScroll=20, lastOptionBottom=616.0, innerHeight=640 | PASS |
| 93 | 360x640/tallest-3-top-reachable | 内容最多题 2017-37 顶部未被裁切（quizTop ≥ 0） | true | quizTop=30.0, scrollHeight=640, innerHeight=640 | PASS |
| 94 | 360x640/tallest-3-bottom-reachable | 内容最多题 2017-37 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=610.0, innerHeight=640 | PASS |
| 95 | 360x640/recent-exclude-completed | 连续作答 12 题全部完成并切题 | true | 12/12 | PASS |
| 96 | 360x640/recent-step | 连续作答后 v3.step 与 log 长度一致（12） | {"step":12,"log":12} | {"step":12,"log":12} | PASS |
| 97 | 360x640/recent-adjacent-no-repeat | 连续作答的相邻题目不重复 | [] | [] | PASS |
| 98 | 360x640/recent-10-exclusion | 每道新题都不在之前最近 10 题中（含当前题） | true | 最近 10 题均无重复 | PASS |
| 99 | 360x640/recent-current-valid | 连续作答后当前题仍是题库中的有效题 | true | currentId=2011-26 | PASS |
| 100 | 360x640/double-click-different-step | 同步连点两个不同选项只前进 1 题 | 1 | 1 | PASS |
| 101 | 360x640/double-click-different-log | 同步连点不同选项只记录 1 条作答（第一次点击的题） | 1 | 1 | PASS |
| 102 | 360x640/double-click-different-current | 同步连点只出一次下一题（currentId 变化） | true | true | PASS |
| 103 | 360x640/double-click-same-step | 同步连点同一选项两次只前进 1 题 | 2 | 2 | PASS |
| 104 | 360x640/double-click-same-current | 同步连点同一选项只出一次下一题 | true | true | PASS |
| 105 | 360x640/double-click-50ms-step | 间隔 50ms 连点两次只前进 1 题 | 3 | 3 | PASS |
| 106 | 360x640/double-click-50ms-current | 间隔 50ms 连点只出一次下一题 | true | true | PASS |
| 107 | 360x640/shot-double-click-size | 防连点截图尺寸 | true | 360x640 | PASS |
| 108 | 360x640/keyboard-a-feedback | 键盘 A 键选择第 1 项（正确）并显示绿色反馈 | {"correct":[0],"wrong":[]} | {"correct":[0],"wrong":[]} | PASS |
| 109 | 360x640/keyboard-a-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 110 | 360x640/keyboard-a-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2019-60 | PASS |
| 111 | 360x640/keyboard-a-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795445560210} | PASS |
| 112 | 360x640/keyboard-a-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-2","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 113 | 360x640/keyboard-a-next | 键盘 A 键答对后自动切题 | true | 已切题 | PASS |
| 114 | 360x640/keyboard-2-feedback | 键盘 2 键选择第 2 项（正确）并显示绿色反馈 | {"correct":[1],"wrong":[]} | {"correct":[1],"wrong":[]} | PASS |
| 115 | 360x640/keyboard-2-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 116 | 360x640/keyboard-2-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2014-10 | PASS |
| 117 | 360x640/keyboard-2-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795445561197} | PASS |
| 118 | 360x640/keyboard-2-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-4","type":"太阳系与月球","ok":true,"step":1} | PASS |
| 119 | 360x640/keyboard-2-next | 数字键 2 答对后自动切题 | true | 已切题 | PASS |
| 120 | 360x640/daily-count-before-migration | 本视口多次答对后 #dailyCount 仍为 10 / 10 | 10 / 10 | 10 / 10 | PASS |
| 121 | 360x640/daily-state-before-migration | 自由刷题状态保持：#daily 隐藏、#freeMode 显示、correct=goal、completedAt 为数字 | true | count=10 / 10, aria=10, daily={"day":"2026-11-20","correct":10,"completedAt":1795186341267} | PASS |
| 122 | 360x640/v2-migration-step | v2 迁移后 v3.step = v2.answers.length | 3 | 3 | PASS |
| 123 | 360x640/v2-migration-currentId | v2 迁移后 v3.currentId = v2.currentId | 2009-3 | 2009-3 | PASS |
| 124 | 360x640/v2-migration-q | v2 迁移后 v3.q 正确（seen/wrong/box/lastStep/due） | true | 全部匹配 | PASS |
| 125 | 360x640/v2-migration-log | v2 迁移后 v3.log 按 v2.answers 顺序与 step 正确 | true | 全部匹配 | PASS |
| 126 | 360x640/v2-key-preserved | v2 迁移后 astroQuizState.v2 原样保留 | 115 字节 | 115 字节 | PASS |
| 127 | 360x640/v2-migration-question | v2 迁移后展示 v2.currentId 对应题目 | 光年是天文学中的 | 光年是天文学中的 | PASS |
| 128 | 360x640/v1-migration-step | v1 迁移后 v3.step = v1.answers.length | 2 | 2 | PASS |
| 129 | 360x640/v1-migration-currentId | v1 迁移后 v3.currentId = order[index] | 2009-6 | 2009-6 | PASS |
| 130 | 360x640/v1-migration-q | v1 迁移后 v3.q 正确（seen/wrong/box/lastStep/due） | true | 全部匹配 | PASS |
| 131 | 360x640/v1-migration-log | v1 迁移后 v3.log 按 v1.answers 顺序与 step 正确 | true | 全部匹配 | PASS |
| 132 | 360x640/v1-key-preserved | v1 迁移后 astroQuizState.v1 原样保留 | 4839 字节 | 4839 字节 | PASS |
| 133 | 360x640/v1-migration-question | v1 迁移后展示 order[index] 对应题目 | 除太阳以外，全天最亮的恒星是 | 除太阳以外，全天最亮的恒星是 | PASS |
| 134 | 360x640/v3-invalid-fallback-state | v3 含题库外 id 时整份判非法并回退为空 v3（step=0、q/log 空、currentId 合法） | true | currentId=2009-2, step=0, q=0, log=0 | PASS |
| 135 | 360x640/v3-invalid-fallback-question | 回退后页面仍展示有效题目（未显示题库加载失败） | true | 2009年7月22日，在北京可以观测到 | PASS |
| 136 | 360x640/v3-invalid-valid-currentid-q-fallback | v3.currentId 合法但 q key / log id 含题库外 id → 判非法并回退为空 v3（页面仍出题） | true | currentId=2012-14, step=0, q=0, log=0 | PASS |
| 137 | 360x640/v3-invalid-valid-currentid-q-question | 非法 v3（currentId 合法）回退后页面展示有效题目，未显示题库加载失败 | true | 太阳每年在黄道上经过______个星座。 | PASS |
| 138 | 360x640/v3-invalid-valid-currentid-v2-migration | v3（currentId 合法、log id 非法）判非法后按合法 v2 迁移到 v3 | true | step/q/log 与 v2 一致 | PASS |
| 139 | 360x640/v3-invalid-v2-key-preserved | v3 非法时按 v2 迁移后 astroQuizState.v2 原样保留 | 91 字节 | 91 字节 | PASS |
| 140 | 360x640/v3-invalid-v2-migration-question | v3 非法 → v2 迁移后展示 v2.currentId 对应题目 | 狮子座流星雨每年出现在 | 狮子座流星雨每年出现在 | PASS |
| 141 | 360x640/v3-invalid-valid-currentid-v1-migration | v3（currentId 合法、q key 非法）判非法后按合法 v1 迁移到 v3 | true | step/q/log 与 v1 一致 | PASS |
| 142 | 360x640/v3-invalid-v1-key-preserved | v3 非法时按 v1 迁移后 astroQuizState.v1 原样保留 | 4842 字节 | 4842 字节 | PASS |
| 143 | 360x640/v3-invalid-v1-migration-question | v3 非法 → v1 迁移后展示 order[index] 对应题目 | 金牛座中有一个著名的“七姐妹星团”，指的是 | 金牛座中有一个著名的“七姐妹星团”，指的是 | PASS |
| 144 | 360x640/no-console-errors | 页面无 console error / warning / pageerror / 请求失败 | true | "0 条" | PASS |
| 145 | 412x915/bank-length | window.QUESTION_BANK.length | 485 | 485 | PASS |
| 146 | 412x915/selector-config | window.AstroSelector.CONFIG 可读，box 上限 = intervalsDays.length - 1 | true | intervalsDays=[0,1,3,7,21,60], maxBox=5, logLimit=500 | PASS |
| 147 | 412x915/daily-free-mode-initial | 初始加载（已注入当天完成）：#daily 隐藏、#freeMode 显示 | true | dailyExists=true, dailyHidden=true, freeModeHidden=false | PASS |
| 148 | 412x915/daily-count-initial | 初始加载：#dailyCount 为 10 / 10（已完成，进度条隐藏） | 10 / 10 | 10 / 10 | PASS |
| 149 | 412x915/daily-fill-initial | 自由刷题模式无可见进度条（#dailyFill 可见宽度为 0） | true | fillWidth=0px | PASS |
| 150 | 412x915/daily-aria-initial | 初始加载：#dailyTrack 的 aria-valuenow 为 10 | 10 | 10 | PASS |
| 151 | 412x915/daily-storage-initial | 初始存储为今天 correct=10 且 completedAt 为数字 | true | {"day":"2026-11-20","correct":10,"completedAt":1795186362531} | PASS |
| 152 | 412x915/free-mode-visible-initial | 初始加载：#freeMode 显示「自由刷题」 | true | exists=true, hidden=false, text=今日目标已完成 · 自由刷题 | PASS |
| 153 | 412x915/legacy-progress-absent | 旧版 #progress 题号文字 / .bar 进度条不存在 | true | #progress=false, .bar=false | PASS |
| 154 | 412x915/question-nonempty | 题目文字非空（动态加载 selector 后已初始化） | true | 2017年秋分是9月23日，请问在秋分那一天日出日落之间及月出月落之间哪个间隔更 | PASS |
| 155 | 412x915/question-type-text | 题目下方灰色小字显示当前题目类别 | 类别：天象与时间历法 | 类别：天象与时间历法 | PASS |
| 156 | 412x915/question-type-small-gray | 类别小字：字号 ≤ 14px 且为灰色系 | true | fontSize=13px, color=rgb(138, 147, 178) | PASS |
| 157 | 412x915/option-count | 选项按钮数量 | 4 | 4 | PASS |
| 158 | 412x915/option-letters | 选项字母 A B C D | A,B,C,D | A,B,C,D | PASS |
| 159 | 412x915/option-text-nonempty | 4 个选项文字均非空 | true | ["日出日落间隔更长，约24分钟","日出日落间隔更长，约49分钟","月出月落间隔更长，约24分钟","月出月落间隔更长，约49分钟"] | PASS |
| 160 | 412x915/state-initial-v3 | 初始 localStorage v3 合法（currentId 在题库、step=0、q/log 为空） | true | currentId=2017-48, step=0, q=0, log=0 | PASS |
| 161 | 412x915/initial-no-h-overflow | 初始界面无横向溢出 | true | scrollWidth=412, innerWidth=412, overflow=0px | PASS |
| 162 | 412x915/shot-initial-size | 初始截图尺寸 | 412x915 | 412x915 | PASS |
| 163 | 412x915/feedback-progress | 反馈期间仍停留在当前题（600ms 反馈，未提前切题） | 2017年秋分是9月23日，请问在秋分那一天日出日落之间及月出月落之间哪个间隔更长？长多久？ | 2017年秋分是9月23日，请问在秋分那一天日出日落之间及月出月落之间哪个间隔更长？长多久？ | PASS |
| 164 | 412x915/feedback-correct-marked | 反馈：正确项被标记为绿色（.correct） | [1] | [1] | PASS |
| 165 | 412x915/feedback-wrong-marked | 反馈：答对时没有红色标记（.wrong） | [] | [] | PASS |
| 166 | 412x915/feedback-correct-no-explanation | 答对时不显示解析面板 | true | hidden=true | PASS |
| 167 | 412x915/shot-feedback-size | 反馈截图尺寸 | 412x915 | 412x915 | PASS |
| 168 | 412x915/natural-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 169 | 412x915/natural-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2018-29 | PASS |
| 170 | 412x915/natural-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795445562710} | PASS |
| 171 | 412x915/natural-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2017-48","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 172 | 412x915/after-answer-question-changed | 约 600ms 反馈 + 淡出后切换到 v3.currentId 对应的新题 | true | 之后小明一家离开北京，来到草原，准备观测（　）流星雨。 | PASS |
| 173 | 412x915/after-answer-option-count | 换题后选项按钮数量 | 4 | 4 | PASS |
| 174 | 412x915/after-answer-fade-cleared | 淡入淡出结束（fade class 移除） | true | fade=false | PASS |
| 175 | 412x915/after-answer-daily-visible | 自由刷题模式下切题后 #daily 仍隐藏、#freeMode 显示 | true | dailyHidden=true, freeModeHidden=false | PASS |
| 176 | 412x915/after-answer-daily-count | 自由刷题模式下 #dailyCount 保持 10 / 10 | 10 / 10 | 10 / 10 | PASS |
| 177 | 412x915/after-answer-daily-fill | 自由刷题模式无可见进度条（#dailyFill 可见宽度为 0） | true | ratio=-1, fillWidth=0px | PASS |
| 178 | 412x915/question-type-updated | 切题后类别小字同步更新为新题类型 | 类别：天象与时间历法 | 类别：天象与时间历法 | PASS |
| 179 | 412x915/shot-after-answer-size | 作答后截图尺寸 | 412x915 | 412x915 | PASS |
| 180 | 412x915/resume-question | 刷新后恢复到同一道题 | 之后小明一家离开北京，来到草原，准备观测（　）流星雨。 | 之后小明一家离开北京，来到草原，准备观测（　）流星雨。 | PASS |
| 181 | 412x915/resume-state | 刷新后 v3 currentId/step/log 不丢 | true | currentId=2018-29, step=1, log=1 | PASS |
| 182 | 412x915/resume-no-h-overflow | 刷新后无横向溢出 | true | overflow=0px | PASS |
| 183 | 412x915/resume-option-count | 刷新后选项按钮数量 | 4 | 4 | PASS |
| 184 | 412x915/resume-daily-count | 刷新续做后 #dailyCount 保持 10 / 10（自由刷题已持久化） | 10 / 10 | 10 / 10 | PASS |
| 185 | 412x915/resume-daily-visible | 刷新续做后 #daily 仍隐藏、#freeMode 仍显示 | true | dailyHidden=true, freeModeHidden=false | PASS |
| 186 | 412x915/shot-resume-size | 续做截图尺寸 | 412x915 | 412x915 | PASS |
| 187 | 412x915/wrong-daily-count | 确定性答错后 #dailyCount 保持 10 / 10（自由刷题不推进） | 10 / 10 | 10 / 10 | PASS |
| 188 | 412x915/wrong-daily-storage | 确定性答错后存储 correct 仍为 10 | true | {"day":"2026-11-20","correct":10,"completedAt":1795186362531} | PASS |
| 189 | 412x915/feedback-wrong-case-correct-marked | 确定性选错：正确项标绿 | [2] | [2] | PASS |
| 190 | 412x915/feedback-wrong-case-selected-marked | 确定性选错：选中项标红 | [0] | [0] | PASS |
| 191 | 412x915/feedback-wrong-case-green | 确定性选错：正确项边框为绿色系（计算样式） | true | rgba(94, 220, 154, 0.95) | PASS |
| 192 | 412x915/feedback-wrong-case-red | 确定性选错：选中项边框为红色系（计算样式） | true | rgba(255, 120, 120, 0.95) | PASS |
| 193 | 412x915/explain-visible-wrong | 答错后显示解析面板（#explain） | true | hidden=false | PASS |
| 194 | 412x915/explain-text | 解析文本与题库 explain 一致（去掉 ** 标记） | 1609年伽利略把望远镜指向天空观测天体，2009年国际天文年正是纪念望远镜用于天文观测400周年，故选 C。 | 1609年伽利略把望远镜指向天空观测天体，2009年国际天文年正是纪念望远镜用于天文观测400周年，故选 C。 | PASS |
| 195 | 412x915/explain-bold | 解析中的 **加粗** 渲染为 <strong> | ["C"] | ["C"] | PASS |
| 196 | 412x915/explain-hint-hidden-initially | 600ms 反馈期间暂不显示“轻触继续” | true | hintHidden=true | PASS |
| 197 | 412x915/wrong-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 198 | 412x915/wrong-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2016-12 | PASS |
| 199 | 412x915/wrong-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":1,"box":0,"lastStep":1,"due":0} | PASS |
| 200 | 412x915/wrong-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-1","type":"天文史、人物与综合常识","ok":false,"step":1} | PASS |
| 201 | 412x915/explain-hint-visible | 反馈结束后显示“轻触继续”提示 | true | hintHidden=false | PASS |
| 202 | 412x915/explain-no-auto-advance | 答错后不自动切题，等待用户阅读解析 | true | questionChanged=false | PASS |
| 203 | 412x915/shot-feedback-wrong-size | 选错解析截图尺寸 | 412x915 | 412x915 | PASS |
| 204 | 412x915/feedback-wrong-case-next | 轻触继续后进入下一题，v3.currentId 与页面一致 | true | next=2016-12 | PASS |
| 205 | 412x915/explain-hidden-after-next | 切题后解析面板隐藏 | true | hidden=true | PASS |
| 206 | 412x915/right-daily-count | 自由刷题模式下确定性答对后 #dailyCount 仍为 10 / 10 | 10 / 10 | 10 / 10 | PASS |
| 207 | 412x915/right-daily-free-mode | 自由刷题模式下继续答对：#daily 隐藏、#freeMode 显示、aria-valuenow 为 goal | true | dailyHidden=true, freeModeHidden=false, aria=10 | PASS |
| 208 | 412x915/feedback-right-case-correct-marked | 确定性选对：选中项标绿 | [0] | [0] | PASS |
| 209 | 412x915/feedback-right-case-no-wrong | 确定性选对：没有红色标记 | [] | [] | PASS |
| 210 | 412x915/feedback-right-case-green | 确定性选对：正确项边框为绿色系（计算样式） | true | rgba(94, 220, 154, 0.95) | PASS |
| 211 | 412x915/feedback-right-case-no-explanation | 确定性选对：不显示解析面板 | true | hidden=true | PASS |
| 212 | 412x915/shot-feedback-correct-size | 选对反馈截图尺寸 | 412x915 | 412x915 | PASS |
| 213 | 412x915/right-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 214 | 412x915/right-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2019-27 | PASS |
| 215 | 412x915/right-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795445565175} | PASS |
| 216 | 412x915/right-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-2","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 217 | 412x915/feedback-right-case-next | 选对反馈结束后进入下一题，v3.currentId 与页面一致 | true | next=2019-27 | PASS |
| 218 | 412x915/long-opt-question | 长题场景定位到目标题 | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | 2019 年和 2020 年诺贝尔物理学奖都颁发给了天文学家，或者在天文学研究领域做出重要贡献的科学家。以下哪项是错的？ | PASS |
| 219 | 412x915/long-opt-h-overflow | 长题（题干+选项最长）文档无横向溢出 | true | scrollWidth=412, innerWidth=412, overflow=0px | PASS |
| 220 | 412x915/long-opt-question-wrap | 长题题干发生换行（行数 ≥ 2） | true | lines=4 (byHeight=4, byRange=4) | PASS |
| 221 | 412x915/long-opt-option-wrap | 长选项文字发生换行（≥1 个选项行数 ≥ 2） | true | 换行选项数=4, 各选项行数=[5,5,4,4] | PASS |
| 222 | 412x915/long-opt-option-no-overflow | 选项文字无横向溢出（scrollWidth ≤ clientWidth） | true | 各选项溢出=[0,0,0,0] | PASS |
| 223 | 412x915/long-opt-option-count | 长题选项按钮数量 | 4 | 4 | PASS |
| 224 | 412x915/shot-long-size | 长题截图尺寸 | 412x915 | 412x915 | PASS |
| 225 | 412x915/long-stem-question | 最长题干场景定位到目标题 | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | 2017年8月22日和25日，世界上最大的单体射电望远镜FAST发现了两颗脉冲星：一颗编号J1859-0131，自转周期为1.83秒，据估算距离地球1.6万光年；一颗编号J1931-01，自转周期0.59秒，据估算距离地球约4100光年。请问FAST的直径和所在地区： | PASS |
| 226 | 412x915/long-stem-h-overflow | 最长题干无横向溢出 | true | overflow=0px | PASS |
| 227 | 412x915/long-stem-wrap | 最长题干发生换行（行数 ≥ 3） | true | lines=7 | PASS |
| 228 | 412x915/shot-long-stem-size | 最长题干截图尺寸 | true | 412x915 | PASS |
| 229 | 412x915/tallest-1-top-reachable | 内容最多题 2020-29 顶部未被裁切（quizTop ≥ 0） | true | quizTop=33.4, scrollHeight=915, innerHeight=915 | PASS |
| 230 | 412x915/tallest-1-bottom-reachable | 内容最多题 2020-29 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=881.6, innerHeight=915 | PASS |
| 231 | 412x915/tallest-2-top-reachable | 内容最多题 2017-21 顶部未被裁切（quizTop ≥ 0） | true | quizTop=142.3, scrollHeight=915, innerHeight=915 | PASS |
| 232 | 412x915/tallest-2-bottom-reachable | 内容最多题 2017-21 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=772.7, innerHeight=915 | PASS |
| 233 | 412x915/tallest-3-top-reachable | 内容最多题 2017-37 顶部未被裁切（quizTop ≥ 0） | true | quizTop=159.9, scrollHeight=915, innerHeight=915 | PASS |
| 234 | 412x915/tallest-3-bottom-reachable | 内容最多题 2017-37 滚动到底后末选项可见（可达） | true | maxScroll=0, lastOptionBottom=755.1, innerHeight=915 | PASS |
| 235 | 412x915/recent-exclude-completed | 连续作答 12 题全部完成并切题 | true | 12/12 | PASS |
| 236 | 412x915/recent-step | 连续作答后 v3.step 与 log 长度一致（12） | {"step":12,"log":12} | {"step":12,"log":12} | PASS |
| 237 | 412x915/recent-adjacent-no-repeat | 连续作答的相邻题目不重复 | [] | [] | PASS |
| 238 | 412x915/recent-10-exclusion | 每道新题都不在之前最近 10 题中（含当前题） | true | 最近 10 题均无重复 | PASS |
| 239 | 412x915/recent-current-valid | 连续作答后当前题仍是题库中的有效题 | true | currentId=2009-15 | PASS |
| 240 | 412x915/double-click-different-step | 同步连点两个不同选项只前进 1 题 | 1 | 1 | PASS |
| 241 | 412x915/double-click-different-log | 同步连点不同选项只记录 1 条作答（第一次点击的题） | 1 | 1 | PASS |
| 242 | 412x915/double-click-different-current | 同步连点只出一次下一题（currentId 变化） | true | true | PASS |
| 243 | 412x915/double-click-same-step | 同步连点同一选项两次只前进 1 题 | 2 | 2 | PASS |
| 244 | 412x915/double-click-same-current | 同步连点同一选项只出一次下一题 | true | true | PASS |
| 245 | 412x915/double-click-50ms-step | 间隔 50ms 连点两次只前进 1 题 | 3 | 3 | PASS |
| 246 | 412x915/double-click-50ms-current | 间隔 50ms 连点只出一次下一题 | true | true | PASS |
| 247 | 412x915/shot-double-click-size | 防连点截图尺寸 | true | 412x915 | PASS |
| 248 | 412x915/keyboard-a-feedback | 键盘 A 键选择第 1 项（正确）并显示绿色反馈 | {"correct":[0],"wrong":[]} | {"correct":[0],"wrong":[]} | PASS |
| 249 | 412x915/keyboard-a-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 250 | 412x915/keyboard-a-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2014-26 | PASS |
| 251 | 412x915/keyboard-a-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795445581555} | PASS |
| 252 | 412x915/keyboard-a-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-2","type":"天象与时间历法","ok":true,"step":1} | PASS |
| 253 | 412x915/keyboard-a-next | 键盘 A 键答对后自动切题 | true | 已切题 | PASS |
| 254 | 412x915/keyboard-2-feedback | 键盘 2 键选择第 2 项（正确）并显示绿色反馈 | {"correct":[1],"wrong":[]} | {"correct":[1],"wrong":[]} | PASS |
| 255 | 412x915/keyboard-2-v3-step | 作答后 v3.step = 旧 step + 1 | true | before=0, after=1 | PASS |
| 256 | 412x915/keyboard-2-v3-next-saved | 作答后 v3.currentId 变化且为题库中的下一题（反馈期间已落盘） | true | currentId=2016-27 | PASS |
| 257 | 412x915/keyboard-2-v3-record | v3.q[oldId] 正确（seen/wrong/box 0-5/lastStep==step/due 数字） | true | {"seen":1,"wrong":0,"box":2,"lastStep":1,"due":1795445582546} | PASS |
| 258 | 412x915/keyboard-2-v3-log-last | v3.log 最后一条匹配 {id, type, ok, step} | true | {"id":"2009-4","type":"太阳系与月球","ok":true,"step":1} | PASS |
| 259 | 412x915/keyboard-2-next | 数字键 2 答对后自动切题 | true | 已切题 | PASS |
| 260 | 412x915/daily-count-before-migration | 本视口多次答对后 #dailyCount 仍为 10 / 10 | 10 / 10 | 10 / 10 | PASS |
| 261 | 412x915/daily-state-before-migration | 自由刷题状态保持：#daily 隐藏、#freeMode 显示、correct=goal、completedAt 为数字 | true | count=10 / 10, aria=10, daily={"day":"2026-11-20","correct":10,"completedAt":1795186362531} | PASS |
| 262 | 412x915/v2-migration-step | v2 迁移后 v3.step = v2.answers.length | 3 | 3 | PASS |
| 263 | 412x915/v2-migration-currentId | v2 迁移后 v3.currentId = v2.currentId | 2009-3 | 2009-3 | PASS |
| 264 | 412x915/v2-migration-q | v2 迁移后 v3.q 正确（seen/wrong/box/lastStep/due） | true | 全部匹配 | PASS |
| 265 | 412x915/v2-migration-log | v2 迁移后 v3.log 按 v2.answers 顺序与 step 正确 | true | 全部匹配 | PASS |
| 266 | 412x915/v2-key-preserved | v2 迁移后 astroQuizState.v2 原样保留 | 115 字节 | 115 字节 | PASS |
| 267 | 412x915/v2-migration-question | v2 迁移后展示 v2.currentId 对应题目 | 光年是天文学中的 | 光年是天文学中的 | PASS |
| 268 | 412x915/v1-migration-step | v1 迁移后 v3.step = v1.answers.length | 2 | 2 | PASS |
| 269 | 412x915/v1-migration-currentId | v1 迁移后 v3.currentId = order[index] | 2009-6 | 2009-6 | PASS |
| 270 | 412x915/v1-migration-q | v1 迁移后 v3.q 正确（seen/wrong/box/lastStep/due） | true | 全部匹配 | PASS |
| 271 | 412x915/v1-migration-log | v1 迁移后 v3.log 按 v1.answers 顺序与 step 正确 | true | 全部匹配 | PASS |
| 272 | 412x915/v1-key-preserved | v1 迁移后 astroQuizState.v1 原样保留 | 4839 字节 | 4839 字节 | PASS |
| 273 | 412x915/v1-migration-question | v1 迁移后展示 order[index] 对应题目 | 除太阳以外，全天最亮的恒星是 | 除太阳以外，全天最亮的恒星是 | PASS |
| 274 | 412x915/v3-invalid-fallback-state | v3 含题库外 id 时整份判非法并回退为空 v3（step=0、q/log 空、currentId 合法） | true | currentId=2016-1, step=0, q=0, log=0 | PASS |
| 275 | 412x915/v3-invalid-fallback-question | 回退后页面仍展示有效题目（未显示题库加载失败） | true | 对于身处北京的天文爱好者来说，今天太阳从哪个方向升起？ | PASS |
| 276 | 412x915/v3-invalid-valid-currentid-q-fallback | v3.currentId 合法但 q key / log id 含题库外 id → 判非法并回退为空 v3（页面仍出题） | true | currentId=2012-17, step=0, q=0, log=0 | PASS |
| 277 | 412x915/v3-invalid-valid-currentid-q-question | 非法 v3（currentId 合法）回退后页面展示有效题目，未显示题库加载失败 | true | 在北京观测，下列哪个天体不可能在北边的天空观测到？ | PASS |
| 278 | 412x915/v3-invalid-valid-currentid-v2-migration | v3（currentId 合法、log id 非法）判非法后按合法 v2 迁移到 v3 | true | step/q/log 与 v2 一致 | PASS |
| 279 | 412x915/v3-invalid-v2-key-preserved | v3 非法时按 v2 迁移后 astroQuizState.v2 原样保留 | 91 字节 | 91 字节 | PASS |
| 280 | 412x915/v3-invalid-v2-migration-question | v3 非法 → v2 迁移后展示 v2.currentId 对应题目 | 狮子座流星雨每年出现在 | 狮子座流星雨每年出现在 | PASS |
| 281 | 412x915/v3-invalid-valid-currentid-v1-migration | v3（currentId 合法、q key 非法）判非法后按合法 v1 迁移到 v3 | true | step/q/log 与 v1 一致 | PASS |
| 282 | 412x915/v3-invalid-v1-key-preserved | v3 非法时按 v1 迁移后 astroQuizState.v1 原样保留 | 4842 字节 | 4842 字节 | PASS |
| 283 | 412x915/v3-invalid-v1-migration-question | v3 非法 → v1 迁移后展示 order[index] 对应题目 | 金牛座中有一个著名的“七姐妹星团”，指的是 | 金牛座中有一个著名的“七姐妹星团”，指的是 | PASS |
| 284 | 412x915/no-console-errors | 页面无 console error / warning / pageerror / 请求失败 | true | "0 条" | PASS |
| 285 | cold-start/completed | 空状态连续作答 16 题全部完成并切题 | 16 | 16 | PASS |
| 286 | cold-start/type-sequence | 冷启动类型序列 = TYPE_ORDER 每类 2 题（无到期复习时） | ["天象与时间历法","天象与时间历法","恒星与星座","恒星与星座","太阳系与月球","太阳系与月球","天文观测与望远镜","天文观测与望远镜","时事与新闻","时事与新闻","天文史、人物与综合常识","天文史、人物与综合常识","航天与空间探测","航天与空间探测","星系与宇宙","星系与宇宙"] | ["天象与时间历法","天象与时间历法","恒星与星座","恒星与星座","太阳系与月球","太阳系与月球","天文观测与望远镜","天文观测与望远镜","时事与新闻","时事与新闻","天文史、人物与综合常识","天文史、人物与综合常识","航天与空间探测","航天与空间探测","星系与宇宙","星系与宇宙"] | PASS |
| 287 | cold-start/step | 冷启动 16 题后 v3.step | 16 | 16 | PASS |
| 288 | cold-start/daily-progress | 16 题全对后处于自由刷题（#daily 隐藏、#freeMode 显示），计数保持 goal / goal | true | count=10 / 10, hidden=true, freeHidden=false, aria=10, daily={"day":"2026-11-20","correct":10,"completedAt":1795186383863} | PASS |
| 289 | cold-start/no-errors | 冷启动过程无 console error / warning / pageerror | true | 0 条 | PASS |
| 290 | daily-goal/initial-daily-visible | 全新上下文：#daily 可见、#dailyCount 为 0 / 10、#dailyFill 宽度 0、#freeMode 隐藏 | true | visible=true, count=0 / 10, fill=0px, aria=0, freeHidden=true | PASS |
| 291 | daily-goal/initial-daily-goal | AstroDaily.DAILY_GOAL 为 10 | 10 | 10 | PASS |
| 292 | daily-goal/initial-daily-storage | 初始存储为今天 0 / 10（day=AstroDaily.dayKey(Date.now())，correct=0，completedAt=null） | true | key=astroQuizDaily.v1, today=2026-11-20, daily={"day":"2026-11-20","correct":0,"completedAt":null} | PASS |
| 293 | daily-goal/wrong-count-held | 答错后 #dailyCount 仍为 0 / 10 | 0 / 10 | 0 / 10 | PASS |
| 294 | daily-goal/wrong-fill-zero | 答错后进度条填充保持 0 | true | hidden=false, ratio=0 | PASS |
| 295 | daily-goal/wrong-storage-held | 答错后存储 correct=0、completedAt=null | true | {"day":"2026-11-20","correct":0,"completedAt":null} | PASS |
| 296 | daily-goal/wrong-no-vibrate | 答错不震动（__vibrations 为空） | [] | [] | PASS |
| 297 | daily-goal/wrong-no-celebration | 答错不显示完成特效 | true | hidden=true, show=false | PASS |
| 298 | daily-goal/wrong-continue-hint | 答错反馈结束后显示「轻触继续」 | true | hidden=false, hintHidden=false | PASS |
| 299 | daily-goal/wrong-no-auto-advance | 答错后不自动切题，等待用户轻触继续 | true | questionChanged=false | PASS |
| 300 | daily-goal/wrong-continue-next | 答错后轻触继续并切到下一题 | true | 已切题 | PASS |
| 301 | daily-goal/start-count | 完成前重新注入后 #dailyCount 为 0 / 10 | 0 / 10 | 0 / 10 | PASS |
| 302 | daily-goal/start-fill | 完成前进度条填充为 0 | true | ratio=0 | PASS |
| 303 | daily-goal/progress-1-changed | 第 1 次答对后正常切题 | true | 已切题 | PASS |
| 304 | daily-goal/progress-1-count | 第 1 次答对后 #dailyCount 为 1 / 10 | 1 / 10 | 1 / 10 | PASS |
| 305 | daily-goal/progress-1-fill | 第 1 次答对后进度约 10% | true | ratio=0.1000（期望 0.1000） | PASS |
| 306 | daily-goal/progress-1-not-completed | 第 1 次答对未完成：进度条可见、存储 correct=1、无震动 / 特效 | true | dailyHidden=false, daily={"day":"2026-11-20","correct":1,"completedAt":null}, vibrations=[], celebrateHidden=true | PASS |
| 307 | daily-goal/progress-2-changed | 第 2 次答对后正常切题 | true | 已切题 | PASS |
| 308 | daily-goal/progress-2-count | 第 2 次答对后 #dailyCount 为 2 / 10 | 2 / 10 | 2 / 10 | PASS |
| 309 | daily-goal/progress-2-fill | 第 2 次答对后进度约 20% | true | ratio=0.2000（期望 0.2000） | PASS |
| 310 | daily-goal/progress-2-not-completed | 第 2 次答对未完成：进度条可见、存储 correct=2、无震动 / 特效 | true | dailyHidden=false, daily={"day":"2026-11-20","correct":2,"completedAt":null}, vibrations=[], celebrateHidden=true | PASS |
| 311 | daily-goal/progress-3-changed | 第 3 次答对后正常切题 | true | 已切题 | PASS |
| 312 | daily-goal/progress-3-count | 第 3 次答对后 #dailyCount 为 3 / 10 | 3 / 10 | 3 / 10 | PASS |
| 313 | daily-goal/progress-3-fill | 第 3 次答对后进度约 30% | true | ratio=0.3000（期望 0.3000） | PASS |
| 314 | daily-goal/progress-3-not-completed | 第 3 次答对未完成：进度条可见、存储 correct=3、无震动 / 特效 | true | dailyHidden=false, daily={"day":"2026-11-20","correct":3,"completedAt":null}, vibrations=[], celebrateHidden=true | PASS |
| 315 | daily-goal/progress-4-changed | 第 4 次答对后正常切题 | true | 已切题 | PASS |
| 316 | daily-goal/progress-4-count | 第 4 次答对后 #dailyCount 为 4 / 10 | 4 / 10 | 4 / 10 | PASS |
| 317 | daily-goal/progress-4-fill | 第 4 次答对后进度约 40% | true | ratio=0.4000（期望 0.4000） | PASS |
| 318 | daily-goal/progress-4-not-completed | 第 4 次答对未完成：进度条可见、存储 correct=4、无震动 / 特效 | true | dailyHidden=false, daily={"day":"2026-11-20","correct":4,"completedAt":null}, vibrations=[], celebrateHidden=true | PASS |
| 319 | daily-goal/progress-5-changed | 第 5 次答对后正常切题 | true | 已切题 | PASS |
| 320 | daily-goal/progress-5-count | 第 5 次答对后 #dailyCount 为 5 / 10 | 5 / 10 | 5 / 10 | PASS |
| 321 | daily-goal/progress-5-fill | 第 5 次答对后进度约 50% | true | ratio=0.5000（期望 0.5000） | PASS |
| 322 | daily-goal/progress-5-not-completed | 第 5 次答对未完成：进度条可见、存储 correct=5、无震动 / 特效 | true | dailyHidden=false, daily={"day":"2026-11-20","correct":5,"completedAt":null}, vibrations=[], celebrateHidden=true | PASS |
| 323 | daily-goal/progress-6-changed | 第 6 次答对后正常切题 | true | 已切题 | PASS |
| 324 | daily-goal/progress-6-count | 第 6 次答对后 #dailyCount 为 6 / 10 | 6 / 10 | 6 / 10 | PASS |
| 325 | daily-goal/progress-6-fill | 第 6 次答对后进度约 60% | true | ratio=0.6000（期望 0.6000） | PASS |
| 326 | daily-goal/progress-6-not-completed | 第 6 次答对未完成：进度条可见、存储 correct=6、无震动 / 特效 | true | dailyHidden=false, daily={"day":"2026-11-20","correct":6,"completedAt":null}, vibrations=[], celebrateHidden=true | PASS |
| 327 | daily-goal/progress-7-changed | 第 7 次答对后正常切题 | true | 已切题 | PASS |
| 328 | daily-goal/progress-7-count | 第 7 次答对后 #dailyCount 为 7 / 10 | 7 / 10 | 7 / 10 | PASS |
| 329 | daily-goal/progress-7-fill | 第 7 次答对后进度约 70% | true | ratio=0.7000（期望 0.7000） | PASS |
| 330 | daily-goal/progress-7-not-completed | 第 7 次答对未完成：进度条可见、存储 correct=7、无震动 / 特效 | true | dailyHidden=false, daily={"day":"2026-11-20","correct":7,"completedAt":null}, vibrations=[], celebrateHidden=true | PASS |
| 331 | daily-goal/progress-8-changed | 第 8 次答对后正常切题 | true | 已切题 | PASS |
| 332 | daily-goal/progress-8-count | 第 8 次答对后 #dailyCount 为 8 / 10 | 8 / 10 | 8 / 10 | PASS |
| 333 | daily-goal/progress-8-fill | 第 8 次答对后进度约 80% | true | ratio=0.8000（期望 0.8000） | PASS |
| 334 | daily-goal/progress-8-not-completed | 第 8 次答对未完成：进度条可见、存储 correct=8、无震动 / 特效 | true | dailyHidden=false, daily={"day":"2026-11-20","correct":8,"completedAt":null}, vibrations=[], celebrateHidden=true | PASS |
| 335 | daily-goal/progress-9-changed | 第 9 次答对后正常切题 | true | 已切题 | PASS |
| 336 | daily-goal/progress-9-count | 第 9 次答对后 #dailyCount 为 9 / 10 | 9 / 10 | 9 / 10 | PASS |
| 337 | daily-goal/progress-9-fill | 第 9 次答对后进度约 90% | true | ratio=0.9000（期望 0.9000） | PASS |
| 338 | daily-goal/progress-9-not-completed | 第 9 次答对未完成：进度条可见、存储 correct=9、无震动 / 特效 | true | dailyHidden=false, daily={"day":"2026-11-20","correct":9,"completedAt":null}, vibrations=[], celebrateHidden=true | PASS |
| 339 | daily-goal/pre-complete-count | 最后一题前 #dailyCount 为 9 / 10 | 9 / 10 | 9 / 10 | PASS |
| 340 | daily-goal/pre-complete-fill | 最后一题前进度约 90% | true | ratio=0.9000（期望 0.9000） | PASS |
| 341 | daily-goal/pre-complete-no-vibration | 完成前一题时仍无震动 | [] | [] | PASS |
| 342 | daily-goal/pre-complete-storage | 最后一题前存储 correct=9、completedAt=null | true | {"day":"2026-11-20","correct":9,"completedAt":null} | PASS |
| 343 | daily-goal/complete-vibrate | 答对第 10 题时调用 navigator.vibrate，参数恰好 [200]（一次） | [200] | [200] | PASS |
| 344 | daily-goal/complete-vibrate-timing | 点击后立即记录到震动（≤500ms；避免慢机器把 Playwright 外部计时误判为失败） | true | elapsed=48ms | PASS |
| 345 | daily-goal/complete-storage | 完成后存储 correct=10 且 completedAt 为数字 | true | {"day":"2026-11-20","correct":10,"completedAt":1795186409991} | PASS |
| 346 | daily-goal/complete-count | 完成瞬间 #dailyCount 为 10 / 10 | 10 / 10 | 10 / 10 | PASS |
| 347 | daily-goal/complete-aria | 完成瞬间 #dailyTrack 的 aria-valuenow 为 10 | 10 | 10 | PASS |
| 348 | daily-goal/celebration-visible | 完成后约 450ms 显示 #celebrate（hidden=false，class 含 show，淡入后 opacity≥0.9） | true | shown=true, hidden=false, show=true, opacity=1 | PASS |
| 349 | daily-goal/celebration-aria-hidden | #celebrate 的 aria-hidden 为 false | false | false | PASS |
| 350 | daily-goal/celebration-title | .celebrate-title 文本包含「今日目标达成」 | true | 今日目标达成！ | PASS |
| 351 | daily-goal/celebration-confetti | .confetti-piece 数量为 28（应用生成 28 个） | 28 | 28 | PASS |
| 352 | daily-goal/celebration-daily-visible | 庆祝期间 #daily 仍可见且计数 10 / 10（填充 100%） | true | hidden=false, count=10 / 10, aria=10, ratio=1.0000 | PASS |
| 353 | daily-goal/shot-celebration-size | 庆祝特效截图尺寸 | 360x640 | 360x640 | PASS |
| 354 | daily-goal/free-mode-entered | 约 450+1600+250ms + 切题后进入自由刷题（#daily.hidden 且 #freeMode 显示） | true | 已进入自由刷题 | PASS |
| 355 | daily-goal/free-mode-text | #freeMode 文本包含「自由刷题」且 #daily 隐藏 | true | text=今日目标已完成 · 自由刷题, dailyHidden=true | PASS |
| 356 | daily-goal/celebration-hidden-after-free | 进入自由刷题后 #celebrate 已隐藏、彩带已清空 | true | hidden=true, confetti=0 | PASS |
| 357 | daily-goal/free-mode-question | 自由刷题页面题目等于 v3.currentId 对应题干 | true | currentId=2018-25 | PASS |
| 358 | daily-goal/shot-free-mode-size | 自由刷题截图尺寸 | 360x640 | 360x640 | PASS |
| 359 | daily-goal/free-mode-persist-before-answer | 注入 v3 刷新后仍处于自由刷题（#daily 隐藏、#freeMode 显示） | true | dailyHidden=true, freeModeHidden=false | PASS |
| 360 | daily-goal/free-mode-vibration-record-persists | 刷新后震动记录仍为 [200]（辅助记录用于验证不再新增） | [200] | [200] | PASS |
| 361 | daily-goal/free-answer-next | 自由刷题继续答对后正常切题 | true | 已切题 | PASS |
| 362 | daily-goal/free-answer-no-celebration | 自由刷题继续答对不再显示庆祝特效 | true | hidden=true, show=false | PASS |
| 363 | daily-goal/free-answer-no-vibrate | 自由刷题继续答对不再震动（__vibrations 仍只有 [200]） | [200] | [200] | PASS |
| 364 | daily-goal/free-answer-daily-unchanged | 自由刷题继续答对不推进每日计数：correct 仍 10、completedAt 不变 | true | daily={"day":"2026-11-20","correct":10,"completedAt":1795186409991}, completedBefore=1795186409991 | PASS |
| 365 | daily-goal/free-answer-daily-hidden | 自由刷题继续答对后 #daily 仍隐藏、#freeMode 仍显示 | true | dailyHidden=true, freeModeHidden=false | PASS |
| 366 | daily-goal/free-persist-daily-hidden | 刷新后 #daily 仍隐藏 | true | dailyHidden=true | PASS |
| 367 | daily-goal/free-persist-free-visible | 刷新后 #freeMode 仍显示「自由刷题」 | true | hidden=false, text=今日目标已完成 · 自由刷题 | PASS |
| 368 | daily-goal/free-persist-no-celebration | 刷新后无庆祝特效、彩带为空 | true | hidden=true, confetti=0 | PASS |
| 369 | daily-goal/free-persist-storage | 刷新后存储仍为今天 correct=10、completedAt 不变 | true | daily={"day":"2026-11-20","correct":10,"completedAt":1795186409991} | PASS |
| 370 | daily-goal/cross-day-count | 跨天（昨天 10 / 10）刷新后计数重置为 0 / 10 | 0 / 10 | 0 / 10 | PASS |
| 371 | daily-goal/cross-day-progress-visible | 跨天重置后进度条重新可见（#freeMode 隐藏） | true | dailyHidden=false, freeModeHidden=true | PASS |
| 372 | daily-goal/cross-day-storage | 跨天重置后存储 day 等于今天 | true | today=2026-11-20, daily={"day":"2026-11-20","correct":0,"completedAt":null} | PASS |
| 373 | daily-goal/no-console-errors | 每日目标 / 自由刷题流程全程无 console error / warning / pageerror | true | 0 条 | PASS |
| 374 | vibration/native-bridge-called | 有原生桥时：window.AstroNativeVibrate.vibrate(200) 恰好调用一次 | [200] | [200] | PASS |
| 375 | vibration/native-bridge-priority | 有原生桥时：不再回退调用 navigator.vibrate | [] | [] | PASS |
| 376 | vibration/native-bridge-daily-completed | 原生桥调用路径同时完成每日目标（存储 correct=goal、completedAt 数字） | true | {"day":"2026-11-20","correct":10,"completedAt":1795186413890} | PASS |
| 377 | vibration/native-bridge-attempted | 原生桥抛异常时：先尝试原生桥（记录到 200） | [200] | [200] | PASS |
| 378 | vibration/native-bridge-fallback-web | 原生桥抛异常时：回退 navigator.vibrate(200) | [200] | [200] | PASS |
| 379 | vibration/native-bridge-fallback-completes | 原生桥异常不阻断完成流程（每日目标仍完成） | true | {"day":"2026-11-20","correct":10,"completedAt":1795186414340} | PASS |
| 380 | vibration/web-fallback-native-absent | 无原生桥时：不调用原生桥（记录为空） | [] | [] | PASS |
| 381 | vibration/web-fallback-called | 无原生桥时：回退 navigator.vibrate(200) | [200] | [200] | PASS |
| 382 | vibration/no-console-errors | 三种震动路径均无 console error / warning / pageerror | true | 0 条 | PASS |
| 383 | daily-midnight/foreground-before-midnight-free-mode | 跨午夜前：当天已完成，#daily 隐藏、#freeMode 显示 | true | dailyHidden=true, freeModeHidden=false | PASS |
| 384 | daily-midnight/foreground-midnight-reset | 前台跨过本地 00:00 后自动重置为第二天 0 / 10 并重新显示进度条 | true | count=0 / 10, dailyHidden=false, freeModeHidden=true, daily={"day":"2026-11-20","correct":0,"completedAt":null}, today=2026-11-20 | PASS |
| 385 | daily-midnight/celebration-across-midnight-visible | 答对最后一题（完成每日目标）后显示庆祝特效（跨午夜前） | true | hidden=false, show=true | PASS |
| 386 | daily-midnight/celebration-across-midnight-reset | 特效期间跨过 00:00：特效结束后显示第二天 0 / 10（不再停留在昨天自由刷题） | true | count=0 / 10, dailyHidden=false, freeModeHidden=true, overlayHidden=true, daily={"day":"2026-11-20","correct":0,"completedAt":null}, today=2026-11-20 | PASS |
| 387 | daily-midnight/no-console-errors | 跨午夜流程无 console error / warning / pageerror | true | 0 条 | PASS |

## 截图

| 文件 | 视口 | 尺寸 | 大小 |
|---|---|---|---|
| 360x640-initial.png | 360x640 | 360×640 | 105.1 KiB |
| 360x640-feedback.png | 360x640 | 360×640 | 104.3 KiB |
| 360x640-after-answer.png | 360x640 | 360×640 | 109.0 KiB |
| 360x640-resume.png | 360x640 | 360×640 | 109.0 KiB |
| 360x640-feedback-wrong.png | 360x640 | 360×640 | 126.7 KiB |
| 360x640-feedback-correct.png | 360x640 | 360×640 | 103.3 KiB |
| 360x640-long-question.png | 360x640 | 360×640 | 165.1 KiB |
| 360x640-long-stem.png | 360x640 | 360×640 | 143.9 KiB |
| 360x640-double-click.png | 360x640 | 360×640 | 101.2 KiB |
| 412x915-initial.png | 412x915 | 412×915 | 174.5 KiB |
| 412x915-feedback.png | 412x915 | 412×915 | 173.7 KiB |
| 412x915-after-answer.png | 412x915 | 412×915 | 156.6 KiB |
| 412x915-resume.png | 412x915 | 412×915 | 156.6 KiB |
| 412x915-feedback-wrong.png | 412x915 | 412×915 | 178.3 KiB |
| 412x915-feedback-correct.png | 412x915 | 412×915 | 148.1 KiB |
| 412x915-long-question.png | 412x915 | 412×915 | 259.2 KiB |
| 412x915-long-stem.png | 412x915 | 412×915 | 194.9 KiB |
| 412x915-double-click.png | 412x915 | 412×915 | 154.6 KiB |
| daily-goal-celebration.png | 360x640 | 360×640 | 118.6 KiB |
| daily-goal-free-mode.png | 360x640 | 360×640 | 109.1 KiB |

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

- 界面为题目 + 类别小字 + 4 个选项 + 每日目标进度条（`#daily`）；答对 1 题（达到每日目标）后进度条替换为「今日目标已完成 · 自由刷题」提示（`#freeMode`）。旧版 `#progress` 题号文字 / `.bar` 进度条仍校验为不存在。
- 题目下方 `#questionType` 灰色小字显示 `类别：<type>`：校验文本与当前题 `type` 一致、字号 ≤ 14px、颜色为灰色系，并随切题更新。
- 对错反馈：正确项 `.correct` 绿色边框、选错项 `.wrong` 红色边框（同时校验计算样式 RGB）；答对约 600ms 后自动淡出/淡入切到下一题。
- 答错解析：答错后 `#explain` 展开题库 `explain` 文本（`**加粗**` 已渲染为 `<strong>`，不显示字面量）；600ms 反馈结束后出现“轻触继续”，页面不自动切题；轻触后淡出切到下一题；答对时不显示解析。
- 防连点：同步双点不同选项、同步双点同一选项、间隔 50ms 双点，均只前进 1 题、只保存 1 条 log。
- 键盘：`A` 与 `2` 键均可选答，反馈与 v3 落盘正确。
- 长题干 / 长选项正常换行、无横向溢出；内容最多的前 3 道题在小屏可滚动到底、末选项可见。

## 每日目标 / 自由刷题

- 独立 browser context（360×640）全新加载：`#daily` 可见、`#dailyCount` 为 `0 / 10`、`#dailyFill` 宽度 0、`#dailyTrack[aria-valuenow=0]`、`#freeMode` 隐藏；`localStorage["astroQuizDaily.v1"]` 为今天 `{ correct: 0, completedAt: null }`，`AstroDaily.DAILY_GOAL === 10`。
- 先答错一道：计数保持 `0 / 10`、填充 0、无震动 / 特效，轻触继续；随后逐步答对前 9 道只推进进度，答对第 10 道完成：存储 `correct=10` 且 `completedAt` 为数字、进度条 `10 / 10`。刷新后自由刷题保持；写入昨天的 `10 / 10` 后刷新自动重置为今天的 `0 / 10`。
- 完成目标：前 9 道只推进进度，答对第 10 道时调用 `navigator.vibrate(200)` 一次（通过 init script 覆写并记录到 `window.__vibrations`）、存储 `correct=10` 且 `completedAt` 为数字；随后 `#celebrate` 以 `.show` / `aria-hidden="false"` 显示，含「今日目标达成！」与 28 个 `.confetti-piece`；停留约 1.6s 后淡出。彩带截图使用 `animations: "allow"` 以保留 CSS 动画。
- 自由刷题：`#daily` 隐藏、`#freeMode` 显示「今日目标已完成 · 自由刷题」、`#celebrate` 隐藏且彩带清空、页面题目等于 `v3.currentId` 对应题干；继续答对不再震动 / 不再出特效 / 不再推进计数，刷新后自由刷题状态保持。
- 两个视口回归使用注入的「当天已完成」每日状态（goal / goal）：进度条一直隐藏，后续 natural / right / recent / double-click / keyboard 答对不再触发完成特效、不再推进计数；冷启动独立 context 同样注入后连续 16 题全对，最终仍为自由刷题。
- 跨午夜（`page.clock` 模拟本地时间）：① 应用停在前台、已完成当天目标时跨过 00:00，自动重置为第二天 `0 / 10` 并重新显示进度条；② 23:59:58 答对最后一题（完成每日目标）的庆祝特效播放期间跨过 00:00，特效结束后显示第二天 `0 / 10`（不会停留在昨天的自由刷题）。
- 震动路径：app.js 优先调用 MainActivity 注入的 `window.AstroNativeVibrate.vibrate(200)`（直接驱动 Android Vibrator），不再依赖会静默失败的 `navigator.vibrate`；原生桥缺失或抛出异常时回退 `navigator.vibrate`，两条路径都不中断答题流程。

## 控制台错误 / 页面异常 / 请求失败

无（两个视口 + 每日目标独立 context + 震动路径 context + 跨午夜 context 全程 0 条 console error / warning / pageerror / requestfailed）。

## www/ 外部 URL 检查

grep 检查 `www/*.html|css|js|json` 中 `http://` / `https://`：0 处，全部资源本地引用。

## 长题目场景

动态从 `window.QUESTION_BANK` 计算候选，并注入 localStorage（currentId=目标题、step=0、q/log 为空）后刷新：

- 综合最长（题干长度 + 最长选项长度）：`2020-29`（题干 60 字，最长选项 93 字）；
- 最长题干：`2017-21`（134 字）；

### 内容最多题的垂直可达性（防 flex 居中裁切 / 底部不可滚动）

| 视口 | 题 ID | innerHeight | scrollHeight | quizTop | 最大 scrollY | 末选项底部 | 结果 |
|---|---|---|---|---|---|---|---|
| 360x640 | 2020-29 | 640 | 922 | 24.0 | 282 | 616.1 | PASS |
| 360x640 | 2017-21 | 640 | 660 | 24.0 | 20 | 616.0 | PASS |
| 360x640 | 2017-37 | 640 | 640 | 30.0 | 0 | 610.0 | PASS |
| 412x915 | 2020-29 | 915 | 915 | 33.4 | 0 | 881.6 | PASS |
| 412x915 | 2017-21 | 915 | 915 | 142.3 | 0 | 772.7 | PASS |
| 412x915 | 2017-37 | 915 | 915 | 159.9 | 0 | 755.1 | PASS |

## 未验证项 / 限制

- 仅桌面无头 Chromium 的 file:// 环境，未覆盖真机 Android WebView 与 Capacitor SystemBars 注入的 safe-area（本机模拟器不可用）。
- 真机震动（`navigator.vibrate` + AndroidManifest 的 `VIBRATE` 权限）与「目标达成」全屏特效在 Android WebView 的实际表现未验证；无头 Chromium 中仅通过覆写 `navigator.vibrate` 记录调用参数与次数，桌面环境不会真实震动。
- 真机彩带 / 发光动画的帧率与低端机掉帧情况未验证；无头 Chromium 只校验 DOM（`.celebrate.show`、28 个 `.confetti-piece`）与截图，不等价于真机动画观感。
- 未验证 APK 包内资源、Android 启动页与系统栏在真机上的实际渲染（包内资源由打包步骤用 unzip/aapt2 静态校验）。
- 未验证屏幕阅读器无障碍；键盘仅验证 `A` / `2` 两条路径（代码路径与 A-D / 1-4 同一处理）。
- 未验证低端设备动画掉帧、真机触屏长按/双击缩放行为。
- 未覆盖 localStorage 损坏 / 被禁用 / 配额已满等异常降级：代码有 try/catch（进度仅内存、刷新后可能回退），浏览器验收未注入这类异常。
- 未覆盖屏幕阅读器对进度条 / 完成特效的播报与焦点管理；ARIA 属性（role=progressbar、aria-valuenow/max）只做静态断言。
- `@media (hover:hover)` 触屏分支无法在桌面无头 Chromium 中真实复现（依赖 isMobile/hasTouch 模拟）。
- 自适应差异（低掌握度类型更常出现、softmax 抽样等）不在浏览器验收中做随机断言，由单元测试与四场景模拟覆盖。
- README 所述“冷启动因到期复习插入而偏移”的异常路径未在浏览器验收中确定性复现（依赖随机题目与到期时间）；浏览器只验证无到期复习时的理想轮转，偏移场景由单元测试 / 模拟覆盖。
- F2 修正后仍属“整份回退”：契约零容忍，应用不会逐题清洗 v3；“v3.currentId 合法但 q key / log id 非法”的三个场景使用合成数据，未覆盖真实题库 ID 大批变更后的用户数据。

## 失败断言

无。

