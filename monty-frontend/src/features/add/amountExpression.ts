/** Numpad input like "1200+350-50": digits plus binary + / − only. */

export type NumpadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '000' | '+' | '-' | 'back' | 'clear';

const MAX_LENGTH = 32;
const MAX_TERM_DIGITS = 10;

const isOperator = (ch: string) => ch === '+' || ch === '-';

export function applyKey(expr: string, key: NumpadKey): string {
  if (key === 'clear') return '';
  if (key === 'back') return expr.slice(0, -1);
  if (expr.length >= MAX_LENGTH) return expr;

  const last = expr.at(-1) ?? '';
  if (key === '+' || key === '-') {
    if (expr === '') return expr; // no leading operator: amounts are positive
    return isOperator(last) ? expr.slice(0, -1) + key : expr + key;
  }

  const currentTerm = expr.split(/[+-]/).at(-1) ?? '';
  if (currentTerm === '' && key === '000') return expr;
  // A term never keeps a leading zero: "0" then "5" becomes "5".
  if (currentTerm === '0') return key === '0' || key === '000' ? expr : expr.slice(0, -1) + key;
  if (currentTerm.length + key.length > MAX_TERM_DIGITS) return expr;
  return expr + key;
}

/** Sum of the expression; a trailing operator is ignored. `null` when empty. */
export function evaluateAmount(expr: string): number | null {
  const trimmed = isOperator(expr.at(-1) ?? '') ? expr.slice(0, -1) : expr;
  if (!trimmed) return null;
  const terms = trimmed.match(/[+-]?\d+/g);
  if (!terms) return null;
  return terms.reduce((sum, term) => sum + parseInt(term, 10), 0);
}

export function hasOperator(expr: string): boolean {
  return /[+-]/.test(expr);
}

/** "1200+350" → "1 200 + 350" for display. */
export function formatExpression(expr: string): string {
  return expr
    .replace(/\d+/g, digits => Number(digits).toLocaleString('ru-RU'))
    .replace(/([+-])/g, (op) => ` ${op === '-' ? '−' : '+'} `)
    .trim();
}
