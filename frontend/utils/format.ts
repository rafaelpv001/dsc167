export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

/**
 * Resolve a URL de uma imagem enviada pelo backend. Em produção (Vercel
 * Blob) o backend já devolve uma URL absoluta; em desenvolvimento (disco
 * local) devolve um caminho relativo (/uploads/...) que precisa ser
 * prefixado com a origem da API.
 */
export function resolveMediaUrl(url: string, apiUrl: string): string {
  return url.startsWith('http') ? url : `${apiUrl}${url}`;
}
