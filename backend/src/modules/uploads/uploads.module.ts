import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadsController } from './uploads.controller';
import { DiskStorageProvider } from './storage/disk-storage.provider';
import { BlobStorageProvider } from './storage/blob-storage.provider';
import { STORAGE_PROVIDER } from './storage/storage-provider.interface';

@Module({
  imports: [ConfigModule],
  controllers: [UploadsController],
  providers: [
    DiskStorageProvider,
    BlobStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, DiskStorageProvider, BlobStorageProvider],
      useFactory: (config: ConfigService, disk: DiskStorageProvider, blob: BlobStorageProvider) =>
        config.get<string>('storage.blobToken') ? blob : disk,
    },
  ],
})
export class UploadsModule {}
