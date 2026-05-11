export interface DocTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  type: string;
  folder: string;
  content: string;
  tags: string[];
  source: 'builtin' | 'upload';
  outputFormat: 'doc' | 'ppt' | 'xls';
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

// ── Office file generators ──

function generateWordDoc(template: DocTemplate): Blob {
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${template.name}</title>
<style>
  body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; margin: 40px; color: #333; line-height: 1.8; }
  h1 { font-size: 22px; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; margin-bottom: 16px; }
  h2 { font-size: 16px; color: #7c3aed; margin-top: 24px; }
  h3 { font-size: 14px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; font-size: 12px; }
  th { background: #f5f3ff; font-weight: 600; }
  .placeholder { color: #9ca3af; font-style: italic; }
  .section { margin-bottom: 16px; }
  ul { padding-left: 20px; }
  li { margin: 4px 0; }
  .meta-table td:first-child { font-weight: 600; background: #fafbfc; width: 120px; }
</style>
</head>
<body>
${template.content}
</body>
</html>`;
  return new Blob(['﻿' + html], { type: 'application/msword;charset=utf-8' });
}

function generatePptOutline(template: DocTemplate): Blob {
  const slides = template.content.split('---').map((slide, i) => {
    const lines = slide.trim().split('\n').filter(Boolean);
    const title = lines[0]?.replace(/^# /, '') || `Slide ${i + 1}`;
    const body = lines.slice(1).map((l) => {
      if (l.startsWith('- ')) return `<li>${l.slice(2)}</li>`;
      return `<p>${l}</p>`;
    }).join('\n');
    return `<div class="slide"><h2>${title}</h2>${body}</div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${template.name}</title>
<style>
  body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; }
  .slide { page-break-after: always; min-height: 400px; padding: 40px 60px; }
  h2 { font-size: 28px; color: #7c3aed; border-bottom: 3px solid #7c3aed; padding-bottom: 12px; margin-bottom: 24px; }
  p, li { font-size: 18px; line-height: 1.6; color: #374151; margin: 8px 0; }
  ul { padding-left: 24px; }
  .placeholder { color: #9ca3af; font-style: italic; }
</style>
</head><body>
${slides}
</body></html>`;
  return new Blob(['﻿' + html], { type: 'application/vnd.ms-powerpoint;charset=utf-8' });
}

function generateExcelTable(template: DocTemplate): Blob {
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8"><title>${template.name}</title>
<style>
  table { border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 8px 12px; font-size: 12px; font-family: 'Microsoft YaHei', sans-serif; }
  th { background: #7c3aed; color: #fff; font-weight: 600; }
  td { min-width: 80px; }
  .placeholder { color: #999; font-style: italic; }
  .section-title { background: #f5f3ff; font-weight: 700; font-size: 13px; }
</style>
</head>
<body>
${template.content}
</body>
</html>`;
  return new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
}

// ── Download ──

export function downloadTemplate(template: DocTemplate) {
  if (template.source === 'upload' && template.fileUrl) {
    const a = document.createElement('a');
    a.href = template.fileUrl;
    a.download = template.fileName || template.name;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.click();
    return;
  }

  let blob: Blob;
  let ext: string;
  switch (template.outputFormat) {
    case 'doc': blob = generateWordDoc(template); ext = '.doc'; break;
    case 'ppt': blob = generatePptOutline(template); ext = '.ppt'; break;
    case 'xls': blob = generateExcelTable(template); ext = '.xls'; break;
    default: blob = generateWordDoc(template); ext = '.doc';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = template.name + ext;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Uploaded template helpers ──

export function templateFromDoc(doc: any): DocTemplate {
  const att = doc.attachments?.[0];
  const mime = att?.mimeType || '';
  let fmt: 'doc' | 'ppt' | 'xls' = 'doc';
  if (mime.includes('presentation') || mime.includes('powerpoint')) fmt = 'ppt';
  else if (mime.includes('spreadsheet') || mime.includes('excel')) fmt = 'xls';
  return {
    id: doc.id,
    name: doc.title,
    description: doc.summary || '',
    icon: fileIconFromType(mime),
    category: 'uploaded',
    type: 'WIKI',
    folder: doc.folder || '',
    content: doc.content || '',
    tags: doc.tags ? doc.tags.split(',').filter(Boolean) : [],
    source: 'upload',
    outputFormat: fmt,
    fileUrl: att?.url,
    fileName: att?.filename,
    fileType: mime,
    fileSize: att?.size,
  };
}

export function fileIconFromType(mimeType: string): string {
  if (!mimeType) return '📄';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.startsWith('image/')) return '🖼';
  return '📄';
}

// ── Format display ──

export function formatLabel(fmt: 'doc' | 'ppt' | 'xls'): string {
  switch (fmt) { case 'doc': return 'Word'; case 'ppt': return 'PPT'; case 'xls': return 'Excel'; }
}

export function formatColor(fmt: 'doc' | 'ppt' | 'xls'): string {
  switch (fmt) { case 'doc': return 'blue'; case 'ppt': return 'orange'; case 'xls': return 'green'; }
}

// ── Categories ──

export const templateCategories = [
  { key: 'sop-templates', label: 'SOP 模板', icon: '⚡', format: 'doc' as const },
  { key: 'word-docs', label: 'Word 文档', icon: '📝', format: 'doc' as const },
  { key: 'ppt-slides', label: 'PPT 演示', icon: '📽', format: 'ppt' as const },
  { key: 'excel-sheets', label: 'Excel 表格', icon: '📊', format: 'xls' as const },
];

export const uploadTemplateCategory = { key: 'uploaded', label: '我的模板', icon: '📤' };

// ── Built-in templates (Office formats, no Markdown) ──

export const templates: DocTemplate[] = [
  // ═══════ Word 文档 ═══════
  {
    id: 'meeting-notes',
    name: '会议纪要',
    description: '记录会议议题、决议和待办事项',
    icon: '📝',
    category: 'word-docs',
    type: 'WIKI',
    folder: '会议纪要',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1>会议纪要：<span class="placeholder">{会议主题}</span></h1>

<h2>基本信息</h2>
<table class="meta-table">
<tr><td>日期</td><td><span class="placeholder">{YYYY-MM-DD}</span></td></tr>
<tr><td>时间</td><td><span class="placeholder">{HH:mm} - {HH:mm}</span></td></tr>
<tr><td>地点</td><td><span class="placeholder">{会议室/线上}</span></td></tr>
<tr><td>主持人</td><td><span class="placeholder">{姓名}</span></td></tr>
<tr><td>参会人员</td><td><span class="placeholder">{列出参会者}</span></td></tr>
<tr><td>记录人</td><td><span class="placeholder">{姓名}</span></td></tr>
</table>

<h2>会议议程</h2>
<ol>
<li><span class="placeholder">{议题一}</span></li>
<li><span class="placeholder">{议题二}</span></li>
<li><span class="placeholder">{议题三}</span></li>
</ol>

<h2>讨论内容</h2>
<h3>议题一：<span class="placeholder">{议题名称}</span></h3>
<p><strong>讨论要点：</strong><span class="placeholder">{内容}</span></p>
<p><strong>决议：</strong><span class="placeholder">{决议内容}</span></p>

<h3>议题二：<span class="placeholder">{议题名称}</span></h3>
<p><strong>讨论要点：</strong><span class="placeholder">{内容}</span></p>
<p><strong>决议：</strong><span class="placeholder">{决议内容}</span></p>

<h2>待办事项</h2>
<table>
<tr><th>事项</th><th>负责人</th><th>截止日期</th><th>状态</th></tr>
<tr><td><span class="placeholder">{事项描述}</span></td><td><span class="placeholder">{姓名}</span></td><td><span class="placeholder">{日期}</span></td><td>待办</td></tr>
<tr><td><span class="placeholder">{事项描述}</span></td><td><span class="placeholder">{姓名}</span></td><td><span class="placeholder">{日期}</span></td><td>待办</td></tr>
</table>

<h2>下次会议</h2>
<table class="meta-table">
<tr><td>日期</td><td><span class="placeholder">{YYYY-MM-DD}</span></td></tr>
<tr><td>议题预告</td><td><span class="placeholder">{议题}</span></td></tr>
</table>`,
    tags: ['会议', '纪要'],
  },
  {
    id: 'weekly-report',
    name: '周报模板',
    description: '快速撰写团队或个人周报',
    icon: '📝',
    category: 'word-docs',
    type: 'WIKI',
    folder: '周报',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1><span class="placeholder">{YYYY}</span>年第<span class="placeholder">{W}</span>周工作周报</h1>

<h2>本周完成</h2>
<ul>
<li>✅ <span class="placeholder">{完成事项一}</span></li>
<li>✅ <span class="placeholder">{完成事项二}</span></li>
<li>✅ <span class="placeholder">{完成事项三}</span></li>
</ul>

<h2>进行中</h2>
<ul>
<li>⏳ <span class="placeholder">{进行中事项一}</span> — 进度：<span class="placeholder">{百分比}</span></li>
<li>⏳ <span class="placeholder">{进行中事项二}</span> — 进度：<span class="placeholder">{百分比}</span></li>
</ul>

<h2>遇到的问题</h2>
<ol>
<li><strong><span class="placeholder">{问题一}</span></strong>：<span class="placeholder">{描述及解决方案}</span></li>
<li><strong><span class="placeholder">{问题二}</span></strong>：<span class="placeholder">{描述及解决方案}</span></li>
</ol>

<h2>下周计划</h2>
<ul>
<li>📋 <span class="placeholder">{计划事项一}</span></li>
<li>📋 <span class="placeholder">{计划事项二}</span></li>
<li>📋 <span class="placeholder">{计划事项三}</span></li>
</ul>

<h2>需要协调</h2>
<p><span class="placeholder">{需要其他团队/人员配合的事项}</span></p>`,
    tags: ['周报', '总结'],
  },
  {
    id: 'retrospective',
    name: '项目复盘',
    description: '项目结束后的回顾与总结模板',
    icon: '📝',
    category: 'word-docs',
    type: 'WIKI',
    folder: '项目复盘',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1>项目复盘：<span class="placeholder">{项目名称}</span></h1>

<h2>项目概况</h2>
<table class="meta-table">
<tr><td>项目周期</td><td><span class="placeholder">{开始日期} — {结束日期}</span></td></tr>
<tr><td>项目目标</td><td><span class="placeholder">{原始目标}</span></td></tr>
<tr><td>项目负责人</td><td><span class="placeholder">{姓名}</span></td></tr>
<tr><td>核心成员</td><td><span class="placeholder">{列出成员}</span></td></tr>
</table>

<h2>目标达成</h2>
<ul>
<li>目标一：<span class="placeholder">{达成情况}</span></li>
<li>目标二：<span class="placeholder">{达成情况}</span></li>
<li>目标三：<span class="placeholder">{达成情况}</span></li>
</ul>

<h2>做得好的 (Keep)</h2>
<ol>
<li><span class="placeholder">{经验/做法一}</span></li>
<li><span class="placeholder">{经验/做法二}</span></li>
</ol>

<h2>需改进的 (Improve)</h2>
<ol>
<li><span class="placeholder">{问题一}</span> — 改进建议：<span class="placeholder">{建议}</span></li>
<li><span class="placeholder">{问题二}</span> — 改进建议：<span class="placeholder">{建议}</span></li>
</ol>

<h2>待停止的 (Stop)</h2>
<ol>
<li><span class="placeholder">{做法一}</span> — 原因：<span class="placeholder">{原因}</span></li>
<li><span class="placeholder">{做法二}</span> — 原因：<span class="placeholder">{原因}</span></li>
</ol>

<h2>经验沉淀</h2>
<ul>
<li><strong>技术经验：</strong><span class="placeholder">{内容}</span></li>
<li><strong>流程经验：</strong><span class="placeholder">{内容}</span></li>
<li><strong>团队协作：</strong><span class="placeholder">{内容}</span></li>
</ul>

<h2>行动项</h2>
<table>
<tr><th>行动项</th><th>负责人</th><th>截止日期</th></tr>
<tr><td><span class="placeholder">{改进行动一}</span></td><td><span class="placeholder">{姓名}</span></td><td><span class="placeholder">{日期}</span></td></tr>
<tr><td><span class="placeholder">{改进行动二}</span></td><td><span class="placeholder">{姓名}</span></td><td><span class="placeholder">{日期}</span></td></tr>
</table>`,
    tags: ['复盘', '总结'],
  },
  {
    id: 'tech-design',
    name: '技术方案',
    description: '编写技术设计方案和架构决策',
    icon: '📝',
    category: 'word-docs',
    type: 'WIKI',
    folder: '技术文档',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1>技术方案：<span class="placeholder">{方案名称}</span></h1>

<h2>背景与问题</h2>
<p><span class="placeholder">{描述当前面临的技术问题或需求背景}</span></p>

<h2>方案目标</h2>
<ol>
<li><span class="placeholder">{目标一}</span></li>
<li><span class="placeholder">{目标二}</span></li>
</ol>

<h2>方案设计</h2>
<h3>整体架构</h3>
<p><span class="placeholder">{架构图描述}</span></p>

<h3>核心模块</h3>
<h4>模块一：<span class="placeholder">{模块名称}</span></h4>
<ul>
<li><strong>职责：</strong><span class="placeholder">{描述}</span></li>
<li><strong>技术选型：</strong><span class="placeholder">{技术栈}</span></li>
</ul>

<h4>模块二：<span class="placeholder">{模块名称}</span></h4>
<ul>
<li><strong>职责：</strong><span class="placeholder">{描述}</span></li>
<li><strong>技术选型：</strong><span class="placeholder">{技术栈}</span></li>
</ul>

<h2>方案对比</h2>
<table>
<tr><th>维度</th><th>方案A</th><th>方案B</th><th>推荐</th></tr>
<tr><td>实现成本</td><td><span class="placeholder">{评估}</span></td><td><span class="placeholder">{评估}</span></td><td><span class="placeholder">{推荐}</span></td></tr>
<tr><td>性能</td><td><span class="placeholder">{评估}</span></td><td><span class="placeholder">{评估}</span></td><td><span class="placeholder">{推荐}</span></td></tr>
<tr><td>可维护性</td><td><span class="placeholder">{评估}</span></td><td><span class="placeholder">{评估}</span></td><td><span class="placeholder">{推荐}</span></td></tr>
</table>

<h2>风险与对策</h2>
<table>
<tr><th>风险</th><th>影响</th><th>概率</th><th>应对措施</th></tr>
<tr><td><span class="placeholder">{风险一}</span></td><td><span class="placeholder">{影响}</span></td><td><span class="placeholder">{概率}</span></td><td><span class="placeholder">{措施}</span></td></tr>
<tr><td><span class="placeholder">{风险二}</span></td><td><span class="placeholder">{影响}</span></td><td><span class="placeholder">{概率}</span></td><td><span class="placeholder">{措施}</span></td></tr>
</table>

<h2>排期计划</h2>
<table>
<tr><th>阶段</th><th>内容</th><th>时间</th><th>负责人</th></tr>
<tr><td>P0</td><td><span class="placeholder">{内容}</span></td><td><span class="placeholder">{时间}</span></td><td><span class="placeholder">{姓名}</span></td></tr>
<tr><td>P1</td><td><span class="placeholder">{内容}</span></td><td><span class="placeholder">{时间}</span></td><td><span class="placeholder">{姓名}</span></td></tr>
</table>`,
    tags: ['技术', '方案', '架构'],
  },
  {
    id: 'prd',
    name: '产品需求文档',
    description: '规范化产品需求描述与验收标准',
    icon: '📝',
    category: 'word-docs',
    type: 'FORMAL',
    folder: '产品文档',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1>PRD：<span class="placeholder">{需求名称}</span></h1>

<h2>版本记录</h2>
<table>
<tr><th>版本</th><th>日期</th><th>修改人</th><th>修改内容</th></tr>
<tr><td>v1.0</td><td><span class="placeholder">{日期}</span></td><td><span class="placeholder">{姓名}</span></td><td>初稿</td></tr>
</table>

<h2>需求概述</h2>
<h3>背景</h3>
<p><span class="placeholder">{为什么需要做这个需求}</span></p>
<h3>用户故事</h3>
<blockquote>作为 <strong><span class="placeholder">{角色}</span></strong>，我想要 <strong><span class="placeholder">{功能}</span></strong>，以便 <strong><span class="placeholder">{价值/目的}</span></strong></blockquote>
<h3>目标</h3>
<ul>
<li><strong>业务目标：</strong><span class="placeholder">{可量化目标}</span></li>
<li><strong>用户目标：</strong><span class="placeholder">{用户价值}</span></li>
</ul>

<h2>功能详述</h2>
<h3>功能一：<span class="placeholder">{功能名称}</span></h3>
<ul>
<li><strong>优先级：</strong>P0 / P1 / P2</li>
<li><strong>前置条件：</strong><span class="placeholder">{条件}</span></li>
<li><strong>主流程：</strong></li>
</ul>
<ol>
<li><span class="placeholder">{步骤一}</span></li>
<li><span class="placeholder">{步骤二}</span></li>
</ol>
<ul>
<li><strong>异常处理：</strong><span class="placeholder">{处理方式}</span></li>
</ul>

<h2>验收标准</h2>
<ul>
<li>☐ <span class="placeholder">{验收条件一}</span></li>
<li>☐ <span class="placeholder">{验收条件二}</span></li>
<li>☐ <span class="placeholder">{验收条件三}</span></li>
</ul>

<h2>影响范围</h2>
<ul>
<li><strong>涉及系统：</strong><span class="placeholder">{系统列表}</span></li>
<li><strong>依赖关系：</strong><span class="placeholder">{依赖描述}</span></li>
</ul>`,
    tags: ['产品', '需求', 'PRD'],
  },
  {
    id: 'sop-template',
    name: '标准操作流程',
    description: '标准化操作步骤与检查清单',
    icon: '📝',
    category: 'word-docs',
    type: 'SOP',
    folder: 'SOP',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1>SOP：<span class="placeholder">{流程名称}</span></h1>

<h2>适用范围</h2>
<table class="meta-table">
<tr><td>适用角色</td><td><span class="placeholder">{角色}</span></td></tr>
<tr><td>适用场景</td><td><span class="placeholder">{场景描述}</span></td></tr>
<tr><td>执行频率</td><td><span class="placeholder">{每次/每日/每周/每月}</span></td></tr>
</table>

<h2>前置条件</h2>
<ul>
<li>☐ <span class="placeholder">{前提条件一}</span></li>
<li>☐ <span class="placeholder">{前提条件二}</span></li>
</ul>

<h2>操作步骤</h2>
<h3>Step 1：<span class="placeholder">{步骤名称}</span></h3>
<ol>
<li><span class="placeholder">{具体操作}</span></li>
<li><span class="placeholder">{具体操作}</span></li>
</ol>
<p><strong>检查点：</strong><span class="placeholder">{验证标准}</span></p>

<h3>Step 2：<span class="placeholder">{步骤名称}</span></h3>
<ol>
<li><span class="placeholder">{具体操作}</span></li>
<li><span class="placeholder">{具体操作}</span></li>
</ol>
<p><strong>检查点：</strong><span class="placeholder">{验证标准}</span></p>

<h2>异常处理</h2>
<table>
<tr><th>异常情况</th><th>处理方式</th><th>升级路径</th></tr>
<tr><td><span class="placeholder">{异常一}</span></td><td><span class="placeholder">{处理}</span></td><td><span class="placeholder">{联系人}</span></td></tr>
<tr><td><span class="placeholder">{异常二}</span></td><td><span class="placeholder">{处理}</span></td><td><span class="placeholder">{联系人}</span></td></tr>
</table>

<h2>完成标准</h2>
<ul>
<li>☐ <span class="placeholder">{完成条件一}</span></li>
<li>☐ <span class="placeholder">{完成条件二}</span></li>
</ul>`,
    tags: ['SOP', '流程'],
  },
  {
    id: 'policy-template',
    name: '制度规范',
    description: '公司制度、规范与合规文件',
    icon: '📝',
    category: 'word-docs',
    type: 'POLICY',
    folder: '制度规范',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1><span class="placeholder">{制度名称}</span></h1>

<h2>总则</h2>
<h3>目的</h3>
<p><span class="placeholder">{制定本制度的目的}</span></p>
<h3>适用范围</h3>
<p><span class="placeholder">{适用部门/人员/场景}</span></p>
<h3>制定依据</h3>
<p><span class="placeholder">{参考的法律法规/行业标准}</span></p>

<h2>制度细则</h2>
<h3>第一条：<span class="placeholder">{条款标题}</span></h3>
<p><span class="placeholder">{条款内容}</span></p>
<h3>第二条：<span class="placeholder">{条款标题}</span></h3>
<p><span class="placeholder">{条款内容}</span></p>
<h3>第三条：<span class="placeholder">{条款标题}</span></h3>
<p><span class="placeholder">{条款内容}</span></p>

<h2>执行与监督</h2>
<table class="meta-table">
<tr><td>执行部门</td><td><span class="placeholder">{负责部门}</span></td></tr>
<tr><td>监督机制</td><td><span class="placeholder">{监督方式}</span></td></tr>
</table>

<h2>奖惩措施</h2>
<table>
<tr><th>情形</th><th>措施</th></tr>
<tr><td>违规</td><td><span class="placeholder">{处罚措施}</span></td></tr>
<tr><td>优秀</td><td><span class="placeholder">{奖励措施}</span></td></tr>
</table>

<h2>附则</h2>
<ol>
<li>本制度自发布之日起生效</li>
<li>本制度由<span class="placeholder">{部门}</span>负责解释</li>
<li>修订记录：<span class="placeholder">{记录}</span></li>
</ol>`,
    tags: ['制度', '规范', '合规'],
  },
  {
    id: 'onboarding-guide',
    name: '新人入职指南',
    description: '新员工入职流程与团队信息',
    icon: '📝',
    category: 'word-docs',
    type: 'WIKI',
    folder: '团队文档',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1>新人入职指南</h1>
<h2>欢迎 <span class="placeholder">{姓名}</span> 加入 <span class="placeholder">{团队名称}</span>！</h2>

<h2>入职信息</h2>
<table class="meta-table">
<tr><td>入职日期</td><td><span class="placeholder">{YYYY-MM-DD}</span></td></tr>
<tr><td>岗位</td><td><span class="placeholder">{岗位名称}</span></td></tr>
<tr><td>导师</td><td><span class="placeholder">{导师姓名}</span></td></tr>
</table>

<h2>入职第一周</h2>
<h3>Day 1：环境搭建</h3>
<ul>
<li>☐ 领取设备（电脑/显示器/外设）</li>
<li>☐ 开通账号（邮箱/代码仓库/内部系统）</li>
<li>☐ 安装开发环境</li>
<li>☐ 阅读团队文档</li>
</ul>
<h3>Day 2-3：了解业务</h3>
<ul>
<li>☐ 了解团队职责与目标</li>
<li>☐ 熟悉产品/项目</li>
<li>☐ 阅读核心代码库</li>
<li>☐ 与团队成员 1:1</li>
</ul>
<h3>Day 4-5：上手任务</h3>
<ul>
<li>☐ 完成第一个小任务</li>
<li>☐ 提交第一份代码/文档</li>
<li>☐ 参加团队周会</li>
</ul>

<h2>常用资源</h2>
<table>
<tr><th>资源</th><th>链接/地址</th></tr>
<tr><td>代码仓库</td><td><span class="placeholder">{地址}</span></td></tr>
<tr><td>项目管理</td><td><span class="placeholder">{地址}</span></td></tr>
<tr><td>文档中心</td><td><span class="placeholder">{地址}</span></td></tr>
<tr><td>通讯工具</td><td><span class="placeholder">{地址}</span></td></tr>
</table>

<h2>FAQ</h2>
<ol>
<li><strong>Q：如何申请请假？</strong> A：<span class="placeholder">{回答}</span></li>
<li><strong>Q：WiFi 密码？</strong> A：<span class="placeholder">{回答}</span></li>
</ol>`,
    tags: ['入职', '指南'],
  },
  {
    id: 'api-doc',
    name: 'API 文档',
    description: '接口定义与调用说明文档',
    icon: '📝',
    category: 'word-docs',
    type: 'WIKI',
    folder: '技术文档',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1>API 文档：<span class="placeholder">{接口名称}</span></h1>

<h2>接口概述</h2>
<table class="meta-table">
<tr><td>路径</td><td><code><span class="placeholder">{METHOD} {/api/endpoint}</span></code></td></tr>
<tr><td>描述</td><td><span class="placeholder">{接口功能说明}</span></td></tr>
</table>

<h2>请求参数</h2>
<table>
<tr><th>参数名</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
<tr><td><span class="placeholder">{参数}</span></td><td><span class="placeholder">{类型}</span></td><td><span class="placeholder">{是/否}</span></td><td><span class="placeholder">{默认值}</span></td><td><span class="placeholder">{说明}</span></td></tr>
</table>

<h2>返回数据</h2>
<h3>成功响应</h3>
<pre>{
  "code": 200,
  "data": {},
  "message": "success"
}</pre>
<h3>错误码</h3>
<table>
<tr><th>错误码</th><th>说明</th></tr>
<tr><td>400</td><td>参数错误</td></tr>
<tr><td>401</td><td>未授权</td></tr>
<tr><td>404</td><td>资源不存在</td></tr>
</table>

<h2>注意事项</h2>
<ul>
<li><span class="placeholder">{注意点一}</span></li>
<li><span class="placeholder">{注意点二}</span></li>
</ul>`,
    tags: ['API', '接口', '技术'],
  },

  // ═══════ PPT 演示 ═══════
  {
    id: 'monthly-report-ppt',
    name: '月报演示',
    description: '月度工作总结演示文稿',
    icon: '📽',
    category: 'ppt-slides',
    type: 'WIKI',
    folder: '月报',
    outputFormat: 'ppt',
    source: 'builtin',
    content: `# <span class="placeholder">{YYYY}年{M}月</span>工作总结

- 汇报人：<span class="placeholder">{姓名}</span>
- 部门：<span class="placeholder">{部门}</span>
- 日期：<span class="placeholder">{日期}</span>
---
# 关键成果

- <span class="placeholder">{成果一}</span>：<span class="placeholder">{量化指标/具体产出}</span>
- <span class="placeholder">{成果二}</span>：<span class="placeholder">{量化指标/具体产出}</span>
- <span class="placeholder">{成果三}</span>：<span class="placeholder">{量化指标/具体产出}</span>
---
# 数据分析

- <span class="placeholder">{指标一}</span>：上月 <span class="placeholder">{值}</span> → 本月 <span class="placeholder">{值}</span>（<span class="placeholder">{环比}</span>）
- <span class="placeholder">{指标二}</span>：上月 <span class="placeholder">{值}</span> → 本月 <span class="placeholder">{值}</span>（<span class="placeholder">{环比}</span>）
- <span class="placeholder">{指标三}</span>：上月 <span class="placeholder">{值}</span> → 本月 <span class="placeholder">{值}</span>（<span class="placeholder">{环比}</span>）
---
# 重点项目 - <span class="placeholder">{项目名称}</span>

- 当前阶段：<span class="placeholder">{阶段}</span>
- 完成情况：<span class="placeholder">{百分比}</span>
- 关键里程碑：
  - <span class="placeholder">{里程碑一}</span>
  - <span class="placeholder">{里程碑二}</span>
- 下月目标：<span class="placeholder">{目标}</span>
---
# 问题与风险

- <span class="placeholder">{问题一}</span>
  - 影响：<span class="placeholder">{描述}</span>
  - 应对：<span class="placeholder">{措施}</span>
- <span class="placeholder">{问题二}</span>
  - 影响：<span class="placeholder">{描述}</span>
  - 应对：<span class="placeholder">{措施}</span>
---
# 下月规划

- 重点目标 1：<span class="placeholder">{目标}</span>
- 重点目标 2：<span class="placeholder">{目标}</span>
- 重点目标 3：<span class="placeholder">{目标}</span>
- 资源需求：<span class="placeholder">{需求}</span>`,
    tags: ['月报', 'PPT', '汇报'],
  },
  {
    id: 'project-plan-ppt',
    name: '项目计划演示',
    description: '项目启动与规划演示文稿',
    icon: '📽',
    category: 'ppt-slides',
    type: 'WIKI',
    folder: '项目文档',
    outputFormat: 'ppt',
    source: 'builtin',
    content: `# <span class="placeholder">{项目名称}</span> 项目计划

- 项目负责人：<span class="placeholder">{姓名}</span>
- 起止日期：<span class="placeholder">{开始} — {结束}</span>
---
# 项目目标

- <span class="placeholder">{目标一}</span>
- <span class="placeholder">{目标二}</span>
- <span class="placeholder">{目标三}</span>
- 成功标准：<span class="placeholder">{标准}</span>
---
# 团队分工

- 项目经理：<span class="placeholder">{姓名}</span>
- 后端开发：<span class="placeholder">{姓名}</span>
- 前端开发：<span class="placeholder">{姓名}</span>
- 测试：<span class="placeholder">{姓名}</span>
- 设计：<span class="placeholder">{姓名}</span>
---
# 里程碑

- M1: <span class="placeholder">{目标}</span> — <span class="placeholder">{日期}</span>
- M2: <span class="placeholder">{目标}</span> — <span class="placeholder">{日期}</span>
- M3: <span class="placeholder">{目标}</span> — <span class="placeholder">{日期}</span>
- M4: <span class="placeholder">{目标}</span> — <span class="placeholder">{日期}</span>
---
# 风险管理

- <span class="placeholder">{风险一}</span>（概率：<span class="placeholder">{高/中/低}</span>）
  - 应对：<span class="placeholder">{措施}</span>
- <span class="placeholder">{风险二}</span>（概率：<span class="placeholder">{高/中/低}</span>）
  - 应对：<span class="placeholder">{措施}</span>
---
# 沟通计划

- 站会：每天 <span class="placeholder">{时间}</span>
- 周会：每周 <span class="placeholder">{时间}</span>
- 周报：每周五发送
- 评审：<span class="placeholder">{频率}</span>`,
    tags: ['项目', 'PPT', '计划'],
  },

  // ═══════ Excel 表格 ═══════
  {
    id: 'risk-matrix',
    name: '风险评估矩阵',
    description: '识别、评估和跟踪项目风险',
    icon: '📊',
    category: 'excel-sheets',
    type: 'FORMAL',
    folder: '项目文档',
    outputFormat: 'xls',
    source: 'builtin',
    content: `<h2>风险评估矩阵 - <span class="placeholder">{项目名称}</span></h2>
<table>
<tr><th>风险ID</th><th>风险描述</th><th>类别</th><th>概率</th><th>影响</th><th>等级</th><th>触发条件</th><th>应对策略</th><th>责任人</th><th>状态</th></tr>
<tr><td>R1</td><td><span class="placeholder">{描述}</span></td><td><span class="placeholder">技术/资源/进度/外部</span></td><td><span class="placeholder">高/中/低</span></td><td><span class="placeholder">高/中/低</span></td><td><span class="placeholder">🔴/🟠/🟡</span></td><td><span class="placeholder">{条件}</span></td><td><span class="placeholder">{措施}</span></td><td><span class="placeholder">{姓名}</span></td><td>监控中</td></tr>
<tr><td>R2</td><td><span class="placeholder">{描述}</span></td><td><span class="placeholder">技术/资源/进度/外部</span></td><td><span class="placeholder">高/中/低</span></td><td><span class="placeholder">高/中/低</span></td><td><span class="placeholder">🔴/🟠/🟡</span></td><td><span class="placeholder">{条件}</span></td><td><span class="placeholder">{措施}</span></td><td><span class="placeholder">{姓名}</span></td><td>监控中</td></tr>
<tr><td>R3</td><td><span class="placeholder">{描述}</span></td><td><span class="placeholder">技术/资源/进度/外部</span></td><td><span class="placeholder">高/中/低</span></td><td><span class="placeholder">高/中/低</span></td><td><span class="placeholder">🔴/🟠/🟡</span></td><td><span class="placeholder">{条件}</span></td><td><span class="placeholder">{措施}</span></td><td><span class="placeholder">{姓名}</span></td><td>监控中</td></tr>
<tr><td>R4</td><td colspan="9" class="placeholder">添加更多风险行...</td></tr>
</table>`,
    tags: ['风险', 'Excel', '管理'],
  },
  {
    id: 'milestone-tracker',
    name: '里程碑跟踪表',
    description: '项目里程碑进度跟踪表格',
    icon: '📊',
    category: 'excel-sheets',
    type: 'WIKI',
    folder: '项目文档',
    outputFormat: 'xls',
    source: 'builtin',
    content: `<h2>里程碑跟踪 - <span class="placeholder">{项目名称}</span></h2>
<table>
<tr><th>里程碑</th><th>描述</th><th>计划日期</th><th>实际日期</th><th>交付物</th><th>负责人</th><th>状态</th><th>备注</th></tr>
<tr><td>M1</td><td><span class="placeholder">{描述}</span></td><td><span class="placeholder">{日期}</span></td><td><span class="placeholder">{日期}</span></td><td><span class="placeholder">{交付物}</span></td><td><span class="placeholder">{姓名}</span></td><td>✅ 完成</td><td></td></tr>
<tr><td>M2</td><td><span class="placeholder">{描述}</span></td><td><span class="placeholder">{日期}</span></td><td><span class="placeholder">{日期}</span></td><td><span class="placeholder">{交付物}</span></td><td><span class="placeholder">{姓名}</span></td><td>⏳ 进行中</td><td></td></tr>
<tr><td>M3</td><td><span class="placeholder">{描述}</span></td><td><span class="placeholder">{日期}</span></td><td></td><td><span class="placeholder">{交付物}</span></td><td><span class="placeholder">{姓名}</span></td><td>⬜ 未开始</td><td></td></tr>
<tr><td>M4</td><td><span class="placeholder">{描述}</span></td><td><span class="placeholder">{日期}</span></td><td></td><td><span class="placeholder">{交付物}</span></td><td><span class="placeholder">{姓名}</span></td><td>⬜ 未开始</td><td></td></tr>
<tr><td colspan="8" class="placeholder">添加更多里程碑...</td></tr>
</table>

<h2>进度总览</h2>
<table>
<tr><th>指标</th><th>值</th></tr>
<tr><td>总里程碑数</td><td><span class="placeholder">{数量}</span></td></tr>
<tr><td>已完成</td><td><span class="placeholder">{数量}</span></td></tr>
<tr><td>进行中</td><td><span class="placeholder">{数量}</span></td></tr>
<tr><td>完成率</td><td><span class="placeholder">{百分比}</span></td></tr>
</table>`,
    tags: ['里程碑', 'Excel', '跟踪'],
  },
  {
    id: 'budget-tracker',
    name: '预算跟踪表',
    description: '项目预算使用跟踪与对比',
    icon: '📊',
    category: 'excel-sheets',
    type: 'FORMAL',
    folder: '项目文档',
    outputFormat: 'xls',
    source: 'builtin',
    content: `<h2>预算跟踪 - <span class="placeholder">{项目名称}</span></h2>
<table>
<tr><th>预算项</th><th>预算金额</th><th>已支出</th><th>剩余</th><th>使用率</th><th>负责人</th><th>备注</th></tr>
<tr><td><span class="placeholder">{项目}</span></td><td><span class="placeholder">{金额}</span></td><td><span class="placeholder">{金额}</span></td><td><span class="placeholder">{金额}</span></td><td><span class="placeholder">{百分比}</span></td><td><span class="placeholder">{姓名}</span></td><td></td></tr>
<tr><td><span class="placeholder">{项目}</span></td><td><span class="placeholder">{金额}</span></td><td><span class="placeholder">{金额}</span></td><td><span class="placeholder">{金额}</span></td><td><span class="placeholder">{百分比}</span></td><td><span class="placeholder">{姓名}</span></td><td></td></tr>
<tr><td><span class="placeholder">{项目}</span></td><td><span class="placeholder">{金额}</span></td><td><span class="placeholder">{金额}</span></td><td><span class="placeholder">{金额}</span></td><td><span class="placeholder">{百分比}</span></td><td><span class="placeholder">{姓名}</span></td><td></td></tr>
<tr class="section-title"><td>合计</td><td><span class="placeholder">{总预算}</span></td><td><span class="placeholder">{总支出}</span></td><td><span class="placeholder">{总剩余}</span></td><td><span class="placeholder">{总使用率}</span></td><td></td><td></td></tr>
</table>`,
    tags: ['预算', 'Excel', '财务'],
  },

  // ═══════ SOP 模板 ═══════
  {
    id: 'sop-customer-complaint',
    name: '客户投诉处理SOP',
    description: '从接收到解决的完整投诉处理流程',
    icon: '🎯',
    category: 'sop-templates',
    type: 'SOP',
    folder: 'SOP',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1>SOP：客户投诉处理流程</h1>

<h2>适用范围</h2>
<table class="meta-table">
<tr><td>适用角色</td><td>客服专员、客服主管</td></tr>
<tr><td>适用场景</td><td>所有渠道的客户投诉处理</td></tr>
<tr><td>执行频率</td><td>每次收到投诉</td></tr>
</table>

<h2>操作步骤</h2>
<h3>Step 1：接收与记录</h3>
<ol>
<li>记录客户信息（姓名、联系方式）</li>
<li>明确投诉内容与诉求</li>
<li>判断投诉等级（一般/紧急/重大）</li>
</ol>
<p><strong>检查点：</strong>投诉信息是否完整录入系统</p>

<h3>Step 2：调查与核实</h3>
<ol>
<li>调取相关订单/服务记录</li>
<li>联系相关责任部门核实情况</li>
<li>整理事实依据与证据材料</li>
</ol>
<p><strong>检查点：</strong>是否在2小时内完成初步核实</p>

<h3>Step 3：方案制定与沟通</h3>
<ol>
<li>根据公司政策制定解决方案</li>
<li>重大投诉需报主管审批</li>
<li>与客户沟通方案并获得确认</li>
</ol>

<h3>Step 4：执行与回访</h3>
<ol>
<li>落实解决方案（退款/补偿/整改）</li>
<li>3个工作日内回访客户满意度</li>
<li>更新投诉处理记录并归档</li>
</ol>`,
    tags: ['客服', '投诉', '流程'],
  },
  {
    id: 'sop-code-review',
    name: '代码评审SOP',
    description: '代码提交到合入的标准评审流程',
    icon: '💻',
    category: 'sop-templates',
    type: 'SOP',
    folder: 'SOP',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1>SOP：代码评审流程</h1>

<h2>适用范围</h2>
<table class="meta-table">
<tr><td>适用角色</td><td>开发工程师、Tech Lead</td></tr>
<tr><td>适用场景</td><td>所有代码变更提交</td></tr>
<tr><td>执行频率</td><td>每次 Pull Request</td></tr>
</table>

<h2>操作步骤</h2>
<h3>Step 1：提交前自检</h3>
<ol>
<li>本地通过所有单元测试</li>
<li>代码格式化与 lint 检查通过</li>
<li>提交信息遵循 Conventional Commits 规范</li>
<li>PR 描述填写变更说明与测试计划</li>
</ol>

<h3>Step 2：自动化检查</h3>
<ol>
<li>CI 流水线自动运行（lint / test / build）</li>
<li>通过后自动分配至少1名 Reviewer</li>
<li>失败则修复后重新提交</li>
</ol>

<h3>Step 3：人工评审</h3>
<ol>
<li>Reviewer 检查代码逻辑、风格、安全与性能</li>
<li>提出修改意见，标记严重程度</li>
<li>作者逐条回应并修改</li>
</ol>
<p><strong>检查点：</strong>所有评论是否已解决</p>

<h3>Step 4：合入与部署</h3>
<ol>
<li>至少1人 Approve 后方可合入</li>
<li>Squash merge 到主分支</li>
<li>监控部署后的线上指标</li>
</ol>`,
    tags: ['开发', '代码', '评审'],
  },
  {
    id: 'sop-deploy-release',
    name: '发布上线SOP',
    description: '从预发布到正式上线的标准发布流程',
    icon: '🚀',
    category: 'sop-templates',
    type: 'SOP',
    folder: 'SOP',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1>SOP：发布上线流程</h1>

<h2>适用范围</h2>
<table class="meta-table">
<tr><td>适用角色</td><td>开发、测试、运维</td></tr>
<tr><td>适用场景</td><td>版本发布与上线</td></tr>
<tr><td>执行频率</td><td>每个发布周期</td></tr>
</table>

<h2>操作步骤</h2>
<h3>Step 1：发布准备</h3>
<ol>
<li>确认所有合入的功能已通过测试</li>
<li>生成 Release Notes（变更清单）</li>
<li>准备回滚方案与应急预案</li>
<li>通知相关方发布时间窗口</li>
</ol>

<h3>Step 2：预发布验证</h3>
<ol>
<li>部署到 staging 环境</li>
<li>执行冒烟测试与回归测试</li>
<li>验证关键业务流程</li>
<li>性能压测（如有需要）</li>
</ol>
<p><strong>检查点：</strong>staging 环境所有检查通过</p>

<h3>Step 3：灰度发布</h3>
<ol>
<li>先发布到 5%-10% 的实例</li>
<li>监控错误率、延迟、业务指标</li>
<li>无异常后逐步扩大灰度比例</li>
</ol>

<h3>Step 4：全量发布与监控</h3>
<ol>
<li>全量发布到所有实例</li>
<li>持续监控至少 30 分钟</li>
<li>确认无异常后发布完成</li>
<li>记录发布日志（时间、版本、负责人）</li>
</ol>`,
    tags: ['发布', '部署', '运维'],
  },
  {
    id: 'sop-meeting-weekly',
    name: '周会组织SOP',
    description: '高效组织和管理团队周例会',
    icon: '📋',
    category: 'sop-templates',
    type: 'SOP',
    folder: 'SOP',
    outputFormat: 'doc',
    source: 'builtin',
    content: `<h1>SOP：团队周会组织</h1>

<h2>适用范围</h2>
<table class="meta-table">
<tr><td>适用角色</td><td>团队负责人、PM</td></tr>
<tr><td>适用场景</td><td>每周团队例会</td></tr>
<tr><td>执行频率</td><td>每周</td></tr>
</table>

<h2>操作步骤</h2>
<h3>Step 1：会前准备</h3>
<ol>
<li>提前1天收集议题（群聊/共享文档）</li>
<li>整理议程：目标、进展、问题、决议</li>
<li>发送会议邀请（时间、地点、议程）</li>
<li>准备数据看板与进度报告</li>
</ol>

<h3>Step 2：会议执行</h3>
<ol>
<li>准时开始，先回顾上周 Action Items</li>
<li>每人 2-3 分钟汇报：完成/计划/风险</li>
<li>讨论议题按优先级排序</li>
<li>严格控制时长（建议≤1小时）</li>
</ol>
<p><strong>检查点：</strong>是否按时结束</p>

<h3>Step 3：会后跟进</h3>
<ol>
<li>24小时内发出会议纪要</li>
<li>纪要包含：决议、Action Items、责任人、DDL</li>
<li>Action Items 录入任务管理系统</li>
<li>下次会议首项回顾本次 Action Items</li>
</ol>`,
    tags: ['会议', '周会', '管理'],
  },
];
