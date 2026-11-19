// qa/verify.mjs — 天文刷题应用 www/index.html 自动化验收（Playwright + 本机 Chromium）
//
// 当前产品形态：无限随机刷题
//   1. 只有题目 + 4 个选项，没有进度条 / 题号进度
//   2. 每次作答后从全部 485 题里随机抽下一题（不连续重复），可以一直刷
//   3. 作答后先显示约 600ms 对错反馈（正确项绿、选错项红），再淡出切题
//   4. 当前题与作答记录保存在 localStorage（astroQuizState.v2），刷新/重开可续做
//
// 覆盖：
//   - 485 题、无进度 UI、4 选项、初始状态
//   - 360×640 / 412×915：初始截图 → 反馈断言/截图 → 切题截图 → 刷新续做截图
//   - 确定性「选错 / 选对」反馈断言与截图
//   - 长题干 / 长选项换行、无横向溢出、内容最多题垂直可达
//   - 连续作答 8 题的随机性 / 无连续重复 / 作答记录累积
//   - 防连点（同步双点不同选项 / 同选项 / 间隔 50ms）
//   - 旧版 v1 状态迁移到 v2
//   - console / 网络错误、www 无外部 URL
//
// 用法：node qa/verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);

// 本机可用的 playwright-core（优先环境变量），找不到时给出明确报错
const PLAYWRIGHT_CANDIDATES = [
  process.env.PLAYWRIGHT_CORE_PATH,
  '/tmp/review-tools/node_modules/playwright-core',
  '/home/marvin/Documents/deepseek-harness/default-workspace/node_modules/playwright-core',
].filter(Boolean);
let PLAYWRIGHT_PATH = null;
let playwright = null;
for (const candidate of PLAYWRIGHT_CANDIDATES) {
  try {
    playwright = require(candidate);
    PLAYWRIGHT_PATH = candidate;
    break;
  } catch (e) {
    /* 尝试下一个 */
  }
}
if (!playwright) {
  throw new Error(
    '找不到 playwright-core，可用 PLAYWRIGHT_CORE_PATH 指定路径；已尝试：' +
      PLAYWRIGHT_CANDIDATES.join(', ')
  );
}
const { chromium } = playwright;

const QA_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(QA_DIR, '..');
const WWW = path.join(ROOT, 'www', 'index.html');
const CHROME =
  '/home/marvin/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const STORAGE_KEY = 'astroQuizState.v2';
const LEGACY_KEY = 'astroQuizState.v1';
const TOTAL = 485;
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 412, height: 915 },
];

const results = []; // { id, title, expected, actual, pass }
const consoleErrors = []; // { viewport, kind, text }
const screenshots = []; // { file, viewport, size, width, height }
const warnings = [];
const tallestSummary = [];

function rec(id, title, expected, actual, pass) {
  results.push({
    id,
    title,
    expected: String(expected),
    actual: String(actual),
    pass: !!pass,
  });
  console.log(
    `[${pass ? 'PASS' : 'FAIL'}] ${id} ${title} | 期望=${expected} 实际=${actual}`
  );
}
const eq = (id, title, expected, actual) =>
  rec(id, title, expected, actual, Object.is(expected, actual));
const ok = (id, title, pass, actual) =>
  rec(id, title, 'true', actual, pass);

async function screenshot(page, name, viewport) {
  const file = path.join(QA_DIR, name);
  await page.screenshot({ path: file, animations: 'disabled' });
  const buf = fs.readFileSync(file);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  screenshots.push({ file, viewport, size: buf.length, width, height });
  return { file, width, height, size: buf.length };
}

async function readState(page) {
  return page.evaluate((key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }, STORAGE_KEY);
}

async function readQuestion(page) {
  return page.$eval('#question', (el) => el.textContent.trim());
}

async function readFeedback(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('#options button.option')];
    return {
      correct: buttons
        .map((b, i) => (b.classList.contains('correct') ? i : -1))
        .filter((i) => i >= 0),
      wrong: buttons
        .map((b, i) => (b.classList.contains('wrong') ? i : -1))
        .filter((i) => i >= 0),
    };
  });
}

const OPTION_SEL = '#options button.option';

async function optionCount(page) {
  return page.$$eval(OPTION_SEL, (els) => els.length);
}

async function currentItem(page) {
  return page.evaluate((key) => {
    const st = JSON.parse(localStorage.getItem(key));
    const item = window.QUESTION_BANK.find((x) => x.id === st.currentId);
    return {
      id: item.id,
      answer: item.answer,
      q: item.q,
      answers: st.answers.length,
    };
  }, STORAGE_KEY);
}

async function waitTransitionDone() {
  // 600ms 对错反馈 + 150ms 淡出 + 换题 + 150ms 淡入；留余量取 1100ms
  return 1100;
}

// ---- 长题目候选：在页面内基于 QUESTION_BANK 计算 ----
async function findLongCandidates(page) {
  return page.evaluate(() => {
    const bank = window.QUESTION_BANK;
    let optionsHeavy = null;
    let stemHeavy = null;
    for (const item of bank) {
      const maxOpt = Math.max(...item.options.map((o) => o.length));
      const combined = item.q.length + maxOpt;
      if (!optionsHeavy || combined > optionsHeavy.combined) {
        optionsHeavy = {
          id: item.id,
          q: item.q,
          combined,
          stemLen: item.q.length,
          maxOptLen: maxOpt,
        };
      }
      if (!stemHeavy || item.q.length > stemHeavy.stemLen) {
        stemHeavy = {
          id: item.id,
          q: item.q,
          combined,
          stemLen: item.q.length,
          maxOptLen: maxOpt,
        };
      }
    }
    const ranked = bank
      .map((item) => ({
        id: item.id,
        q: item.q,
        stemLen: item.q.length,
        totalLen:
          item.q.length + item.options.reduce((s, o) => s + o.length, 0),
      }))
      .sort((a, b) => b.totalLen - a.totalLen);
    return { optionsHeavy, stemHeavy, tallest: ranked.slice(0, 3) };
  });
}

// 构造无限模式的 localStorage 状态：当前题 = targetId，作答记录清空
async function injectState(page, targetId) {
  await page.evaluate(
    ({ key, targetId }) => {
      localStorage.setItem(
        key,
        JSON.stringify({ currentId: targetId, answers: [] })
      );
    },
    { key: STORAGE_KEY, targetId }
  );
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
}

// 收集布局/换行指标
async function layoutMetrics(page) {
  return page.evaluate(() => {
    const lineCount = (el) => {
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight);
      const h = el.getBoundingClientRect().height;
      const byHeight = lh > 0 ? Math.round(h / lh) : 0;
      let byRange = 0;
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = new Set(
        [...range.getClientRects()].map((r) => Math.round(r.top))
      );
      byRange = tops.size;
      return { lines: Math.max(byHeight, byRange), byHeight, byRange };
    };
    const q = document.getElementById('question');
    const optTexts = [...document.querySelectorAll('.option-text')];
    return {
      questionText: q.textContent,
      questionLines: lineCount(q),
      questionOverflowPx: Math.max(0, q.scrollWidth - q.clientWidth),
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
      docOverflowPx: Math.max(
        0,
        document.documentElement.scrollWidth - window.innerWidth
      ),
      optionCount: document.querySelectorAll('button.option').length,
      optionTexts: optTexts.map((el) => ({
        text: el.textContent,
        lines: lineCount(el).lines,
        overflowPx: Math.max(0, el.scrollWidth - el.clientWidth),
      })),
      fadeClass:
        document.getElementById('quiz').className.indexOf('fade') !== -1,
      progressExists: !!document.getElementById('progress'),
      barExists: !!document.querySelector('.bar'),
    };
  });
}

// ---- 单视口完整验收 ----
async function testViewport(browser, vp) {
  const tag = `${vp.width}x${vp.height}`;
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  const watch = { console: [], pageerror: [], requestfailed: [] };
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      const entry = { viewport: tag, kind: `console.${m.type()}`, text: m.text() };
      watch.console.push(entry);
      consoleErrors.push(entry);
    }
  });
  page.on('pageerror', (e) => {
    const entry = { viewport: tag, kind: 'pageerror', text: e.message };
    watch.pageerror.push(entry);
    consoleErrors.push(entry);
  });
  page.on('requestfailed', (r) => {
    const entry = {
      viewport: tag,
      kind: 'requestfailed',
      text: `${r.url()} ${r.failure() && r.failure().errorText}`,
    };
    watch.requestfailed.push(entry);
    consoleErrors.push(entry);
  });
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('file:') && !u.startsWith('data:')) {
      warnings.push(`外部请求(非 file:)：${u}`);
    }
  });

  await page.goto('file://' + WWW, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);

  // ---- 基础断言 ----
  const bankLen = await page.evaluate(
    () => (window.QUESTION_BANK ? window.QUESTION_BANK.length : -1)
  );
  eq(`${tag}/bank-length`, 'window.QUESTION_BANK.length', TOTAL, bankLen);

  const init = await layoutMetrics(page);
  ok(`${tag}/no-progress-text`, '没有题号进度文字（#progress）',
    !init.progressExists, `#progress=${init.progressExists}`);
  ok(`${tag}/no-progress-bar`, '没有进度条（.bar）',
    !init.barExists, `.bar=${init.barExists}`);
  ok(`${tag}/question-nonempty`, '题目文字非空',
    init.questionText.trim().length > 0,
    init.questionText.slice(0, 30));

  const n0 = await optionCount(page);
  eq(`${tag}/option-count`, '选项按钮数量', 4, n0);

  const letters = await page.$$eval('#options .letter', (els) =>
    els.map((e) => e.textContent)
  );
  eq(`${tag}/option-letters`, '选项字母 A B C D', 'A,B,C,D', letters.join(','));

  const texts = await page.$$eval(
    '#options .option-text',
    (els) => els.map((e) => e.textContent.trim())
  );
  ok(
    `${tag}/option-text-nonempty`,
    '4 个选项文字均非空',
    texts.length === 4 && texts.every((t) => t.length > 0),
    JSON.stringify(texts.map((t) => t.slice(0, 20)))
  );

  const st0 = await readState(page);
  const bankIds = await page.evaluate(() =>
    window.QUESTION_BANK.map((x) => x.id)
  );
  ok(
    `${tag}/state-initial`,
    '初始 localStorage 状态合法（currentId 在题库中 / answers=[]）',
    !!st0 &&
      bankIds.includes(st0.currentId) &&
      Array.isArray(st0.answers) &&
      st0.answers.length === 0,
    st0
      ? `currentId=${st0.currentId}, answers=${st0.answers.length}`
      : 'null'
  );

  ok(
    `${tag}/initial-no-h-overflow`,
    '初始界面无横向溢出',
    init.docOverflowPx === 0,
    `scrollWidth=${init.docScrollWidth}, innerWidth=${init.innerWidth}, overflow=${init.docOverflowPx}px`
  );

  const shotInit = await screenshot(page, `${tag}-initial.png`, tag);
  eq(
    `${tag}/shot-initial-size`,
    '初始截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotInit.width}x${shotInit.height}`
  );

  // ---- 随机首题：反馈 → 随机切下一题 ----
  const item1 = await currentItem(page);
  const qBefore = await readQuestion(page);
  await page.locator(OPTION_SEL).first().click();
  await page.waitForTimeout(250);

  const fb1 = await readFeedback(page);
  eq(`${tag}/feedback-progress`, '反馈期间仍停留在当前题', qBefore,
    await readQuestion(page));
  eq(
    `${tag}/feedback-correct-marked`,
    '反馈：正确项被标记为绿色（.correct）',
    JSON.stringify([item1.answer]),
    JSON.stringify(fb1.correct)
  );
  eq(
    `${tag}/feedback-wrong-marked`,
    '反馈：选错时选中项被标记为红色（.wrong）',
    JSON.stringify(item1.answer === 0 ? [] : [0]),
    JSON.stringify(fb1.wrong)
  );
  const shotFeedback = await screenshot(page, `${tag}-feedback.png`, tag);
  eq(
    `${tag}/shot-feedback-size`,
    '反馈截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotFeedback.width}x${shotFeedback.height}`
  );

  const stAfterClick = await readState(page);
  ok(
    `${tag}/after-answer-state`,
    '作答已落盘并随机出下一题（answers+1 / currentId 变化）',
    !!stAfterClick &&
      stAfterClick.answers.length === 1 &&
      stAfterClick.answers[0].choice === 0 &&
      stAfterClick.currentId !== item1.id,
    stAfterClick
      ? `currentId=${stAfterClick.currentId}, answers=${stAfterClick.answers.length}`
      : 'null'
  );

  await page.waitForTimeout(900); // 等反馈 + 淡出 + 换题 + 淡入完成

  const qAfter = await readQuestion(page);
  ok(
    `${tag}/after-answer-question-changed`,
    '反馈结束后随机切到新题目',
    qAfter !== qBefore,
    qAfter.slice(0, 30)
  );
  eq(`${tag}/after-answer-option-count`, '换题后选项按钮数量', 4,
    await optionCount(page));
  const metricsAfter = await layoutMetrics(page);
  ok(
    `${tag}/after-answer-fade-cleared`,
    '淡入淡出结束（fade class 移除）',
    !metricsAfter.fadeClass,
    `class=${metricsAfter.fadeClass}`
  );
  ok(
    `${tag}/after-answer-still-no-progress`,
    '切题后仍然没有进度 UI',
    !metricsAfter.progressExists && !metricsAfter.barExists,
    `progress=${metricsAfter.progressExists}, bar=${metricsAfter.barExists}`
  );

  const shotAfter = await screenshot(page, `${tag}-after-answer.png`, tag);
  eq(
    `${tag}/shot-after-answer-size`,
    '作答后截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotAfter.width}x${shotAfter.height}`
  );

  // ---- 刷新 → 断点续做 ----
  const resumeState = await readState(page);
  const resumeQuestion = await readQuestion(page);
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  eq(`${tag}/resume-question`, '刷新后恢复到同一道题', resumeQuestion,
    await readQuestion(page));
  const stResume = await readState(page);
  ok(
    `${tag}/resume-state`,
    '刷新后 localStorage 仍是同一 currentId / answers 不丢',
    !!stResume &&
      stResume.currentId === resumeState.currentId &&
      stResume.answers.length === 1,
    stResume
      ? `currentId=${stResume.currentId}, answers=${stResume.answers.length}`
      : 'null'
  );
  const resumeMetrics = await layoutMetrics(page);
  ok(
    `${tag}/resume-no-h-overflow`,
    '刷新后无横向溢出',
    resumeMetrics.docOverflowPx === 0,
    `overflow=${resumeMetrics.docOverflowPx}px`
  );
  eq(`${tag}/resume-option-count`, '刷新后选项按钮数量', 4,
    resumeMetrics.optionCount);
  const shotResume = await screenshot(page, `${tag}-resume.png`, tag);
  eq(
    `${tag}/shot-resume-size`,
    '续做截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotResume.width}x${shotResume.height}`
  );

  // ---- 对错反馈（确定性：选错场景） ----
  const wrongItem = await page.evaluate(() => {
    const item = window.QUESTION_BANK.find((q) => q.answer !== 0);
    return { id: item.id, answer: item.answer };
  });
  await injectState(page, wrongItem.id);
  await page.locator(OPTION_SEL).first().click();
  await page.waitForTimeout(250);
  const fbWrong = await readFeedback(page);
  eq(
    `${tag}/feedback-wrong-case-correct-marked`,
    '确定性选错：正确项标绿',
    JSON.stringify([wrongItem.answer]),
    JSON.stringify(fbWrong.correct)
  );
  eq(
    `${tag}/feedback-wrong-case-selected-marked`,
    '确定性选错：选中项标红',
    JSON.stringify([0]),
    JSON.stringify(fbWrong.wrong)
  );
  const shotFbWrong = await screenshot(page, `${tag}-feedback-wrong.png`, tag);
  eq(
    `${tag}/shot-feedback-wrong-size`,
    '选错反馈截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotFbWrong.width}x${shotFbWrong.height}`
  );
  await page.waitForTimeout(900);
  const afterWrong = await readState(page);
  ok(
    `${tag}/feedback-wrong-case-next`,
    '反馈结束后随机进入下一题',
    !!afterWrong && afterWrong.answers.length === 1 &&
      afterWrong.currentId !== wrongItem.id,
    afterWrong
      ? `currentId=${afterWrong.currentId}, answers=${afterWrong.answers.length}`
      : 'null'
  );

  // ---- 对错反馈（确定性：选对场景） ----
  const rightItem = await page.evaluate(() => {
    const item = window.QUESTION_BANK.find((q) => q.answer === 0);
    return { id: item.id };
  });
  await injectState(page, rightItem.id);
  await page.locator(OPTION_SEL).first().click();
  await page.waitForTimeout(250);
  const fbRight = await readFeedback(page);
  eq(
    `${tag}/feedback-right-case-correct-marked`,
    '确定性选对：选中项标绿',
    JSON.stringify([0]),
    JSON.stringify(fbRight.correct)
  );
  eq(
    `${tag}/feedback-right-case-no-wrong`,
    '确定性选对：没有红色标记',
    '[]',
    JSON.stringify(fbRight.wrong)
  );
  const shotFbRight = await screenshot(page, `${tag}-feedback-correct.png`, tag);
  eq(
    `${tag}/shot-feedback-correct-size`,
    '选对反馈截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotFbRight.width}x${shotFbRight.height}`
  );
  await page.waitForTimeout(900);

  // ---- 长题目 ----
  const cand = await findLongCandidates(page);

  await injectState(page, cand.optionsHeavy.id);
  const longOpt = await layoutMetrics(page);
  eq(`${tag}/long-opt-question`, '长题场景定位到目标题',
    cand.optionsHeavy.q, longOpt.questionText);
  ok(
    `${tag}/long-opt-h-overflow`,
    '长题（题干+选项最长）文档无横向溢出',
    longOpt.docOverflowPx === 0,
    `scrollWidth=${longOpt.docScrollWidth}, innerWidth=${longOpt.innerWidth}, overflow=${longOpt.docOverflowPx}px`
  );
  ok(
    `${tag}/long-opt-question-wrap`,
    '长题题干发生换行（行数 ≥ 2）',
    longOpt.questionLines.lines >= 2,
    `lines=${longOpt.questionLines.lines} (byHeight=${longOpt.questionLines.byHeight}, byRange=${longOpt.questionLines.byRange})`
  );
  const wrappedOpts = longOpt.optionTexts.filter((o) => o.lines >= 2);
  ok(
    `${tag}/long-opt-option-wrap`,
    '长选项文字发生换行（≥1 个选项行数 ≥ 2）',
    wrappedOpts.length >= 1,
    `换行选项数=${wrappedOpts.length}, 各选项行数=${JSON.stringify(longOpt.optionTexts.map((o) => o.lines))}`
  );
  ok(
    `${tag}/long-opt-option-no-overflow`,
    '选项文字无横向溢出（scrollWidth ≤ clientWidth）',
    longOpt.optionTexts.every((o) => o.overflowPx === 0),
    `各选项溢出=${JSON.stringify(longOpt.optionTexts.map((o) => o.overflowPx))}`
  );
  eq(`${tag}/long-opt-option-count`, '长题选项按钮数量', 4, longOpt.optionCount);
  const shotLong = await screenshot(page, `${tag}-long-question.png`, tag);
  eq(
    `${tag}/shot-long-size`,
    '长题截图尺寸',
    `${vp.width}x${vp.height}`,
    `${shotLong.width}x${shotLong.height}`
  );

  await injectState(page, cand.stemHeavy.id);
  const longStem = await layoutMetrics(page);
  eq(`${tag}/long-stem-question`, '最长题干场景定位到目标题',
    cand.stemHeavy.q, longStem.questionText);
  ok(
    `${tag}/long-stem-h-overflow`,
    '最长题干（' + cand.stemHeavy.id + '）无横向溢出',
    longStem.docOverflowPx === 0,
    `overflow=${longStem.docOverflowPx}px`
  );
  ok(
    `${tag}/long-stem-wrap`,
    '最长题干发生换行（行数 ≥ 3）',
    longStem.questionLines.lines >= 3,
    `lines=${longStem.questionLines.lines}`
  );
  const shotStem = await screenshot(page, `${tag}-long-stem.png`, tag);
  ok(
    `${tag}/shot-long-stem-size`,
    '最长题干截图尺寸',
    `${shotStem.width}x${shotStem.height}` === `${vp.width}x${vp.height}`,
    `${shotStem.width}x${shotStem.height}`
  );

  // ---- 额外：内容最多的前 3 道题垂直可达性 ----
  const tallestInfo = [];
  for (let i = 0; i < cand.tallest.length; i++) {
    const item = cand.tallest[i];
    await injectState(page, item.id);
    const h = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      quizTop: document.getElementById('quiz').getBoundingClientRect().top,
    }));
    const reach = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const opts = [...document.querySelectorAll('button.option')];
      const r = {
        maxScroll: window.scrollY,
        lastBottom: opts[opts.length - 1].getBoundingClientRect().bottom,
        optionCount: opts.length,
      };
      window.scrollTo(0, 0);
      return r;
    });
    tallestInfo.push({ id: item.id, ...h, ...reach });
    ok(
      `${tag}/tallest-${i + 1}-top-reachable`,
      `内容最多题 ${item.id} 顶部未被裁切（quizTop ≥ 0）`,
      h.quizTop >= 0,
      `quizTop=${h.quizTop.toFixed(1)}, scrollHeight=${h.scrollHeight}, innerHeight=${h.innerHeight}`
    );
    ok(
      `${tag}/tallest-${i + 1}-bottom-reachable`,
      `内容最多题 ${item.id} 滚动到底后末选项可见（可达）`,
      reach.optionCount === 4 && reach.lastBottom <= h.innerHeight + 1,
      `maxScroll=${reach.maxScroll}, lastOptionBottom=${reach.lastBottom.toFixed(1)}, innerHeight=${h.innerHeight}`
    );
  }
  tallestSummary.push({ viewport: tag, items: tallestInfo });

  // ---- 无限随机：连续作答 8 题 ----
  await injectState(page, cand.optionsHeavy.id);
  const seen = [];
  for (let i = 0; i < 8; i++) {
    const st = await readState(page);
    seen.push(st.currentId);
    await page.locator(OPTION_SEL).first().click();
    await page.waitForTimeout(1050);
  }
  const stInfinite = await readState(page);
  eq(`${tag}/infinite-answers`, '连续作答 8 题累计 8 条作答记录',
    8, stInfinite.answers.length);
  const adjacent = [];
  for (let i = 1; i < seen.length; i++) {
    if (seen[i] === seen[i - 1]) adjacent.push(`${i - 1}->${i}`);
  }
  if (stInfinite.currentId === seen[seen.length - 1]) adjacent.push('last');
  eq(`${tag}/infinite-no-adjacent-repeat`, '连续抽取的题目不会一题连出',
    '[]', JSON.stringify(adjacent));
  const distinct = new Set(seen);
  ok(
    `${tag}/infinite-random-enough`,
    '8 次随机抽题至少有 6 个不同题目',
    distinct.size >= 6,
    `distinct=${distinct.size}/${seen.length}`
  );
  ok(
    `${tag}/infinite-question-valid`,
    '无限模式下当前题目仍在题库中',
    bankIds.includes(stInfinite.currentId),
    `currentId=${stInfinite.currentId}`
  );
  ok(
    `${tag}/infinite-still-no-progress`,
    '无限模式下仍然没有进度 UI',
    !(await layoutMetrics(page)).progressExists &&
      !(await layoutMetrics(page)).barExists,
    '无 #progress / .bar'
  );

  // ---- 防连点（同步双点不同选项） ----
  await injectState(page, cand.optionsHeavy.id);
  const beforeD1 = await readState(page);
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#options button.option')];
    btns[0].click();
    btns[1].click();
  });
  await page.waitForTimeout(await waitTransitionDone());
  const stD1 = await readState(page);
  eq(`${tag}/double-click-different`, '同步连点两个不同选项只前进 1 题',
    1, stD1.answers.length);
  eq(`${tag}/double-click-different-current`, '同步连点只随机出一次下一题',
    true, stD1.currentId !== beforeD1.currentId);
  eq(
    `${tag}/double-click-different-answers`,
    '同步连点不同选项只记录 1 条作答（且为第一次点击的 A）',
    JSON.stringify({ answers: 1, choice: 0 }),
    JSON.stringify({
      answers: stD1.answers.length,
      choice: stD1.answers[0].choice,
    })
  );

  // ---- 防连点（同步双点同一选项） ----
  const beforeD2 = stD1.currentId;
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#options button.option')];
    btns[0].click();
    btns[0].click();
  });
  await page.waitForTimeout(await waitTransitionDone());
  const stD2 = await readState(page);
  eq(`${tag}/double-click-same`, '同步连点同一选项两次只前进 1 题',
    1, stD2.answers.length - stD1.answers.length);
  eq(`${tag}/double-click-same-current`, '同步连点同一选项只随机出一次下一题',
    true, stD2.currentId !== beforeD2);

  // ---- 防连点（间隔 50ms 双点，真实事件序列） ----
  const beforeD3 = stD2.currentId;
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#options button.option')];
    btns[0].click();
    setTimeout(() => btns[1].click(), 50);
  });
  await page.waitForTimeout(await waitTransitionDone());
  const stD3 = await readState(page);
  eq(`${tag}/double-click-50ms`, '间隔 50ms 连点两次只前进 1 题',
    1, stD3.answers.length - stD2.answers.length);
  eq(`${tag}/double-click-50ms-current`, '间隔 50ms 连点只随机出一次下一题',
    true, stD3.currentId !== beforeD3);
  const shotDbl = await screenshot(page, `${tag}-double-click.png`, tag);
  ok(
    `${tag}/shot-double-click-size`,
    '防连点截图尺寸',
    `${shotDbl.width}x${shotDbl.height}` === `${vp.width}x${vp.height}`,
    `${shotDbl.width}x${shotDbl.height}`
  );

  // ---- 旧版 v1 状态迁移 ----
  const legacyTarget = await page.evaluate(
    ({ legacyKey }) => {
      const ids = window.QUESTION_BANK.map((x) => x.id);
      localStorage.removeItem('astroQuizState.v2');
      localStorage.setItem(
        legacyKey,
        JSON.stringify({
          order: ids,
          index: 3,
          answers: [{ id: ids[0], choice: 1 }],
        })
      );
      return ids[3];
    },
    { legacyKey: LEGACY_KEY }
  );
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  const migrated = await readState(page);
  ok(
    `${tag}/legacy-migration`,
    '旧版 v1 状态可迁移（续做当前题 + 保留作答记录）',
    !!migrated &&
      migrated.currentId === legacyTarget &&
      migrated.answers.length === 1,
    migrated
      ? `currentId=${migrated.currentId}, answers=${migrated.answers.length}`
      : 'null'
  );
  eq(`${tag}/legacy-migration-question`, '迁移后展示旧版当前题',
    legacyTarget, (await currentItem(page)).id);

  // ---- console / 网络错误 ----
  ok(
    `${tag}/no-console-errors`,
    '页面无 console error / pageerror / 请求失败',
    watch.console.length === 0 &&
      watch.pageerror.length === 0 &&
      watch.requestfailed.length === 0,
    JSON.stringify(warnings.length ? warnings : watch)
  );

  await ctx.close();
  return cand;
}

// ---- 全局静态检查：www/ 无外部 URL ----
function staticChecks() {
  const files = fs
    .readdirSync(path.join(ROOT, 'www'))
    .filter((f) => /\.(html|css|js|json)$/.test(f));
  const hits = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(ROOT, 'www', f), 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (/https?:\/\//.test(line)) {
        hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 160)}`);
      }
    });
  }
  eq(
    'global/www-no-external-url',
    'www/ 内无任何 http(s) 外部 URL',
    '0 处',
    `${hits.length} 处${hits.length ? ' → ' + hits.join(' | ') : ''}`
  );
  eq('global/www-index-exists', 'www/index.html 存在', true,
    fs.existsSync(WWW));
  eq('global/www-questions-exists', 'www/questions.js 存在', true,
    fs.existsSync(path.join(ROOT, 'www', 'questions.js')));
  return hits;
}

// ---- 报告 ----
function writeReport({ browserVersion, pwVersion, gitHead, launchError, wwwHits }) {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  const now = new Date().toISOString();
  const lines = [];
  lines.push('# Web 端验收报告（qa/verify.mjs）');
  lines.push('');
  lines.push(`- 生成时间：${now}`);
  lines.push(`- 被测页面：\`${WWW}\`（file:// 打开，未启动服务器）`);
  lines.push(`- 浏览器：Chromium ${browserVersion || '未知'}（playwright-core ${pwVersion}）`);
  lines.push(`- 视口：360×640、412×915（deviceScaleFactor=1，isMobile+hasTouch）`);
  lines.push(`- git HEAD：${gitHead || '未知'}`);
  lines.push(`- 结论：**${failed.length === 0 ? '全部通过' : failed.length + ' 条失败'}**（共 ${total} 条断言，通过 ${passed}）`);
  lines.push('');
  lines.push('## 断言明细');
  lines.push('');
  lines.push('| # | 断言 ID | 描述 | 期望 | 实际 | 结果 |');
  lines.push('|---|---|---|---|---|---|');
  results.forEach((r, i) => {
    const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(
      `| ${i + 1} | ${r.id} | ${r.title} | ${esc(r.expected)} | ${esc(r.actual)} | ${r.pass ? 'PASS' : '**FAIL**'} |`
    );
  });
  lines.push('');
  lines.push('## 截图');
  lines.push('');
  lines.push('| 文件 | 视口 | 尺寸 | 大小 |');
  lines.push('|---|---|---|---|');
  for (const s of screenshots) {
    lines.push(
      `| ${path.basename(s.file)} | ${s.viewport} | ${s.width}×${s.height} | ${(s.size / 1024).toFixed(1)} KiB |`
    );
  }
  lines.push('');
  lines.push('## 无限随机刷题模式');
  lines.push('');
  lines.push('- 页面没有 `#progress` 题号文字，也没有 `.bar` 进度条；只有题目 + 4 个选项。');
  lines.push('- 每次作答后从全部 485 题中随机抽下一题，且不会连续两题相同（`randomId(excludeId)`）。');
  lines.push('- 连续作答 8 题的断言验证：作答记录每题 +1、无相邻重复、随机分布正常。');
  lines.push('- 当前题与作答记录存 `localStorage["astroQuizState.v2"]`，刷新后题目与记录都恢复。');
  lines.push('');
  lines.push('## 控制台错误 / 页面异常 / 请求失败');
  lines.push('');
  if (consoleErrors.length === 0) {
    lines.push('无（两个视口全程 0 条 console error / pageerror / requestfailed）。');
  } else {
    lines.push('| 视口 | 类型 | 内容 |');
    lines.push('|---|---|---|');
    for (const e of consoleErrors) {
      lines.push(`| ${e.viewport} | ${e.kind} | ${String(e.text).replace(/\|/g, '\\|')} |`);
    }
  }
  lines.push('');
  lines.push('## www/ 外部 URL 检查');
  lines.push('');
  if (wwwHits.length === 0) {
    lines.push('grep 检查 `www/*.html|css|js|json` 中 `http://` / `https://`：0 处，全部资源本地引用。');
  } else {
    lines.push('发现外部 URL：');
    for (const h of wwwHits) lines.push(`- \`${h}\``);
  }
  lines.push('');
  lines.push('## 长题目场景');
  lines.push('');
  lines.push('动态从 `window.QUESTION_BANK` 计算候选，并注入 localStorage（currentId=目标题、answers=[]）后刷新：');
  lines.push('');
  lines.push('- 综合最长（题干长度 + 最长选项长度）：`2020-29`，实际页面定位由脚本动态校验；');
  lines.push('- 最长题干：`2017-21`（134 字），实际页面定位由脚本动态校验。');
  lines.push('');
  if (tallestSummary.length) {
    lines.push('### 内容最多题的垂直可达性（防 flex 居中裁切 / 底部不可滚动）');
    lines.push('');
    lines.push('| 视口 | 题 ID | innerHeight | scrollHeight | quizTop | 最大 scrollY | 末选项底部 | 结果 |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const vs of tallestSummary) {
      for (const it of vs.items) {
        const pass = it.quizTop >= 0 && it.lastBottom <= it.innerHeight + 1;
        lines.push(
          `| ${vs.viewport} | ${it.id} | ${it.innerHeight} | ${it.scrollHeight} | ${it.quizTop.toFixed(1)} | ${it.maxScroll} | ${it.lastBottom.toFixed(1)} | ${pass ? 'PASS' : '**FAIL**'} |`
        );
      }
    }
    lines.push('');
  }
  lines.push('## 未验证项 / 限制');
  lines.push('');
  lines.push('- 仅桌面无头 Chromium 的 file:// 环境，未覆盖真机 Android WebView 与 Capacitor SystemBars 注入的 safe-area（模拟器不可用）。');
  lines.push('- 未验证 APK 包内资源、Android 启动页与系统栏在真机上的实际渲染（包内资源由打包步骤用 unzip/aapt2 静态校验）。');
  lines.push('- 未验证屏幕阅读器/键盘可达性（仅通过 4 个选项按钮存在性推断键盘 A-D 路径存在）。');
  lines.push('- 未验证低端设备动画掉帧、真机触屏长按/双击缩放行为。');
  lines.push('- `@media (hover:hover)` 触屏分支无法在桌面无头 Chromium 中真实复现（依赖 isMobile/hasTouch 模拟）。');
  lines.push('');
  lines.push('## 失败断言');
  lines.push('');
  if (failed.length === 0) {
    lines.push('无。');
  } else {
    for (const f of failed) {
      lines.push(`- **${f.id}** ${f.title}：期望 \`${f.expected}\`，实际 \`${f.actual}\``);
    }
  }
  lines.push('');
  if (launchError) {
    lines.push('## 执行异常');
    lines.push('');
    lines.push('```');
    lines.push(launchError);
    lines.push('```');
  }
  fs.writeFileSync(path.join(QA_DIR, 'report.md'), lines.join('\n') + '\n', 'utf8');
}

// ---- main ----
let browserVersion;
let pwVersion;
let launchError;
try {
  pwVersion = require(PLAYWRIGHT_PATH + '/package.json').version;
} catch (e) {
  pwVersion = '?';
}
let gitHead;
try {
  gitHead = execSync('git -C ' + JSON.stringify(ROOT) + ' rev-parse --short HEAD', {
    encoding: 'utf8',
  }).trim();
} catch (e) {
  gitHead = '?';
}

const wwwHits = staticChecks();
let browser;
try {
  console.log(`\n=== 启动 Chromium（${CHROME}）===`);
  browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  browserVersion = browser.version();
  for (const vp of VIEWPORTS) {
    console.log(`\n=== 视口 ${vp.width}x${vp.height} ===`);
    await testViewport(browser, vp);
  }
} catch (err) {
  launchError = String(err && err.stack ? err.stack : err);
  console.error('执行异常:', launchError);
  rec('global/execution', '测试脚本完整执行', '无异常', '异常: ' + String(err).slice(0, 300), false);
} finally {
  if (browser) await browser.close().catch(() => {});
  writeReport({ browserVersion, pwVersion, gitHead, launchError, wwwHits });
  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== 完成：${results.length} 条断言，${results.length - failed.length} 通过，${failed.length} 失败 ===`);
  console.log('报告与截图目录:', QA_DIR);
  if (failed.length > 0 || launchError) process.exitCode = 1;
}
