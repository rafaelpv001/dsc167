import { digitsFor, padNumber } from './pad-number.util';

/**
 * Gera a lista de números (strings com zero-padding) de uma rifa, do
 * `startNumber` até `startNumber + totalNumbers - 1`. O número de dígitos
 * do zero-padding é baseado no maior número da faixa (startNumber + totalNumbers - 1),
 * conforme especificado no planejamento do domínio.
 *
 * Função pura, sem I/O — usada pelo RafflesService para popular RaffleNumber
 * em lote (createMany) dentro de uma transação, e testável isoladamente.
 */
export function generateRaffleNumberValues(totalNumbers: number, startNumber = 0): string[] {
  if (!Number.isInteger(totalNumbers) || totalNumbers <= 0) {
    throw new Error('totalNumbers deve ser um inteiro positivo');
  }
  if (!Number.isInteger(startNumber) || startNumber < 0) {
    throw new Error('startNumber deve ser um inteiro >= 0');
  }

  // Largura do zero-padding = quantidade de dígitos de (startNumber + totalNumbers),
  // não do maior índice — é isso que produz "100 números → 000..099" (3 dígitos) e
  // "1.000 números → 0000..0999" (4 dígitos), conforme os exemplos do domínio.
  const digits = digitsFor(startNumber + totalNumbers);

  const values: string[] = new Array(totalNumbers);
  for (let i = 0; i < totalNumbers; i += 1) {
    values[i] = padNumber(startNumber + i, digits);
  }
  return values;
}
