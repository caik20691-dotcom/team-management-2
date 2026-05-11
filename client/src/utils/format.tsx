import {
  FileOutlined, FilePdfOutlined, FileExcelOutlined,
  FileWordOutlined, FilePptOutlined, FileImageOutlined,
} from '@ant-design/icons';

export function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function getFileTypeInfo(mimeType: string): {
  label: string;
  color: string;
  icon: React.ReactNode;
} {
  if (!mimeType) return { label: '文件', color: 'default', icon: <FileOutlined /> };
  if (mimeType.includes('pdf')) return { label: 'PDF', color: 'red', icon: <FilePdfOutlined /> };
  if (mimeType.includes('word') || mimeType.includes('document')) return { label: 'Word', color: 'blue', icon: <FileWordOutlined /> };
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return { label: 'PPT', color: 'orange', icon: <FilePptOutlined /> };
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return { label: 'Excel', color: 'green', icon: <FileExcelOutlined /> };
  if (mimeType.startsWith('image/')) return { label: '图片', color: 'purple', icon: <FileImageOutlined /> };
  return { label: '文件', color: 'default', icon: <FileOutlined /> };
}
