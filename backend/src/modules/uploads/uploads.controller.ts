import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { STORAGE_PROVIDER, type StorageProvider } from './storage/storage-provider.interface';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/** Upload de imagem de capa da rifa (o prêmio sendo sorteado). Só admin autenticado pode enviar. */
@Controller('api/admin/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  @Post('raffle-cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException('Formato de imagem inválido. Use JPEG, PNG ou WebP.'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');

    const url = await this.storage.save(
      { buffer: file.buffer, originalName: file.originalname, mimeType: file.mimetype },
      'raffles',
    );
    return { url };
  }
}
