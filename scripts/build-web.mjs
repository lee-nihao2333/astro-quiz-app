#!/usr/bin/env node
/**
 * 构建脚本：把 src/ 与 data/ 组装成可离线运行的 www/
 *
 * 1. 从 src/selector.js 取得 TYPE_ORDER（单一来源，不复制常量）；
 * 2. 读取 data/index.json 及其中列出的全部题库文件；
 * 3. 校验每道题（题干、4 个选项、答案下标、题目唯一 ID、type 属于 TYPE_ORDER）；
 * 4. 清空并重新生成 www/，复制 src/，并生成 www/questions.js
 *    （内容为 window.QUESTION_BANK = [...]，每题含 { id, q, options, answer,
 *    type, explain, ai }，不依赖 fetch）；
 * 5. 构建成功时按 TYPE_ORDER 打印全部 8 类的题数与总数。
 *
 * 任一条校验失败都会以非 0 退出码结束，并指出出问题的文件与题号。
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data");
const SRC_DIR = join(ROOT, "src");
const WWW_DIR = join(ROOT, "www");
const SELECTOR_PATH = join(SRC_DIR, "selector.js");

function fail(message) {
  console.error(`\n[build] ✗ ${message}\n`);
  process.exit(1);
}

function readJson(filePath, label) {
  let raw;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    fail(`无法读取${label} ${filePath}：${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`${label} ${filePath} 不是合法 JSON：${err.message}`);
  }
}

/**
 * 从 src/selector.js 读取 TYPE_ORDER（单一来源，不在此处复制一份）。
 * selector 尚不存在或加载失败时给出清晰错误并以非 0 退出。
 */
function loadTypeOrder() {
  if (!existsSync(SELECTOR_PATH)) {
    fail(
      `找不到 src/selector.js：type 校验所需的 TYPE_ORDER 必须从该模块取得（应有 window.AstroSelector / module.exports 导出）`
    );
  }

  let selector;
  try {
    const require = createRequire(import.meta.url);
    selector = require(SELECTOR_PATH);
  } catch (err) {
    fail(`无法加载 src/selector.js：${err.message}`);
  }

  const typeOrder = selector && selector.TYPE_ORDER;
  if (!Array.isArray(typeOrder) || typeOrder.length === 0) {
    fail("src/selector.js 未导出有效的 TYPE_ORDER（应为非空字符串数组）");
  }
  typeOrder.forEach((type, i) => {
    if (typeof type !== "string" || type.trim() === "") {
      fail(
        `src/selector.js 的 TYPE_ORDER[${i}] 必须是非空字符串，实际为 ${JSON.stringify(
          type
        )}`
      );
    }
  });

  return typeOrder;
}

/** 统一描述某道题在源文件中的位置，便于报错定位 */
function locate(file, index, item) {
  const no =
    item && (typeof item.no === "number" || typeof item.no === "string")
      ? item.no
      : "?";
  return `data/${file} 第 ${index + 1} 条（题号 ${no}）`;
}

function assertQuestion(item, file, index, seenIds, typeOrder) {
  const where = locate(file, index, item);

  if (!item || typeof item !== "object" || Array.isArray(item)) {
    fail(`${where}：题目必须是对象`);
  }

  if (typeof item.no !== "number" || !Number.isInteger(item.no) || item.no < 1) {
    fail(`${where}：no 必须是正整数`);
  }

  if (typeof item.q !== "string" || item.q.trim() === "") {
    fail(`${where}：q 必须是非空字符串`);
  }

  if (!Array.isArray(item.options) || item.options.length !== 4) {
    fail(`${where}：options 必须恰好有 4 个选项`);
  }
  item.options.forEach((option, i) => {
    if (typeof option !== "string" || option.trim() === "") {
      fail(`${where}：options[${i}] 必须是非空字符串`);
    }
  });

  if (
    !Number.isInteger(item.answer) ||
    item.answer < 0 ||
    item.answer > 3
  ) {
    fail(
      `${where}：answer 必须是 0 到 3 之间的整数，实际为 ${JSON.stringify(
        item.answer
      )}`
    );
  }

  if (typeof item.type !== "string" || item.type.trim() === "") {
    fail(
      `${where}：type 必须是非空字符串，实际为 ${JSON.stringify(item.type)}`
    );
  }
  if (!typeOrder.includes(item.type)) {
    fail(
      `${where}：type "${item.type}" 不在 TYPE_ORDER 中（允许的类型：${typeOrder.join(
        "、"
      )}）`
    );
  }

  if (typeof item.explain !== "string" || item.explain.trim() === "") {
    fail(
      `${where}：explain 必须是非空字符串（用户答错时展示的解析）`
    );
  }

  const year = file.replace(/\.json$/i, "");
  if (!/^\d{4}$/.test(year)) {
    fail(`data/${file}：文件名必须是 4 位年份（如 2014.json）`);
  }
  const id = `${year}-${item.no}`;
  if (seenIds.has(id)) {
    fail(`${where}：题目 ID "${id}" 重复（首次出现在 data/${seenIds.get(id)}）`);
  }
  seenIds.set(id, `${file}（题号 ${item.no}）`);

  return {
    id,
    q: item.q,
    options: item.options,
    answer: item.answer,
    type: item.type,
    explain: item.explain,
    ai: item.answerSource === "ai",
  };
}

function main() {
  // ---- TYPE_ORDER 单一来源：src/selector.js ----
  const typeOrder = loadTypeOrder();

  // ---- 读取索引 ----
  const indexPath = join(DATA_DIR, "index.json");
  if (!existsSync(indexPath)) {
    fail("找不到 data/index.json");
  }
  const index = readJson(indexPath, "题库索引");
  if (!Array.isArray(index) || index.length === 0) {
    fail("data/index.json 必须是非空数组");
  }
  index.forEach((file, i) => {
    if (typeof file !== "string" || file.trim() === "") {
      fail(`data/index.json 第 ${i + 1} 项必须是非空文件名字符串`);
    }
    if (file.includes("/") || file.includes("\\")) {
      fail(`data/index.json 第 ${i + 1} 项只能是 data/ 下的文件名，实际为 "${file}"`);
    }
    if (!existsSync(join(DATA_DIR, file))) {
      fail(`data/index.json 中列出的 data/${file} 不存在`);
    }
  });

  // ---- 逐题校验并合并 ----
  const seenIds = new Map();
  const bank = [];
  for (const file of index) {
    const list = readJson(join(DATA_DIR, file), `题库 ${file}`);
    if (!Array.isArray(list)) {
      fail(`data/${file} 必须是题目数组`);
    }
    list.forEach((item, position) => {
      bank.push(assertQuestion(item, file, position, seenIds, typeOrder));
    });
  }

  // ---- 生成 www/ ----
  if (!existsSync(join(SRC_DIR, "index.html"))) {
    fail("src/index.html 不存在");
  }
  rmSync(WWW_DIR, { recursive: true, force: true });
  mkdirSync(WWW_DIR, { recursive: true });
  cpSync(SRC_DIR, WWW_DIR, { recursive: true });

  const questionsJs = `/* 由 scripts/build-web.mjs 自动生成，请勿手动修改 */\nwindow.QUESTION_BANK = ${JSON.stringify(
    bank
  )};\n`;
  writeFileSync(join(WWW_DIR, "questions.js"), questionsJs, "utf8");

  console.log(
    `[build] ✓ 题库校验通过：${index.length} 个文件，共 ${bank.length} 道题`
  );

  // ---- 类型统计（按 TYPE_ORDER 顺序，8 类全部打印）----
  const typeCounts = new Map(typeOrder.map((type) => [type, 0]));
  for (const item of bank) {
    typeCounts.set(item.type, (typeCounts.get(item.type) || 0) + 1);
  }
  console.log(`[build] 类型统计（TYPE_ORDER 共 ${typeOrder.length} 类）：`);
  for (const type of typeOrder) {
    console.log(`[build]   ${type}：${typeCounts.get(type)} 题`);
  }
  console.log(`[build]   合计：${bank.length} 题`);

  console.log(`[build] ✓ 已生成 www/（${bank.length} 题，含解析，离线可用）`);
}

main();
