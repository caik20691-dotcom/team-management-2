import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('仪表盘')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: '核心指标' })
  getStats() { return this.dashboardService.getStats(); }

  @Get('activity')
  @ApiOperation({ summary: '最近活动' })
  getRecentActivity(@Query('limit') limit?: number) { return this.dashboardService.getRecentActivity(limit); }

  @Get('task-distribution')
  @ApiOperation({ summary: '任务分布' })
  getTaskDistribution() { return this.dashboardService.getTaskDistribution(); }

  @Get('training-overview')
  @ApiOperation({ summary: '培训概览' })
  getTrainingOverview() { return this.dashboardService.getTrainingOverview(); }
}
