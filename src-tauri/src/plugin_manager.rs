#![deny(clippy::unwrap_used)]

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginPermissions {
    #[serde(default)]
    pub commands: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginPanelContribution {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginToolbarContribution {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub open: Option<PluginToolbarOpenTarget>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginToolbarOpenTarget {
    pub side: String,
    pub panel: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginContributes {
    #[serde(default)]
    pub left_sidebar: Vec<PluginPanelContribution>,
    #[serde(default)]
    pub right_sidebar: Vec<PluginPanelContribution>,
    #[serde(default)]
    pub toolbar: Vec<PluginToolbarContribution>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginAbout {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub main: Option<String>,
    #[serde(default)]
    pub contributes: PluginContributes,
    #[serde(default)]
    pub permissions: PluginPermissions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledPlugin {
    pub about: PluginAbout,
    pub install_path: String,
    pub entry_file_path: String,
}

fn get_plugins_dir() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir().ok_or_else(|| "Failed to resolve config_dir".to_string())?;
    Ok(config_dir.join("HOI4_GUI_Editor").join("plugins"))
}

fn read_about_file(plugin_root: &Path) -> Result<PluginAbout, String> {
    let about_path = plugin_root.join("About.hoics");
    if !about_path.exists() {
        return Err("Missing About.hoics in plugin root".to_string());
    }

    let content = fs::read_to_string(&about_path)
        .map_err(|e| format!("Failed to read About.hoics: {}", e))?;

    let mut about: PluginAbout = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse About.hoics (json): {}", e))?;

    about.id = about.id.trim().to_string();
    about.name = about.name.trim().to_string();
    about.version = about.version.trim().to_string();

    if about.id.is_empty() {
        return Err("About.hoics: id is empty".to_string());
    }
    if about.name.is_empty() {
        return Err("About.hoics: name is empty".to_string());
    }
    if about.version.is_empty() {
        return Err("About.hoics: version is empty".to_string());
    }

    Ok(about)
}

fn sanitize_rel_path(p: &Path) -> Result<PathBuf, String> {
    let mut out = PathBuf::new();
    for comp in p.components() {
        match comp {
            Component::Normal(s) => out.push(s),
            Component::CurDir => {}
            _ => {
                return Err(format!("Invalid path component in zip entry: {}", p.display()));
            }
        }
    }
    Ok(out)
}

fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    if !src.exists() {
        return Err(format!("Source path not found: {}", src.display()));
    }

    fs::create_dir_all(dst).map_err(|e| format!("Failed to create dir: {} ({})", dst.display(), e))?;

    for entry in WalkDir::new(src)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let p = entry.path();
        let rel = p.strip_prefix(src).map_err(|e| e.to_string())?;
        if rel.as_os_str().is_empty() {
            continue;
        }

        let target = dst.join(rel);
        if entry.file_type().is_dir() {
            fs::create_dir_all(&target)
                .map_err(|e| format!("Failed to create dir: {} ({})", target.display(), e))?;
        } else if entry.file_type().is_file() {
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create dir: {} ({})", parent.display(), e))?;
            }
            fs::copy(p, &target)
                .map_err(|e| format!("Failed to copy file: {} -> {} ({})", p.display(), target.display(), e))?;
        }
    }

    Ok(())
}

fn extract_zip_to_dir(zip_path: &Path, dst: &Path) -> Result<(), String> {
    let f = fs::File::open(zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;
    let mut archive = zip::ZipArchive::new(f).map_err(|e| format!("Failed to read zip: {}", e))?;

    fs::create_dir_all(dst).map_err(|e| format!("Failed to create dir: {} ({})", dst.display(), e))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read zip entry: {}", e))?;

        let raw_name = file.name().to_string();
        let raw_path = Path::new(&raw_name);
        let rel = sanitize_rel_path(raw_path)?;
        if rel.as_os_str().is_empty() {
            continue;
        }

        let out_path = dst.join(rel);

        if file.is_dir() {
            fs::create_dir_all(&out_path)
                .map_err(|e| format!("Failed to create dir: {} ({})", out_path.display(), e))?;
            continue;
        }

        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create dir: {} ({})", parent.display(), e))?;
        }

        let mut out_file = fs::File::create(&out_path)
            .map_err(|e| format!("Failed to create file: {} ({})", out_path.display(), e))?;

        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .map_err(|e| format!("Failed to read zip entry data: {}", e))?;

        out_file
            .write_all(&buffer)
            .map_err(|e| format!("Failed to write file: {} ({})", out_path.display(), e))?;
    }

    Ok(())
}

fn resolve_entry_file(plugin_root: &Path, about: &PluginAbout) -> Result<PathBuf, String> {
    let rel = about
        .main
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "ui/index.html".to_string());

    let rel_path = sanitize_rel_path(Path::new(&rel))?;
    let entry = plugin_root.join(rel_path);
    if !entry.exists() {
        return Err(format!("Entry file not found: {}", entry.display()));
    }

    Ok(entry)
}

fn load_installed_plugins_impl() -> Result<Vec<InstalledPlugin>, String> {
    let plugins_dir = get_plugins_dir()?;
    if !plugins_dir.exists() {
        return Ok(Vec::new());
    }

    let mut out: Vec<InstalledPlugin> = Vec::new();
    for entry in fs::read_dir(&plugins_dir).map_err(|e| format!("Failed to read plugins dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read plugins dir entry: {}", e))?;
        let p = entry.path();
        if !p.is_dir() {
            continue;
        }

        let about = match read_about_file(&p) {
            Ok(a) => a,
            Err(_) => continue,
        };

        let entry_file = match resolve_entry_file(&p, &about) {
            Ok(x) => x,
            Err(_) => continue,
        };

        out.push(InstalledPlugin {
            about,
            install_path: p.to_string_lossy().to_string(),
            entry_file_path: entry_file.to_string_lossy().to_string(),
        });
    }

    out.sort_by(|a, b| a.about.id.cmp(&b.about.id));
    Ok(out)
}

#[tauri::command]
pub fn list_installed_plugins() -> Result<Vec<InstalledPlugin>, String> {
    load_installed_plugins_impl()
}

#[tauri::command]
pub fn uninstall_plugin(plugin_id: String) -> Result<(), String> {
    let plugin_id = plugin_id.trim().to_string();
    if plugin_id.is_empty() {
        return Err("plugin_id is empty".to_string());
    }

    let plugins_dir = get_plugins_dir()?;
    let target = plugins_dir.join(&plugin_id);
    if !target.exists() {
        return Err("plugin not installed".to_string());
    }

    fs::remove_dir_all(&target).map_err(|e| format!("Failed to remove plugin dir: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn install_plugin(source_path: String) -> Result<InstalledPlugin, String> {
    let src = PathBuf::from(source_path);
    if !src.exists() {
        return Err("source_path not found".to_string());
    }

    let plugins_dir = get_plugins_dir()?;
    fs::create_dir_all(&plugins_dir).map_err(|e| format!("Failed to create plugins dir: {}", e))?;

    let tmp_dir = plugins_dir.join(".tmp_install");
    if tmp_dir.exists() {
        fs::remove_dir_all(&tmp_dir).map_err(|e| format!("Failed to cleanup tmp dir: {}", e))?;
    }
    fs::create_dir_all(&tmp_dir).map_err(|e| format!("Failed to create tmp dir: {}", e))?;

    if src.is_dir() {
        copy_dir_all(&src, &tmp_dir)?;
    } else {
        let ext = src
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        if ext != "zip" {
            return Err("Only .zip or directory is supported".to_string());
        }
        extract_zip_to_dir(&src, &tmp_dir)?;
    }

    let about = read_about_file(&tmp_dir)?;
    let plugin_id = about.id.clone();

    let final_dir = plugins_dir.join(&plugin_id);
    if final_dir.exists() {
        fs::remove_dir_all(&final_dir).map_err(|e| format!("Failed to remove existing plugin: {}", e))?;
    }

    fs::rename(&tmp_dir, &final_dir).map_err(|e| {
        format!(
            "Failed to move plugin into install dir: {} -> {} ({})",
            tmp_dir.display(),
            final_dir.display(),
            e
        )
    })?;

    let entry_file = resolve_entry_file(&final_dir, &about)?;

    Ok(InstalledPlugin {
        about,
        install_path: final_dir.to_string_lossy().to_string(),
        entry_file_path: entry_file.to_string_lossy().to_string(),
    })
}
