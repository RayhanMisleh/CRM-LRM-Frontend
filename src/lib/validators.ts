export const cleanCnpj = (value: string) => value.replace(/\D/g, '')

export const isValidCnpj = (value: string) => {
  const digits = cleanCnpj(value)

  if (digits.length !== 14) return false
  if (/^(\d)\1{13}$/.test(digits)) return false

  const calculateCheckDigit = (base: string, factors: number[]) => {
    const total = base.split('').reduce((sum, digit, index) => {
      return sum + Number(digit) * factors[index]
    }, 0)

    const remainder = total % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const base = digits.slice(0, 12)
  const firstDigit = calculateCheckDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const secondDigit = calculateCheckDigit(base + firstDigit, [
    6,
    5,
    4,
    3,
    2,
    9,
    8,
    7,
    6,
    5,
    4,
    3,
    2,
  ])

  return digits === base + String(firstDigit) + String(secondDigit)
}
