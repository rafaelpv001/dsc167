/**
 * Converte um texto livre em um slug URL-friendly (minúsculo, sem acentos,
 * separado por hífens). Não garante unicidade — isso é responsabilidade de
 * quem consome esta função (ex.: RafflesService), que deve checar colisão
 * no banco e aplicar um sufixo incremental quando necessário.
 */
const DIACRITICS_REGEX = new RegExp('[̀-ͯ]', 'g');

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}
