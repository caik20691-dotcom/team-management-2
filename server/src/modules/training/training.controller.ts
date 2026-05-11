import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TrainingService } from './training.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('培训管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training')
export class TrainingController {
  constructor(private trainingService: TrainingService) {}

  // ─── Courses ───
  @Get('courses')
  @ApiOperation({ summary: '课程列表' })
  findAllCourses(@Query() query: any) {
    return this.trainingService.findAllCourses(query);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: '课程详情' })
  findCourse(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.trainingService.findCourse(id, userId);
  }

  @Post('courses')
  @Roles('ADMIN')
  @ApiOperation({ summary: '创建课程' })
  createCourse(@Body() dto: any) {
    return this.trainingService.createCourse(dto);
  }

  @Patch('courses/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '更新课程' })
  updateCourse(@Param('id') id: string, @Body() dto: any) {
    return this.trainingService.updateCourse(id, dto);
  }

  @Delete('courses/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除课程' })
  deleteCourse(@Param('id') id: string) {
    return this.trainingService.deleteCourse(id);
  }

  // ─── Lessons (ADMIN only) ───
  @Post('courses/:courseId/lessons')
  @Roles('ADMIN')
  @ApiOperation({ summary: '创建课时' })
  createLesson(@Param('courseId') courseId: string, @Body() dto: any) {
    return this.trainingService.createLesson(courseId, dto);
  }

  @Patch('lessons/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '更新课时' })
  updateLesson(@Param('id') id: string, @Body() dto: any) {
    return this.trainingService.updateLesson(id, dto);
  }

  @Delete('lessons/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除课时' })
  deleteLesson(@Param('id') id: string) {
    return this.trainingService.deleteLesson(id);
  }

  @Post('courses/:courseId/lessons/reorder')
  @Roles('ADMIN')
  @ApiOperation({ summary: '课时排序' })
  reorderLessons(@Param('courseId') courseId: string, @Body('ids') ids: string[]) {
    return this.trainingService.reorderLessons(courseId, ids);
  }

  // ─── Quiz ───
  @Get('lessons/:lessonId/quiz')
  @ApiOperation({ summary: '获取测验' })
  getQuiz(@Param('lessonId') lessonId: string) {
    return this.trainingService.getQuiz(lessonId);
  }

  @Post('lessons/:lessonId/quiz')
  @Roles('ADMIN')
  @ApiOperation({ summary: '创建/更新测验' })
  upsertQuiz(@Param('lessonId') lessonId: string, @Body() dto: any) {
    return this.trainingService.upsertQuiz(lessonId, dto);
  }

  @Post('lessons/:lessonId/quiz/submit')
  @ApiOperation({ summary: '提交测验答案' })
  submitQuiz(@Param('lessonId') lessonId: string, @CurrentUser('id') userId: string, @Body() dto: { answers: number[] }) {
    return this.trainingService.submitQuiz(lessonId, userId, dto);
  }

  @Get('quiz/:quizId/attempts')
  @ApiOperation({ summary: '测验历史' })
  getQuizAttempts(@CurrentUser('id') userId: string, @Param('quizId') quizId: string) {
    return this.trainingService.getQuizAttempts(userId, quizId);
  }

  // ─── Progress ───
  @Get('progress')
  @ApiOperation({ summary: '用户整体学习进度' })
  getProgress(@CurrentUser('id') userId: string) {
    return this.trainingService.getProgress(userId);
  }

  @Post('lessons/:lessonId/complete')
  @ApiOperation({ summary: '标记课时完成' })
  markLessonComplete(@Param('lessonId') lessonId: string, @CurrentUser('id') userId: string) {
    return this.trainingService.markLessonComplete(lessonId, userId);
  }

  @Post('lessons/:lessonId/uncomplete')
  @ApiOperation({ summary: '取消完成标记' })
  unmarkLessonComplete(@Param('lessonId') lessonId: string, @CurrentUser('id') userId: string) {
    return this.trainingService.unmarkLessonComplete(lessonId, userId);
  }

  @Get('courses/:courseId/lesson-progress')
  @ApiOperation({ summary: '课时完成情况' })
  getLessonProgress(@CurrentUser('id') userId: string, @Param('courseId') courseId: string) {
    return this.trainingService.getLessonProgress(userId, courseId);
  }

  // ─── Attachments (ADMIN only) ───
  @Post('courses/:courseId/attachments')
  @Roles('ADMIN')
  @ApiOperation({ summary: '添加课程附件' })
  addCourseAttachment(@Param('courseId') courseId: string, @CurrentUser('id') userId: string, @Body() file: any) {
    return this.trainingService.addCourseAttachment(courseId, userId, file);
  }

  @Delete('attachments/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除课程附件' })
  removeCourseAttachment(@Param('id') id: string) {
    return this.trainingService.removeCourseAttachment(id);
  }

  @Post('lessons/:lessonId/attachments')
  @Roles('ADMIN')
  @ApiOperation({ summary: '添加课时附件' })
  addLessonAttachment(@Param('lessonId') lessonId: string, @CurrentUser('id') userId: string, @Body() file: any) {
    return this.trainingService.addLessonAttachment(lessonId, userId, file);
  }

  @Delete('lesson-attachments/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除课时附件' })
  removeLessonAttachment(@Param('id') id: string) {
    return this.trainingService.removeLessonAttachment(id);
  }

  // ─── Quiz Attachments (ADMIN only) ───
  @Post('quiz/:quizId/attachments')
  @Roles('ADMIN')
  @ApiOperation({ summary: '添加测验附件' })
  addQuizAttachment(@Param('quizId') quizId: string, @CurrentUser('id') userId: string, @Body() file: any) {
    return this.trainingService.addQuizAttachment(quizId, userId, file);
  }

  @Delete('quiz-attachments/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除测验附件' })
  removeQuizAttachment(@Param('id') id: string) {
    return this.trainingService.removeQuizAttachment(id);
  }
}
