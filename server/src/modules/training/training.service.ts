import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}

  // ─── Courses ───
  async findAllCourses(query: any) {
    const { page = '1', pageSize = '20', category, status, search } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (search) where.title = { contains: search };

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take,
        include: {
          _count: { select: { lessons: true, progresses: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);

    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async findCourse(id: string, userId?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        lessons: { orderBy: { order: 'asc' }, include: { quiz: { include: { attachments: true } } } },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!course) throw new NotFoundException('课程不存在');

    let progress: any = null;
    if (userId) {
      progress = await this.prisma.trainingProgress.findUnique({ where: { userId_courseId: { userId, courseId: id } } });
    }

    return { ...course, progress };
  }

  async createCourse(dto: any) {
    return this.prisma.course.create({ data: dto });
  }

  async updateCourse(id: string, dto: any) {
    await this.findCourse(id);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async deleteCourse(id: string) {
    await this.findCourse(id);
    await this.prisma.course.delete({ where: { id } });
    return { success: true };
  }

  // ─── Lessons ───
  async createLesson(courseId: string, dto: any) {
    await this.findCourse(courseId);
    const maxOrder = await this.prisma.lesson.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return this.prisma.lesson.create({
      data: { ...dto, courseId, order: dto.order ?? (maxOrder?.order ?? 0) + 1 },
    });
  }

  async updateLesson(id: string, dto: any) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('课时不存在');
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }

  async deleteLesson(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('课时不存在');
    await this.prisma.lesson.delete({ where: { id } });
    return { success: true };
  }

  async reorderLessons(courseId: string, ids: string[]) {
    await this.findCourse(courseId);
    await Promise.all(ids.map((id, i) => this.prisma.lesson.update({ where: { id }, data: { order: i + 1 } })));
    return { success: true };
  }

  // ─── Quiz ───
  async getQuiz(lessonId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { lessonId } });
    if (!quiz) throw new NotFoundException('测验不存在');
    return quiz;
  }

  async upsertQuiz(lessonId: string, dto: any) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('课时不存在');
    return this.prisma.quiz.upsert({
      where: { lessonId },
      create: { lessonId, questions: dto.questions || '[]', passScore: dto.passScore ?? 60 },
      update: { questions: dto.questions, passScore: dto.passScore },
    });
  }

  async submitQuiz(lessonId: string, userId: string, dto: { answers: number[] }) {
    const quiz = await this.prisma.quiz.findUnique({ where: { lessonId } });
    if (!quiz) throw new NotFoundException('测验不存在');

    const questions = JSON.parse(quiz.questions);
    if (!questions.length) throw new BadRequestException('测验没有题目');

    let correct = 0;
    questions.forEach((q: any, i: number) => {
      if (dto.answers[i] === q.correctIndex) correct++;
    });

    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= quiz.passScore;

    const attempt = await this.prisma.quizAttempt.create({
      data: { quizId: quiz.id, userId, answers: JSON.stringify(dto.answers), score, passed },
    });

    // Update training progress with best quiz score
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (lesson) {
      const progress = await this.prisma.trainingProgress.findUnique({
        where: { userId_courseId: { userId, courseId: lesson.courseId } },
      });
      const bestScore = progress?.quizScore != null ? Math.max(progress.quizScore, score) : score;
      const totalLessons = await this.prisma.lesson.count({ where: { courseId: lesson.courseId } });
      const completedLessons = await this.prisma.lessonProgress.count({
        where: { userId, lesson: { courseId: lesson.courseId }, completed: true },
      });
      const newProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      await this.prisma.trainingProgress.upsert({
        where: { userId_courseId: { userId, courseId: lesson.courseId } },
        create: { userId, courseId: lesson.courseId, progress: newProgress, quizScore: score, completed: newProgress >= 100 },
        update: { progress: newProgress, quizScore: passed ? bestScore : progress?.quizScore, completed: newProgress >= 100, completedAt: newProgress >= 100 ? new Date() : null },
      });
    }

    return { score, passed, correct, total: questions.length, attempt };
  }

  // ─── Progress ───
  async getProgress(userId: string) {
    return this.prisma.trainingProgress.findMany({
      where: { userId },
      include: {
        course: { select: { id: true, title: true, duration: true, category: true, coverImage: true } },
      },
    });
  }

  async markLessonComplete(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('课时不存在');

    await this.prisma.lessonProgress.upsert({
      where: { lessonId_userId: { lessonId, userId } },
      create: { lessonId, userId, completed: true, completedAt: new Date() },
      update: { completed: true, completedAt: new Date() },
    });

    // Recalculate course progress
    const totalLessons = await this.prisma.lesson.count({ where: { courseId: lesson.courseId } });
    const completedLessons = await this.prisma.lessonProgress.count({
      where: { userId, lesson: { courseId: lesson.courseId }, completed: true },
    });
    const newProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    await this.prisma.trainingProgress.upsert({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
      create: { userId, courseId: lesson.courseId, progress: newProgress, completed: newProgress >= 100 },
      update: { progress: newProgress, completed: newProgress >= 100, completedAt: newProgress >= 100 ? new Date() : null },
    });

    return { success: true, progress: newProgress, completed: newProgress >= 100 };
  }

  async getLessonProgress(userId: string, courseId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      select: { id: true },
    });
    const lessonIds = lessons.map((l) => l.id);
    const progresses = await this.prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: lessonIds }, completed: true },
    });
    return progresses;
  }

  // ─── Course Attachments ───
  async addCourseAttachment(courseId: string, uploaderId: string, file: any) {
    await this.findCourse(courseId);
    return this.prisma.courseAttachment.create({
      data: {
        filename: file.filename,
        url: file.url,
        size: file.size,
        mimeType: file.mimeType,
        courseId,
        uploaderId,
      },
    });
  }

  async removeCourseAttachment(id: string) {
    await this.prisma.courseAttachment.delete({ where: { id } });
    return { success: true };
  }

  // ─── Lesson Attachments ───
  async addLessonAttachment(lessonId: string, uploaderId: string, file: any) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('课时不存在');
    return this.prisma.lessonAttachment.create({
      data: {
        filename: file.filename,
        url: file.url,
        size: file.size,
        mimeType: file.mimeType,
        lessonId,
        uploaderId,
      },
    });
  }

  async removeLessonAttachment(id: string) {
    await this.prisma.lessonAttachment.delete({ where: { id } });
    return { success: true };
  }

  // ─── Quiz Attempts ───
  async getQuizAttempts(userId: string, quizId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { userId, quizId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Quiz Attachments ───
  async addQuizAttachment(quizId: string, uploaderId: string, file: any) {
    return this.prisma.quizAttachment.create({
      data: { filename: file.filename, url: file.url, size: file.size, mimeType: file.mimeType, quizId, uploaderId },
    });
  }

  async removeQuizAttachment(id: string) {
    await this.prisma.quizAttachment.delete({ where: { id } });
    return { success: true };
  }

  // ─── Lesson Unmark ───
  async unmarkLessonComplete(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('课时不存在');

    await this.prisma.lessonProgress.updateMany({
      where: { lessonId, userId },
      data: { completed: false, completedAt: null },
    });

    const totalLessons = await this.prisma.lesson.count({ where: { courseId: lesson.courseId } });
    const completedLessons = await this.prisma.lessonProgress.count({
      where: { userId, lesson: { courseId: lesson.courseId }, completed: true },
    });
    const newProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    await this.prisma.trainingProgress.upsert({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
      create: { userId, courseId: lesson.courseId, progress: newProgress, completed: false },
      update: { progress: newProgress, completed: false },
    });

    return { success: true, progress: newProgress };
  }
}
