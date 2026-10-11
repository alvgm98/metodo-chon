const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

export function normalizeDni(value: string): string {
  return value.replace(/[^0-9a-z]/gi, '').toUpperCase()
}

/** Valida DNI (12345678Z) y NIE (X1234567L) incluyendo la letra de control. */
export function isValidDni(value: string): boolean {
  const dni = normalizeDni(value)
  if (!/^[0-9XYZ][0-9]{7}[A-Z]$/.test(dni)) return false
  const digits = dni.slice(0, 8).replace('X', '0').replace('Y', '1').replace('Z', '2')
  return LETTERS[Number(digits) % 23] === dni[8]
}

/** Formato válido aunque la letra de control no cuadre (para avisar sin bloquear). */
export function hasDniShape(value: string): boolean {
  return /^[0-9XYZ][0-9]{7}[A-Z]$/.test(normalizeDni(value))
}

export function maskDni(dni: string): string {
  return '•••••' + dni.slice(-4)
}
