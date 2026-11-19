(function () {
  "use strict";

  // 无限刷题模式：每次作答后从全部题目中随机抽取下一题，没有进度、没有尽头。
  // 当前题目与作答记录保存在 localStorage，用于关闭应用后断点续做。
  const STORAGE_KEY = "astroQuizState.v2";
  const LEGACY_STORAGE_KEY = "astroQuizState.v1";
  const LETTERS = ["A", "B", "C", "D"];
  const FEEDBACK_MS = 600; // 答完后显示对错的时间
  const FADE_MS = 150; // 淡出 / 淡入各自的时长

  const bank = window.QUESTION_BANK;
  const $quiz = document.getElementById("quiz");
  const $question = document.getElementById("question");
  const $options = document.getElementById("options");

  if (!Array.isArray(bank) || bank.length === 0) {
    $question.textContent = "题库加载失败";
    return;
  }

  const byId = new Map(bank.map((item) => [item.id, item]));

  let state = loadState() || createState();
  let locked = false;
  let feedbackTimer = 0;
  let swapTimer = 0;
  let unlockTimer = 0;

  // 随机抽一道题；excludeId 用于避免连续两题抽到同一道
  function randomId(excludeId) {
    if (bank.length === 1) return bank[0].id;
    let id;
    do {
      id = bank[Math.floor(Math.random() * bank.length)].id;
    } while (id === excludeId);
    return id;
  }

  function createState() {
    return {
      currentId: randomId(null),
      // 作答记录：[{ id: "2014-12", choice: 1 }, ...]，跨轮次持续累积
      answers: [],
    };
  }

  function isValidState(value) {
    if (!value || typeof value !== "object") return false;
    if (typeof value.currentId !== "string" || !byId.has(value.currentId)) {
      return false;
    }
    if (!Array.isArray(value.answers)) return false;
    for (const answer of value.answers) {
      if (
        !answer ||
        typeof answer.id !== "string" ||
        !byId.has(answer.id) ||
        !Number.isInteger(answer.choice) ||
        answer.choice < 0 ||
        answer.choice > 3
      ) {
        return false;
      }
    }
    return true;
  }

  function loadState() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (isValidState(parsed)) {
          return { currentId: parsed.currentId, answers: parsed.answers };
        }
      } catch (err) {
        /* 当前格式损坏，尝试从旧版迁移 */
      }
    }

    // 兼容旧版（v1：order/index/answers，一轮 485 题）的状态：
    // 从上次做到的位置续做，作答记录保留。
    try {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return null;
      const old = JSON.parse(raw);
      if (
        !old ||
        !Array.isArray(old.order) ||
        !Number.isInteger(old.index) ||
        old.index < 0 ||
        old.index >= old.order.length
      ) {
        return null;
      }
      const id = old.order[old.index];
      if (typeof id !== "string" || !byId.has(id)) return null;
      const answers = Array.isArray(old.answers)
        ? old.answers.filter(
            (answer) =>
              answer &&
              typeof answer.id === "string" &&
              byId.has(answer.id) &&
              Number.isInteger(answer.choice) &&
              answer.choice >= 0 &&
              answer.choice <= 3
          )
        : [];
      return { currentId: id, answers };
    } catch (err) {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* 隐私模式 / 存储被禁用时忽略，仍可继续做题 */
    }
  }

  function currentQuestion() {
    return byId.get(state.currentId);
  }

  function render() {
    const item = currentQuestion();
    $question.textContent = item.q;

    $options.textContent = "";
    item.options.forEach((text, choice) => {
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

  function choose(choice) {
    if (locked) return;
    locked = true;

    const item = currentQuestion();
    // 先落盘（作答记录 + 随机出的下一题），反馈/切换期间退出也不会丢进度
    state.answers.push({ id: item.id, choice: choice });
    state.currentId = randomId(item.id);
    saveState();

    // 先显示约 600ms 的对错反馈，再淡出换下一题
    showFeedback(item.answer, choice);
    clearTimeout(feedbackTimer);
    clearTimeout(swapTimer);
    clearTimeout(unlockTimer);
    feedbackTimer = setTimeout(function () {
      $quiz.classList.add("fade"); // 150ms 淡出
      swapTimer = setTimeout(function () {
        render(); // 随机抽到的下一题
        $quiz.classList.remove("fade"); // 150ms 淡入
        unlockTimer = setTimeout(function () {
          locked = false;
        }, FADE_MS);
      }, FADE_MS);
    }, FEEDBACK_MS);
  }

  // 桌面/外接键盘快捷作答（A/B/C/D 或 1/2/3/4），界面不展示任何额外文字
  document.addEventListener("keydown", function (event) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toUpperCase();
    let choice = LETTERS.indexOf(key);
    if (choice === -1 && "1234".indexOf(key) !== -1) {
      choice = Number(key) - 1;
    }
    if (choice >= 0 && choice < 4) {
      event.preventDefault();
      choose(choice);
    }
  });

  render();
  saveState(); // 立即落盘，随时关闭都能续做
})();
