import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FileService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = '1', pageSize = '50', search, folder } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = {};
    if (folder) where.folder = folder;
    if (search) where.filename = { contains: search };

    const [data, total] = await Promise.all([
      this.prisma.fileRecord.findMany({
        where,
        skip,
        take,
        include: { uploader: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fileRecord.count({ where }),
    ]);

    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async create(file: any, uploaderId: string) {
    return this.prisma.fileRecord.create({
      data: {
        filename: file.filename,
        url: file.url,
        size: file.size,
        mimeType: file.mimeType,
        folder: file.folder || null,
        uploaderId,
      },
    });
  }

  async remove(id: string) {
    const record = await this.prisma.fileRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('文件不存在');
    await this.prisma.fileRecord.delete({ where: { id } });
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'uploads', record.url.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
    return { success: true };
  }
}
