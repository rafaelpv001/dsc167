import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { Injectable } from '@nestjs/common';
import type { StorageProvider, StoredFile } from './storage-provider.interface';

/** Grava em backend/uploads/<destinationSubpath>, servido estaticamente (ver bootstrap.ts). */
@Injectable()
export class DiskStorageProvider implements StorageProvider {
  async save(file: StoredFile, destinationSubpath: string): Promise<string> {
    const dir = join(process.cwd(), 'uploads', destinationSubpath);
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}${extname(file.originalName).toLowerCase()}`;
    await writeFile(join(dir, filename), file.buffer);

    return `/uploads/${destinationSubpath}/${filename}`;
  }
}
