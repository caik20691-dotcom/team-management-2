import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import {
  ThunderboltOutlined, AuditOutlined, FileProtectOutlined, BookOutlined,
} from '@ant-design/icons';
import { documentApi, fileApi, documentCategoryApi, scenarioApi, folderApi } from '../../api';
import { useAuthStore } from '../../stores/auth';
import DocSidebar from './DocSidebar';
import DocDashboard from './DocDashboard';
import DocList from './DocList';
import TemplateCenter from './TemplateCenter';
import DocEditor from './DocEditor';
import DocDetail from './DocDetail';
import FileManager from './FileManager';
import DocSopView from './DocSopView';
import SopCreator from './SopCreator';
import { TagManageModal } from './CategoryManager';
import { templateFromDoc, DocTemplate } from './templates';

const typeMetaMap: Record<string, { label: string; icon: any; color: string; gradient: [string, string]; accent: string }> = {
  SOP:    { label: '工作 SOP', icon: <ThunderboltOutlined />,  color: 'orange', gradient: ['#fff7ed','#ffedd5'], accent: '#f97316' },
  POLICY: { label: '制度文档', icon: <AuditOutlined />,       color: 'cyan',   gradient: ['#ecfeff','#cffafe'], accent: '#0891b2' },
  FORMAL: { label: '正式文档', icon: <FileProtectOutlined />, color: 'blue',   gradient: ['#eff6ff','#dbeafe'], accent: '#3b82f6' },
  WIKI:   { label: 'Wiki 知识', icon: <BookOutlined />,       color: 'purple', gradient: ['#faf5ff','#f3e8ff'], accent: '#7c3aed' },
};

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [activeFolder, setActiveFolder] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editorOpen, setEditorOpen] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sopCreatorOpen, setSopCreatorOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  // ── Queries ──
  const { data: docsResp } = useQuery({
    queryKey: ['documents', { pageSize: '200' }],
    queryFn: () => documentApi.list({ pageSize: '200' }).then((r) => r.data),
  });

  // Query template documents (user-uploaded file-based templates)
  const { data: templateDocsResp } = useQuery({
    queryKey: ['documents', { type: 'TEMPLATE', pageSize: '100' }],
    queryFn: () => documentApi.list({ type: 'TEMPLATE', pageSize: '100' }).then((r) => r.data),
  });

  const { data: folders } = useQuery({
    queryKey: ['document-folders'],
    queryFn: () => documentApi.getFolders().then((r) => r.data),
  });

  const { data: allTags } = useQuery({
    queryKey: ['document-tags'],
    queryFn: () => documentApi.getAllTags().then((r) => r.data),
  });

  const { data: allScenarios } = useQuery({
    queryKey: ['document-scenarios'],
    queryFn: () => documentApi.getScenarios().then((r) => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ['document', detailOpen?.id],
    queryFn: () => documentApi.get(detailOpen.id).then((r) => r.data),
    enabled: !!detailOpen?.id,
  });

  const { data: managedCategories } = useQuery({
    queryKey: ['document-categories'],
    queryFn: () => documentCategoryApi.list().then((r: any) => r.data),
  });

  const { data: managedScenarios } = useQuery({
    queryKey: ['sop-scenarios'],
    queryFn: () => scenarioApi.list().then((r: any) => r.data),
  });

  const { data: managedFolders } = useQuery({
    queryKey: ['managed-document-folders'],
    queryFn: () => folderApi.list().then((r: any) => r.data),
  });

  const { data: filesResp } = useQuery({
    queryKey: ['files', fileSearch],
    queryFn: () => fileApi.list({ search: fileSearch || undefined, pageSize: '100' }).then((r) => r.data),
    enabled: activeView === 'files',
  });

  const docs = docsResp?.data || [];
  const folderList: string[] = Array.isArray(folders) ? folders : [];
  const tagsList: string[] = Array.isArray(allTags) ? allTags : [];
  const files = filesResp?.data || [];

  const managedScenarioList: any[] = Array.isArray(managedScenarios) ? managedScenarios : [];
  const managedFolderList: any[] = Array.isArray(managedFolders) ? managedFolders : [];

  // Merge managed scenarios + existing doc scenarios
  const scenariosList: string[] = useMemo(() => {
    const s = new Set<string>();
    managedScenarioList.forEach((sc: any) => s.add(sc.name));
    (Array.isArray(allScenarios) ? allScenarios : []).forEach((sc: string) => s.add(sc));
    return [...s];
  }, [allScenarios, managedScenarioList]);

  // Managed folder names as suggestions (documents can still use custom paths)
  const availableFolders: string[] = useMemo(() => {
    return managedFolderList.map((f: any) => f.name);
  }, [managedFolderList]);

  // Convert template documents to DocTemplate objects
  const uploadedTemplates: DocTemplate[] = useMemo(() => {
    const templateDocs = templateDocsResp?.data || [];
    // Filter out templates that are already in the main docs list
    const templateIds = new Set(docs.map((d: any) => d.id));
    return templateDocs
      .filter((d: any) => !templateIds.has(d.id))
      .map(templateFromDoc);
  }, [templateDocsResp, docs]);

  const availableCategories = useMemo(() => {
    const s = new Set<string>();
    // Managed categories first
    const managed: any[] = Array.isArray(managedCategories) ? managedCategories : [];
    managed.forEach((c: any) => s.add(c.name));
    // Also include categories from existing docs (backwards compatibility)
    docs.forEach((d: any) => { if (d.category) s.add(d.category); });
    return [...s];
  }, [docs, managedCategories]);

  // ── Mutations ──
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['document-tags'] });
    queryClient.invalidateQueries({ queryKey: ['document-scenarios'] });
    queryClient.invalidateQueries({ queryKey: ['document-folders'] });
    queryClient.invalidateQueries({ queryKey: ['files'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => documentApi.create(data),
    onSuccess: () => { invalidateAll(); message.success('文档创建成功'); setEditorOpen(null); setTemplate(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => documentApi.update(id, data),
    onSuccess: () => { invalidateAll(); message.success('文档已更新'); setEditorOpen(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentApi.remove(id),
    onSuccess: () => { invalidateAll(); message.success('已删除'); setDetailOpen(null); },
  });

  const uploadTemplateMutation = useMutation({
    mutationFn: async ({ file, name, description, category }: { file: File; name: string; description: string; category: string }) => {
      // Upload file first
      const uploadRes = await fileApi.uploadAny(file);
      // Create a template document with the file as attachment
      const docRes = await documentApi.create({
        title: name,
        content: '',
        summary: description,
        type: 'TEMPLATE',
        category: category,
        folder: '',
        tags: '',
      });
      // Attach file to the template document
      await documentApi.addAttachment(docRes.data.id, {
        filename: file.name,
        url: uploadRes.data.url,
        size: file.size,
        mimeType: file.type,
      });
      return docRes.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      message.success('模板上传成功');
    },
  });

  // ── Handlers ──
  const handleViewChange = (view: string, folder?: string) => {
    setActiveView(view);
    setActiveFolder(folder || '');
  };

  const handleCreateDoc = (docType?: string) => {
    if (docType === 'SOP') {
      setTemplate(null);
      setSopCreatorOpen(true);
    } else {
      setTemplate(null);
      setEditorOpen({ mode: 'create', type: docType });
    }
  };

  const handleCreateFromTemplate = (t: any) => {
    if (t.type === 'SOP') {
      setTemplate(t);
      setSopCreatorOpen(true);
      return;
    }
    if (t.source === 'upload') {
      setTemplate({ ...t, isFileTemplate: true });
    } else {
      setTemplate(t);
    }
    setEditorOpen({ mode: 'create', type: t.type || 'WIKI' });
  };

  const handleSopCreate = async (data: any) => {
    const { sopFile, ...docData } = data;
    const created = await documentApi.create({ ...docData, content: docData.content || '' });
    const newDocId = (created as any)?.data?.id || (created as any)?.id;

    if (sopFile && newDocId) {
      const uploadRes = await fileApi.uploadAny(sopFile);
      await documentApi.addAttachment(newDocId, {
        filename: sopFile.name,
        url: uploadRes.data.url,
        size: sopFile.size,
        mimeType: sopFile.type,
      });
    }

    if (template?.isFileTemplate && template.fileUrl && newDocId) {
      try {
        await documentApi.addAttachment(newDocId, {
          filename: template.fileName || 'template-file',
          url: template.fileUrl,
          size: template.fileSize || 0,
          mimeType: template.fileType || 'application/octet-stream',
        });
      } catch { /* ignore */ }
    }

    invalidateAll();
    message.success('SOP 创建成功');
    setSopCreatorOpen(false);
    setTemplate(null);
  };

  const handleEditDoc = (doc: any) => {
    setTemplate(null);
    setEditorOpen({ mode: 'edit', doc });
  };

  const handleEditTemplate = async (t: DocTemplate) => {
    setTemplate(null);
    if (t.source === 'upload') {
      try {
        const res = await documentApi.get(t.id);
        setEditorOpen({ mode: 'template-edit', doc: res.data });
      } catch {
        message.error('获取模板数据失败');
      }
    } else {
      setEditorOpen({
        mode: 'template-edit',
        doc: {
          title: t.name,
          type: t.type,
          category: t.category,
          folder: t.folder,
          tags: t.tags.join(', '),
          summary: t.description,
        },
      });
    }
  };

  const handleSubmit = async (data: any) => {
    if (editorOpen?.mode === 'template-edit') {
      const { replaceFile, ...updateData } = data;
      const doc = editorOpen.doc;
      setSubmitting(true);
      try {
        if (doc.id) {
          await documentApi.update(doc.id, { ...updateData, type: doc.type || 'TEMPLATE' });
          if (replaceFile) {
            const uploadRes = await fileApi.uploadAny(replaceFile);
            if (doc.attachments) {
              for (const att of doc.attachments) {
                try { await documentApi.removeAttachment(doc.id, att.id); } catch { /* skip */ }
              }
            }
            await documentApi.addAttachment(doc.id, {
              filename: replaceFile.name,
              url: uploadRes.data.url,
              size: replaceFile.size,
              mimeType: replaceFile.type,
            });
          }
          message.success('模板已更新');
        } else {
          const created = await documentApi.create({ ...updateData, type: 'TEMPLATE', content: '' });
          const newDocId = (created as any)?.data?.id || (created as any)?.id;
          if (replaceFile && newDocId) {
            const uploadRes = await fileApi.uploadAny(replaceFile);
            await documentApi.addAttachment(newDocId, {
              filename: replaceFile.name,
              url: uploadRes.data.url,
              size: replaceFile.size,
              mimeType: replaceFile.type,
            });
          }
          message.success('模板已创建');
        }
        invalidateAll();
        setEditorOpen(null);
        setTemplate(null);
      } catch (e: any) {
        message.error(e?.message || '操作失败');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (editorOpen?.mode === 'edit') {
      if (editorOpen.doc?.type === 'SOP') {
        const { editFile, ...updateData } = data;
        setSubmitting(true);
        try {
          const created = await documentApi.createVersion(editorOpen.doc.id, updateData);
          const newDocId = (created as any)?.data?.id || (created as any)?.id;
          if (editFile && newDocId) {
            const uploadRes = await fileApi.uploadAny(editFile);
            await documentApi.addAttachment(newDocId, {
              filename: editFile.name,
              url: uploadRes.data.url,
              size: editFile.size,
              mimeType: editFile.type,
            });
          }
          invalidateAll();
          message.success('SOP 新版本已创建');
          setEditorOpen(null);
        } catch (e: any) {
          message.error(e?.message || '创建新版本失败');
        } finally {
          setSubmitting(false);
        }
      } else {
        updateMutation.mutate({ id: editorOpen.doc.id, data });
      }
    } else {
      // Create new document
      try {
        const created = await createMutation.mutateAsync(data);
        const newDocId = (created as any)?.id || (created as any)?.data?.id;

        // Attach uploaded file to the new document
        if (data.createFile && newDocId) {
          try {
            const uploadRes = await fileApi.uploadAny(data.createFile);
            await documentApi.addAttachment(newDocId, {
              filename: data.createFile.name,
              url: uploadRes.data.url,
              size: data.createFile.size,
              mimeType: data.createFile.type,
            });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
          } catch { /* attachment failed but doc was created */ }
        }

        // If template is file-based, also attach the template file to the new doc
        if (template?.isFileTemplate && template.fileUrl && newDocId) {
          try {
            await documentApi.addAttachment(newDocId, {
              filename: template.fileName || 'template-file',
              url: template.fileUrl,
              size: template.fileSize || 0,
              mimeType: template.fileType || 'application/octet-stream',
            });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
          } catch { /* attachment failed but doc was created */ }
        }
      } catch { /* creation failed, error handled by mutation */ }
    }
  };

  const handleDeleteDoc = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleUploadTemplate = (file: File, name: string, description: string, category: string) => {
    uploadTemplateMutation.mutate({ file, name, description, category });
  };

  const handleDeleteUploadedTemplate = (id: string) => {
    deleteMutation.mutate(id);
  };

  // ── Render ──
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DocDashboard
            docs={docs}
            allTags={tagsList}
            onViewChange={handleViewChange}
            onCreateFromTemplate={handleCreateFromTemplate}
            onDocClick={(doc: any) => setDetailOpen(doc)}
          />
        );
      case 'list':
        return (
          <DocList
            docs={docs}
            allTags={tagsList}
            folders={folderList}
            activeFolder={activeFolder}
            typeMetaMap={typeMetaMap}
            onCreateDoc={handleCreateDoc}
            onDocClick={(doc: any) => setDetailOpen(doc)}
            onEditDoc={handleEditDoc}
            onDeleteDoc={handleDeleteDoc}
          />
        );
      case 'templates':
        return (
          <TemplateCenter
            onSelectTemplate={handleCreateFromTemplate}
            onCreateBlank={() => handleCreateDoc()}
            uploadedTemplates={uploadedTemplates}
            onUploadTemplate={handleUploadTemplate}
            onDeleteUploadedTemplate={handleDeleteUploadedTemplate}
            onEditTemplate={handleEditTemplate}
          />
        );
      case 'sop':
        return (
          <DocSopView
            docs={docs}
            isAdmin={isAdmin}
            availableFolders={availableFolders}
            availableCategories={availableCategories}
            onManageCategories={() => setTagManagerOpen(true)}
            onCreateDoc={handleCreateDoc}
            onCreateFromTemplate={handleCreateFromTemplate}
            onDocClick={(doc: any) => setDetailOpen(doc)}
            onEditDoc={handleEditDoc}
            onDeleteDoc={handleDeleteDoc}
          />
        );
      case 'files':
        return (
          <FileManager
            files={files}
            fileSearch={fileSearch}
            onSearchChange={setFileSearch}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', gap: 0 }}>
      {/* Left Sidebar */}
      <div style={{
        width: sidebarCollapsed ? 56 : 220,
        flexShrink: 0,
        borderRight: '1px solid #f3f4f6',
        background: '#fafbfc',
        borderRadius: '14px 0 0 14px',
        overflow: 'hidden auto',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', padding: '4px 8px 0',
        }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'transparent', color: '#9ca3af', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        <DocSidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          onManageTags={() => setTagManagerOpen(true)}
          collapsed={sidebarCollapsed}
        />
      </div>

      {/* Right Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '20px 24px',
        background: '#fff',
        borderRadius: '0 14px 14px 0',
      }}>
        {renderContent()}
      </div>

      {/* Editor Modal */}
      <DocEditor
        open={!!editorOpen}
        mode={editorOpen?.mode || 'create'}
        doc={editorOpen?.doc}
        template={template}
        availableCategories={availableCategories}
        availableScenarios={scenariosList}
        availableFolders={availableFolders}
        onClose={() => { setEditorOpen(null); setTemplate(null); }}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending || submitting}
      />

      {/* SOP Creator Modal */}
      <SopCreator
        open={sopCreatorOpen}
        availableScenarios={scenariosList}
        availableCategories={availableCategories}
        availableFolders={availableFolders}
        onClose={() => { setSopCreatorOpen(false); setTemplate(null); }}
        onSubmit={handleSopCreate}
      />

      {/* Tag Manage Modal (分类 / 场景 / 目录) */}
      <TagManageModal
        open={tagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
        categoryApi={documentCategoryApi}
        scenarioApi={scenarioApi}
        folderApi={folderApi}
      />

      {/* Detail Modal */}
      <DocDetail
        detail={detail}
        open={!!detailOpen}
        onClose={() => setDetailOpen(null)}
        onEdit={(doc: any) => {
          setDetailOpen(null);
          handleEditDoc(doc);
        }}
        onDelete={handleDeleteDoc}
        isAdmin={isAdmin}
        onViewVersion={(docId: string) => setDetailOpen({ id: docId })}
      />
    </div>
  );
}
