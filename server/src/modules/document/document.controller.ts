import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('团队知识库')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Get()
  @ApiOperation({ summary: '文档列表' })
  findAll(@Query() query: any) { return this.documentService.findAll(query); }

  @Get('tags')
  @ApiOperation({ summary: '所有标签' })
  getAllTags() { return this.documentService.getAllTags(); }

  @Get('scenarios')
  @ApiOperation({ summary: 'SOP 场景列表' })
  getScenarios() { return this.documentService.getScenarios(); }

  @Get('folders')
  @ApiOperation({ summary: '文档目录列表' })
  getFolders() { return this.documentService.getFolders(); }

  @Get(':id')
  @ApiOperation({ summary: '文档详情' })
  findOne(@Param('id') id: string) { return this.documentService.findOne(id); }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '创建文档' })
  create(@Body() dto: any, @CurrentUser('id') userId: string) { return this.documentService.create(dto, userId); }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '更新文档' })
  update(@Param('id') id: string, @Body() dto: any) { return this.documentService.update(id, dto); }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '删除文档' })
  remove(@Param('id') id: string) { return this.documentService.remove(id); }

  @Post(':id/versions')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '创建文档新版本（新建文档而非更新原文档）' })
  createVersion(@Param('id') id: string, @Body() dto: any, @CurrentUser('id') userId: string) {
    return this.documentService.createVersion(id, dto, userId);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '获取文档版本历史' })
  getVersionHistory(@Param('id') id: string) {
    return this.documentService.getVersionHistory(id);
  }

  @Post(':id/attachments')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '添加文档附件' })
  addAttachment(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() file: any) {
    return this.documentService.addAttachment(id, userId, file);
  }

  @Delete(':id/attachments/:attachmentId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '删除文档附件' })
  removeAttachment(@Param('attachmentId') attachmentId: string) {
    return this.documentService.removeAttachment(attachmentId);
  }
}
