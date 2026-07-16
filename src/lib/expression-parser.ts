/**
 * Arithmetic expression parser.
 *
 * Grammar (lowest to highest precedence):
 *   expr    := term (('+' | '-') term)*
 *   term    := unary (('*' | '/') unary)*
 *   unary   := '-' unary | power
 *   power   := atom ('^' unary)?      // right-associative, binds tighter than * /
 *   atom    := NUMBER | '(' expr ')'
 */

type Token =
  | { type: 'number'; value: number }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '^' }
  | { type: 'lparen' }
  | { type: 'rparen' };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const start = i;
      let seenDot = false;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        if (expr[i] === '.') {
          if (seenDot) {
            throw new Error(
              `Invalid number at position ${start}: "${expr.slice(start, i + 1)}"`,
            );
          }
          seenDot = true;
        }
        i++;
      }
      const raw = expr.slice(start, i);
      const value = Number(raw);
      if (raw === '.' || Number.isNaN(value)) {
        throw new Error(`Invalid number at position ${start}: "${raw}"`);
      }
      tokens.push({ type: 'number', value });
      continue;
    }

    if (
      char === '+' ||
      char === '-' ||
      char === '*' ||
      char === '/' ||
      char === '^'
    ) {
      tokens.push({ type: 'op', value: char });
      i++;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    throw new Error(`Unknown character "${char}" at position ${i}`);
  }

  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parseExpression(): number {
    const value = this.parseExpr();
    if (this.pos < this.tokens.length) {
      throw new Error('Unexpected trailing input in expression');
    }
    return value;
  }

  private parseExpr(): number {
    let value = this.parseTerm();
    while (true) {
      const token = this.peek();
      if (
        token?.type === 'op' &&
        (token.value === '+' || token.value === '-')
      ) {
        this.next();
        const rhs = this.parseTerm();
        value = token.value === '+' ? value + rhs : value - rhs;
      } else {
        break;
      }
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parseUnary();
    while (true) {
      const token = this.peek();
      if (
        token?.type === 'op' &&
        (token.value === '*' || token.value === '/')
      ) {
        this.next();
        const rhs = this.parseUnary();
        if (token.value === '/') {
          if (rhs === 0) {
            throw new Error('Division by zero');
          }
          value = value / rhs;
        } else {
          value = value * rhs;
        }
      } else {
        break;
      }
    }
    return value;
  }

  private parseUnary(): number {
    const token = this.peek();
    if (token?.type === 'op' && token.value === '-') {
      this.next();
      return -this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parseAtom();
    const token = this.peek();
    if (token?.type === 'op' && token.value === '^') {
      this.next();
      const exponent = this.parseUnary();
      return Math.pow(base, exponent);
    }
    return base;
  }

  private parseAtom(): number {
    const token = this.next();
    if (!token) {
      throw new Error('Unexpected end of expression');
    }
    if (token.type === 'number') {
      return token.value;
    }
    if (token.type === 'lparen') {
      const value = this.parseExpr();
      const closing = this.next();
      if (closing?.type !== 'rparen') {
        throw new Error('Unbalanced parentheses: missing closing ")"');
      }
      return value;
    }
    throw new Error('Unexpected token in expression');
  }
}

/**
 * Evaluates an arithmetic expression string.
 * Supports +, -, *, /, ^ (right-associative), parentheses, unary minus, decimals.
 * Throws a descriptive Error on invalid input.
 */
export function evaluate(expr: string): number {
  if (typeof expr !== 'string' || expr.trim().length === 0) {
    throw new Error('Expression is empty');
  }

  const tokens = tokenize(expr);
  if (tokens.length === 0) {
    throw new Error('Expression is empty');
  }

  const parser = new Parser(tokens);
  return parser.parseExpression();
}
