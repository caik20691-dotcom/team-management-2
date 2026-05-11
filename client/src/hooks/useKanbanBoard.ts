import { useState } from 'react';

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  LOW:    { label: '低',   color: '#6b7280', bg: '#f9fafb' },
  MEDIUM: { label: '中',   color: '#3b82f6', bg: '#eff6ff' },
  HIGH:   { label: '高',   color: '#f59e0b', bg: '#fffbeb' },
  URGENT: { label: '紧急', color: '#ef4444', bg: '#fef2f2' },
};

export const PRIORITY_BORDER: Record<string, string> = {
  LOW: '#d1d5db', MEDIUM: '#93c5fd', HIGH: '#fcd34d', URGENT: '#fca5a5',
};

export const KANBAN_COLUMNS = [
  {
    key: 'TODO', label: '待处理', icon: '📥',
    accent: '#6b7280', accentBg: '#f9fafb', accentBorder: '#e5e7eb',
    dotColor: '#9ca3af', gradient: 'linear-gradient(180deg, #f9fafb, #f3f4f6)',
  },
  {
    key: 'IN_PROGRESS', label: '进行中', icon: '🚀',
    accent: '#7c3aed', accentBg: '#f5f3ff', accentBorder: '#ddd6fe',
    dotColor: '#7c3aed', gradient: 'linear-gradient(180deg, #faf5ff, #f5f3ff)',
  },
  {
    key: 'REVIEW', label: '审核中', icon: '🔍',
    accent: '#d97706', accentBg: '#fffbeb', accentBorder: '#fde68a',
    dotColor: '#f59e0b', gradient: 'linear-gradient(180deg, #fffbeb, #fef3c7)',
  },
  {
    key: 'DONE', label: '已完成', icon: '✅',
    accent: '#059669', accentBg: '#ecfdf5', accentBorder: '#a7f3d0',
    dotColor: '#10b981', gradient: 'linear-gradient(180deg, #ecfdf5, #d1fae5)',
  },
];

interface UseKanbanBoardOptions {
  tasks: any[];
  onUpdateStatus: (taskId: string, newStatus: string) => void;
}

export function useKanbanBoard({ tasks, onUpdateStatus }: UseKanbanBoardOptions) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const getTasksByStatus = (status: string) =>
    tasks.filter((t: any) => t.status === status);

  const handleDrop = (targetStatus: string) => {
    if (draggedTaskId) {
      onUpdateStatus(draggedTaskId, targetStatus);
    }
    setDraggedTaskId(null);
    setDragOverCol(null);
  };

  return {
    draggedTaskId, setDraggedTaskId,
    dragOverCol, setDragOverCol,
    getTasksByStatus, handleDrop,
  };
}
