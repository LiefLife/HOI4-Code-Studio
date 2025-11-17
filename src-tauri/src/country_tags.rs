use once_cell::sync::Lazy;
use regex::Regex;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use std::time::SystemTime;

/// ：表示标签来源（项目、游戏目录或依赖项），用于前端区分来源显示。
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TagSource {
    Project,
    Game,
    Dependency,
}

/// ：单个国家标签条目，包含标签代码、名称与来源。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagEntry {
    pub code: String,
    pub name: Option<String>,
    pub source: TagSource,
}

/// ：命令返回值，包含成功状态、消息及标签数组。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagLoadResponse {
    pub success: bool,
    pub message: String,
    pub tags: Option<Vec<TagEntry>>,
}

/// ：记录缓存内容与文件时间戳，用于检测缓存是否仍然有效。
#[derive(Debug, Clone)]
struct TagCacheEntry {
    tags: Vec<TagEntry>,
    timestamps: HashMap<String, Option<SystemTime>>,
}

/// ：缓存容器，key 为“项目路径||游戏路径”。
static TAG_CACHE: Lazy<RwLock<HashMap<String, TagCacheEntry>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

/// ：解析 `A = "B"` 的正则，允许可选空白。
static TAG_LINE_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"^\s*([A-Za-z0-9]{2,4})\s*=\s*"([^"]*)""#)
        .expect("failed to compile tag parser regex")
});

/// ：命令入口，加载项目、游戏目录与依赖项目录下的全部国家标签，并应用缓存。
#[tauri::command]
pub fn load_country_tags(
    project_root: Option<String>,
    game_root: Option<String>,
    dependency_roots: Option<Vec<String>>,
) -> TagLoadResponse {
    let normalized_project = normalize_root(project_root.as_deref());
    let normalized_game = normalize_root(game_root.as_deref());
    let normalized_deps: Vec<String> = dependency_roots
        .unwrap_or_default()
        .into_iter()
        .filter_map(|s| normalize_root(Some(&s)))
        .collect();
    
    let cache_key = format!(
        "{}||{}||{}",
        normalized_project.clone().unwrap_or_default(),
        normalized_game.clone().unwrap_or_default(),
        normalized_deps.join("|")
    );

    // ：收集所有候选文件以及其最新修改时间。
    let file_infos = match collect_file_infos(
        normalized_project.as_deref(),
        normalized_game.as_deref(),
        &normalized_deps,
    ) {
        Ok(infos) => infos,
        Err(err) => {
            return TagLoadResponse {
                success: false,
                message: format!("读取标签文件失败: {}", err),
                tags: None,
            };
        }
    };

    // ：若缓存有效则直接返回。
    if let Some(tags) = try_use_cache(&cache_key, &file_infos) {
        let count = tags.len();
        return TagLoadResponse {
            success: true,
            message: format!("命中缓存，加载 {} 个标签", count),
            tags: Some(tags),
        };
    }

    // ：缓存失效时重新解析所有文件。
    match parse_tags(&file_infos) {
        Ok(tags) => {
            store_cache(&cache_key, &tags, &file_infos);
            let count = tags.len();
            TagLoadResponse {
                success: true,
                message: format!("重新解析完成，共获取 {} 个标签", count),
                tags: Some(tags),
            }
        }
        Err(err) => TagLoadResponse {
            success: false,
            message: format!("解析标签失败: {}", err),
            tags: None,
        },
    }
}

/// ：描述单个候选文件与其来源及修改时间。
#[derive(Debug, Clone)]
struct TagFileInfo {
    path: PathBuf,
    source: TagSource,
    modified: Option<SystemTime>,
}

/// 规范化根路径，兼容空字符串以及去除多余分隔符。
fn normalize_root(path: Option<&str>) -> Option<String> {
    let raw = path?.trim();
    if raw.is_empty() {
        return None;
    }
    let replaced = raw.replace('\\', "/");
    let without_tail = replaced.trim_end_matches('/');
    if without_tail.is_empty() {
        None
    } else {
        Some(without_tail.to_string())
    }
}

/// 收集 project/game/dependency 下 `common/country_tags` 内所有 `.txt` 文件。
fn collect_file_infos(
    project_root: Option<&str>,
    game_root: Option<&str>,
    dependency_roots: &[String],
) -> io::Result<Vec<TagFileInfo>> {
    let mut files: Vec<TagFileInfo> = Vec::new();
    add_files_under_root(project_root, TagSource::Project, &mut files)?;
    add_files_under_root(game_root, TagSource::Game, &mut files)?;
    // 添加所有依赖项的标签文件
    for dep_root in dependency_roots {
        add_files_under_root(Some(dep_root.as_str()), TagSource::Dependency, &mut files)?;
    }

    // ：若所有目录均不存在，则返回空列表以免误报。
    Ok(files)
}

/// 帮助函数，向列表填充某根路径下的所有标签文件。
fn add_files_under_root(
    root: Option<&str>,
    source: TagSource,
    out: &mut Vec<TagFileInfo>,
) -> io::Result<()> {
    if let Some(root_path) = root {
        let dir = Path::new(root_path).join("common/country_tags");
        if dir.exists() {
            let mut stack = vec![dir];
            while let Some(current) = stack.pop() {
                let entries = fs::read_dir(&current)?;
                for entry in entries {
                    let entry = entry?;
                    let path = entry.path();
                    if path.is_dir() {
                        stack.push(path);
                    } else if is_script_file(&path) {
                        let modified = entry.metadata().ok().and_then(|m| m.modified().ok());
                        out.push(TagFileInfo {
                            path,
                            source,
                            modified,
                        });
                    }
                }
            }
        }
    }
    Ok(())
}

/// 判断是否为脚本文本文件（扩展名 .txt）。
fn is_script_file(path: &Path) -> bool {
    match path.extension().and_then(|s| s.to_str()) {
        Some(ext) => ext.eq_ignore_ascii_case("txt"),
        None => false,
    }
}

/// 尝试使用缓存，若缓存仍然有效则返回克隆后的标签集合。
fn try_use_cache(cache_key: &str, files: &[TagFileInfo]) -> Option<Vec<TagEntry>> {
    let cache_map = TAG_CACHE.read().ok()?;
    let cached = cache_map.get(cache_key)?;

    // ：校验文件数量与时间戳是否完全匹配。
    if !is_cache_valid(cached, files) {
        return None;
    }
    Some(cached.tags.clone())
}

/// 检测缓存记录与当前文件列表是否一致。
fn is_cache_valid(entry: &TagCacheEntry, files: &[TagFileInfo]) -> bool {
    if entry.timestamps.len() != files.len() {
        return false;
    }
    for info in files {
        let path_str = match info.path.to_str() {
            Some(v) => v,
            None => return false,
        };
        match entry.timestamps.get(path_str) {
            Some(stored) => {
                if &info.modified != stored {
                    return false;
                }
            }
            None => return false,
        }
    }
    true
}

/// 解析所有文件内容并返回去重后的标签列表。
fn parse_tags(files: &[TagFileInfo]) -> io::Result<Vec<TagEntry>> {
    let mut grouped: HashMap<String, TagEntry> = HashMap::new();

    let mut ordered_files: Vec<&TagFileInfo> = files.iter().collect();
    ordered_files.sort_by_key(|info| match info.source {
        TagSource::Game => 0,
        TagSource::Dependency => 1,
        TagSource::Project => 2,
    });

    for info in ordered_files {
        let content = match fs::read_to_string(&info.path) {
            Ok(text) => text,
            Err(err) => return Err(err),
        };
        for entry in extract_tags(&content, info.source) {
            grouped.insert(entry.code.clone(), entry);
        }
    }

    let mut tags: Vec<TagEntry> = grouped.into_values().collect();
    tags.sort_by(|a, b| a.code.cmp(&b.code));
    Ok(tags)
}

/// 从单个文件内容中提取全部标签。
fn extract_tags(content: &str, source: TagSource) -> Vec<TagEntry> {
    content
        .lines()
        .filter_map(|line| {
            let sanitized = line.split('#').next().unwrap_or("");
            TAG_LINE_REGEX.captures(sanitized).map(|caps| {
                let code = caps
                    .get(1)
                    .map(|m| m.as_str().trim().to_uppercase())
                    .unwrap_or_default();
                let name = caps.get(2).map(|m| m.as_str().trim().to_string());
                TagEntry {
                    code,
                    name,
                    source,
                }
            })
        })
        .collect()
}

/// 写入缓存，确保出现异常时不会破坏原缓存。
fn store_cache(key: &str, tags: &[TagEntry], files: &[TagFileInfo]) {
    if let Ok(mut cache) = TAG_CACHE.write() {
        let mut timestamps = HashMap::new();
        for info in files {
            if let Some(path_str) = info.path.to_str() {
                timestamps.insert(path_str.to_string(), info.modified);
            }
        }
        cache.insert(
            key.to_string(),
            TagCacheEntry {
                tags: tags.to_vec(),
                timestamps,
            },
        );
    }
}
