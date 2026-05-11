import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('系统配置')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system-config')
export class SystemConfigController {
  constructor(private configService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取系统配置' })
  get() {
    return this.configService.get();
  }

  @Patch()
  @Roles('ADMIN')
  @ApiOperation({ summary: '更新系统配置（管理员）' })
  update(@Body() dto: any) {
    return this.configService.update(dto);
  }

  // ── Announcement categories ──

  @Get('announcement-categories')
  @ApiOperation({ summary: '获取公告分类列表' })
  getCategories() {
    return this.configService.getCategories();
  }

  @Post('announcement-categories')
  @Roles('ADMIN')
  @ApiOperation({ summary: '创建公告分类（管理员）' })
  createCategory(@Body() dto: any) {
    return this.configService.createCategory(dto);
  }

  @Patch('announcement-categories/reorder')
  @Roles('ADMIN')
  @ApiOperation({ summary: '重新排序公告分类（管理员）' })
  reorderCategories(@Body() dto: { ids: string[] }) {
    return this.configService.reorderCategories(dto.ids);
  }

  @Patch('announcement-categories/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '更新公告分类（管理员）' })
  updateCategory(@Param('id') id: string, @Body() dto: any) {
    return this.configService.updateCategory(id, dto);
  }

  @Delete('announcement-categories/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除公告分类（管理员）' })
  deleteCategory(@Param('id') id: string) {
    return this.configService.deleteCategory(id);
  }

  // ── Document categories ──

  @Get('document-categories')
  @ApiOperation({ summary: '获取文档分类列表' })
  getDocumentCategories() {
    return this.configService.getDocumentCategories();
  }

  @Post('document-categories')
  @Roles('ADMIN')
  @ApiOperation({ summary: '创建文档分类（管理员）' })
  createDocumentCategory(@Body() dto: any) {
    return this.configService.createDocumentCategory(dto);
  }

  @Patch('document-categories/reorder')
  @Roles('ADMIN')
  @ApiOperation({ summary: '重新排序文档分类（管理员）' })
  reorderDocumentCategories(@Body() dto: { ids: string[] }) {
    return this.configService.reorderDocumentCategories(dto.ids);
  }

  @Patch('document-categories/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '更新文档分类（管理员）' })
  updateDocumentCategory(@Param('id') id: string, @Body() dto: any) {
    return this.configService.updateDocumentCategory(id, dto);
  }

  @Delete('document-categories/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除文档分类（管理员）' })
  deleteDocumentCategory(@Param('id') id: string) {
    return this.configService.deleteDocumentCategory(id);
  }

  // ── SOP scenarios ──

  @Get('sop-scenarios')
  @ApiOperation({ summary: '获取 SOP 场景列表' })
  getSopScenarios() {
    return this.configService.getSopScenarios();
  }

  @Post('sop-scenarios')
  @Roles('ADMIN')
  @ApiOperation({ summary: '创建 SOP 场景（管理员）' })
  createSopScenario(@Body() dto: any) {
    return this.configService.createSopScenario(dto);
  }

  @Patch('sop-scenarios/reorder')
  @Roles('ADMIN')
  @ApiOperation({ summary: '重新排序 SOP 场景（管理员）' })
  reorderSopScenarios(@Body() dto: { ids: string[] }) {
    return this.configService.reorderSopScenarios(dto.ids);
  }

  @Patch('sop-scenarios/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '更新 SOP 场景（管理员）' })
  updateSopScenario(@Param('id') id: string, @Body() dto: any) {
    return this.configService.updateSopScenario(id, dto);
  }

  @Delete('sop-scenarios/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除 SOP 场景（管理员）' })
  deleteSopScenario(@Param('id') id: string) {
    return this.configService.deleteSopScenario(id);
  }

  // ── Document folders ──

  @Get('document-folders')
  @ApiOperation({ summary: '获取文档目录列表' })
  getDocumentFolders() {
    return this.configService.getDocumentFolders();
  }

  @Post('document-folders')
  @Roles('ADMIN')
  @ApiOperation({ summary: '创建文档目录（管理员）' })
  createDocumentFolder(@Body() dto: any) {
    return this.configService.createDocumentFolder(dto);
  }

  @Patch('document-folders/reorder')
  @Roles('ADMIN')
  @ApiOperation({ summary: '重新排序文档目录（管理员）' })
  reorderDocumentFolders(@Body() dto: { ids: string[] }) {
    return this.configService.reorderDocumentFolders(dto.ids);
  }

  @Patch('document-folders/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '更新文档目录（管理员）' })
  updateDocumentFolder(@Param('id') id: string, @Body() dto: any) {
    return this.configService.updateDocumentFolder(id, dto);
  }

  @Delete('document-folders/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除文档目录（管理员）' })
  deleteDocumentFolder(@Param('id') id: string) {
    return this.configService.deleteDocumentFolder(id);
  }
}
