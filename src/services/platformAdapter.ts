import { invoke } from '@tauri-apps/api/tauri';

export interface Notebook {
  name: string;
  path: string;
}

export interface Note {
  name: string;
  path: string;
}

export const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_IPC__);

export const platformApi = {
  async ensureDemoData() {
    if (!isTauri) return;
    await invoke('ensure_demo_data');
  },
  async listNotebooks(): Promise<Notebook[]> {
    if (!isTauri) return [];
    return invoke('list_notebooks');
  },
  async listNotes(notebookPath: string): Promise<Note[]> {
    if (!isTauri) return [];
    return invoke('list_notes', { notebookPath });
  },
  async readNote(notePath: string): Promise<string> {
    if (!isTauri) return '';
    return invoke('read_note', { notePath });
  },
  async saveNote(notePath: string, content: string) {
    if (!isTauri) return;
    await invoke('save_note', { notePath, content });
  },
  async createNotebook(name: string): Promise<Notebook | null> {
    if (!isTauri) return null;
    return invoke('create_notebook', { name });
  },
  async createNote(notebookPath: string, name: string): Promise<Note | null> {
    if (!isTauri) return null;
    return invoke('create_note', { notebookPath, name });
  },
  async saveImage(notePath: string, fileName: string, data: Uint8Array | number[]) {
    if (!isTauri) return '';
    return invoke<string>('save_image', {
      notePath,
      fileName,
      data: Array.from(data),
    });
  },
  async deleteNote(notePath: string) {
    if (!isTauri) return;
    await invoke('delete_note', { notePath });
  },
  async deleteNotebook(notebookPath: string) {
    if (!isTauri) return;
    await invoke('delete_notebook', { notebookPath });
  },
  async renameNotebook(notebookPath: string, name: string): Promise<Notebook | null> {
    if (!isTauri) return null;
    return invoke('rename_notebook', { notebookPath, name });
  },
  async renameNote(notePath: string, name: string): Promise<Note | null> {
    if (!isTauri) return null;
    return invoke('rename_note', { notePath, name });
  },
  async revealInFinder(targetPath?: string) {
    if (!isTauri) return;
    await invoke('reveal_in_finder', targetPath ? { target_path: targetPath } : {});
  },
};
