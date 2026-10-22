/**
 * Safe, zero-eval arithmetic engine for Cashier Quick Calculator.
 * Implements Shunting-Yard algorithm to evaluate infix expressions into Reverse Polish Notation (RPN).
 * 
 * Features:
 * - 100% immune to JS strict mode octal literal SyntaxErrors (e.g., '05 + 10')
 * - Graceful division by zero guard ('Cannot divide by 0')
 * - Trailing and consecutive operator normalization (last operator wins)
 * - IEEE 754 precision correction (e.g., 0.1 + 0.2 -> 0.3)
 * - Percentage operator support (N% -> N * 0.01)
 */

export interface MathEvalResult {
  value: number | null
  error?: string
}

export function safeEvalArithmetic(expr: string): MathEvalResult {
  if (!expr || typeof expr !== 'string') {
    return { value: 0 }
  }

  // 1. Normalize visual operators
  const s = expr
    .replace(/÷/g, '/')
    .replace(/×/g, '*')
    .replace(/−/g, '-')
    .replace(/,/g, '.')
    .trim()

  // 2. Tokenize: match numbers (including floats and leading zeroes), operators, parens, percent
  const rawTokens = s.match(/(\d+(?:\.\d+)?|[+\-*/()%])/g)
  if (!rawTokens || rawTokens.length === 0) {
    return { value: 0 }
  }

  // 3. Pre-process tokens: normalize operators and percentages
  const tokens: string[] = []
  for (const t of rawTokens) {
    if (!t) continue
    if (t === '%') {
      tokens.push('*', '0.01')
    } else if (['+', '-', '*', '/'].includes(t)) {
      const lastToken = tokens[tokens.length - 1]
      // If previous token was an operator (not parens), replace with current operator
      if (lastToken && ['+', '-', '*', '/'].includes(lastToken)) {
        tokens[tokens.length - 1] = t
      } else if (tokens.length === 0 && t === '-') {
        // Unary minus at the start of expression
        tokens.push('0', '-')
      } else if (tokens.length > 0) {
        tokens.push(t)
      }
    } else {
      tokens.push(t)
    }
  }

  // Drop any trailing operator at the end
  while (tokens.length > 0) {
    const last = tokens[tokens.length - 1]
    if (last && ['+', '-', '*', '/'].includes(last)) {
      tokens.pop()
    } else {
      break
    }
  }

  if (tokens.length === 0) {
    return { value: 0 }
  }

  // 4. Shunting-Yard Algorithm: Infix -> RPN (Postfix)
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }
  const outputQueue: (number | string)[] = []
  const operatorStack: string[] = []

  for (const token of tokens) {
    const num = Number(token)

    if (!isNaN(num) && token !== '') {
      outputQueue.push(num)
    } else if (['+', '-', '*', '/'].includes(token)) {
      while (operatorStack.length > 0) {
        const top = operatorStack[operatorStack.length - 1]
        if (!top || top === '(') break
        const topPrec = precedence[top] ?? 0
        const tokenPrec = precedence[token] ?? 0
        if (topPrec >= tokenPrec) {
          outputQueue.push(operatorStack.pop()!)
        } else {
          break
        }
      }
      operatorStack.push(token)
    } else if (token === '(') {
      operatorStack.push(token)
    } else if (token === ')') {
      while (operatorStack.length > 0) {
        const top = operatorStack[operatorStack.length - 1]
        if (top === '(') {
          operatorStack.pop()
          break
        }
        outputQueue.push(operatorStack.pop()!)
      }
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop()!
    if (top !== '(' && top !== ')') {
      outputQueue.push(top)
    }
  }

  // 5. Evaluate RPN
  const evalStack: number[] = []

  for (const item of outputQueue) {
    if (typeof item === 'number') {
      evalStack.push(item)
    } else {
      const b = evalStack.pop()
      const a = evalStack.pop()

      if (a === undefined || b === undefined) {
        return { value: null, error: 'Invalid expression' }
      }

      let res = 0
      switch (item) {
        case '+':
          res = a + b
          break
        case '-':
          res = a - b
          break
        case '*':
          res = a * b
          break
        case '/':
          if (b === 0) {
            return { value: null, error: 'Cannot divide by 0' }
          }
          res = a / b
          break
        default:
          return { value: null, error: 'Unknown operator' }
      }

      evalStack.push(res)
    }
  }

  if (evalStack.length !== 1) {
    return { value: null, error: 'Malformed expression' }
  }

  // Precision cleanup (avoid 0.30000000000000004)
  const finalVal = Math.round(evalStack[0]! * 1e10) / 1e10
  return { value: finalVal }
}
