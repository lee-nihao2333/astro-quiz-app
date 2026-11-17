(function () {
  "use strict";

  // 本轮状态（轮次顺序 / 当前下标 / 作答记录）保存到 localStorage，用于断点续做
  const STORAGE_KEY = "astroQuizState.v1";
  const LETTERS = ["A", "B", "C", "D"];
  const FEEDBACK_MS = 600; // 答完后显示对错的时间
  const FADE_MS = 150; // 淡出 / 淡入各自的时长（反馈 + 淡出 + 淡入期间不响应点击）

  const bank = window.QUESTION_BANK;
  const $quiz = document.getElementById("quiz");
  const $progress = document.getElementById("progress");
  const $barFill = document.getElementById("barFill");
  const $question = document.getElementById("question");
  const $options = document.getElementById("options");

  if (!Array.isArray(bank) || bank.length === 0) {
    $question.textContent = "题库加载失败";
    return;
  }

  const byId = new Map(bank.map((item) => [item.id, item]));

  let state = loadState() || createRound();
  let locked = false;
  let feedbackTimer = 0;
  let swapTimer = 0;
  let unlockTimer = 0;

  function shuffle(list) {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // 把全部题目打乱成一轮；一轮做完后重新打乱再来一轮
  function createRound() {
    return {
      order: shuffle(bank.map((item) => item.id)),
      index: 0,
      // 当前轮作答记录：[{ id: "2014-12", choice: 1 }, ...]
      answers: [],
    };
  }

  function isValidState(value) {
    if (!value || typeof value !== "object") return false;
    const { order, index, answers } = value;
    if (!Array.isArray(order) || order.length !== bank.length) return false;
    if (!Number.isInteger(index) || index < 0 || index >= order.length) {
      return false;
    }
    if (!Array.isArray(answers)) return false;

    const seen = new Set();
    for (const id of order) {
      if (typeof id !== "string" || !byId.has(id) || seen.has(id)) {
        return false;
      }
      seen.add(id);
    }
    for (const answer of answers) {
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
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!isValidState(parsed)) return null;
      return {
        order: parsed.order,
        index: parsed.index,
        answers: parsed.answers,
      };
    } catch (err) {
      return null; // 数据损坏时重新开始
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
    return byId.get(state.order[state.index]);
  }

  function render() {
    const item = currentQuestion();
    const total = state.order.length;

    $progress.textContent = "第 " + (state.index + 1) + " / " + total + " 题";
    $barFill.style.width = (state.index / total) * 100 + "%";
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
    // 记录作答并立刻推进下标，这样即使反馈/切换期间退出应用，下次也能从下一题继续
    state.answers.push({ id: item.id, choice: choice });
    state.index += 1;
    if (state.index >= state.order.length) {
      state = createRound(); // 一轮做完，重新打乱开始下一轮
    }
    saveState();

    // 先显示约 600ms 的对错反馈（正确项绿、选错项红），再淡出换下一题
    showFeedback(item.answer, choice);
    clearTimeout(feedbackTimer);
    clearTimeout(swapTimer);
    clearTimeout(unlockTimer);
    feedbackTimer = setTimeout(function () {
      $quiz.classList.add("fade"); // 150ms 淡出
      swapTimer = setTimeout(function () {
        render(); // 换下一题
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
  saveState(); // 新开一轮时立即落盘，之后随时关闭都能续做
})();
