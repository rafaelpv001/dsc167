import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { put } from '@vercel/blob';
import type { StorageProvider, StoredFile } from './storage-provider.interface';

/** Envia para o Vercel Blob e retorna a URL pública absoluta. */
@Injectable()
export class BlobStorageProvider implements StorageProvider {
  constructor(private readonly config: ConfigService) {}

  async save(file: StoredFile, destinationSubpath: string): Promise<string> {
    const filename = `${destinationSubpath}/${randomUUID()}${extname(file.originalName).toLowerCase()}`;
    const blob = await put(filename, file.buffer, {
      access: 'public',
      contentType: file.mimeType,
      token: this.config.get<string>('storage.blobToken'),
    });
    return blob.url;
  }
}
