import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const memberHash = await bcrypt.hash('member123', 10);

  const tech = await prisma.department.create({ data: { id: 'dept-tech', name: '技术部' } });
  const product = await prisma.department.create({ data: { id: 'dept-product', name: '产品部', parentId: tech.id } });
  const design = await prisma.department.create({ data: { id: 'dept-design', name: '设计部' } });
  const marketing = await prisma.department.create({ data: { id: 'dept-marketing', name: '市场部' } });

  await prisma.user.create({
    data: {
      email: 'admin@teamhub.com',
      passwordHash: adminHash,
      name: '系统管理员',
      role: 'ADMIN',
      departmentId: tech.id,
      position: '系统管理员',
    },
  });

  const users = [
    { email: 'zhangsan@teamhub.com', name: '张三', role: 'MANAGER', deptId: tech.id, position: '技术经理' },
    { email: 'lisi@teamhub.com', name: '李四', role: 'MEMBER', deptId: product.id, position: '产品经理' },
    { email: 'wangwu@teamhub.com', name: '王五', role: 'MEMBER', deptId: design.id, position: 'UI 设计师' },
    { email: 'zhaoliu@teamhub.com', name: '赵六', role: 'MEMBER', deptId: marketing.id, position: '市场专员' },
    { email: 'sunqi@teamhub.com', name: '孙七', role: 'MEMBER', deptId: tech.id, position: '前端工程师' },
    { email: 'zhouba@teamhub.com', name: '周八', role: 'MEMBER', deptId: tech.id, position: '后端工程师' },
    { email: 'wujiu@teamhub.com', name: '吴九', role: 'VIEWER', deptId: marketing.id, position: '实习生' },
  ];

  const createdUsers: any[] = [];
  for (const u of users) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: memberHash,
        name: u.name,
        role: u.role,
        departmentId: u.deptId,
        position: u.position,
      },
    });
    createdUsers.push(user);
  }

  await prisma.course.create({
    data: {
      id: 'course-1',
      title: '新员工入职培训',
      description: '了解公司文化、规章制度和基本工作流程，帮助新员工快速融入团队。',
      category: '入职',
      duration: 60,
      status: 'IN_PROGRESS',
      lessons: {
        create: [
          {
            title: '公司介绍与企业文化', order: 1, contentType: 'RICH_TEXT',
            content: '## 公司介绍\n\n欢迎加入我们的团队！\n\n我们是一家专注于企业级 SaaS 产品的科技公司，成立于 2020 年。\n\n### 企业文化\n- **创新**：持续探索新技术、新方法\n- **协作**：开放沟通，互相成就\n- **用户第一**：始终从用户角度思考\n- **成长**：保持学习，不断突破\n\n### 组织架构\n- 技术部：前端 / 后端 / 测试\n- 产品部：产品规划与需求分析\n- 设计部：UI / UX 设计\n- 市场部：品牌推广与客户关系',
          },
          {
            title: '规章制度与考勤', order: 2, contentType: 'MARKDOWN',
            content: '# 规章制度\n\n## 考勤制度\n- 工作时间：9:00 - 18:00（弹性 30 分钟）\n- 午休时间：12:00 - 13:30\n- 迟到处理：每月累计不超过 3 次\n\n## 请假流程\n1. 提前在系统提交请假申请\n2. 主管审批\n3. 3 天以上需要部门负责人审批\n\n## 考核周期\n- 试用期：3 个月\n- 季度 OKR 回顾\n- 年度绩效考核',
          },
          {
            title: '工具使用与开发环境', order: 3, contentType: 'RICH_TEXT',
            content: '## 必备工具\n\n### 开发工具\n- **代码管理**：Git + GitLab\n- **项目管理**：TeamHub 任务面板\n- **文档协作**：TeamHub 文档中心\n- **即时通讯**：企业微信\n\n### 开发环境搭建\n1. 安装 Node.js 18+\n2. 克隆项目仓库\n3. 运行 `npm install`\n4. 配置本地数据库\n5. 启动开发服务器\n\n> 详细文档请查看附件中的《开发环境搭建指南》',
          },
        ],
      },
    },
  });

  await prisma.course.create({
    data: {
      id: 'course-2',
      title: '代码规范与最佳实践',
      description: '学习团队代码规范、Git 工作流、代码审查流程和单元测试编写。',
      category: '技术',
      duration: 90,
      status: 'NOT_STARTED',
      lessons: {
        create: [
          {
            title: '代码风格与 ESLint 配置', order: 1, contentType: 'MARKDOWN',
            content: '# 代码风格指南\n\n## 命名规范\n- 变量/函数：`camelCase`\n- 类/组件：`PascalCase`\n- 常量：`UPPER_SNAKE_CASE`\n- 文件名：`kebab-case` 或 `PascalCase`（React 组件）\n\n## 缩进与格式\n- 使用 2 空格缩进\n- 行宽不超过 100 字符\n- 使用单引号\n- 末尾加分号\n\n## ESLint 配置\n```json\n{\n  "extends": ["@teamhub/eslint-config"],\n  "rules": {\n    "no-console": "warn",\n    "prefer-const": "error"\n  }\n}\n```',
          },
          {
            title: 'Git 工作流', order: 2, contentType: 'RICH_TEXT',
            content: '## Git 分支策略\n\n### 分支命名\n- `main`：生产环境分支\n- `develop`：开发主分支\n- `feature/*`：功能分支\n- `bugfix/*`：修复分支\n- `release/*`：发布分支\n\n### 提交规范\n使用 Conventional Commits：\n```\nfeat: 添加用户登录功能\nfix: 修复日期格式化错误\nrefactor: 重构用户模块\ndocs: 更新 API 文档\n```\n\n### Code Review 流程\n1. 创建 Feature 分支\n2. 开发完成后发起 Merge Request\n3. 至少 1 位 Reviewer 审核\n4. 通过后合并到 develop',
            videoUrl: 'https://www.bilibili.com/video/BV1GJ411x7h7',
          },
          {
            title: '单元测试入门', order: 3, contentType: 'RICH_TEXT',
            content: '## 测试金字塔\n\n- **单元测试**（70%）：测试单个函数/组件\n- **集成测试**（20%）：测试模块间交互\n- **E2E 测试**（10%）：端到端场景\n\n### Jest 基础\n```javascript\ndescribe("sum", () => {\n  it("should add two numbers", () => {\n    expect(sum(1, 2)).toBe(3);\n  });\n});\n```\n\n### 覆盖率目标\n- 语句覆盖率 > 80%\n- 分支覆盖率 > 70%\n- 函数覆盖率 > 80%',
          },
        ],
      },
    },
  });

  // Add quiz to the last lesson of course 1
  const lesson3 = await prisma.lesson.findFirst({ where: { courseId: 'course-1' }, orderBy: { order: 'desc' } });
  if (lesson3) {
    await prisma.quiz.create({
      data: {
        lessonId: lesson3.id,
        passScore: 60,
        questions: JSON.stringify([
          { question: '公司的工作时间是？', options: ['8:00-17:00', '9:00-18:00', '10:00-19:00', '9:30-18:30'], correctIndex: 1 },
          { question: '午休时间是？', options: ['11:30-13:00', '12:00-13:00', '12:00-13:30', '12:30-14:00'], correctIndex: 2 },
          { question: '试用期多久？', options: ['1个月', '2个月', '3个月', '6个月'], correctIndex: 2 },
          { question: '开发环境需要安装的 Node.js 版本是？', options: ['14+', '16+', '18+', '20+'], correctIndex: 2 },
          { question: '公司核心价值观不包括？', options: ['创新', '协作', '盈利第一', '用户第一'], correctIndex: 2 },
        ]),
      },
    });
  }

  // Add quiz to the last lesson of course 2
  const course2Lesson = await prisma.lesson.findFirst({ where: { courseId: 'course-2' }, orderBy: { order: 'desc' } });
  if (course2Lesson) {
    await prisma.quiz.create({
      data: {
        lessonId: course2Lesson.id,
        passScore: 60,
        questions: JSON.stringify([
          { question: '单元测试在测试金字塔中占比应为？', options: ['50%', '60%', '70%', '80%'], correctIndex: 2 },
          { question: '以下哪个不是 Conventional Commits 类型？', options: ['feat', 'fix', 'update', 'refactor'], correctIndex: 2 },
          { question: 'Git 分支命名中，功能分支前缀是？', options: ['feature/', 'feat/', 'func/', 'dev/'], correctIndex: 0 },
          { question: '语句覆盖率目标是多少？', options: ['> 60%', '> 70%', '> 80%', '> 90%'], correctIndex: 2 },
        ]),
      },
    });
  }

  const admin: any = await prisma.user.findUnique({ where: { email: 'admin@teamhub.com' } });
  if (admin) {
    await prisma.task.create({
      data: {
        id: 'task-1',
        title: '完成 Q2 产品需求文档',
        description: '撰写并评审 Q2 产品需求文档',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        creatorId: admin.id,
        dueDate: new Date('2026-06-30'),
        assignees: {
          create: [
            { userId: createdUsers[0].id },
            { userId: createdUsers[1].id },
          ],
        },
      },
    });

    await prisma.task.create({
      data: {
        id: 'task-2',
        title: '首页 UI 改版',
        description: '根据新设计稿重构首页',
        status: 'TODO',
        priority: 'MEDIUM',
        creatorId: createdUsers[0].id,
        dueDate: new Date('2026-05-15'),
        assignees: {
          create: [
            { userId: createdUsers[2].id },
            { userId: createdUsers[4].id },
          ],
        },
      },
    });

    await prisma.announcement.create({
      data: {
        title: '欢迎使用 TeamHub 团队管理系统',
        content: 'TeamHub 已正式上线，包含任务管理、培训管理、考勤管理等功能模块。请大家登录后完善个人资料，如有问题请联系管理员。',
        category: '通知',
        targetType: 'ALL',
        authorId: admin.id,
      },
    });
  }

  console.log('Seed completed!');
  console.log('Admin: admin@teamhub.com / admin123');
  console.log('Member: zhangsan@teamhub.com / member123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
