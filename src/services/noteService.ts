import { convertFileSrc } from '@tauri-apps/api/tauri';
import type { Note } from './platformAdapter';

export const WEB_SAMPLE_NOTE = `# Web Demo

非 Tauri 环境下的演示数据。

- 左侧 Notebook / Note 列表
- Milkdown 所见即所得
- 图片功能需在 Tauri 环境运行
`;

export const createWebDemoData = () => {
  const notebook = { name: 'Web Demo', path: '/web/demo' };
  const note: Note = { name: 'Welcome', path: '/web/demo/welcome' };
  return { notebook, note, content: WEB_SAMPLE_NOTE };
};

export const toDisplayMarkdown = (markdown: string, notePath: string, isTauri: boolean) => {
  if (!isTauri) return markdown;
  const normalized = withSlash(notePath);
  return markdown.replace(/!\[(.*?)\]\((.*?)\)/g, (_match, alt, src) => {
    if (typeof src !== 'string') return _match;
    if (src.startsWith('http') || src.startsWith('asset://')) return _match;
    const absolute = normalizePath(`${normalized}${src}`);
    const assetSrc = convertFileSrc(absolute);
    return `![${alt}](${assetSrc})`;
  });
};

export const toRelativeMarkdown = (markdown: string, notePath: string, isTauri: boolean) => {
  if (!isTauri) return markdown;
  const normalized = withSlash(notePath);
  const assetBase = withSlash(convertFileSrc(normalized));
  return markdown.replace(/!\[(.*?)\]\((.*?)\)/g, (_match, alt, src) => {
    if (typeof src !== 'string') return _match;
    let next = src;
    if (next.startsWith(assetBase)) {
      next = next.slice(assetBase.length);
    } else if (next.startsWith(normalized)) {
      next = next.slice(normalized.length);
    }
    return `![${alt}](${next})`;
  });
};

const normalizePath = (path: string) => path.replace(/\\/g, '/');

const withSlash = (path: string) => {
  const normalized = normalizePath(path);
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
};
