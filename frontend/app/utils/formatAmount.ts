export interface NumericInputOptions {
  allowNegative?: boolean
  allowDecimal?: boolean
  decimalPlaces?: number
  maxIntegerDigits?: number
}

/** Keep editing values as strings; empty, zero and incomplete decimals are distinct. */
export function normalizeNumericInput(value: string, options: NumericInputOptions = {}): string {
  const limit = (value: number | undefined) => value === undefined || !Number.isFinite(value)
    ? undefined : Math.max(0, Math.trunc(value))
  const decimalPlaces = limit(options.decimalPlaces)
  const allowDecimal = options.allowDecimal && decimalPlaces !== 0
  const cleaned = value.replaceAll(',', '').replace(allowDecimal ? /[^\d.-]/g : /[^\d-]/g, '')
  const sign = options.allowNegative !== false && cleaned.startsWith('-') ? '-' : ''
  const unsigned = cleaned.replaceAll('-', '')
  const dot = allowDecimal ? unsigned.indexOf('.') : -1
  const whole = (dot < 0 ? unsigned : unsigned.slice(0, dot)).slice(0, limit(options.maxIntegerDigits))
  const fraction = dot < 0 ? '' : unsigned.slice(dot + 1).replaceAll('.', '').slice(0, decimalPlaces)
  return sign + whole + (dot < 0 ? '' : '.' + fraction)
}

export function formatAmount(value: unknown, options: { allowDecimal?: boolean } = {}): string {
  const text = String(value ?? '')
  if (!(options.allowDecimal ? /^-?\d+(?:\.\d*)?$/ : /^-?\d+$/).test(text)) return text
  const [whole = '', fraction] = text.split('.')
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : '.' + fraction)
}
