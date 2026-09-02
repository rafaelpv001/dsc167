/** Quantidade de dígitos necessária para representar `maxValue` (>= 0). */
export function digitsFor(maxValue: number): number {
  return String(Math.max(maxValue, 0)).length;
}

/** Zero-pad de um número inteiro para `totalDigits` dígitos. */
export function padNumber(value: number, totalDigits: number): string {
  return value.toString().padStart(totalDigits, '0');
}
