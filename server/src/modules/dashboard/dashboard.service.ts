import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [totalUsers, totalTasks, completedTasks, totalCourses, activeTrainings] = await Promise.all([
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.task.count(),
      this.prisma.task.count({ where: { status: 'DONE' } }),
      this.prisma.course.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.trainingProgress.count({ where: { completed: false } }),
    ]);

    return {
      totalUsers,
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalCourses,
      activeTrainings,
    };
  }

  async getRecentActivity(limit = 10) {
    return this.prisma.activityLog.findMany({
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaskDistribution() {
    const statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'];
    const counts = await Promise.all(
      statuses.map((status) => this.prisma.task.count({ where: { status: status as any } })),
    );
    return statuses.map((status, i) => ({ status, count: counts[i] }));
  }

  async getTrainingOverview() {
    const courses = await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        _count: { select: { progresses: true } },
        progresses: { select: { completed: true } },
      },
    });

    return courses.map((c) => ({
      title: c.title,
      total: c._count.progresses,
      completed: c.progresses.filter((p) => p.completed).length,
    }));
  }
}
