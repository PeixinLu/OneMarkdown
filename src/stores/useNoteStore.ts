import { defineStore } from 'pinia';
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri';

export interface Notebook {
  name: string;
  path: string;
}

export interface Note {
  name: string;
  path: string;
}

interface State {
  notebooks: Notebook[];
  notes: Note[];
  activeNotebook: Notebook | null;
  activeNote: Note | null;
  currentContent: string;
}

const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_IPC__);
const WEB_SAMPLE_NOTE = `# Web Demo

非 Tauri 环境下的演示数据。

- 左侧 Notebook / Note 列表
- Milkdown 所见即所得
- 图片功能需在 Tauri 环境运行
`;

export const useNoteStore = defineStore('note', {
  state: (): State => ({
    notebooks: [],
    notes: [],
    activeNotebook: null,
    activeNote: null,
    currentContent: '',
  }),
  actions: {
    async bootstrap() {
      if (!isTauri) {
        // Web fallback: 提供内存示例，避免 __TAURI_IPC__ 报错
        const notebook: Notebook = { name: 'Web Demo', path: '/web/demo' };
        const note: Note = { name: 'Welcome', path: '/web/demo/welcome' };
        this.notebooks = [notebook];
        this.notes = [note];
        this.activeNotebook = notebook;
        this.activeNote = note;
        this.currentContent = WEB_SAMPLE_NOTE;
        return;
      }
      await invoke('ensure_demo_data');
      await this.loadNotebooks();
    },
    async loadNotebooks() {
      this.notebooks = await invoke<Notebook[]>('list_notebooks');
      if (this.notebooks.length) {
        await this.selectNotebook(this.notebooks[0]);
      }
    },
    async selectNotebook(notebook: Notebook) {
      this.activeNotebook = notebook;
      await this.loadNotes(notebook.path);
    },
    async loadNotes(notebookPath: string) {
      this.notes = await invoke<Note[]>('list_notes', { notebookPath });
      if (this.notes.length) {
        await this.selectNote(this.notes[0]);
      } else {
        this.activeNote = null;
        this.currentContent = '';
      }
    },
    async selectNote(note: Note) {
      this.activeNote = note;
      if (!isTauri) {
        this.currentContent = WEB_SAMPLE_NOTE;
        return;
      }
      const content = await invoke<string>('read_note', { notePath: note.path });
      this.currentContent = this.toDisplayMarkdown(content, note.path);
    },
    async updateContent(markdown: string) {
      if (!this.activeNote) return;
      this.currentContent = markdown;
      if (!isTauri) return;
      const storageContent = this.toRelativeMarkdown(markdown, this.activeNote.path);
      await invoke('save_note', {
        notePath: this.activeNote.path,
        content: storageContent,
      });
    },
    async createNotebook() {
      const name = `Notebook-${this.notebooks.length + 1}`;
      if (!isTauri) {
        const notebook: Notebook = { name, path: `/web/${name}` };
        this.notebooks.push(notebook);
        this.selectNotebook(notebook);
        return;
      }
      const notebook = await invoke<Notebook>('create_notebook', { name });
      await this.loadNotebooks();
      await this.selectNotebook(notebook);
    },
    async createNote() {
      if (!this.activeNotebook) return;
      const name = `Note-${this.notes.length + 1}`;
      if (!isTauri) {
        const note: Note = { name, path: `${this.activeNotebook.path}/${name}` };
        this.notes.push(note);
        this.selectNote(note);
        return;
      }
      const note = await invoke<Note>('create_note', {
        notebookPath: this.activeNotebook.path,
        name,
      });
      await this.loadNotes(this.activeNotebook.path);
      await this.selectNote(note);
    },
    async saveImage(file: File) {
      if (!this.activeNote) return '';
      if (!isTauri) {
        // Web 模式暂不支持文件写入
        return '';
      }
      const buffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      const relativePath = await invoke<string>('save_image', {
        notePath: this.activeNote.path,
        fileName: file.name,
        data,
      });
      return relativePath;
    },
    toDisplayMarkdown(markdown: string, notePath: string) {
      if (!isTauri) return markdown;
      const normalized = this.withSlash(notePath);
      return markdown.replace(/!\[(.*?)\]\((.*?)\)/g, (_match, alt, src) => {
        if (typeof src !== 'string') return _match;
        if (src.startsWith('http') || src.startsWith('asset://')) return _match;
        const absolute = this.normalizePath(`${normalized}${src}`);
        const assetSrc = convertFileSrc(absolute);
        return `![${alt}](${assetSrc})`;
      });
    },
    toRelativeMarkdown(markdown: string, notePath: string) {
      if (!isTauri) return markdown;
      const normalized = this.withSlash(notePath);
      const assetBase = this.withSlash(convertFileSrc(normalized));
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
    },
    normalizePath(path: string) {
      return path.replace(/\\/g, '/');
    },
    withSlash(path: string) {
      const normalized = this.normalizePath(path);
      return normalized.endsWith('/') ? normalized : `${normalized}/`;
    },
  },
});
