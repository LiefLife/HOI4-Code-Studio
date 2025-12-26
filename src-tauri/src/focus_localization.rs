#![deny(clippy::unwrap_used)]

use once_cell::sync::Lazy;
use rayon::prelude::*;
use regex::Regex;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use std::time::SystemTime;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FocusLocalizationLoadResponse {
    pub success: bool,
    pub message: String,
    pub map: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone)]
struct LocalizationCacheEntry {
    map: HashMap<String, String>,
    timestamps: HashMap<String, Option<SystemTime>>,
}

static LOCALIZATION_CACHE: Lazy<RwLock<HashMap<String, LocalizationCacheEntry>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

static LOC_LINE_REGEX: Lazy<Regex> = Lazy::new(|| {
    // 支持：
    //  - ID: "Text"
    //  - ID:0 "Text"
    // 说明：
    //  - key 允许 HOI4 常见字符：字母数字、_、.、-
    Regex::new(r#"^\s*([A-Za-z0-9_\.\-]+)\s*:(?:\d+)?\s*\"([^\"]*)\""#)
        .expect("failed to compile localization parser regex")
});

#[derive(Debug, Clone)]
struct LocalizationFileInfo {
    path: PathBuf,
    modified: Option<SystemTime>,
}

#[tauri::command]
pub fn load_focus_localizations(roots: Vec<String>) -> FocusLocalizationLoadResponse {
    let normalized_roots: Vec<String> = roots
        .into_iter()
        .filter_map(|r| normalize_root(Some(&r)))
        .collect();

    let cache_key = normalized_roots.join("|");

    let files = match collect_localization_files(&normalized_roots) {
        Ok(v) => v,
        Err(err) => {
            return FocusLocalizationLoadResponse {
                success: false,
                message: format!("读取本地化文件失败: {}", err),
                map: None,
            };
        }
    };

    if let Some(map) = try_use_cache(&cache_key, &files) {
        let count = map.len();
        return FocusLocalizationLoadResponse {
            success: true,
            message: format!("命中缓存，本地化 {} 条", count),
            map: Some(map),
        };
    }

    match parse_localizations(&normalized_roots, &files) {
        Ok(map) => {
            let count = map.len();
            store_cache(&cache_key, &map, &files);
            FocusLocalizationLoadResponse {
                success: true,
                message: format!("重新解析完成，本地化 {} 条", count),
                map: Some(map),
            }
        }
        Err(err) => FocusLocalizationLoadResponse {
            success: false,
            message: format!("解析本地化失败: {}", err),
            map: None,
        },
    }
}

fn normalize_root(path: Option<&str>) -> Option<String> {
    let raw = path?.trim();
    if raw.is_empty() {
        return None;
    }

    let replaced = raw.replace('\\', "/");
    let trimmed = replaced.trim_end_matches('/');
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn collect_localization_files(roots: &[String]) -> io::Result<Vec<LocalizationFileInfo>> {
    let mut out: Vec<LocalizationFileInfo> = Vec::new();
    for root in roots {
        let dir = Path::new(root)
            .join("localisation")
            .join("simp_chinese");
        add_yml_files_recursive(&dir, &mut out)?;
    }
    Ok(out)
}

fn add_yml_files_recursive(dir: &Path, out: &mut Vec<LocalizationFileInfo>) -> io::Result<()> {
    if !dir.exists() {
        return Ok(());
    }
    if !dir.is_dir() {
        return Ok(());
    }

    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        for entry in fs::read_dir(&current)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }

            if !is_yml_file(&path) {
                continue;
            }

            let modified = entry.metadata().ok().and_then(|m| m.modified().ok());
            out.push(LocalizationFileInfo { path, modified });
        }
    }

    Ok(())
}

fn is_yml_file(path: &Path) -> bool {
    match path.extension().and_then(|s| s.to_str()) {
        Some(ext) => ext.eq_ignore_ascii_case("yml"),
        None => false,
    }
}

fn try_use_cache(cache_key: &str, files: &[LocalizationFileInfo]) -> Option<HashMap<String, String>> {
    let cache_map = LOCALIZATION_CACHE.read().ok()?;
    let cached = cache_map.get(cache_key)?;

    if !is_cache_valid(cached, files) {
        return None;
    }

    Some(cached.map.clone())
}

fn is_cache_valid(entry: &LocalizationCacheEntry, files: &[LocalizationFileInfo]) -> bool {
    if entry.timestamps.len() != files.len() {
        return false;
    }

    for info in files {
        let path_str = match info.path.to_str() {
            Some(v) => v,
            None => return false,
        };

        match entry.timestamps.get(path_str) {
            Some(stored) if stored == &info.modified => continue,
            Some(_) => return false,
            None => return false,
        }
    }

    true
}

fn parse_localizations(
    normalized_roots: &[String],
    files: &[LocalizationFileInfo],
) -> io::Result<HashMap<String, String>> {
    let root_priority: HashMap<&str, usize> = normalized_roots
        .iter()
        .enumerate()
        .map(|(idx, root)| (root.as_str(), idx))
        .collect();

    // 并行读取文件并解析每个文件的键值对，附带 priority
    let parsed: Result<Vec<Vec<(String, String, usize)>>, io::Error> = files
        .par_iter()
        .map(|info| {
            let content = fs::read_to_string(&info.path)?;
            let path_str = info.path.to_string_lossy().replace('\\', "/");
            let priority = root_priority
                .iter()
                .filter_map(|(root, idx)| {
                    if path_str.starts_with(*root) {
                        Some(*idx)
                    } else {
                        None
                    }
                })
                .max()
                .unwrap_or(0);

            let mut local: Vec<(String, String, usize)> = Vec::new();
            for (k, v) in extract_localizations(&content) {
                local.push((k, v, priority));
            }
            Ok(local)
        })
        .collect();

    let mut merged: HashMap<String, (String, usize)> = HashMap::new();
    for list in parsed? {
        for (k, v, priority) in list {
            merged
                .entry(k)
                .and_modify(|entry| {
                    if priority >= entry.1 {
                        entry.0 = v.clone();
                        entry.1 = priority;
                    }
                })
                .or_insert((v, priority));
        }
    }

    let result: HashMap<String, String> = merged
        .into_iter()
        .map(|(k, (v, _p))| (k, v))
        .collect();

    Ok(result)
}

fn extract_localizations(content: &str) -> Vec<(String, String)> {
    content
        .lines()
        .filter_map(|line| {
            // yml 允许 # 注释
            let sanitized = line.split('#').next().unwrap_or("");
            LOC_LINE_REGEX.captures(sanitized).map(|caps| {
                let key = caps
                    .get(1)
                    .map(|m| m.as_str().trim().to_string())
                    .unwrap_or_default();
                let val = caps
                    .get(2)
                    .map(|m| m.as_str().to_string())
                    .unwrap_or_default();
                (key, val)
            })
        })
        .collect()
}

fn store_cache(cache_key: &str, map: &HashMap<String, String>, files: &[LocalizationFileInfo]) {
    if let Ok(mut cache) = LOCALIZATION_CACHE.write() {
        let mut timestamps = HashMap::new();
        for info in files {
            if let Some(path_str) = info.path.to_str() {
                timestamps.insert(path_str.to_string(), info.modified);
            }
        }
        cache.insert(
            cache_key.to_string(),
            LocalizationCacheEntry {
                map: map.clone(),
                timestamps,
            },
        );
    }
}
