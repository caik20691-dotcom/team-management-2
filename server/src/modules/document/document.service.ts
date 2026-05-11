import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = '1', pageSize = '200', folder, type, category, scenario, status, search, tag, latestOnly } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = {};
    if (folder) where.folder = folder;
    if (type) where.type = type;
    if (category) where.category = category;
    if (scenario) where.scenario = scenario;
    if (status) where.status = status;
    if (search) where.OR = [{ title: { contains: search } }, { content: { contains: search } }, { summary: { contains: search } }];
    if (tag) where.tags = { contains: tag };

    const select = {
      id: true, title: true, summary: true, type: true, category: true,
      tags: true, scenario: true, status: true, folder: true, viewCount: true,
      version: true, changelog: true, sopGroupId: true,
      author: { select: { id: true, name: true, avatar: true } },
      isPublic: true, updatedAt: true, createdAt: true,
      attachments: { select: { id: true, filename: true, url: true, size: true, mimeType: true }, take: 1, orderBy: { createdAt: 'asc' as const } },
    };

    if (latestOnly === 'true' && type === 'SOP') {
      // Fetch all matching SOPs, then keep only latest version per sopGroupId
      const allData = await this.prisma.document.findMany({
        where,
        select,
        orderBy: { updatedAt: 'desc' },
      });

      const latestMap = new Map<string, any>();
      for (const doc of allData) {
        const gid = doc.sopGroupId || doc.id;
        if (!latestMap.has(gid) || (doc.version || 1) > (latestMap.get(gid)!.version || 1)) {
          latestMap.set(gid, doc);
        }
      }

      const data = Array.from(latestMap.values()).slice(skip, skip + take);
      return { data, total: latestMap.size, page: Number(page), pageSize: Number(pageSize) };
    }

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take,
        select,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!doc) throw new NotFoundException('文档不存在');

    await this.prisma.document.update({ where: { id }, data: { viewCount: doc.viewCount + 1 } });

    return { ...doc, viewCount: doc.viewCount + 1 };
  }

  async create(dto: any, userId: string) {
    const doc = await this.prisma.document.create({ data: { ...dto, authorId: userId } });
    // For SOP type, set sopGroupId to own id to anchor the version group
    if (dto.type === 'SOP' && !dto.sopGroupId) {
      await this.prisma.document.update({ where: { id: doc.id }, data: { sopGroupId: doc.id } });
      doc.sopGroupId = doc.id;
    }
    return doc;
  }

  async update(id: string, dto: any) {
    return this.prisma.document.update({ where: { id }, data: dto });
  }

  async createVersion(id: string, dto: any, userId: string) {
    const original = await this.prisma.document.findUnique({ where: { id } });
    if (!original) throw new NotFoundException('文档不存在');

    const groupId = original.sopGroupId || original.id;
    const versions = await this.prisma.document.findMany({
      where: { sopGroupId: groupId },
      select: { version: true },
    });
    const maxVersion = versions.reduce((max, v) => Math.max(max, v.version), 0);

    const newDoc = await this.prisma.document.create({
      data: {
        ...dto,
        authorId: userId,
        type: original.type,
        sopGroupId: groupId,
        version: maxVersion + 1,
        status: 'PUBLISHED',
      },
    });

    return newDoc;
  }

  async getVersionHistory(sopGroupId: string) {
    return this.prisma.document.findMany({
      where: { sopGroupId },
      select: {
        id: true, title: true, version: true, changelog: true, createdAt: true,
        author: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { version: 'desc' },
    });
  }

  async remove(id: string) {
    await this.prisma.document.delete({ where: { id } });
    return { success: true };
  }

  async addAttachment(documentId: string, uploaderId: string, file: any) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('文档不存在');
    return this.prisma.documentAttachment.create({
      data: { filename: file.filename, url: file.url, size: file.size, mimeType: file.mimeType, documentId, uploaderId },
    });
  }

  async removeAttachment(id: string) {
    await this.prisma.documentAttachment.delete({ where: { id } });
    return { success: true };
  }

  async getAllTags() {
    const docs = await this.prisma.document.findMany({ select: { tags: true }, where: { tags: { not: '' } } });
    const tagSet = new Set<string>();
    docs.forEach((d) => d.tags.split(',').filter(Boolean).forEach((t) => tagSet.add(t.trim())));
    return [...tagSet];
  }

  async getScenarios() {
    const docs = await this.prisma.document.findMany({
      select: { scenario: true },
      where: { type: 'SOP', scenario: { not: null } },
      distinct: ['scenario'],
    });
    return docs.map((d) => d.scenario).filter(Boolean);
  }

  async getFolders() {
    const docs = await this.prisma.document.findMany({
      select: { folder: true },
      where: { folder: { not: null } },
      distinct: ['folder'],
    });
    return docs.map((d) => d.folder).filter(Boolean);
  }
}
