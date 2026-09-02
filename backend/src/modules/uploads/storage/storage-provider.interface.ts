export interface StoredFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

/**
 * Abstração de armazenamento de arquivos enviados (capa das rifas). Local
 * disk em desenvolvimento/hospedagem tradicional; Vercel Blob em produção
 * serverless (filesystem do Vercel é efêmero e somente /tmp é gravável).
 * Troca controlada só por presença de BLOB_READ_WRITE_TOKEN — nenhuma outra
 * parte do sistema precisa saber qual está ativo.
 */
export interface StorageProvider {
  /** Salva o arquivo e retorna a URL para acessá-lo (absoluta ou relativa). */
  save(file: StoredFile, destinationSubpath: string): Promise<string>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
