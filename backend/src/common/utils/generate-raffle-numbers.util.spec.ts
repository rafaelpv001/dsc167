import { generateRaffleNumberValues } from './generate-raffle-numbers.util';

describe('generateRaffleNumberValues', () => {
  it('matches the domain spec examples: 100 numbers -> 000..099, 1000 numbers -> 0000..0999', () => {
    expect(generateRaffleNumberValues(100)).toEqual(
      Array.from({ length: 100 }, (_, i) => String(i).padStart(3, '0')),
    );
    const thousand = generateRaffleNumberValues(1000);
    expect(thousand[0]).toBe('0000');
    expect(thousand[999]).toBe('0999');
  });

  it('supports a non-zero startNumber', () => {
    expect(generateRaffleNumberValues(3, 998)).toEqual(['0998', '0999', '1000']);
  });

  it('never produces duplicate numbers', () => {
    const values = generateRaffleNumberValues(1000);
    expect(new Set(values).size).toBe(1000);
  });

  it('rejects invalid input', () => {
    expect(() => generateRaffleNumberValues(0)).toThrow();
    expect(() => generateRaffleNumberValues(-5)).toThrow();
    expect(() => generateRaffleNumberValues(10, -1)).toThrow();
  });
});
