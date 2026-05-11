import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('任务管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: '任务列表' })
  findAll(@Query() query: any) {
    return this.taskService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '任务详情' })
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '创建任务' })
  create(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.taskService.create(dto, userId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '更新任务' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.taskService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '删除任务' })
  remove(@Param('id') id: string) {
    return this.taskService.remove(id);
  }

  @Post(':id/attachments')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '添加任务附件' })
  addAttachment(
    @Param('id') id: string,
    @Body() dto: { filename: string; url: string; size: number; mimeType: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.taskService.addAttachment(id, userId, dto);
  }

  @Delete('attachments/:attachmentId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '删除任务附件' })
  removeAttachment(@Param('attachmentId') attachmentId: string) {
    return this.taskService.removeAttachment(attachmentId);
  }
}
