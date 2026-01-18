#![deny(clippy::unwrap_used)]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeColors {
    pub bg: String,
    #[serde(rename = "bgSecondary")]
    pub bg_secondary: String,
    pub fg: String,
    pub comment: String,
    pub border: String,
    pub selection: String,
    pub accent: String,
    pub success: String,
    pub warning: String,
    pub error: String,
    pub keyword: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub id: String,
    pub name: String,
    pub colors: ThemeColors,
}

fn get_theme_file_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir().ok_or_else(|| "Failed to resolve config_dir".to_string())?;
    Ok(config_dir.join("HOI4_GUI_Editor").join("themes.json"))
}

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create theme dir: {}", e))?;
    }
    Ok(())
}

fn read_themes_file() -> Result<Vec<Theme>, String> {
    let path = get_theme_file_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let text = fs::read_to_string(&path).map_err(|e| format!("Failed to read themes.json: {}", e))?;
    if text.trim().is_empty() {
        return Ok(Vec::new());
    }
    serde_json::from_str(&text).map_err(|e| format!("Failed to parse themes.json: {}", e))
}

fn write_themes_file(themes: &[Theme]) -> Result<(), String> {
    let path = get_theme_file_path()?;
    ensure_parent_dir(&path)?;

    let json = serde_json::to_string_pretty(themes).map_err(|e| format!("Failed to serialize themes: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write themes.json: {}", e))?;
    Ok(())
}

fn normalize_theme(theme: &Theme) -> Result<Theme, String> {
    let mut out = theme.clone();
    out.id = out.id.trim().to_string();
    out.name = out.name.trim().to_string();

    if out.id.is_empty() {
        return Err("Theme id is empty".to_string());
    }
    if out.name.is_empty() {
        return Err("Theme name is empty".to_string());
    }

    Ok(out)
}

#[tauri::command]
pub fn list_themes() -> Result<Vec<Theme>, String> {
    read_themes_file()
}

#[tauri::command]
pub fn upsert_theme(theme: Theme) -> Result<Vec<Theme>, String> {
    let theme = normalize_theme(&theme)?;
    let mut themes = read_themes_file()?;

    if let Some(idx) = themes.iter().position(|t| t.id == theme.id) {
        themes[idx] = theme;
    } else {
        themes.push(theme);
    }

    write_themes_file(&themes)?;
    Ok(themes)
}

#[tauri::command]
pub fn delete_theme(theme_id: String) -> Result<Vec<Theme>, String> {
    let theme_id = theme_id.trim().to_string();
    if theme_id.is_empty() {
        return Err("Theme id is empty".to_string());
    }

    let mut themes = read_themes_file()?;
    themes.retain(|t| t.id != theme_id);

    write_themes_file(&themes)?;
    Ok(themes)
}
