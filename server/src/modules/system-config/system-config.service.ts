import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const CONFIG_PATH = path.resolve(__dirname, '../../../../system-config.json');

interface AnnouncementCategory {
  id: string;
  name: string;
  color: string;
  bg: string;
  sort: number;
}

interface DocumentCategory {
  id: string;
  name: string;
  sort: number;
}

interface SopScenario {
  id: string;
  name: string;
  sort: number;
}

interface DocumentFolder {
  id: string;
  name: string;
  sort: number;
}

interface SystemConfig {
  logoUrl?: string;
  systemName?: string;
  timezone?: string;
  announcementCategories?: AnnouncementCategory[];
  documentCategories?: DocumentCategory[];
  sopScenarios?: SopScenario[];
  documentFolders?: DocumentFolder[];
}

const DEFAULT_CATEGORIES: AnnouncementCategory[] = [
  { id: 'cat-1', name: '通知', color: '#3b82f6', bg: '#eff6ff', sort: 1 },
  { id: 'cat-2', name: '制度', color: '#7c3aed', bg: '#f5f3ff', sort: 2 },
  { id: 'cat-3', name: '活动', color: '#10b981', bg: '#ecfdf5', sort: 3 },
  { id: 'cat-4', name: '人事', color: '#f59e0b', bg: '#fffbeb', sort: 4 },
  { id: 'cat-5', name: '其他', color: '#6b7280', bg: '#f9fafb', sort: 5 },
];

export type { SystemConfig, AnnouncementCategory, DocumentCategory, SopScenario, DocumentFolder };

function read(): SystemConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {}
  return {};
}

function write(config: SystemConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

@Injectable()
export class SystemConfigService {
  get(): SystemConfig {
    return read();
  }

  update(data: SystemConfig) {
    const current = read();
    const updated = { ...current, ...data };
    write(updated);
    return updated;
  }

  // ── Announcement category management ──

  getCategories(): AnnouncementCategory[] {
    const config = read();
    if (config.announcementCategories && config.announcementCategories.length > 0) {
      return config.announcementCategories.sort((a, b) => a.sort - b.sort);
    }
    return DEFAULT_CATEGORIES;
  }

  createCategory(dto: { name: string; color: string; bg: string }): AnnouncementCategory[] {
    const categories = this.getCategories();
    const maxSort = categories.reduce((max, c) => Math.max(max, c.sort), 0);
    categories.push({
      id: `cat-${crypto.randomBytes(4).toString('hex')}`,
      name: dto.name,
      color: dto.color,
      bg: dto.bg,
      sort: maxSort + 1,
    });
    const config = read();
    config.announcementCategories = categories;
    write(config);
    return categories;
  }

  updateCategory(id: string, dto: { name?: string; color?: string; bg?: string; sort?: number }): AnnouncementCategory[] {
    let categories = this.getCategories();
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return categories;
    categories[idx] = { ...categories[idx], ...dto };
    const config = read();
    config.announcementCategories = categories;
    write(config);
    return categories;
  }

  deleteCategory(id: string): AnnouncementCategory[] {
    let categories = this.getCategories();
    categories = categories.filter((c) => c.id !== id);
    const config = read();
    config.announcementCategories = categories;
    write(config);
    return categories;
  }

  reorderCategories(ids: string[]): AnnouncementCategory[] {
    const categories = this.getCategories();
    const updated = ids.map((id, i) => {
      const cat = categories.find((c) => c.id === id);
      if (!cat) return null;
      return { ...cat, sort: i + 1 };
    }).filter(Boolean) as AnnouncementCategory[];
    const config = read();
    config.announcementCategories = updated;
    write(config);
    return updated;
  }

  // ── Document category management ──

  getDocumentCategories(): DocumentCategory[] {
    const config = read();
    if (config.documentCategories && config.documentCategories.length > 0) {
      return config.documentCategories.sort((a, b) => a.sort - b.sort);
    }
    return [];
  }

  createDocumentCategory(dto: { name: string }): DocumentCategory[] {
    const categories = this.getDocumentCategories();
    const maxSort = categories.reduce((max, c) => Math.max(max, c.sort), 0);
    categories.push({
      id: `dc-${crypto.randomBytes(4).toString('hex')}`,
      name: dto.name,
      sort: maxSort + 1,
    });
    const config = read();
    config.documentCategories = categories;
    write(config);
    return categories;
  }

  updateDocumentCategory(id: string, dto: { name?: string; sort?: number }): DocumentCategory[] {
    let categories = this.getDocumentCategories();
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return categories;
    categories[idx] = { ...categories[idx], ...dto };
    const config = read();
    config.documentCategories = categories;
    write(config);
    return categories;
  }

  deleteDocumentCategory(id: string): DocumentCategory[] {
    let categories = this.getDocumentCategories();
    categories = categories.filter((c) => c.id !== id);
    const config = read();
    config.documentCategories = categories;
    write(config);
    return categories;
  }

  reorderDocumentCategories(ids: string[]): DocumentCategory[] {
    const categories = this.getDocumentCategories();
    const updated = ids.map((id, i) => {
      const cat = categories.find((c) => c.id === id);
      if (!cat) return null;
      return { ...cat, sort: i + 1 };
    }).filter(Boolean) as DocumentCategory[];
    const config = read();
    config.documentCategories = updated;
    write(config);
    return updated;
  }

  // ── SOP scenario management ──

  getSopScenarios(): SopScenario[] {
    const config = read();
    if (config.sopScenarios && config.sopScenarios.length > 0) {
      return config.sopScenarios.sort((a, b) => a.sort - b.sort);
    }
    return [];
  }

  createSopScenario(dto: { name: string }): SopScenario[] {
    const scenarios = this.getSopScenarios();
    const maxSort = scenarios.reduce((max, s) => Math.max(max, s.sort), 0);
    scenarios.push({
      id: `sc-${crypto.randomBytes(4).toString('hex')}`,
      name: dto.name,
      sort: maxSort + 1,
    });
    const config = read();
    config.sopScenarios = scenarios;
    write(config);
    return scenarios;
  }

  updateSopScenario(id: string, dto: { name?: string; sort?: number }): SopScenario[] {
    let scenarios = this.getSopScenarios();
    const idx = scenarios.findIndex((s) => s.id === id);
    if (idx === -1) return scenarios;
    scenarios[idx] = { ...scenarios[idx], ...dto };
    const config = read();
    config.sopScenarios = scenarios;
    write(config);
    return scenarios;
  }

  deleteSopScenario(id: string): SopScenario[] {
    let scenarios = this.getSopScenarios();
    scenarios = scenarios.filter((s) => s.id !== id);
    const config = read();
    config.sopScenarios = scenarios;
    write(config);
    return scenarios;
  }

  reorderSopScenarios(ids: string[]): SopScenario[] {
    const scenarios = this.getSopScenarios();
    const updated = ids.map((id, i) => {
      const s = scenarios.find((s) => s.id === id);
      if (!s) return null;
      return { ...s, sort: i + 1 };
    }).filter(Boolean) as SopScenario[];
    const config = read();
    config.sopScenarios = updated;
    write(config);
    return updated;
  }

  // ── Document folder management ──

  getDocumentFolders(): DocumentFolder[] {
    const config = read();
    if (config.documentFolders && config.documentFolders.length > 0) {
      return config.documentFolders.sort((a, b) => a.sort - b.sort);
    }
    return [];
  }

  createDocumentFolder(dto: { name: string }): DocumentFolder[] {
    const folders = this.getDocumentFolders();
    const maxSort = folders.reduce((max, f) => Math.max(max, f.sort), 0);
    folders.push({
      id: `df-${crypto.randomBytes(4).toString('hex')}`,
      name: dto.name,
      sort: maxSort + 1,
    });
    const config = read();
    config.documentFolders = folders;
    write(config);
    return folders;
  }

  updateDocumentFolder(id: string, dto: { name?: string; sort?: number }): DocumentFolder[] {
    let folders = this.getDocumentFolders();
    const idx = folders.findIndex((f) => f.id === id);
    if (idx === -1) return folders;
    folders[idx] = { ...folders[idx], ...dto };
    const config = read();
    config.documentFolders = folders;
    write(config);
    return folders;
  }

  deleteDocumentFolder(id: string): DocumentFolder[] {
    let folders = this.getDocumentFolders();
    folders = folders.filter((f) => f.id !== id);
    const config = read();
    config.documentFolders = folders;
    write(config);
    return folders;
  }

  reorderDocumentFolders(ids: string[]): DocumentFolder[] {
    const folders = this.getDocumentFolders();
    const updated = ids.map((id, i) => {
      const f = folders.find((f) => f.id === id);
      if (!f) return null;
      return { ...f, sort: i + 1 };
    }).filter(Boolean) as DocumentFolder[];
    const config = read();
    config.documentFolders = folders;
    write(config);
    return updated;
  }
}
