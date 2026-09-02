import { slugify } from './slugify.util';

describe('slugify', () => {
  it('lowercases, strips accents and hyphenates', () => {
    expect(slugify('Rifa Solidária ARLM Nº 167')).toBe('rifa-solidaria-arlm-n-167');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  --Título--  ')).toBe('titulo');
  });
});
