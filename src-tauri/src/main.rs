#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
};
use tauri::AppHandle;

#[derive(Serialize, Deserialize)]
struct Notebook {
    name: String,
    path: String,
}

#[derive(Serialize, Deserialize)]
struct Note {
    name: String,
    path: String,
}

const SAMPLE_NOTE: &str = r#"# 欢迎使用 OneMDEditor

- Notebook / Note 三栏布局
- Milkdown 所见即所得编辑
- 图片保存于笔记目录的 images/ 子目录并使用相对路径引用

```js
console.log('Hello Milkdown');
```

![示例图片](images/sample.png)
"#;

const SAMPLE_PNG: &[u8] = &[
    0x89, 0x50, 0x4e, 0x47, 0xd, 0xa, 0x1a, 0xa, 0x0, 0x0, 0x0, 0xd, 0x49, 0x48, 0x44, 0x52,
    0x0, 0x0, 0x0, 0x1, 0x0, 0x0, 0x0, 0x1, 0x8, 0x6, 0x0, 0x0, 0x0, 0x1f, 0x15, 0xc4, 0x89,
    0x0, 0x0, 0x0, 0x10, 0x49, 0x44, 0x41, 0x54, 0x78, 0xda, 0x63, 0xfc, 0xff, 0x9f, 0xa1,
    0x1e, 0x0, 0x7, 0x82, 0x2, 0x7f, 0x3f, 0x83, 0x79, 0xcf, 0x0, 0x0, 0x0, 0x0, 0x49, 0x45,
    0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
];

fn base_dir(app: &AppHandle) -> PathBuf {
    app.path_resolver()
        .app_data_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .join("notebooks")
}

fn ensure_root(app: &AppHandle) -> Result<PathBuf, String> {
    let root = base_dir(app);
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    Ok(root)
}

fn sanitize_name(name: &str) -> String {
    name.trim().replace(['/', '\\'], "_")
}

fn to_notebook(entry: &Path) -> Option<Notebook> {
    let name = entry.file_name()?.to_string_lossy().to_string();
    let path = entry.to_string_lossy().to_string();
    Some(Notebook { name, path })
}

fn to_note(entry: &Path) -> Option<Note> {
    let name = entry.file_name()?.to_string_lossy().to_string();
    let path = entry.to_string_lossy().to_string();
    Some(Note { name, path })
}

#[tauri::command]
fn ensure_demo_data(app: AppHandle) -> Result<(), String> {
    println!("[tauri] ensure_demo_data");
    let root = ensure_root(&app)?;
    let notebook_dir = root.join("Sample Notebook");
    let note_dir = notebook_dir.join("Welcome");
    fs::create_dir_all(&note_dir).map_err(|e| e.to_string())?;
    let note_path = note_dir.join("note.md");
    if !note_path.exists() {
        let mut file = File::create(&note_path).map_err(|e| e.to_string())?;
        file.write_all(SAMPLE_NOTE.as_bytes())
            .map_err(|e| e.to_string())?;
    }
    let image_dir = note_dir.join("images");
    fs::create_dir_all(&image_dir).map_err(|e| e.to_string())?;
    let image_path = image_dir.join("sample.png");
    if !image_path.exists() {
        let mut file = File::create(image_path).map_err(|e| e.to_string())?;
        file.write_all(SAMPLE_PNG).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn list_notebooks(app: AppHandle) -> Result<Vec<Notebook>, String> {
    println!("[tauri] list_notebooks");
    let root = ensure_root(&app)?;
    let mut notebooks = Vec::new();
    for entry in fs::read_dir(&root).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            if let Some(nb) = to_notebook(&entry.path()) {
                notebooks.push(nb);
            }
        }
    }
    notebooks.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(notebooks)
}

#[tauri::command]
fn list_notes(_app: AppHandle, notebook_path: String) -> Result<Vec<Note>, String> {
    println!("[tauri] list_notes for {}", notebook_path);
    let mut notes = Vec::new();
    let path = PathBuf::from(notebook_path);
    for entry in fs::read_dir(&path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            if let Some(note) = to_note(&entry.path()) {
                notes.push(note);
            }
        }
    }
    notes.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(notes)
}

#[tauri::command]
fn read_note(_app: AppHandle, note_path: String) -> Result<String, String> {
    println!("[tauri] read_note {}", note_path);
    let path = PathBuf::from(note_path).join("note.md");
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;
    Ok(content)
}

#[tauri::command]
fn save_note(_app: AppHandle, note_path: String, content: String) -> Result<(), String> {
    println!("[tauri] save_note {}", note_path);
    let path = PathBuf::from(note_path).join("note.md");
    let mut file = File::create(path).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn create_notebook(app: AppHandle, name: String) -> Result<Notebook, String> {
    println!("[tauri] create_notebook {}", name);
    let root = ensure_root(&app)?;
    let dir_name = sanitize_name(&name);
    let dir_path = root.join(dir_name);
    fs::create_dir_all(&dir_path).map_err(|e| e.to_string())?;
    Ok(to_notebook(&dir_path).unwrap())
}

#[tauri::command]
fn create_note(_app: AppHandle, notebook_path: String, name: String) -> Result<Note, String> {
    println!("[tauri] create_note {} in {}", name, notebook_path);
    let dir_name = sanitize_name(&name);
    let note_dir = PathBuf::from(notebook_path).join(dir_name);
    fs::create_dir_all(&note_dir).map_err(|e| e.to_string())?;
    let note_file = note_dir.join("note.md");
    if !note_file.exists() {
        File::create(&note_file)
            .map_err(|e| e.to_string())?
            .write_all("# 新笔记\n\n开始记录吧。".as_bytes())
            .map_err(|e| e.to_string())?;
    }
    Ok(to_note(&note_dir).unwrap())
}

#[tauri::command]
fn save_image(_app: AppHandle, note_path: String, file_name: String, data: Vec<u8>) -> Result<String, String> {
    println!("[tauri] save_image {} in {}", file_name, note_path);
    let dir = PathBuf::from(note_path).join("images");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let safe_name = Path::new(&file_name)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("image.png")
        .to_string();
    let target = dir.join(&safe_name);
    let mut file = File::create(&target).map_err(|e| e.to_string())?;
    file.write_all(&data).map_err(|e| e.to_string())?;
    // Return relative path
    let relative = format!("images/{}", safe_name);
    Ok(relative)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ensure_demo_data,
            list_notebooks,
            list_notes,
            read_note,
            save_note,
            create_notebook,
            create_note,
            save_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
