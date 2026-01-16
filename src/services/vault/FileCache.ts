// FileCache keeps in-memory markdown for the current note path.
// It never writes to Pinia or UI; Vault owns this.
export class FileCache {
  private path: string | null = null;
  private content = '';

  set(path: string, markdown: string) {
    this.path = path;
    this.content = markdown;
  }

  getPath() {
    return this.path;
  }

  getContent() {
    return this.content;
  }

  update(markdown: string) {
    this.content = markdown;
  }

  clear() {
    this.path = null;
    this.content = '';
  }
}
