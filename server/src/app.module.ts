import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { DepartmentModule } from './modules/department/department.module';
import { TaskModule } from './modules/task/task.module';
import { TrainingModule } from './modules/training/training.module';
import { AnnouncementModule } from './modules/announcement/announcement.module';
import { DocumentModule } from './modules/document/document.module';

import { NotificationModule } from './modules/notification/notification.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FileModule } from './modules/file/file.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { ProjectModule } from './modules/project/project.module';
import { CalendarModule } from './modules/calendar/calendar.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    UserModule,
    DepartmentModule,
    TaskModule,
    TrainingModule,
    AnnouncementModule,
    DocumentModule,
    NotificationModule,
    DashboardModule,
    FileModule,
    SystemConfigModule,
    ProjectModule,
    CalendarModule,
  ],
})
export class AppModule {}
