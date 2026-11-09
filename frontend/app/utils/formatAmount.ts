export function formatAmount(value: unknown): string {
  const text = String(value ?? '')
  if (!/^-?\d+$/.test(text)) return text
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
