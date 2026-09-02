/** Gera o código amigável do pedido: RF-YYYYMMDD-XXXXX (sufixo aleatório, não sequencial). */
export function generateOrderCode(date: Date, randomSuffix: string): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `RF-${y}${m}${d}-${randomSuffix}`;
}
