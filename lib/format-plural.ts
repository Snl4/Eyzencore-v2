type PluralForms = readonly [string, string, string]

export function formatPlural(value: number, forms: PluralForms): string {
  const absoluteValue = Math.abs(Math.trunc(value))
  const lastTwoDigits = absoluteValue % 100
  const lastDigit = absoluteValue % 10
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${value} ${forms[2]}`
  if (lastDigit === 1) return `${value} ${forms[0]}`
  if (lastDigit >= 2 && lastDigit <= 4) return `${value} ${forms[1]}`
  return `${value} ${forms[2]}`
}
