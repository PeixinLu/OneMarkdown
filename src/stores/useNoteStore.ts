import { defineStore } from 'pinia';
import { platformApi, isTauri, type Note, type Notebook } from '../services/platformAdapter';
import { createWebDemoData } from '../services/noteService';
import { Vault } from '../services/vault/Vault';

interface State {
  notebooks: Notebook[];
  notes: Note[];
  activeNotebook: Notebook | null;
  activeNote: Note | null;
  currentContent: string;
}

const vault = new Vault();

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
        console.info('[store] bootstrap in web mode');
        const demo = createWebDemoData();
        this.notebooks = [demo.notebook];
        this.notes = [demo.note];
        this.activeNotebook = demo.notebook;
        await this.selectNote(demo.note);
        return;
      }
      console.info('[store] bootstrap in tauri mode');
      await platformApi.ensureDemoData();
      await this.loadNotebooks();
    },
    async loadNotebooks(selectedPath?: string) {
      if (!isTauri) return;
      console.info('[store] loadNotebooks');
      this.notebooks = await platformApi.listNotebooks();
      const target =
        (selectedPath && this.notebooks.find((n) => n.path === selectedPath)) ||
        this.notebooks[0] ||
        null;
      if (target) {
        await this.selectNotebook(target);
      } else {
        this.activeNotebook = null;
        this.activeNote = null;
        this.notes = [];
        this.currentContent = '';
      }
    },
    async selectNotebook(notebook: Notebook) {
      console.info('[store] selectNotebook', notebook.path);
      this.activeNotebook = notebook;
      if (!isTauri) {
        this.notes = this.notes.filter((n) => n.path.startsWith(`${notebook.path}/`));
        const first = this.notes[0] ?? null;
        if (first) {
          await this.selectNote(first);
        } else {
          this.activeNote = null;
          this.currentContent = '';
        }
        return;
      }
      await this.loadNotes(notebook.path);
    },
    async loadNotes(notebookPath: string, selectedNotePath?: string) {
      if (!isTauri) return;
      console.info('[store] loadNotes for', notebookPath);
      this.notes = await platformApi.listNotes(notebookPath);
      const target =
        (selectedNotePath && this.notes.find((n) => n.path === selectedNotePath)) ||
        this.notes[0] ||
        null;
      if (target) {
        await this.selectNote(target);
        return;
      }
      this.activeNote = null;
      this.currentContent = '';
    },
    async selectNote(note: Note) {
      console.info('[store] selectNote', note.path);
      // Flush pending writes from previous note before switching.
      await vault.flush();
      this.activeNote = note;
      // Only on switching note do we set editor content to avoid state backflow.
      const content = await vault.openNote(note.path);
      this.currentContent = content;
    },
    async updateContent(markdown: string) {
      console.info('[store] updateContent length', markdown?.length ?? 0);
      if (!this.activeNote) return;
      // Editor content is source of truth; store does not mirror live edits to avoid backflow.
      vault.updateContent(markdown);
    },
    async createNotebook() {
      console.info('[store] createNotebook');
      const name = `Notebook-${this.notebooks.length + 1}`;
      if (!isTauri) {
        const notebook: Notebook = { name, path: `/web/${name}` };
        this.notebooks.push(notebook);
        await this.selectNotebook(notebook);
        return;
      }
      const notebook = await platformApi.createNotebook(name);
      if (notebook) {
        await this.loadNotebooks(notebook.path);
      }
    },
    async createNote() {
      if (!this.activeNotebook) return;
      console.info('[store] createNote');
      const name = `Note-${this.notes.length + 1}`;
      if (!isTauri) {
        const note: Note = { name, path: `${this.activeNotebook.path}/${name}` };
        this.notes.push(note);
        await this.selectNote(note);
        return;
      }
      const note = await platformApi.createNote(this.activeNotebook.path, name);
      if (note) {
        await this.loadNotes(this.activeNotebook.path, note.path);
      }
    },
    async saveImage(file: File) {
      if (!this.activeNote) return '';
      console.info('[store] saveImage', file.name);
      if (!isTauri) {
        // Web 模式暂不支持文件写入
        return '';
      }
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const relativePath = await platformApi.saveImage(this.activeNote.path, file.name, data);
      return relativePath;
    },
    async deleteNote(note: Note) {
      console.info('[store] deleteNote', note.path);
      if (!isTauri) {
        this.notes = this.notes.filter((n) => n.path !== note.path);
        if (this.activeNote?.path === note.path) {
          this.activeNote = this.notes[0] ?? null;
          this.currentContent = this.activeNote ? createWebDemoData().content : '';
        }
        return;
      }
      await platformApi.deleteNote(note.path);
      if (this.activeNotebook) {
        await this.loadNotes(this.activeNotebook.path);
      }
    },
    async deleteNotebook(notebook: Notebook) {
      console.info('[store] deleteNotebook', notebook.path);
      if (!isTauri) {
        this.notebooks = this.notebooks.filter((n) => n.path !== notebook.path);
        if (this.activeNotebook?.path === notebook.path) {
          this.activeNotebook = this.notebooks[0] ?? null;
          this.notes = [];
          this.activeNote = null;
          this.currentContent = '';
          if (this.activeNotebook) {
            await this.selectNotebook(this.activeNotebook);
          }
        }
        return;
      }
      await platformApi.deleteNotebook(notebook.path);
      await this.loadNotebooks();
    },
    async renameNotebook(notebook: Notebook, name: string) {
      console.info('[store] renameNotebook', notebook.path, name);
      if (!name) return;
      if (!isTauri) {
        const parent = notebook.path.split('/').slice(0, -1).join('/');
        notebook.name = name;
        notebook.path = `${parent}/${name}`;
        if (this.activeNotebook?.path === notebook.path) {
          this.activeNotebook = notebook;
        }
        return;
      }
      const updated = await platformApi.renameNotebook(notebook.path, name);
      if (updated) {
        await this.loadNotebooks(updated.path);
      }
    },
    async renameNote(note: Note, name: string) {
      console.info('[store] renameNote', note.path, name);
      if (!name) return;
      if (!isTauri) {
        const parent = note.path.split('/').slice(0, -1).join('/');
        note.name = name;
        note.path = `${parent}/${name}`;
        if (this.activeNote?.path === note.path) {
          this.activeNote = note;
        }
        return;
      }
      const updated = await platformApi.renameNote(note.path, name);
      if (updated && this.activeNotebook) {
        await this.loadNotes(this.activeNotebook.path, updated.path);
      }
    },
    async revealInFinder() {
      console.info('[store] revealInFinder');
      if (!isTauri) {
        console.warn('[store] revealInFinder is only available in Tauri');
        return;
      }
      const target = this.activeNote?.path || this.activeNotebook?.path;
      try {
        await platformApi.revealInFinder(target || undefined);
      } catch (error) {
        console.error('[store] revealInFinder failed', error);
      }
    },
  },
});
