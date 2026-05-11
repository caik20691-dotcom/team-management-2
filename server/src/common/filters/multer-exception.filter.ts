import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: '文件大小不能超过 200MB',
      LIMIT_FILE_COUNT: '文件数量超过限制',
      LIMIT_FIELD_KEY: '字段名过长',
      LIMIT_FIELD_VALUE: '字段值过长',
      LIMIT_FIELD_COUNT: '字段数量超过限制',
      LIMIT_UNEXPECTED_FILE: '意外的文件字段',
      LIMIT_PART_COUNT: '分区数量超过限制',
    };

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: messages[exception.code] || `文件上传错误: ${exception.message}`,
      error: 'Bad Request',
    });
  }
}
