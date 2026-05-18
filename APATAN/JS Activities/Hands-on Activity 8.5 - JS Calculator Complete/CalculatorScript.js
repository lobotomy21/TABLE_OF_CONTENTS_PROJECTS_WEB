/** Left-to-right collapsed chain (display + chaining when operators are pressed). */
let currentExpression = "";
/**
 * Exact formula typed (only consecutive-op swaps), never LTR-collapsed.
 * "=" uses MDAS on this so 1+2*3+1= → 8 while the chain may show 9+1 → 10 after + .
 */
let verbatimExpression = "";
let memoryValue = 0;
const display = document.getElementById("display");
const historyDiv = document.getElementById("history");

function updateDisplay(main, history = "") {
  display.value = main || "0";
  historyDiv.innerText = history;
}

function exprEndsWithOperator(expr) {
  return /[+\-*/]$/.test(expr.trim());
}

function stripTrailingOperators(expr) {
  return expr.replace(/[+\-*/]+$/, "");
}

/** Split expression into alternating number and operator tokens. */
function tokenize(expr) {
  const s = expr.trim();
  const tokens = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    if ("+-*/".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    let j = i;
    while (j < s.length && (s[j] === "." || (s[j] >= "0" && s[j] <= "9"))) {
      j++;
    }
    if (j === i) break;
    const raw = s.slice(i, j);
    const num = raw === "." ? NaN : parseFloat(raw);
    tokens.push({ type: "num", value: num });
    i = j;
  }
  return tokens;
}

/** Build nums[] and ops[] from token list; drops a trailing operator. */
function toNumsOps(tokens) {
  const trimmed = [...tokens];
  while (trimmed.length && trimmed[trimmed.length - 1].type === "op") {
    trimmed.pop();
  }
  if (trimmed.length === 0) return null;

  const nums = [];
  const ops = [];
  for (let k = 0; k < trimmed.length; k++) {
    if (trimmed[k].type !== "num") return null;
    nums.push(trimmed[k].value);
    if (k + 1 >= trimmed.length) break;
    if (trimmed[k + 1].type !== "op") return null;
    ops.push(trimmed[k + 1].value);
    k++;
  }
  if (nums.length !== ops.length + 1) return null;
  if (nums.some((n) => Number.isNaN(n))) return null;
  return { nums, ops };
}

function applyOp(op, a, b) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? NaN : a / b;
    default:
      return NaN;
  }
}

function evaluateLeftToRight(expr) {
  const pair = toNumsOps(tokenize(stripTrailingOperators(expr)));
  if (!pair) return NaN;
  let acc = pair.nums[0];
  for (let i = 0; i < pair.ops.length; i++) {
    acc = applyOp(pair.ops[i], acc, pair.nums[i + 1]);
  }
  return acc;
}

/**
 * MDAS: multiplication and division before addition and subtraction (standard order).
 * Used only when "=" is pressed — not for intermediate operator keys (those use LTR).
 */
function evaluateMDAS(expr) {
  const pair = toNumsOps(tokenize(stripTrailingOperators(expr)));
  if (!pair) return NaN;
  const nums = [...pair.nums];
  const ops = [...pair.ops];

  let i = 0;
  while (i < ops.length) {
    const op = ops[i];
    if (op === "*" || op === "/") {
      const v = applyOp(op, nums[i], nums[i + 1]);
      if (Number.isNaN(v)) return NaN;
      nums.splice(i, 2, v);
      ops.splice(i, 1);
    } else i++;
  }

  let acc = nums[0];
  for (let j = 0; j < ops.length; j++) {
    acc = applyOp(ops[j], acc, nums[j + 1]);
  }
  return acc;
}

function formatResult(n) {
  if (Number.isNaN(n)) return "NaN";
  return String(Number.isFinite(n) ? Number(n.toPrecision(14)) : n);
}

/** Last numeric segment after the last operator (or whole string). */
function getLastOperandSubstring(expr) {
  const t = expr.trim();
  let i = t.length - 1;
  while (i >= 0 && (t[i] === "." || (t[i] >= "0" && t[i] <= "9"))) {
    i--;
  }
  return t.slice(i + 1);
}

/** Current number for M+/M−: last operand only (not the whole equation). */
function getCurrentNumberForMemory() {
  const sub = getLastOperandSubstring(currentExpression);
  if (!sub || sub === ".") return 0;
  const v = parseFloat(sub);
  return Number.isNaN(v) ? 0 : v;
}

function syncMemoryLed() {
  const mEl = document.getElementById("ind-m");
  if (!mEl) return;
  if (memoryValue !== 0) mEl.classList.add("active-ind");
  else mEl.classList.remove("active-ind");
}

/** MC/MR short flash; M stays lit while memory≠0 per PDF flash rules. */
function flashIndicator(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("active-ind");
  if (id !== "ind-m") {
    setTimeout(() => el.classList.remove("active-ind"), 500);
  }
}

function appendNumber(num) {
  currentExpression += num;
  verbatimExpression += num;
  updateDisplay(currentExpression);
}

/** @returns {string} updated expression after one decimal-key action */
function applyDecimalToExpression(s) {
  let i = s.length - 1;
  while (i >= 0 && (s[i] === "." || (s[i] >= "0" && s[i] <= "9"))) {
    i--;
  }
  const head = s.slice(0, i + 1);
  const operand = s.slice(i + 1);

  if (operand.includes(".") && !operand.endsWith(".")) {
    return s;
  }

  if (operand.endsWith(".")) {
    return head + operand.slice(0, -1);
  }

  if (operand === "") {
    return head + "0.";
  }
  return head + operand + ".";
}

/**
 * One '.' per fractional part of the operand. Extra presses after "9.2..." are ignored (9.2.1.5 → 9.215).
 * If the operand ends with '.' (e.g. "5."), another '.' deletes that '.' (5.. → 53.4 workflow).
 */
function appendDecimal() {
  currentExpression = applyDecimalToExpression(currentExpression);
  verbatimExpression = applyDecimalToExpression(verbatimExpression);
  updateDisplay(currentExpression);
}

function handleOperator(op) {
  const expr = currentExpression.trimEnd();
  const verb = verbatimExpression.trimEnd();

  /**
   * Consecutive operators: replace the last operator only (e.g. 1+2 + - → 1+2-),
   * do not evaluate yet.
   */
  if (exprEndsWithOperator(expr)) {
    currentExpression = expr.slice(0, -1) + op;
    if (exprEndsWithOperator(verb)) {
      verbatimExpression = verb.slice(0, -1) + op;
    }
    updateDisplay(currentExpression, "");
    return;
  }

  if (expr === "" || !/[0-9.]$/.test(expr)) return;

  /**
   * Spec: before "=", pressing an operator after a complete number collapses the
   * chain using strict left-to-right order (not MDAS). Verbatim tape only appends
   * the operator so "=" can still MDAS the full typed formula (e.g. 1+2*3+1 → 8).
   */
  const evaluated = evaluateLeftToRight(expr);
  if (Number.isNaN(evaluated)) return;

  const resultStr = formatResult(evaluated);
  currentExpression = `${resultStr}${op}`;
  verbatimExpression = `${verb}${op}`;
  updateDisplay(resultStr, expr);
}

/** Req. 3: Equals ("=") always evaluates the typed formula with MDAS (verbatim), not the LTR chain. */
function solve() {
  const work = stripTrailingOperators(verbatimExpression);
  if (!work) return;
  try {
    const result = evaluateMDAS(work);
    if (Number.isNaN(result)) {
      updateDisplay("Error");
      currentExpression = "";
      verbatimExpression = "";
      return;
    }
    const fullEq = `${work}=`;
    const out = formatResult(result);
    currentExpression = out;
    verbatimExpression = out;
    updateDisplay(currentExpression, fullEq);
  } catch {
    updateDisplay("Error");
    currentExpression = "";
    verbatimExpression = "";
  }
}

/** C — clears input / expression only. */
function clearInput() {
  currentExpression = "";
  verbatimExpression = "";
  updateDisplay("0", "");
}

/** AC — reset display and equation; memory unchanged per spec. */
function resetCalc() {
  currentExpression = "";
  verbatimExpression = "";
  updateDisplay("0", "");
}

function memAdd() {
  const addend = getCurrentNumberForMemory();
  memoryValue += Number.isFinite(addend) ? addend : 0;
  syncMemoryLed();
  flashIndicator("ind-m");
}

function memSub() {
  const subtrahend = getCurrentNumberForMemory();
  memoryValue -= Number.isFinite(subtrahend) ? subtrahend : 0;
  syncMemoryLed();
  flashIndicator("ind-m");
}

function memRecall() {
  const v = formatResult(memoryValue);
  currentExpression = v;
  verbatimExpression = v;
  updateDisplay(currentExpression);
  flashIndicator("ind-mr");
}

function memClear() {
  memoryValue = 0;
  syncMemoryLed();
  flashIndicator("ind-mc");
}

syncMemoryLed();
