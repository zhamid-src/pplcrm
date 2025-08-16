import { PcIconNameType } from '../icons/icons.index';

// file-icon.util.ts
export type FileIconKey =
  | 'pdf'
  | 'doc'
  | 'sheet'
  | 'slides'
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'archive'
  | 'code'
  | 'design'
  | 'font'
  | 'ebook'
  | 'email'
  | 'calendar'
  | 'contact'
  | 'db'
  | 'disk'
  | 'exe'
  | 'unknown';

function cleanName(name: string): string {
  // strip query/hash (e.g., foo.pdf?dl=1#x)
  return name.split('#')[0].split('?')[0].trim();
}

export function iconKeyForFilename(filename: string): FileIconKey {
  if (!filename) return 'unknown';
  const name = cleanName(filename.toLowerCase());

  // multi-part extensions first (e.g., .tar.gz)
  for (const mex of MULTI_EXT) {
    if (name.endsWith(`.${mex}`)) return 'archive';
  }

  // single extension
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1 || lastDot === name.length - 1) return 'unknown';
  const ext = name.slice(lastDot + 1);
  return EXT_TO_KEY[ext] ?? 'unknown';
}

const EXT_MAP: Record<FileIconKey, string[]> = {
  pdf: ['pdf'],
  doc: ['doc', 'docx', 'rtf', 'odt', 'pages'],
  sheet: ['xls', 'xlsx', 'csv', 'tsv', 'ods', 'numbers'],
  slides: ['ppt', 'pptx', 'key', 'odp'],
  text: ['txt', 'md', 'markdown', 'rst', 'log'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff', 'tif', 'heic', 'heif'],
  audio: ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga'],
  video: ['mp4', 'm4v', 'mov', 'mkv', 'webm', 'avi', 'wmv'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz'],
  code: [
    'js',
    'ts',
    'jsx',
    'tsx',
    'json',
    'jsonl',
    'html',
    'css',
    'scss',
    'xml',
    'yml',
    'yaml',
    'sql',
    'py',
    'java',
    'c',
    'cpp',
    'h',
    'cs',
    'go',
    'rs',
    'php',
    'rb',
    'kt',
    'swift',
    'sh',
    'ps1',
  ],
  design: ['psd', 'ai', 'fig', 'xd', 'sketch'],
  font: ['ttf', 'otf', 'woff', 'woff2'],
  ebook: ['epub', 'mobi', 'azw', 'djvu'],
  email: ['eml', 'msg'],
  calendar: ['ics'],
  contact: ['vcf'],
  db: ['sqlite', 'sqlite3', 'db', 'mdb', 'accdb', 'parquet'],
  disk: ['iso', 'dmg', 'img'],
  exe: ['exe', 'msi', 'apk', 'pkg', 'appimage'],
  unknown: [],
};

// reverse lookup
const EXT_TO_KEY: Record<string, FileIconKey> = Object.entries(EXT_MAP).reduce(
  (acc, [key, exts]) => {
    for (const e of exts) acc[e] = key as FileIconKey;
    return acc;
  },
  {} as Record<string, FileIconKey>,
);
const MULTI_EXT = ['tar.gz', 'tar.bz2', 'tar.xz', 'tgz'] as const;

// Map to your <pc-icon> names (assume these exist in your icon set)
export const ICON_FOR_KEY: Record<FileIconKey, PcIconNameType> = {
  pdf: 'file-pdf',
  doc: 'file-doc',
  sheet: 'file-sheet',
  slides: 'file-slides',
  text: 'file-text',
  image: 'file-image',
  audio: 'file-audio',
  video: 'file-video',
  archive: 'file-archive',
  code: 'file-code',
  design: 'file-design',
  font: 'file-font',
  ebook: 'file-ebook',
  email: 'file-email',
  calendar: 'file-calendar',
  contact: 'file-contact',
  db: 'file-db',
  disk: 'file-disk',
  exe: 'file-exe',
  unknown: 'unknown',
};
