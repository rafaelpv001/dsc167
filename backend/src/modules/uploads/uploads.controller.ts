import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Upload de imagem de capa da rifa (o prêmio sendo sorteado). Só admin
 * autenticado pode enviar. O arquivo fica em backend/uploads/raffles e é
 * servido estaticamente em /uploads (ver main.ts) — o service devolve o
 * caminho relativo, que o frontend prefixa com NEXT_PUBLIC_API_URL.
 */
@Controller('api/admin/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post('raffle-cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/raffles',
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
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
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return { url: `/uploads/raffles/${file.filename}` };
  }
}
