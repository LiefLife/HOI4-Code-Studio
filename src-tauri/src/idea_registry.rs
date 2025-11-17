use once_cell::sync::Lazy;
use rayon::prelude::*;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use std::time::SystemTime;

/// ：标记点位的来源，区分项目、游戏目录与依赖项，便于前端显示覆盖关系。
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum IdeaSource {
    Project,
    Game,
    Dependency,
}

/// ：单个idea条目，仅包含标识符与来源信息。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaEntry {
    pub id: String,
    pub source: IdeaSource,
}

/// ：命令返回值，附带加载说明与idea列表。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaLoadResponse {
    pub success: bool,
    pub message: String,
    pub ideas: Option<Vec<IdeaEntry>>,
}

/// ：缓存条目，记录idea集合及文件时间戳，便于判断缓存是否失效。
#[derive(Debug, Clone)]
struct IdeaCacheEntry {
    ideas: Vec<IdeaEntry>,
    timestamps: HashMap<String, Option<SystemTime>>,
}

/// ：全局缓存容器，key 为“项目路径||游戏路径”。
static IDEA_CACHE: Lazy<RwLock<HashMap<String, IdeaCacheEntry>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

/// ：描述单个候选文件与来源及修改时间。
#[derive(Debug, Clone)]
struct IdeaFileInfo {
    path: PathBuf,
    source: IdeaSource,
    modified: Option<SystemTime>,
}

/// ：对外暴露的清理接口，可在调试时手动失效缓存。
#[tauri::command]
pub fn reset_idea_cache() -> bool {
    if let Ok(mut cache) = IDEA_CACHE.write() {
        cache.clear();
        println!("[idea_registry] cache cleared by frontend command");
        true
    } else {
        false
    }
}

/// ：加载idea列表，必要时重新扫描文件。支持依赖项路径列表。
#[tauri::command]
pub fn load_ideas(
    project_root: Option<String>,
    game_root: Option<String>,
    dependency_roots: Option<Vec<String>>,
) -> IdeaLoadResponse {
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

    let files = match collect_file_infos(
        normalized_project.as_deref(),
        normalized_game.as_deref(),
        &normalized_deps,
    ) {
        Ok(list) => list,
        Err(err) => {
            return IdeaLoadResponse {
                success: false,
                message: format!("读取idea文件失败: {}", err),
                ideas: None,
            }
        }
    };

    if let Some(ideas) = try_use_cache(&cache_key, &files) {
        let count = ideas.len();
        // println!("[idea_registry] cache hit with {} entries", count);
        return IdeaLoadResponse {
            success: true,
            message: format!("命中缓存，共 {} 个idea", count),
            ideas: Some(ideas),
        };
    }

    match parse_ideas(&files) {
        Ok(ideas) => {
            let count = ideas.len();
            store_cache(&cache_key, &ideas, &files);
            println!("[idea_registry] parsed {} entries", count);
            IdeaLoadResponse {
                success: true,
                message: format!("重新解析完成，共 {} 个idea", count),
                ideas: Some(ideas),
            }
        }
        Err(err) => IdeaLoadResponse {
            success: false,
            message: format!("解析idea失败: {}", err),
            ideas: None,
        },
    }
}

/// 路径标准化，统一分隔符并剔除尾部分隔。
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

/// 收集项目、游戏目录与依赖项目录下的idea定义文件。
fn collect_file_infos(
    project_root: Option<&str>,
    game_root: Option<&str>,
    dependency_roots: &[String],
) -> io::Result<Vec<IdeaFileInfo>> {
    let mut files = Vec::new();
    add_files_under_root(project_root, IdeaSource::Project, &mut files)?;
    add_files_under_root(game_root, IdeaSource::Game, &mut files)?;
    // 添加所有依赖项的idea文件
    for dep_root in dependency_roots {
        add_files_under_root(Some(dep_root.as_str()), IdeaSource::Dependency, &mut files)?;
    }
    Ok(files)
}

/// 遍历某根目录下 `common/ideas` 中的所有 `.txt` 文件。
fn add_files_under_root(
    root: Option<&str>,
    source: IdeaSource,
    out: &mut Vec<IdeaFileInfo>,
) -> io::Result<()> {
    if let Some(root_dir) = root {
        let base = Path::new(root_dir).join("common/ideas");
        if base.exists() {
            let mut stack = vec![base];
            while let Some(current) = stack.pop() {
                for entry in fs::read_dir(&current)? {
                    let entry = entry?;
                    let path = entry.path();
                    if path.is_dir() {
                        stack.push(path);
                    } else if is_script_file(&path) {
                        let modified = entry.metadata().ok().and_then(|m| m.modified().ok());
                        out.push(IdeaFileInfo { path, source, modified });
                    }
                }
            }
        }
    }
    Ok(())
}

/// 判断是否为idea脚本文件。
fn is_script_file(path: &Path) -> bool {
    match path.extension().and_then(|s| s.to_str()) {
        Some(ext) => ext.eq_ignore_ascii_case("txt"),
        None => false,
    }
}

/// 尝试读取缓存，若文件时间戳均一致则返回克隆数据。
fn try_use_cache(cache_key: &str, files: &[IdeaFileInfo]) -> Option<Vec<IdeaEntry>> {
    let cache_map = IDEA_CACHE.read().ok()?;
    let cached = cache_map.get(cache_key)?;
    if !is_cache_valid(cached, files) {
        return None;
    }
    Some(cached.ideas.clone())
}

/// 校验缓存内的时间戳是否与当前文件列表一致。
fn is_cache_valid(entry: &IdeaCacheEntry, files: &[IdeaFileInfo]) -> bool {
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

/// 将最新扫描的idea列表写入缓存。
fn store_cache(cache_key: &str, ideas: &[IdeaEntry], files: &[IdeaFileInfo]) {
    if let Ok(mut cache) = IDEA_CACHE.write() {
        let mut timestamps = HashMap::new();
        for info in files {
            if let Some(path_str) = info.path.to_str() {
                timestamps.insert(path_str.to_string(), info.modified);
            }
        }
        cache.insert(
            cache_key.to_string(),
            IdeaCacheEntry {
                ideas: ideas.to_vec(),
                timestamps,
            },
        );
    }
}

/// 并行解析所有文件的idea定义。
fn parse_ideas(files: &[IdeaFileInfo]) -> io::Result<Vec<IdeaEntry>> {
    let parsed: Result<Vec<Vec<(String, IdeaSource)>>, io::Error> = files
        .par_iter()
        .map(|info| {
            let content = fs::read_to_string(&info.path)?;
            let mut local = Vec::new();
            for idea in extract_ideas(&content) {
                local.push((idea, info.source));
            }
            Ok(local)
        })
        .collect();

    let mut merged: HashMap<String, (IdeaEntry, u8)> = HashMap::new();
    for list in parsed? {
        for (id, source) in list {
            let priority = match source {
                IdeaSource::Game => 0u8,
                IdeaSource::Dependency => 1u8,
                IdeaSource::Project => 2u8,
            };
            merged
                .entry(id.clone())
                .and_modify(|entry| {
                    if priority >= entry.1 {
                        entry.0 = IdeaEntry {
                            id: id.clone(),
                            source,
                        };
                        entry.1 = priority;
                    }
                })
                .or_insert((IdeaEntry { id, source }, priority));
        }
    }

    let mut ideas: Vec<IdeaEntry> = merged.into_values().map(|(entry, _)| entry).collect();
    ideas.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(ideas)
}

/// 从单个脚本内容中提取idea标识符。
fn extract_ideas(content: &str) -> Vec<String> {
    let mut ideas = Vec::new();
    let mut chars = content.chars().peekable();
    let mut stack: Vec<Option<String>> = Vec::new();
    let mut current_ident: Option<String> = None;
    let mut in_comment = false;

    while let Some(ch) = chars.next() {
        if in_comment {
            if ch == '\n' {
                in_comment = false;
            }
            continue;
        }

        match ch {
            '#' => {
                in_comment = true;
                current_ident = None;
            }
            '{' => {
                let ident = current_ident.take();
                stack.push(ident.clone());
                if stack.len() >= 3 {
                    if let (Some(Some(ideas_key)), Some(Some(_category)), Some(Some(idea_name))) = (
                        stack.get(stack.len() - 3),
                        stack.get(stack.len() - 2),
                        stack.last(),
                    ) {
                        if ideas_key.eq_ignore_ascii_case("ideas") {
                            ideas.push(idea_name.clone());
                        }
                    }
                }
            }
            '}' => {
                current_ident = None;
                stack.pop();
            }
            '=' => {
                // 忽略，等待下一个符号以决定是否进入块
            }
            c if c.is_whitespace() => {
                // 空白直接忽略
            }
            c if is_ident_char(c) => {
                let mut ident = String::new();
                ident.push(c);
                while let Some(&next) = chars.peek() {
                    if is_ident_char(next) {
                        ident.push(next);
                        chars.next();
                    } else {
                        break;
                    }
                }
                current_ident = Some(ident);
            }
            _ => {
                current_ident = None;
            }
        }
    }

    ideas
}

/// 判断字符是否属于idea标识符。
fn is_ident_char(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || matches!(ch, '_' | '.' | '-')
}