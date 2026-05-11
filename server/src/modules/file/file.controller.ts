import {
  Controller, Post, Get, Delete, Param, Query, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FileService } from './file.service';

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif', '.cpl', '.jar', '.js', '.vbs', '.ps1', '.wsf', '.sh', '.bash', '.csh', '.dll', '.sys', '.drv'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.tif', '.heic', '.heif', '.ico', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.mp4', '.mp3', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.wav', '.flac', '.aac', '.ogg', '.md', '.json', '.xml', '.yaml', '.yml', '.html', '.htm', '.rtf', '.odt', '.ods', '.odp', '.pages', '.numbers', '.key', '.epub', '.mobi', '.psd', '.ai', '.eps', '.log', '.sql', '.eml', '.msg', '.vsd', '.vsdx'];

@ApiTags('文件管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FileController {
  constructor(private fileService: FileService) {}

  @Get()
  @ApiOperation({ summary: '文件列表' })
  findAll(@Query() query: any) {
    return this.fileService.findAll(query);
  }

  @Post('upload')
  @ApiOperation({ summary: '上传文件' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
        const ext = extname(file.originalname).toLowerCase();
        if (BLOCKED_EXTENSIONS.includes(ext)) {
          return cb(new BadRequestException(`不支持的文件类型: ${ext}`), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @CurrentUser('id') userId: string) {
    if (!file) throw new BadRequestException('请选择要上传的文件');
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const result = {
      filename: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      isImage,
    };
    await this.fileService.create(result, userId);
    return result;
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除文件' })
  remove(@Param('id') id: string) {
    return this.fileService.remove(id);
  }
}
