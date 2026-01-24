#![deny(clippy::unwrap_used)]

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use crate::theme_manager::{Theme, upsert_theme};
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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginInstallHooks {
    #[serde(default)]
    pub themes: Vec<Theme>,
    #[serde(default)]
    pub settings: Option<Value>,
    #[serde(default)]
    pub shortcuts: Vec<PluginShortcut>,
    #[serde(default)]
    pub snippets: Vec<PluginSnippet>,
    #[serde(default, rename = "iconSets")]
    pub icon_sets: Vec<PluginIconSet>,
    #[serde(default, rename = "editorSettings")]
    pub editor_settings: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginShortcut {
    pub id: String,
    #[serde(default)]
    pub keys: Vec<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginSnippet {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    pub content: String,
    #[serde(default, rename = "pathIncludes")]
    pub path_includes: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginIconSetFolder {
    pub closed: String,
    pub open: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginIconSetIcons {
    pub folder: PluginIconSetFolder,
    #[serde(default)]
    pub files: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginIconSet {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub icon_type: String,
    pub icons: PluginIconSetIcons,
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
    #[serde(default)]
    pub install: PluginInstallHooks,
}

fn apply_install_hooks(about: &PluginAbout) -> Result<(), String> {
    if !about.install.themes.is_empty() {
        for theme in about.install.themes.iter().cloned() {
            let _ = upsert_theme(theme)?;
        }
    }

    if let Some(settings_patch) = about.install.settings.as_ref() {
        let mut settings = read_settings_file()?;
        merge_json(&mut settings, settings_patch);
        write_settings_file(&settings)?;
    }

    if !about.install.shortcuts.is_empty() {
        let mut settings = read_settings_file()?;
        let existing = settings
            .get("shortcuts")
            .and_then(|v| serde_json::from_value::<Vec<PluginShortcut>>(v.clone()).ok())
            .unwrap_or_default();
        let merged = merge_shortcuts(&existing, &about.install.shortcuts);
        settings["shortcuts"] = serde_json::to_value(merged)
            .map_err(|e| format!("Failed to serialize shortcuts: {}", e))?;
        write_settings_file(&settings)?;
    }

    if !about.install.snippets.is_empty() {
        let mut settings = read_settings_file()?;
        let existing = settings
            .get("snippets")
            .and_then(|v| serde_json::from_value::<Vec<PluginSnippet>>(v.clone()).ok())
            .unwrap_or_default();
        let merged = merge_snippets(&existing, &about.install.snippets);
        settings["snippets"] = serde_json::to_value(merged)
            .map_err(|e| format!("Failed to serialize snippets: {}", e))?;
        write_settings_file(&settings)?;
    }

    if !about.install.icon_sets.is_empty() {
        let mut settings = read_settings_file()?;
        let existing = settings
            .get("iconSets")
            .and_then(|v| serde_json::from_value::<Vec<PluginIconSet>>(v.clone()).ok())
            .unwrap_or_default();
        let merged = merge_icon_sets(&existing, &about.install.icon_sets);
        settings["iconSets"] = serde_json::to_value(merged)
            .map_err(|e| format!("Failed to serialize icon sets: {}", e))?;
        write_settings_file(&settings)?;
    }

    if let Some(editor_settings_patch) = about.install.editor_settings.as_ref() {
        let mut settings = read_settings_file()?;
        if let Some(existing) = settings.get_mut("editorSettings") {
            merge_json(existing, editor_settings_patch);
        } else {
            settings["editorSettings"] = editor_settings_patch.clone();
        }
        write_settings_file(&settings)?;
    }

    Ok(())
}

fn validate_install_hooks(about: &PluginAbout) -> (Vec<String>, Vec<String>) {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    if let Some(settings_patch) = about.install.settings.as_ref() {
        if !settings_patch.is_object() {
            errors.push("install.settings must be a JSON object".to_string());
        }
    }

    if !about.install.shortcuts.is_empty() {
        let mut seen = std::collections::HashSet::new();
        for shortcut in about.install.shortcuts.iter() {
            if shortcut.id.trim().is_empty() {
                errors.push("install.shortcuts: id is empty".to_string());
                continue;
            }
            if !seen.insert(shortcut.id.clone()) {
                warnings.push(format!("install.shortcuts: duplicated id '{}', later one overrides", shortcut.id));
            }
            if shortcut.keys.is_empty() {
                warnings.push(format!("install.shortcuts: '{}' has empty keys", shortcut.id));
            }
        }
    }

    if let Some(editor_settings_patch) = about.install.editor_settings.as_ref() {
        if !editor_settings_patch.is_object() {
            errors.push("install.editorSettings must be a JSON object".to_string());
        }
    }

    if !about.install.snippets.is_empty() {
        let mut seen = std::collections::HashSet::new();
        for snippet in about.install.snippets.iter() {
            if snippet.id.trim().is_empty() {
                errors.push("install.snippets: id is empty".to_string());
                continue;
            }
            if snippet.title.trim().is_empty() {
                errors.push(format!("install.snippets: '{}' title is empty", snippet.id));
            }
            if snippet.content.trim().is_empty() {
                warnings.push(format!("install.snippets: '{}' content is empty", snippet.id));
            }
            if !seen.insert(snippet.id.clone()) {
                warnings.push(format!("install.snippets: duplicated id '{}', later one overrides", snippet.id));
            }
            if let Some(paths) = snippet.path_includes.as_ref() {
                if paths.is_empty() {
                    warnings.push(format!("install.snippets: '{}' pathIncludes is empty", snippet.id));
                }
            }
        }
    }

    if !about.install.icon_sets.is_empty() {
        let mut seen = std::collections::HashSet::new();
        for icon_set in about.install.icon_sets.iter() {
            if icon_set.id.trim().is_empty() {
                errors.push("install.iconSets: id is empty".to_string());
                continue;
            }
            if icon_set.name.trim().is_empty() {
                errors.push(format!("install.iconSets: '{}' name is empty", icon_set.id));
            }
            if !seen.insert(icon_set.id.clone()) {
                warnings.push(format!("install.iconSets: duplicated id '{}', later one overrides", icon_set.id));
            }
            if icon_set.icon_type != "emoji" && icon_set.icon_type != "svg" {
                errors.push(format!("install.iconSets: '{}' type must be 'emoji' or 'svg'", icon_set.id));
            }
            if icon_set.icons.folder.closed.trim().is_empty() || icon_set.icons.folder.open.trim().is_empty() {
                errors.push(format!("install.iconSets: '{}' folder icons are empty", icon_set.id));
            }
            if !icon_set.icons.files.contains_key("default") {
                warnings.push(format!("install.iconSets: '{}' files.default is missing", icon_set.id));
            }
        }
    }

    (errors, warnings)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledPlugin {
    pub about: PluginAbout,
    pub install_path: String,
    pub entry_file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginValidateResult {
    pub ok: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub about: Option<PluginAbout>,
    pub entry_file_path: Option<String>,
}

fn get_plugins_dir() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir().ok_or_else(|| "Failed to resolve config_dir".to_string())?;
    Ok(config_dir.join("HOI4_GUI_Editor").join("plugins"))
}

fn get_settings_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir().ok_or_else(|| "Failed to resolve config_dir".to_string())?;
    Ok(config_dir.join("HOI4_GUI_Editor").join("settings.json"))
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

fn requires_entry_file(about: &PluginAbout) -> bool {
    !about.contributes.left_sidebar.is_empty() || !about.contributes.right_sidebar.is_empty()
}

fn read_settings_file() -> Result<Value, String> {
    let path = get_settings_path()?;
    if !path.exists() {
        return Ok(Value::Object(serde_json::Map::new()));
    }
    let text = fs::read_to_string(&path).map_err(|e| format!("Failed to read settings.json: {}", e))?;
    if text.trim().is_empty() {
        return Ok(Value::Object(serde_json::Map::new()));
    }
    serde_json::from_str(&text).map_err(|e| format!("Failed to parse settings.json: {}", e))
}

fn write_settings_file(settings: &Value) -> Result<(), String> {
    let path = get_settings_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write settings.json: {}", e))?;
    Ok(())
}

fn merge_json(target: &mut Value, src: &Value) {
    match (target, src) {
        (Value::Object(target_map), Value::Object(src_map)) => {
            for (k, v) in src_map {
                match target_map.get_mut(k) {
                    Some(existing) if existing.is_object() && v.is_object() => {
                        merge_json(existing, v);
                    }
                    _ => {
                        target_map.insert(k.clone(), v.clone());
                    }
                }
            }
        }
        (target_value, src_value) => {
            *target_value = src_value.clone();
        }
    }
}

fn merge_shortcuts(existing: &[PluginShortcut], incoming: &[PluginShortcut]) -> Vec<PluginShortcut> {
    let mut out: Vec<PluginShortcut> = Vec::new();
    for item in existing.iter().cloned() {
        if !item.id.trim().is_empty() {
            out.push(item);
        }
    }
    for item in incoming.iter().cloned() {
        if item.id.trim().is_empty() {
            continue;
        }
        if let Some(pos) = out.iter().position(|x| x.id == item.id) {
            out[pos] = item;
        } else {
            out.push(item);
        }
    }
    out
}

fn merge_snippets(existing: &[PluginSnippet], incoming: &[PluginSnippet]) -> Vec<PluginSnippet> {
    let mut out: Vec<PluginSnippet> = Vec::new();
    for item in existing.iter().cloned() {
        if !item.id.trim().is_empty() {
            out.push(item);
        }
    }
    for item in incoming.iter().cloned() {
        if item.id.trim().is_empty() {
            continue;
        }
        if let Some(pos) = out.iter().position(|x| x.id == item.id) {
            out[pos] = item;
        } else {
            out.push(item);
        }
    }
    out
}

fn merge_icon_sets(existing: &[PluginIconSet], incoming: &[PluginIconSet]) -> Vec<PluginIconSet> {
    let mut out: Vec<PluginIconSet> = Vec::new();
    for item in existing.iter().cloned() {
        if !item.id.trim().is_empty() {
            out.push(item);
        }
    }
    for item in incoming.iter().cloned() {
        if item.id.trim().is_empty() {
            continue;
        }
        if let Some(pos) = out.iter().position(|x| x.id == item.id) {
            out[pos] = item;
        } else {
            out.push(item);
        }
    }
    out
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

        let entry_file = if requires_entry_file(&about) {
            match resolve_entry_file(&p, &about) {
                Ok(x) => x,
                Err(_) => continue,
            }
        } else {
            PathBuf::new()
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

    let (hook_errors, _hook_warnings) = validate_install_hooks(&about);
    if !hook_errors.is_empty() {
        return Err(format!("Invalid install hooks: {}", hook_errors.join("; ")));
    }

    let entry_file = if requires_entry_file(&about) {
        resolve_entry_file(&final_dir, &about)?
    } else {
        PathBuf::new()
    };
    apply_install_hooks(&about)?;

    Ok(InstalledPlugin {
        about,
        install_path: final_dir.to_string_lossy().to_string(),
        entry_file_path: entry_file.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn validate_plugin_package(source_path: String) -> Result<PluginValidateResult, String> {
    let src = PathBuf::from(source_path);
    if !src.exists() {
        return Ok(PluginValidateResult {
            ok: false,
            errors: vec!["source_path not found".to_string()],
            ..PluginValidateResult::default()
        });
    }

    let plugins_dir = get_plugins_dir()?;
    fs::create_dir_all(&plugins_dir).map_err(|e| format!("Failed to create plugins dir: {}", e))?;

    let tmp_dir = plugins_dir.join(".tmp_validate");
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
            return Ok(PluginValidateResult {
                ok: false,
                errors: vec!["Only .zip or directory is supported".to_string()],
                ..PluginValidateResult::default()
            });
        }
        extract_zip_to_dir(&src, &tmp_dir)?;
    }

    let about = match read_about_file(&tmp_dir) {
        Ok(a) => a,
        Err(e) => {
            return Ok(PluginValidateResult {
                ok: false,
                errors: vec![e],
                ..PluginValidateResult::default()
            });
        }
    };

    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    let entry_file = if requires_entry_file(&about) {
        match resolve_entry_file(&tmp_dir, &about) {
            Ok(x) => Some(x.to_string_lossy().to_string()),
            Err(e) => {
                errors.push(e);
                None
            }
        }
    } else {
        None
    };

    let (hook_errors, hook_warnings) = validate_install_hooks(&about);
    errors.extend(hook_errors);
    warnings.extend(hook_warnings);

    let result = PluginValidateResult {
        ok: errors.is_empty(),
        errors,
        warnings,
        about: Some(about),
        entry_file_path: entry_file,
    };
    let _ = fs::remove_dir_all(&tmp_dir);
    Ok(result)
}
