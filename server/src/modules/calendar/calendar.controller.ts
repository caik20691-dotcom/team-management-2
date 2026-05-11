import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('团队日历')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get('events')
  @ApiOperation({ summary: '获取日程列表' })
  findAll(@Query() query: any) {
    return this.calendarService.findAll(query);
  }

  @Get('events/:id')
  @ApiOperation({ summary: '获取日程详情' })
  findOne(@Param('id') id: string) {
    return this.calendarService.findOne(id);
  }

  @Post('events')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '创建日程' })
  create(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.calendarService.create(dto, userId);
  }

  @Patch('events/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '更新日程' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.calendarService.update(id, dto);
  }

  @Delete('events/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '删除日程' })
  remove(@Param('id') id: string) {
    return this.calendarService.remove(id);
  }

  @Get('task-deadlines')
  @ApiOperation({ summary: '获取关联任务的截止日期' })
  getTaskDeadlines(@Query() query: any) {
    return this.calendarService.getTaskDeadlines(query);
  }
}
