(function () {
  "use strict";

  // 自适应刷题模式：选题 / 复习算法在 selector.js（src/selector.js）中。
  // 由于不能修改 index.html，selector.js 在运行时动态插入脚本加载。
  // 当前题目与作答/复习状态保存在 localStorage（astroQuizState.v3），用于关闭应用后断点续做。
  const V3_KEY = "astroQuizState.v3";
  const V2_KEY = "astroQuizState.v2";
  const V1_KEY = "astroQuizState.v1";
  const LETTERS = ["A", "B", "C", "D"];
  const FEEDBACK_MS = 600; // 答完后显示对错的时间
  const FADE_MS = 150; // 淡出 / 淡入各自的时长
  const LOAD_FAILED_TEXT = "题库加载失败";

  const $quiz = document.getElementById("quiz");
  const $question = document.getElementById("question");
  const $options = document.getElementById("options");
  const $explain = document.getElementById("explain");
  const $explainText = document.getElementById("explainText");
  const $explainHint = document.getElementById("explainHint");

  let S = null; // window.AstroSelector（selector.js 加载后才有）
  let bank = null;
  let byId = null;
  let state = null;
  let locked = false;
  let awaitingContinue = false; // 答错后展示解析，等待用户轻触继续
  let feedbackTimer = 0;
  let swapTimer = 0;
  let unlockTimer = 0;

  // ---------------- 错误提示 ----------------

  function showLoadFailure(detail) {
    console.error("[app] " + detail);
    if ($question) $question.textContent = LOAD_FAILED_TEXT;
    if ($options) $options.textContent = "";
  }

  // ---------------- 启动校验（CONTRACT 8.1） ----------------

  // 校验题库每道题：id/q/options/answer 合法、type 属于 TYPE_ORDER、ai 是 boolean。
  // 返回 null 表示通过，否则返回错误描述。
  function validateBank(list) {
    if (!Array.isArray(list) || list.length === 0) {
      return "题库为空或不是数组";
    }
    const typeOrder = Array.isArray(S.TYPE_ORDER) ? S.TYPE_ORDER : [];
    const types = new Set(typeOrder);
    for (let i = 0; i < list.length; i += 1) {
      const item = list[i];
      const where = "题库第 " + (i + 1) + " 题";
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return where + "不是对象";
      }
      if (typeof item.id !== "string" || item.id === "") {
        return where + " id 不合法";
      }
      if (typeof item.q !== "string" || item.q.trim() === "") {
        return where + " q 不合法";
      }
      if (!Array.isArray(item.options) || item.options.length !== 4) {
        return where + " options 必须恰好有 4 个选项";
      }
      for (let j = 0; j < item.options.length; j += 1) {
        if (typeof item.options[j] !== "string" || item.options[j].trim() === "") {
          return where + " options[" + j + "] 不合法";
        }
      }
      if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer > 3) {
        return where + " answer 不合法";
      }
      if (typeof item.type !== "string" || !types.has(item.type)) {
        return where + " type 不合法：" + String(item.type);
      }
      if (typeof item.ai !== "boolean") {
        return where + " ai 必须是 boolean";
      }
      if (typeof item.explain !== "string" || item.explain.trim() === "") {
        return where + " explain 必须是非空字符串（答错时展示的解析）";
      }
    }
    return null;
  }

  // ---------------- 状态存取（CONTRACT 8.2） ----------------

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function readStored(key) {
    let raw = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  // 只写 v3；v1 / v2 的原始数据保留，绝不删除或覆盖。
  function saveState() {
    try {
      window.localStorage.setItem(V3_KEY, JSON.stringify(state));
    } catch (err) {
      /* 隐私模式 / 存储被禁用时忽略，仍可继续做题 */
    }
  }

  function isValidV3(value) {
    if (!isPlainObject(value)) return false;
    if (typeof value.currentId !== "string" || !byId.has(value.currentId)) {
      return false;
    }
    if (!Number.isInteger(value.step) || value.step < 0) {
      return false;
    }
    if (!isPlainObject(value.q)) return false;
    // box 上限从 CONFIG.intervalsDays 派生（不硬编码 5）
    const maxBox = S.CONFIG.intervalsDays.length - 1;
    const ids = Object.keys(value.q);
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      if (!byId.has(id)) return false;
      const record = value.q[id];
      if (!isPlainObject(record)) return false;
      if (!Number.isInteger(record.seen) || record.seen < 1) return false;
      if (
        !Number.isInteger(record.wrong) ||
        record.wrong < 0 ||
        record.wrong > record.seen
      ) {
        return false;
      }
      if (!Number.isInteger(record.box) || record.box < 0 || record.box > maxBox) {
        return false;
      }
      if (!Number.isInteger(record.lastStep) || record.lastStep < 0) {
        return false;
      }
      if (typeof record.due !== "number" || !Number.isFinite(record.due)) {
        return false;
      }
      // CONTRACT §3：box 0 的 due 固定为 0；box > 0 的 due 必须 > 0。
      if (record.box === 0) {
        if (record.due !== 0) return false;
      } else if (!(record.due > 0)) {
        return false;
      }
    }
    if (!Array.isArray(value.log)) return false;
    // log 上限直接取 CONFIG.logLimit（不硬编码 500）
    const logLimit = S.CONFIG.logLimit;
    if (value.log.length > logLimit) return false;
    for (let i = 0; i < value.log.length; i += 1) {
      const entry = value.log[i];
      if (!isPlainObject(entry)) return false;
      if (typeof entry.id !== "string" || !byId.has(entry.id)) return false;
      if (typeof entry.type !== "string") return false;
      if (typeof entry.ok !== "boolean") return false;
      if (!Number.isInteger(entry.step) || entry.step < 0) return false;
    }
    return true;
  }

  // ---------------- v1 / v2 → v3 迁移 ----------------

  function emptyV3() {
    return { currentId: null, step: 0, q: {}, log: [] };
  }

  function isLegacyAnswer(answer) {
    return (
      isPlainObject(answer) &&
      typeof answer.id === "string" &&
      byId.has(answer.id) &&
      Number.isInteger(answer.choice) &&
      answer.choice >= 0 &&
      answer.choice <= 3
    );
  }

  // 用同一个 now 逐条 applyAnswer，从空 v3 开始重建状态。
  function migrateAnswers(answers, now) {
    let next = emptyV3();
    for (let i = 0; i < answers.length; i += 1) {
      const answer = answers[i];
      const item = byId.get(answer.id);
      const ok = answer.choice === item.answer;
      next = S.applyAnswer(next, item, ok, now);
    }
    return next;
  }

  // v2：{ currentId, answers:[{id, choice}] }
  function migrateV2(now) {
    const old = readStored(V2_KEY);
    if (!isPlainObject(old) || !Array.isArray(old.answers)) return null;
    const answers = old.answers.filter(isLegacyAnswer);
    const next = migrateAnswers(answers, now);
    const oldCurrentId =
      typeof old.currentId === "string" && byId.has(old.currentId)
        ? old.currentId
        : null;
    next.currentId = oldCurrentId || S.nextQuestion(bank, next, now, Math.random);
    return next;
  }

  // v1：{ order, index, answers }
  function migrateV1(now) {
    const old = readStored(V1_KEY);
    if (!isPlainObject(old) || !Array.isArray(old.order)) return null;
    const answers = Array.isArray(old.answers)
      ? old.answers.filter(isLegacyAnswer)
      : [];
    const next = migrateAnswers(answers, now);
    let oldCurrentId = null;
    if (
      Number.isInteger(old.index) &&
      old.index >= 0 &&
      old.index < old.order.length
    ) {
      const candidate = old.order[old.index];
      if (typeof candidate === "string" && byId.has(candidate)) {
        oldCurrentId = candidate;
      }
    }
    next.currentId = oldCurrentId || S.nextQuestion(bank, next, now, Math.random);
    return next;
  }

  // ---------------- 初始化 ----------------

  function initialize() {
    const api = window.AstroSelector;
    if (!api || typeof api !== "object") {
      showLoadFailure("selector.js 已加载，但 window.AstroSelector 缺失");
      return;
    }
    if (
      typeof api.nextQuestion !== "function" ||
      typeof api.applyAnswer !== "function" ||
      !Array.isArray(api.TYPE_ORDER) ||
      !isPlainObject(api.CONFIG) ||
      !Array.isArray(api.CONFIG.intervalsDays) ||
      api.CONFIG.intervalsDays.length === 0 ||
      !Number.isInteger(api.CONFIG.logLimit) ||
      api.CONFIG.logLimit < 1
    ) {
      showLoadFailure("window.AstroSelector 接口不完整");
      return;
    }
    S = api;

    bank = window.QUESTION_BANK;
    const bankProblem = validateBank(bank);
    if (bankProblem) {
      showLoadFailure(bankProblem);
      return;
    }
    byId = new Map(
      bank.map(function (item) {
        return [item.id, item];
      })
    );

    const now = Date.now();

    // 启动顺序：合法 v3 → v2 迁移 → v1 迁移 → 新建空状态。
    const storedV3 = readStored(V3_KEY);
    if (isValidV3(storedV3)) {
      state = storedV3;
    } else {
      // v2 与 v1 分别容错：v2 迁移抛异常时仍要尝试 v1，二者都失败才新建空状态。
      let next = null;
      try {
        next = migrateV2(now);
      } catch (err) {
        console.error("[app] v2 状态迁移失败：", err);
        next = null;
      }
      if (!next) {
        try {
          next = migrateV1(now);
        } catch (err) {
          console.error("[app] v1 状态迁移失败：", err);
          next = null;
        }
      }
      if (!next) {
        next = emptyV3();
        next.currentId = S.nextQuestion(bank, next, now, Math.random);
      }
      state = next;
      saveState(); // 迁移 / 新建后立即写 v3；v1、v2 原数据保留
    }

    render();
  }

  // ---------------- 渲染与作答 ----------------

  function currentItem() {
    return byId.get(state.currentId);
  }

  function render() {
    const item = currentItem();
    if (!item) {
      showLoadFailure("当前题目 id 不在题库中：" + String(state.currentId));
      return;
    }
    hideExplanation();
    $question.textContent = item.q;

    $options.textContent = "";
    item.options.forEach(function (text, choice) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";

      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = LETTERS[choice];

      const label = document.createElement("span");
      label.className = "option-text";
      label.textContent = text;

      button.append(letter, label);
      button.addEventListener("click", function () {
        choose(choice);
      });
      $options.appendChild(button);
    });
  }

  // 在选项上标出正确 / 错误：正确项绿色，选错时选中项红色
  function showFeedback(answer, choice) {
    const buttons = $options.querySelectorAll(".option");
    buttons.forEach(function (button, index) {
      if (index === answer) {
        button.classList.add("correct");
      } else if (index === choice) {
        button.classList.add("wrong");
      }
    });
  }

  // 解析文本来自 data 的 explain，只含少量 **加粗** 标记；
  // 用 textContent 逐段构建，避免把数据当 HTML 注入。
  function setExplanation(text) {
    $explainText.textContent = "";
    String(text || "").split("**").forEach(function (part, index) {
      if (index % 2 === 1) {
        const strong = document.createElement("strong");
        strong.textContent = part;
        $explainText.appendChild(strong);
      } else {
        $explainText.appendChild(document.createTextNode(part));
      }
    });
    $explain.hidden = false;
    $explainHint.hidden = true;
    requestAnimationFrame(function () {
      $explain.scrollIntoView({ block: "nearest" });
    });
  }

  function hideExplanation() {
    if (!$explain) return;
    $explain.hidden = true;
    $explainText.textContent = "";
    $explainHint.hidden = true;
  }

  // 淡出 → 渲染下一题 → 淡入 → 解锁
  function goToNext() {
    clearTimeout(swapTimer);
    clearTimeout(unlockTimer);
    $quiz.classList.add("fade");
    swapTimer = setTimeout(function () {
      render(); // 自适应算法选出的下一题
      $quiz.classList.remove("fade");
      unlockTimer = setTimeout(function () {
        locked = false;
      }, FADE_MS);
    }, FADE_MS);
  }

  // 答错并展示解析后，轻触/按键继续（由用户控制阅读时间）
  function continueAfterExplanation(event) {
    if (!awaitingContinue) return;
    if (event) {
      if (
        event.type === "keydown" &&
        (event.repeat || event.ctrlKey || event.metaKey || event.altKey)
      ) {
        return;
      }
      if (event.cancelable) event.preventDefault();
    }
    awaitingContinue = false;
    clearTimeout(feedbackTimer);
    goToNext();
  }

  function choose(choice) {
    if (locked || !state) return;
    locked = true;

    const item = currentItem();
    if (!item) {
      locked = false;
      showLoadFailure("当前题目 id 不在题库中：" + String(state.currentId));
      return;
    }

    const now = Date.now();
    const ok = choice === item.answer;
    let next = S.applyAnswer(state, item, ok, now);
    next.currentId = S.nextQuestion(bank, next, now, Math.random);
    state = next;
    // 先落盘（含下一题 currentId），反馈 / 切换期间退出也不会丢进度
    saveState();

    // 先显示约 600ms 的对错反馈：
    // 答对 → 自动切下一题；答错 → 展开解析，等待用户轻触继续。
    showFeedback(item.answer, choice);
    clearTimeout(feedbackTimer);
    clearTimeout(swapTimer);
    clearTimeout(unlockTimer);
    if (ok) {
      feedbackTimer = setTimeout(goToNext, FEEDBACK_MS);
    } else {
      setExplanation(item.explain);
      feedbackTimer = setTimeout(function () {
        $explainHint.hidden = false;
        awaitingContinue = true;
      }, FEEDBACK_MS);
    }
  }

  // 解析展示期间：点击任意处 / 按任意键继续（捕获阶段先于作答快捷键）
  document.addEventListener("pointerdown", continueAfterExplanation, true);
  document.addEventListener("keydown", continueAfterExplanation, true);

  // 桌面/外接键盘快捷作答（A/B/C/D 或 1/2/3/4），界面不展示任何额外文字
  document.addEventListener("keydown", function (event) {
    if (awaitingContinue) return;
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = String(event.key || "").toUpperCase();
    let choice = LETTERS.indexOf(key);
    if (choice === -1 && "1234".indexOf(key) !== -1) {
      choice = Number(key) - 1;
    }
    if (choice >= 0 && choice < 4) {
      event.preventDefault();
      choose(choice);
    }
  });

  // ---------------- 动态加载 selector.js（不改 index.html） ----------------

  function loadSelector() {
    const script = document.createElement("script");
    script.src = "selector.js";
    script.onload = function () {
      initialize();
    };
    script.onerror = function () {
      showLoadFailure("selector.js 加载失败");
    };
    document.head.appendChild(script);
  }

  loadSelector();
})();
