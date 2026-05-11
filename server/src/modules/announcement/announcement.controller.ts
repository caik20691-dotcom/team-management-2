import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnnouncementService } from './announcement.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('公告管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('announcements')
export class AnnouncementController {
  constructor(private announcementService: AnnouncementService) {}

  @Get()
  @ApiOperation({ summary: '公告列表' })
  findAll(@Query() query: any) {
    return this.announcementService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '公告详情' })
  findOne(@Param('id') id: string) {
    return this.announcementService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '发布公告' })
  create(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.announcementService.create(dto, userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记已读' })
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.announcementService.markRead(id, userId);
  }
}
