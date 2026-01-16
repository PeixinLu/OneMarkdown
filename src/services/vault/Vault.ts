import { platformApi, isTauri } from '../platformAdapter';
import { FileCache } from './FileCache';
import { toRelativeMarkdown, toDisplayMarkdown, createWebDemoData } from '../noteService';

// Vault is the single coordinator for note IO.
// It owns in-memory content, debounces disk writes, and never mutates Pinia/UI state.
export class Vault {
  private cache = new FileCache();
  private saveTimer: number | null = null;
  private readonly debounceMs: number;

  constructor(debounceMs = 500) {
    this.debounceMs = debounceMs;
  }

  async openNote(notePath: string): Promise<string> {
    this.cancel();
    if (!isTauri) {
      const demo = createWebDemoData();
      this.cache.set(notePath, demo.content);
      return demo.content;
    }
    const content = await platformApi.readNote(notePath);
    // Only on open do we transform for display.
    const display = toDisplayMarkdown(content, notePath, true);
    this.cache.set(notePath, display);
    return display;
  }

  updateContent(markdown: string) {
    // Editor is the source of truth; we only cache and schedule save.
    this.cache.update(markdown);
    if (!isTauri) return;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    const path = this.cache.getPath();
    if (!path) return;
    const storageContent = toRelativeMarkdown(markdown, path, true);
    this.saveTimer = window.setTimeout(async () => {
      try {
        await platformApi.saveNote(path, storageContent);
      } catch (error) {
        console.error('[vault] saveNote failed', error);
      } finally {
        this.saveTimer = null;
      }
    }, this.debounceMs);
  }

  async flush() {
    if (!isTauri) return;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    const path = this.cache.getPath();
    if (!path) return;
    const storageContent = toRelativeMarkdown(this.cache.getContent(), path, true);
    this.saveTimer = null;
    await platformApi.saveNote(path, storageContent);
  }

  cancel() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
}
