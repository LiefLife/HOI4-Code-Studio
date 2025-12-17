// 禁止使用 unwrap()，避免 panic
#![deny(clippy::unwrap_used)]

// serde 序列化/反序列化
use serde::{Deserialize, Serialize};
// base64 编码解码
use base64::{Engine};
// 多线程支持
use rayon::prelude::*;
use std::sync::{Arc, Mutex};

// 本地模块
mod json_decoder;
mod file_tree;
mod bracket_matcher;
mod country_tags;
mod idea_registry;
mod tag_validator;
mod dependency;

use json_decoder::{
    get_json_path,
    merge_json,
    parse_json,
    read_json_file,
    set_json_path,
    stringify_json,
    validate_json,
    write_json_file,
    JsonResult,
};

use file_tree::{
    build_file_tree,
    build_file_tree_parallel,
    FileTreeResult,
};

use bracket_matcher::{
    find_bracket_matches,
    find_matching_bracket,
    get_bracket_depth_map,
    BracketMatchResult,
};

use tag_validator::validate_tags;
use idea_registry::{load_ideas, reset_idea_cache};

// 创建项目的返回结果结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectResult {
    success: bool,
    message: String,
    project_path: Option<String>,
}

#[tauri::command]
fn get_recent_project_stats(paths: Vec<String>) -> RecentProjectStatsResult {
    use std::fs;
    use std::path::Path;
    use walkdir::WalkDir;

    let mut stats = Vec::with_capacity(paths.len());

    for path in paths {
        let project_path = Path::new(&path);

        let mut file_count: u64 = 0;
        let mut total_size: u64 = 0;

        if project_path.exists() && project_path.is_dir() {
            for entry in WalkDir::new(project_path).follow_links(false).into_iter() {
                let entry = match entry {
                    Ok(e) => e,
                    Err(_) => continue,
                };

                if !entry.file_type().is_file() {
                    continue;
                }

                file_count = file_count.saturating_add(1);
                if let Ok(meta) = entry.metadata() {
                    total_size = total_size.saturating_add(meta.len());
                }
            }
        }

        let version = project_path
            .join("project.json")
            .to_str()
            .and_then(|p| fs::read_to_string(p).ok())
            .and_then(|content| serde_json::from_str::<serde_json::Value>(&content).ok())
            .and_then(|v| v.get("version").and_then(|vv| vv.as_str()).map(|s| s.to_string()));

        stats.push(ProjectStats {
            path,
            file_count,
            total_size,
            version,
        });
    }

    RecentProjectStatsResult {
        success: true,
        stats,
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenProjectResult {
    success: bool,
    message: String,
    project_data: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentProject {
    name: String,
    path: String,
    last_opened: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentProjectsResult {
    success: bool,
    projects: Vec<RecentProject>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectStats {
    path: String,
    file_count: u64,
    total_size: u64,
    version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentProjectStatsResult {
    success: bool,
    stats: Vec<ProjectStats>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileDialogResult {
    success: bool,
    path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LaunchGameResult {
    success: bool,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PackageResult {
    success: bool,
    message: String,
    output_path: Option<String>,
    file_size: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageOptions {
    pub project_path: String,
    pub output_name: String,
    pub exclude_dependencies: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageReadResult {
    success: bool,
    message: Option<String>,
    base64: Option<String>,
    mime_type: Option<String>,
}

// ==================== Tauri 命令 ====================

/// 创建新项目
#[tauri::command]
fn create_new_project(
    project_name: String,
    version: String,
    project_path: String,
    replace_path: Vec<String>,
) -> CreateProjectResult {
    use std::fs;
    use std::path::Path;

    println!(
        "创建新项目: {} v{} 于 {}",
        project_name, version, project_path
    );
    println!("Replace Path 目录: {:?}", replace_path);

    if project_name.is_empty() {
        return CreateProjectResult {
            success: false,
            message: "项目名称不能为空".to_string(),
            project_path: None,
        };
    }

    let full_path = Path::new(&project_path).join(&project_name);

    if full_path.exists() {
        return CreateProjectResult {
            success: false,
            message: "项目目录已存在".to_string(),
            project_path: None,
        };
    }

    if let Err(e) = fs::create_dir_all(&full_path) {
        return CreateProjectResult {
            success: false,
            message: format!("创建目录失败: {}", e),
            project_path: None,
        };
    }

    let subdirs = vec!["interface", "gfx", "localisation"];

    for subdir in subdirs {
        let subdir_path = full_path.join(subdir);

        if let Err(e) = fs::create_dir_all(&subdir_path) {
            return CreateProjectResult {
                success: false,
                message: format!("创建子目录 {} 失败: {}", subdir, e),
                project_path: None,
            };
        }
    }

    for dir in &replace_path {
        let replace_path_dir = full_path.join(dir);

        if let Err(e) = fs::create_dir_all(&replace_path_dir) {
            return CreateProjectResult {
                success: false,
                message: format!("创建 replace_path 目录 {} 失败: {}", dir, e),
                project_path: None,
            };
        }
    }

    let config = serde_json::json!({
        "name": project_name,
        "version": version,
        "replace_path": replace_path,
        "created_at": chrono::Utc::now().to_rfc3339(),
    });

    let config_path = full_path.join("project.json");
    let config_str = match serde_json::to_string_pretty(&config) {
        Ok(s) => s,
        Err(e) => {
            return CreateProjectResult {
                success: false,
                message: format!("序列化配置失败: {}", e),
                project_path: None,
            };
        }
    };

    if let Err(e) = fs::write(&config_path, config_str) {
        return CreateProjectResult {
            success: false,
            message: format!("创建配置文件失败: {}", e),
            project_path: None,
        };
    }

    let replace_path_str = if !replace_path.is_empty() {
        replace_path
            .iter()
            .map(|s| format!("replace_path=\"{}\"", s))
            .collect::<Vec<_>>()
            .join("\n")
            + "\n"
    } else {
        String::new()
    };

    let descriptor_content = format!(
        r#"version="{}"
tags={{
    "Graphics"
}}
name="{}"
{}supported_version="1.14.*"
"#,
        version, project_name, replace_path_str
    );

    let descriptor_path = full_path.join("descriptor.mod");

    if let Err(e) = fs::write(&descriptor_path, descriptor_content) {
        return CreateProjectResult {
            success: false,
            message: format!("创建 descriptor.mod 失败: {}", e),
            project_path: None,
        };
    }

    CreateProjectResult {
        success: true,
        message: format!("项目 '{}' 创建成功", project_name),
        project_path: Some(full_path.to_string_lossy().to_string()),
    }
}

/// 初始化项目（为非HOICS项目创建配置文件）
#[tauri::command]
fn initialize_project(project_path: String) -> OpenProjectResult {
    use std::fs;
    use std::path::Path;

    println!("初始化项目: {}", project_path);

    // 验证项目路径是否存在
    let project_dir = Path::new(&project_path);
    if !project_dir.exists() || !project_dir.is_dir() {
        return OpenProjectResult {
            success: false,
            message: "项目目录不存在".to_string(),
            project_data: None,
        };
    }

    // 检查是否已经存在配置文件
    let config_path = project_dir.join("project.json");
    if config_path.exists() {
        return OpenProjectResult {
            success: false,
            message: "项目已存在配置文件".to_string(),
            project_data: None,
        };
    }

    // 读取descriptor.mod文件
    let descriptor_path = project_dir.join("descriptor.mod");
    let mod_name = if descriptor_path.exists() {
        match fs::read_to_string(&descriptor_path) {
            Ok(content) => {
                // 解析name属性
                if let Some(name_match) = content.lines()
                    .find(|line| line.trim().starts_with("name="))
                    .and_then(|line| {
                        let line = line.trim();
                        if line.starts_with("name=\"") && line.ends_with('\"') && line.len() > 7 {
                            Some(line[6..line.len()-1].to_string())
                        } else {
                            None
                        }
                    }) {
                    name_match
                } else {
                    "Unknown Mod".to_string()
                }
            }
            Err(_) => "Unknown Mod".to_string(),
        }
    } else {
        "Unknown Mod".to_string()
    };

    // 创建项目配置
    let mut config = serde_json::json!({
        "name": mod_name,
        "version": "1.0.0",
        "created_at": chrono::Utc::now().to_rfc3339(),
    });

    // 添加项目路径到配置
    if let Some(obj) = config.as_object_mut() {
        obj.insert("path".to_string(), serde_json::json!(project_path.clone()));
    }

    // // 扫描项目文件
    // let files = scan_project_files(&project_path);
    // if let Some(obj) = config.as_object_mut() {
    //     obj.insert("files".to_string(), serde_json::json!(files));
    // }

    // 保存配置文件
    let config_str = match serde_json::to_string_pretty(&config) {
        Ok(s) => s,
        Err(e) => {
            return OpenProjectResult {
                success: false,
                message: format!("序列化配置失败: {}", e),
                project_data: None,
            };
        }
    };

    if let Err(e) = fs::write(&config_path, config_str) {
        return OpenProjectResult {
            success: false,
            message: format!("创建配置文件失败: {}", e),
            project_data: None,
        };
    }

    // 更新最近项目列表
    if let Err(e) = update_recent_projects(&project_path, &mod_name) {
        println!("更新最近项目失败: {}", e);
    }

    OpenProjectResult {
        success: true,
        message: format!("项目 '{}' 初始化成功", mod_name),
        project_data: Some(config),
    }
}

/// 打开现有项目
#[tauri::command]
fn open_project(project_path: String) -> OpenProjectResult {
    use std::fs;
    use std::path::Path;

    println!("打开项目: {}", project_path);

    // 验证项目路径是否存在
    let project_dir = Path::new(&project_path);
    if !project_dir.exists() || !project_dir.is_dir() {
        return OpenProjectResult {
            success: false,
            message: "项目目录不存在".to_string(),
            project_data: None,
        };
    }

    // 读取项目配置文件
    let config_path = project_dir.join("project.json");
    if !config_path.exists() {
        return OpenProjectResult {
            success: false,
            message: "检测到此文件夹不是HOI4 Code Studio项目，是否要将其初始化为项目？".to_string(),
            project_data: None,
        };
    }

    // 解析配置文件
    let config_content = match fs::read_to_string(&config_path) {
        Ok(content) => content,
        Err(e) => {
            return OpenProjectResult {
                success: false,
                message: format!("读取配置文件失败: {}", e),
                project_data: None,
            };
        }
    };

    let mut config: serde_json::Value = match serde_json::from_str(&config_content) {
        Ok(cfg) => cfg,
        Err(e) => {
            return OpenProjectResult {
                success: false,
                message: format!("解析配置文件失败: {}", e),
                project_data: None,
            };
        }
    };

    // 添加项目路径到配置
    if let Some(obj) = config.as_object_mut() {
        obj.insert("path".to_string(), serde_json::json!(project_path.clone()));
    }

    // 扫描项目文件
    let files = scan_project_files(&project_path);
    if let Some(obj) = config.as_object_mut() {
        obj.insert("files".to_string(), serde_json::json!(files));
    }

    // 更新最近项目列表
    if let Err(e) = update_recent_projects(&project_path, config.get("name").and_then(|v| v.as_str()).unwrap_or("未命名项目")) {
        println!("更新最近项目失败: {}", e);
    }

    OpenProjectResult {
        success: true,
        message: "项目打开成功".to_string(),
        project_data: Some(config),
    }
}

/// 获取最近打开的项目列表
#[tauri::command]
fn get_recent_projects() -> RecentProjectsResult {
    use std::fs;

    println!("获取最近项目列表");

    // 获取最近项目文件路径
    let recent_path = get_recent_projects_path();

    // 如果文件不存在，返回空列表
    if !recent_path.exists() {
        return RecentProjectsResult {
            success: true,
            projects: vec![],
        };
    }

    // 读取并解析文件
    match fs::read_to_string(&recent_path) {
        Ok(content) => {
            match serde_json::from_str::<Vec<RecentProject>>(&content) {
                Ok(mut projects) => {
                    // 按最后打开时间排序（最新的在前）
                    projects.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
                    
                    // 只保留前 10 个
                    projects.truncate(10);
                    
                    RecentProjectsResult {
                        success: true,
                        projects,
                    }
                }
                Err(e) => {
                    println!("解析最近项目文件失败: {}", e);
                    RecentProjectsResult {
                        success: true,
                        projects: vec![],
                    }
                }
            }
        }
        Err(e) => {
            println!("读取最近项目文件失败: {}", e);
            RecentProjectsResult {
                success: true,
                projects: vec![],
            }
        }
    }
}

/// 打开文件选择对话框
#[tauri::command]
async fn open_file_dialog(mode: String) -> FileDialogResult {
    println!("打开文件对话框: {}", mode);

    match mode.as_str() {
        "directory" => {
            let folder = rfd::AsyncFileDialog::new()
                .set_title("选择文件夹")
                .pick_folder()
                .await;

            match folder {
                Some(handle) => {
                    let path = handle.path().to_string_lossy().to_string();
                    println!("选择的文件夹: {}", path);
                    FileDialogResult {
                        success: true,
                        path: Some(path),
                    }
                }
                None => {
                    println!("用户取消了选择");
                    FileDialogResult {
                        success: false,
                        path: None,
                    }
                }
            }
        }
        "file" => {
            let file = rfd::AsyncFileDialog::new()
                .set_title("选择文件")
                .pick_file()
                .await;

            match file {
                Some(handle) => {
                    let path = handle.path().to_string_lossy().to_string();
                    println!("选择的文件: {}", path);
                    FileDialogResult {
                        success: true,
                        path: Some(path),
                    }
                }
                None => {
                    println!("用户取消了选择");
                    FileDialogResult {
                        success: false,
                        path: None,
                    }
                }
            }
        }
        _ => {
            println!("无效的 mode: {}", mode);
            FileDialogResult {
                success: false,
                path: None,
            }
        }
    }
}


/// 加载设置
#[tauri::command]
fn load_settings() -> JsonResult {
    use std::fs;

    let config_path = get_config_path();

    if !config_path.exists() {
        return JsonResult {
            success: true,
            message: "使用默认设置".to_string(),
            data: Some(serde_json::json!({
                "gameDirectory": "",
                "autoSave": true,
                "showGrid": false,
                "syntaxHighlight": true,
            })),
        };
    }

    match fs::read_to_string(&config_path) {
        Ok(content) => {
            match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(settings) => JsonResult {
                    success: true,
                    message: "设置加载成功".to_string(),
                    data: Some(settings),
                },
                Err(e) => JsonResult {
                    success: false,
                    message: format!("解析设置失败: {}", e),
                    data: None,
                },
            }
        }
        Err(e) => JsonResult {
            success: false,
            message: format!("读取设置失败: {}", e),
            data: None,
        },
    }
}

/// 保存设置
#[tauri::command]
fn save_settings(settings: serde_json::Value) -> JsonResult {
    use std::fs;

    let config_path = get_config_path();

    if let Some(parent) = config_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return JsonResult {
                success: false,
                message: format!("创建配置目录失败: {}", e),
                data: None,
            };
        }
    }

    match serde_json::to_string_pretty(&settings) {
        Ok(content) => {
            match fs::write(&config_path, content) {
                Ok(_) => JsonResult {
                    success: true,
                    message: "设置保存成功".to_string(),
                    data: None,
                },
                Err(e) => JsonResult {
                    success: false,
                    message: format!("写入设置失败: {}", e),
                    data: None,
                },
            }
        }
        Err(e) => JsonResult {
            success: false,
            message: format!("序列化设置失败: {}", e),
            data: None,
        },
    }
}

/// 验证游戏目录
#[tauri::command]
fn validate_game_directory(path: String) -> serde_json::Value {
    use std::path::Path;

    let game_path = Path::new(&path);

    if !game_path.exists() || !game_path.is_dir() {
        return serde_json::json!({
            "valid": false,
            "message": "目录不存在"
        });
    }

    let required_dirs = vec!["common", "history", "events", "interface"];

    let mut found_count = 0;

    for dir in required_dirs {
        if game_path.join(dir).exists() {
            found_count += 1;
        }
    }

    if found_count >= 2 {
        serde_json::json!({
            "valid": true,
            "message": "有效的 HOI4 游戏目录"
        })
    } else {
        serde_json::json!({
            "valid": false,
            "message": "不是有效的 HOI4 游戏目录"
        })
    }
}

/// 启动游戏
#[tauri::command]
fn launch_game() -> LaunchGameResult {
    use std::process::Command;
    use std::path::Path;

    // 加载设置
    let settings_result = load_settings();
    if !settings_result.success {
        return LaunchGameResult {
            success: false,
            message: "无法加载设置".to_string(),
        };
    }

    let settings = match settings_result.data {
        Some(data) => data,
        None => {
            return LaunchGameResult {
                success: false,
                message: "设置数据为空".to_string(),
            };
        }
    };

    // 获取启动选项
    let use_steam = settings.get("useSteamVersion")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let use_pirate = settings.get("usePirateVersion")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let launch_with_debug = settings.get("launchWithDebug")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    // Steam 版本启动
    if use_steam {
        let steam_url = if launch_with_debug {
            "steam://rungameid/394360//--debug"
        } else {
            "steam://rungameid/394360"
        };
        
        #[cfg(target_os = "windows")]
        {
            match Command::new("cmd")
                .args(&["/C", "start", steam_url])
                .spawn()
            {
                Ok(_) => {
                    return LaunchGameResult {
                        success: true,
                        message: if launch_with_debug {
                            "正在通过 Steam 启动游戏（调试模式）...".to_string()
                        } else {
                            "正在通过 Steam 启动游戏...".to_string()
                        },
                    };
                }
                Err(e) => {
                    return LaunchGameResult {
                        success: false,
                        message: format!("启动 Steam 失败: {}", e),
                    };
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            match Command::new("xdg-open")
                .arg(steam_url)
                .spawn()
            {
                Ok(_) => {
                    return LaunchGameResult {
                        success: true,
                        message: if launch_with_debug {
                            "正在通过 Steam 启动游戏（调试模式）...".to_string()
                        } else {
                            "正在通过 Steam 启动游戏...".to_string()
                        },
                    };
                }
                Err(e) => {
                    return LaunchGameResult {
                        success: false,
                        message: format!("启动 Steam 失败: {}", e),
                    };
                }
            }
        }
    }

    // 学习版版本启动
    if use_pirate {
        let game_path = settings.get("gameDirectory")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if game_path.is_empty() {
            return LaunchGameResult {
                success: false,
                message: "未设置游戏目录，请在设置中配置 HOI4 游戏目录".to_string(),
            };
        }

        // 获取用户选择的启动程序
        let pirate_executable = settings.get("pirateExecutable")
            .and_then(|v| v.as_str())
            .unwrap_or("dowser");
        
        let exe_name = format!("{}.exe", pirate_executable);

        #[cfg(target_os = "windows")]
        {
            let game_exe = Path::new(game_path).join(&exe_name);

            if !game_exe.exists() {
                return LaunchGameResult {
                    success: false,
                    message: format!("找不到游戏文件: {}，请确认游戏目录包含 {} 文件", game_exe.display(), exe_name),
                };
            }

            // 构建启动参数
            let mut args = Vec::new();
            if launch_with_debug {
                args.push("--debug");
            }

            let mut cmd = Command::new(&game_exe);
            cmd.current_dir(game_path);
            if !args.is_empty() {
                cmd.args(&args);
            }

            match cmd.spawn()
            {
                Ok(_) => {
                    return LaunchGameResult {
                        success: true,
                        message: if launch_with_debug {
                            "正在启动游戏（调试模式）...".to_string()
                        } else {
                            "正在启动游戏...".to_string()
                        },
                    };
                }
                Err(e) => {
                    return LaunchGameResult {
                        success: false,
                        message: format!("启动游戏失败: {}", e),
                    };
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            return LaunchGameResult {
                success: false,
                message: "学习版启动仅支持 Windows 平台".to_string(),
            };
        }
    }

    // 如果两个都未启用
    LaunchGameResult {
        success: false,
        message: "未启用任何游戏启动方式，请在设置中配置".to_string(),
    }
}

/// 获取配置文件路径
fn get_config_path() -> std::path::PathBuf {
    let config_dir = dirs::config_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    config_dir.join("HOI4_GUI_Editor").join("settings.json")
}

/// 获取最近项目文件路径
fn get_recent_projects_path() -> std::path::PathBuf {
    // 使用与 settings.json 相同的目录
    let config_path = get_config_path();
    config_path.parent()
        .map(|p| p.join("recent_projects.json"))
        .unwrap_or_else(|| {
            let config_dir = dirs::config_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
            config_dir.join("HOI4_GUI_Editor").join("recent_projects.json")
        })
}

/// 获取缓存目录路径
fn get_cache_dir() -> std::path::PathBuf {
    // 获取配置目录
    let config_path = get_config_path();
    // 缓存目录位于配置目录的temp子目录
    let cache_dir = config_path.parent()
        .map(|p| p.join("temp").join("focus-icon-cache"))
        .unwrap_or_else(|| {
            let config_dir = dirs::config_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
            config_dir.join("HOI4_GUI_Editor").join("temp").join("focus-icon-cache")
        });
    
    // 确保缓存目录存在
    if let Err(e) = std::fs::create_dir_all(&cache_dir) {
        println!("创建缓存目录失败: {}", e);
    }
    
    cache_dir
}

/// 计算字符串的哈希值，用于缓存文件名
fn hash_string(s: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

/// 获取图标缓存路径
fn get_icon_cache_path(icon_name: &str) -> std::path::PathBuf {
    let cache_dir = get_cache_dir();
    let hash = hash_string(icon_name);
    cache_dir.join(format!("{}.png", hash))
}

/// 读取图标缓存的内部实现
fn read_icon_cache_impl(icon_name: String) -> serde_json::Value {
    let cache_path = get_icon_cache_path(&icon_name);
    
    if cache_path.exists() {
        match std::fs::read(&cache_path) {
            Ok(data) => {
                let base64 = base64::engine::general_purpose::STANDARD.encode(&data);
                serde_json::json!({
                    "success": true,
                    "base64": base64,
                    "mime_type": "image/png"
                })
            },
            Err(e) => {
                serde_json::json!(
                    {
                        "success": false,
                        "message": format!("读取缓存失败: {}", e)
                    }
                )
            }
        }
    } else {
        serde_json::json!({
            "success": false,
            "message": "缓存不存在"
        })
    }
}

/// 读取图标缓存 Tauri 命令
#[tauri::command]
fn read_icon_cache(icon_name: String) -> serde_json::Value {
    read_icon_cache_impl(icon_name)
}

/// 写入图标缓存的内部实现
fn write_icon_cache_impl(icon_name: String, base64: String, mime_type: String) -> serde_json::Value {
    // 只处理png格式
    if mime_type != "image/png" {
        return serde_json::json!(
            {
                "success": false,
                "message": "只支持png格式的图标缓存"
            }
        );
    }
    
    let cache_path = get_icon_cache_path(&icon_name);
    
    // 解码base64
    match base64::engine::general_purpose::STANDARD.decode(&base64) {
        Ok(data) => {
            match std::fs::write(&cache_path, data) {
                Ok(_) => {
                    serde_json::json!(
                        {
                            "success": true,
                            "message": "缓存写入成功"
                        }
                    )
                },
                Err(e) => {
                    serde_json::json!(
                        {
                            "success": false,
                            "message": format!("写入缓存失败: {}", e)
                        }
                    )
                }
            }
        },
        Err(e) => {
            serde_json::json!(
                {
                    "success": false,
                    "message": format!("base64解码失败: {}", e)
                }
            )
        }
    }
}

/// 写入图标缓存 Tauri 命令
#[tauri::command]
fn write_icon_cache(icon_name: String, base64: String, mime_type: String) -> serde_json::Value {
    write_icon_cache_impl(icon_name, base64, mime_type)
}

/// 清理图标缓存的内部实现
fn clear_icon_cache_impl() -> serde_json::Value {
    let cache_dir = get_cache_dir();
    
    if cache_dir.exists() {
        match std::fs::remove_dir_all(&cache_dir) {
            Ok(_) => {
                // 重新创建缓存目录
                if let Err(e) = std::fs::create_dir_all(&cache_dir) {
                    println!("重新创建缓存目录失败: {}", e);
                }
                serde_json::json!(
                    {
                        "success": true,
                        "message": "缓存清理成功"
                    }
                )
            },
            Err(e) => {
                serde_json::json!(
                    {
                        "success": false,
                        "message": format!("清理缓存失败: {}", e)
                    }
                )
            }
        }
    } else {
        serde_json::json!(
            {
                "success": true,
                "message": "缓存目录不存在，无需清理"
            }
        )
    }
}

/// 清理图标缓存 Tauri 命令
#[tauri::command]
fn clear_icon_cache() -> serde_json::Value {
    clear_icon_cache_impl()
}

/// 更新最近项目列表
fn update_recent_projects(project_path: &str, project_name: &str) -> Result<(), String> {
    use std::fs;

    let recent_path = get_recent_projects_path();

    // 确保目录存在
    if let Some(parent) = recent_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return Err(format!("创建配置目录失败: {}", e));
        }
    }

    // 读取现有列表
    let mut projects: Vec<RecentProject> = if recent_path.exists() {
        match fs::read_to_string(&recent_path) {
            Ok(content) => {
                serde_json::from_str(&content).unwrap_or_else(|_| vec![])
            }
            Err(_) => vec![],
        }
    } else {
        vec![]
    };

    // 移除已存在的相同路径
    projects.retain(|p| p.path != project_path);

    // 添加新项目到列表开头
    projects.insert(0, RecentProject {
        name: project_name.to_string(),
        path: project_path.to_string(),
        last_opened: chrono::Utc::now().to_rfc3339(),
    });

    // 只保留最近 10 个
    projects.truncate(10);

    // 保存到文件
    let content = match serde_json::to_string_pretty(&projects) {
        Ok(s) => s,
        Err(e) => return Err(format!("序列化失败: {}", e)),
    };

    match fs::write(&recent_path, content) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("写入文件失败: {}", e)),
    }
}

/// 扫描项目文件
fn scan_project_files(project_path: &str) -> Vec<serde_json::Value> {
    use std::fs;
    use std::path::Path;

    let mut files = Vec::new();
    let project_dir = Path::new(project_path);

    // 扫描项目目录
    if let Ok(entries) = fs::read_dir(project_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                let file_name = entry.file_name().to_string_lossy().to_string();
                
                // 跳过隐藏文件和特定文件
                if file_name.starts_with('.') || file_name == "node_modules" {
                    continue;
                }

                files.push(serde_json::json!({
                    "name": file_name,
                    "path": entry.path().to_string_lossy().to_string(),
                    "is_directory": metadata.is_dir(),
                }));
            }
        }
    }

    // 按名称排序，目录在前
    files.sort_by(|a, b| {
        let a_is_dir = a.get("is_directory").and_then(|v| v.as_bool()).unwrap_or(false);
        let b_is_dir = b.get("is_directory").and_then(|v| v.as_bool()).unwrap_or(false);
        
        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => {
                let a_name = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let b_name = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
                a_name.cmp(b_name)
            }
        }
    });

    files
}

/// 读取目录内容
#[tauri::command]
fn read_directory(dir_path: String) -> serde_json::Value {
    use std::fs;
    use std::path::Path;

    println!("读取目录: {}", dir_path);

    let dir = Path::new(&dir_path);
    
    // 验证路径
    if !dir.exists() || !dir.is_dir() {
        return serde_json::json!({
            "success": false,
            "message": "目录不存在",
            "files": []
        });
    }

    let mut files = Vec::new();

    // 扫描目录
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                let file_name = entry.file_name().to_string_lossy().to_string();
                
                // 跳过隐藏文件和特定文件
                if file_name.starts_with('.') || file_name == "node_modules" {
                    continue;
                }

                files.push(serde_json::json!({
                    "name": file_name,
                    "path": entry.path().to_string_lossy().to_string(),
                    "is_directory": metadata.is_dir(),
                }));
            }
        }
    }

    // 按名称排序，目录在前
    files.sort_by(|a, b| {
        let a_is_dir = a.get("is_directory").and_then(|v| v.as_bool()).unwrap_or(false);
        let b_is_dir = b.get("is_directory").and_then(|v| v.as_bool()).unwrap_or(false);
        
        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => {
                let a_name = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let b_name = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
                a_name.cmp(b_name)
            }
        }
    });

    serde_json::json!({
        "success": true,
        "message": "读取成功",
        "files": files
    })
}

/// Tauri 命令：读取文件内容（支持多种编码）
/// 参数:
/// - file_path: 文件路径
/// 返回: JSON 对象，包含 success, message, content 字段
#[tauri::command]
fn read_file_content(file_path: String) -> serde_json::Value {
    use std::fs;
    use std::path::Path;

    println!("读取文件: {}", file_path);

    let path = Path::new(&file_path);

    if !path.exists() {
        return serde_json::json!({
            "success": false,
            "message": "文件不存在"
        });
    }

    // 检查是否为图片文件
    if let Some(ext) = path.extension() {
        let ext_str = ext.to_string_lossy().to_lowercase();
        if matches!(ext_str.as_str(), "png" | "jpg" | "jpeg" | "gif" | "bmp" | "webp" | "svg" | "dds" | "tga") {
            return serde_json::json!({
                "success": false,
                "message": "图片文件无法预览",
                "is_image": true
            });
        }
    }

    // 读取文件字节
    let bytes = match fs::read(&file_path) {
        Ok(b) => b,
        Err(e) => return serde_json::json!({
            "success": false,
            "message": format!("读取文件失败: {}", e)
        })
    };

    // 1. 尝试UTF-8
    if let Ok(content) = String::from_utf8(bytes.clone()) {
        return serde_json::json!({
            "success": true,
            "message": "读取成功 (UTF-8)",
            "content": content,
            "encoding": "UTF-8"
        });
    }

    // 2. 使用chardetng检测编码
    let mut detector = chardetng::EncodingDetector::new();
    detector.feed(&bytes, true);
    let detected_encoding = detector.guess(None, true);
    
    println!("检测到编码: {}", detected_encoding.name());

    // 3. 尝试使用检测到的编码解码
    let (decoded, encoding_used, had_errors) = detected_encoding.decode(&bytes);
    
    if !had_errors {
        return serde_json::json!({
            "success": true,
            "message": format!("读取成功 ({})", encoding_used.name()),
            "content": decoded.to_string(),
            "encoding": encoding_used.name()
        });
    }

    // 4. 如果仍然有错误，尝试常见编码
    let encodings_to_try = [
        encoding_rs::GBK,      // 简体中文
        encoding_rs::BIG5,     // 繁体中文
        encoding_rs::SHIFT_JIS, // 日文
        encoding_rs::EUC_KR,   // 韩文
        encoding_rs::WINDOWS_1252, // 西欧
    ];

    for encoding in encodings_to_try {
        let (decoded, _, had_errors) = encoding.decode(&bytes);
        if !had_errors {
            return serde_json::json!({
                "success": true,
                "message": format!("读取成功 ({})", encoding.name()),
                "content": decoded.to_string(),
                "encoding": encoding.name()
            });
        }
    }

    // 5. 最后使用lossy转换
    let content = String::from_utf8_lossy(&bytes).to_string();
    serde_json::json!({
        "success": true,
        "message": "读取成功（使用UTF-8 Lossy转换，部分字符可能显示为�）",
        "content": content,
        "encoding": "UTF-8 (Lossy)",
        "is_binary": true
    })
}

/// 写入文件内容
/// 参数:
/// - file_path: 文件路径
/// - content: 文件内容
/// 返回: JSON 对象，包含 success, message 字段
#[tauri::command]
fn write_file_content(file_path: String, content: String) -> serde_json::Value {
    use std::fs;
    use std::path::Path;

    println!("写入文件: {}", file_path);

    let path = Path::new(&file_path);
    
    // 写入文件
    match fs::write(path, content) {
        Ok(_) => serde_json::json!({
            "success": true,
            "message": "保存成功"
        }),
        Err(e) => serde_json::json!({
            "success": false,
            "message": format!("保存文件失败: {}", e)
        })
    }
}

/// 退出应用程序
#[tauri::command]
fn exit_application() {
    println!("退出应用程序");
    std::process::exit(0);
}

/// 打开设置页面（由前端处理跳转）
#[tauri::command]
fn open_settings() -> serde_json::Value {
    println!("打开设置");
    serde_json::json!({
        "success": true,
        "message": "设置页面"
    })
}

/// 打开文件夹
#[tauri::command]
fn open_folder(path: String) -> serde_json::Value {
    use std::process::Command;

    println!("打开文件夹: {}", path);

    // 根据操作系统使用不同的命令
    #[cfg(target_os = "windows")]
    let result = Command::new("explorer").arg(&path).spawn();

    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(&path).spawn();

    #[cfg(target_os = "linux")]
    let result = Command::new("xdg-open").arg(&path).spawn();

    match result {
        Ok(_) => serde_json::json!({
            "success": true,
            "message": "已打开文件夹"
        }),
        Err(e) => serde_json::json!({
            "success": false,
            "message": format!("打开文件夹失败: {}", e)
        }),
    }
}

/// 创建新文件
#[tauri::command]
fn create_file(file_path: String, content: String, use_bom: bool) -> serde_json::Value {
    use std::fs;
    use std::path::Path;

    println!("创建文件: {}, 使用BOM: {}", file_path, use_bom);

    let path = Path::new(&file_path);

    // 检查文件是否已存在
    if path.exists() {
        return serde_json::json!({
            "success": false,
            "message": "文件已存在"
        });
    }

    // 确保父目录存在
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            if let Err(e) = fs::create_dir_all(parent) {
                return serde_json::json!({
                    "success": false,
                    "message": format!("创建目录失败: {}", e)
                });
            }
        }
    }

    // 准备文件内容
    let file_content = if use_bom {
        // UTF-8 BOM: EF BB BF
        let mut bom_content = vec![0xEF, 0xBB, 0xBF];
        bom_content.extend_from_slice(content.as_bytes());
        bom_content
    } else {
        content.as_bytes().to_vec()
    };

    // 写入文件
    match fs::write(&file_path, file_content) {
        Ok(_) => serde_json::json!({
            "success": true,
            "message": "文件创建成功",
            "path": file_path
        }),
        Err(e) => serde_json::json!({
            "success": false,
            "message": format!("创建文件失败: {}", e)
        }),
    }
}

/// 创建新文件夹
/// 
/// # 参数
/// * `folder_path` - 要创建的文件夹路径
/// 
/// # 返回值
/// 返回包含操作结果的 JSON 对象
#[tauri::command]
fn create_folder(folder_path: String) -> serde_json::Value {
    // 引入文件系统操作模块
    use std::fs;
    // 引入路径处理模块
    use std::path::Path;

    // 打印日志：显示正在创建的文件夹路径
    println!("创建文件夹: {}", folder_path);

    // 将字符串路径转换为 Path 对象
    let path = Path::new(&folder_path);

    // 检查文件夹是否已存在
    if path.exists() {
        // 如果文件夹已存在，返回失败结果
        return serde_json::json!({
            "success": false,
            "message": "文件夹已存在"
        });
    }

    // 创建文件夹（包括所有必要的父目录）
    match fs::create_dir_all(&folder_path) {
        // 创建成功
        Ok(_) => serde_json::json!({
            "success": true,
            "message": "文件夹创建成功",
            "path": folder_path
        }),
        // 创建失败，返回错误信息
        Err(e) => serde_json::json!({
            "success": false,
            "message": format!("创建文件夹失败: {}", e)
        }),
    }
}


/// 重命名文件或文件夹
#[tauri::command]
fn rename_path(old_path: String, new_path: String) -> serde_json::Value {
    use std::fs;
    use std::path::Path;

    println!("重命名: {} -> {}", old_path, new_path);

    let old = Path::new(&old_path);
    let new = Path::new(&new_path);

    if !old.exists() {
        return serde_json::json!({
            "success": false,
            "message": "源文件不存在"
        });
    }

    if new.exists() {
        return serde_json::json!({
            "success": false,
            "message": "目标路径已存在"
        });
    }

    match fs::rename(old, new) {
        Ok(_) => serde_json::json!({
            "success": true,
            "message": "重命名成功"
        }),
        Err(e) => serde_json::json!({
            "success": false,
            "message": format!("重命名失败: {}", e)
        })
    }
}

/// 删除文件或文件夹
#[tauri::command]
fn delete_path(target_path: String) -> serde_json::Value {
    use std::fs;
    use std::path::Path;

    println!("删除路径: {}", target_path);

    let path = Path::new(&target_path);

    if !path.exists() {
        return serde_json::json!({
            "success": false,
            "message": "目标路径不存在"
        });
    }

    if path.is_file() {
        match fs::remove_file(path) {
            Ok(_) => serde_json::json!({
                "success": true,
                "message": "文件删除成功"
            }),
            Err(e) => serde_json::json!({
                "success": false,
                "message": format!("删除文件失败: {}", e)
            }),
        }
    } else {
        match fs::remove_dir_all(path) {
            Ok(_) => serde_json::json!({
                "success": true,
                "message": "文件夹删除成功"
            }),
            Err(e) => serde_json::json!({
                "success": false,
                "message": format!("删除文件夹失败: {}", e)
            }),
        }
    }
}

// ==================== 搜索功能 ====================

/// 搜索结果结构体
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    /// 文件路径
    file_path: String,
    /// 文件名
    file_name: String,
    /// 行号（从1开始）
    line: usize,
    /// 匹配的内容
    content: String,
    /// 匹配开始位置
    match_start: usize,
    /// 匹配结束位置
    match_end: usize,
}

/// 搜索文件内容（多线程）
/// 
/// # 参数
/// * `directory_path` - 要搜索的目录路径
/// * `query` - 搜索关键词
/// * `case_sensitive` - 是否区分大小写
/// * `use_regex` - 是否使用正则表达式
/// 
/// # 返回
/// 返回搜索结果的JSON对象
#[tauri::command]
fn search_files(
    directory_path: String,
    query: String,
    case_sensitive: bool,
    use_regex: bool,
    include_all_files: bool,
) -> serde_json::Value {
    use std::fs;
    use std::path::Path;
    use regex::Regex;

    println!("搜索目录: {}, 关键词: {}", directory_path, query);

    // 验证目录是否存在
    let dir_path = Path::new(&directory_path);
    if !dir_path.exists() || !dir_path.is_dir() {
        return serde_json::json!({
            "success": false,
            "message": "目录不存在",
            "results": []
        });
    }

    // 递归收集所有文件，支持文件类型过滤
    fn collect_files(dir: &Path, files: &mut Vec<std::path::PathBuf>, include_all_files: bool) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    // 检查文件类型
                    if include_all_files {
                        files.push(path);
                    } else {
                        // 默认只搜索 .txt, .gfx, .mod 文件
                        if let Some(ext) = path.extension() {
                            let ext_str = ext.to_string_lossy().to_lowercase();
                            if ext_str == "txt" || ext_str == "gfx" || ext_str == "mod" {
                                files.push(path);
                            }
                        }
                    }
                } else if path.is_dir() {
                    collect_files(&path, files, include_all_files);
                }
            }
        }
    }

    let mut all_files = Vec::new();
    collect_files(dir_path, &mut all_files, include_all_files);

    println!("找到 {} 个文件", all_files.len());

    // 使用Arc和Mutex来安全地共享结果
    let results = Arc::new(Mutex::new(Vec::new()));
    
    // 编译正则表达式（如果使用）
    let regex_pattern = if use_regex {
        if case_sensitive {
            Regex::new(&query).ok()
        } else {
            Regex::new(&format!("(?i){}", query)).ok()
        }
    } else {
        None
    };

    // 使用rayon进行并行搜索
    all_files.par_iter().for_each(|file_path| {
        // 读取文件内容
        if let Ok(content) = fs::read_to_string(file_path) {
            let lines: Vec<&str> = content.lines().collect();
            
            for (line_index, line) in lines.iter().enumerate() {
                let mut found = false;
                let mut match_start = 0;
                let mut match_end = 0;

                if let Some(ref regex) = regex_pattern {
                    // 使用正则表达式搜索
                    if let Some(mat) = regex.find(line) {
                        found = true;
                        match_start = mat.start();
                        match_end = mat.end();
                    }
                } else {
                    // 普通文本搜索
                    let search_line = if case_sensitive {
                        line.to_string()
                    } else {
                        line.to_lowercase()
                    };
                    
                    let search_query = if case_sensitive {
                        query.clone()
                    } else {
                        query.to_lowercase()
                    };

                    if let Some(pos) = search_line.find(&search_query) {
                        found = true;
                        match_start = pos;
                        match_end = pos + query.len();
                    }
                }

                if found {
                    let result = SearchResult {
                        file_path: file_path.to_string_lossy().to_string(),
                        file_name: file_path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string(),
                        line: line_index + 1,
                        content: line.to_string(),
                        match_start,
                        match_end,
                    };

                    // 安全地添加结果
                    if let Ok(mut results_lock) = results.lock() {
                        results_lock.push(result);
                    }
                }
            }
        }
    });

    // 提取结果
    let final_results = match results.lock() {
        Ok(results_lock) => results_lock.clone(),
        Err(_) => Vec::new(),
    };

    println!("搜索完成，找到 {} 个匹配项", final_results.len());

    serde_json::json!({
        "success": true,
        "message": format!("找到 {} 个匹配项", final_results.len()),
        "results": final_results
    })
}

// ==================== 文件树构建命令 ====================

/// Tauri命令：构建文件树（单线程版本）
/// 
/// # 参数
/// * `path` - 目录路径
/// * `max_depth` - 最大递归深度（0表示无限制）
#[tauri::command]
fn build_directory_tree(path: String, max_depth: usize) -> FileTreeResult {
    println!("构建文件树: {}, 最大深度: {}", path, max_depth);
    build_file_tree(&path, max_depth)
}

/// Tauri命令：构建文件树（多线程版本）
/// 
/// # 参数
/// * `path` - 目录路径
/// * `max_depth` - 最大递归深度
#[tauri::command]
fn build_directory_tree_fast(path: String, max_depth: usize) -> FileTreeResult {
    // println!("快速构建文件树（多线程）: {}, 最大深度: {}", path, max_depth);
    build_file_tree_parallel(&path, max_depth)
}

// ==================== 括号匹配命令 ====================

/// Tauri命令：查找所有括号匹配
/// 
/// # 参数
/// * `content` - 文本内容
#[tauri::command]
fn match_brackets(content: String) -> BracketMatchResult {
    find_bracket_matches(&content)
}

/// Tauri命令：查找光标位置的匹配括号
/// 
/// # 参数
/// * `content` - 文本内容
/// * `cursor_pos` - 光标位置
#[tauri::command]
fn find_bracket_pair(content: String, cursor_pos: usize) -> Option<usize> {
    find_matching_bracket(&content, cursor_pos)
}

/// Tauri命令：获取括号深度映射
/// 
/// # 参数
/// * `content` - 文本内容
#[tauri::command]
fn get_bracket_depths(content: String) -> Vec<usize> {
    get_bracket_depth_map(&content)
}

// ==================== 项目打包命令 ====================
/// 打包项目到 ZIP 文件的内部实现
/// 
/// # 参数
/// * `project_path` - 项目路径
/// * `output_name` - 输出文件名（如 project.zip）
/// * `exclude_dependencies` - 是否排除依赖项
fn package_project_impl(opts: PackageOptions) -> PackageResult {
    use std::fs::{self, File};
    use std::io::Write;
    use std::path::{Path, PathBuf};
    use walkdir::WalkDir;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    println!("开始打包项目: {}", opts.project_path);
    println!("输出文件名: {}", opts.output_name);

    let project_path_obj = Path::new(&opts.project_path);
    if !project_path_obj.exists() {
        return PackageResult {
            success: false,
            message: "项目路径不存在".to_string(),
            output_path: None,
            file_size: None,
        };
    }

    // 创建 package 目录
    let package_dir = project_path_obj.join("package");
    if let Err(e) = fs::create_dir_all(&package_dir) {
        return PackageResult {
            success: false,
            message: format!("创建 package 目录失败: {}", e),
            output_path: None,
            file_size: None,
        };
    }

    // 输出文件路径
    let output_path = package_dir.join(&opts.output_name);
    
    // 如果文件已存在，尝试删除
    if output_path.exists() {
        if let Err(e) = fs::remove_file(&output_path) {
            return PackageResult {
                success: false,
                message: format!("无法覆盖已存在的文件: {}", e),
                output_path: None,
                file_size: None,
            };
        }
    }

    // 创建 ZIP 文件
    let file = match File::create(&output_path) {
        Ok(f) => f,
        Err(e) => {
            return PackageResult {
                success: false,
                message: format!("创建 ZIP 文件失败: {}", e),
                output_path: None,
                file_size: None,
            };
        }
    };

    let mut zip = ZipWriter::new(file);
    let file_options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .compression_level(Some(6));

    // 定义要排除的目录和文件
    let exclude_dirs = vec![
        "node_modules",
        "target",
        ".git",
        ".idea",
        ".vscode",
        ".windsurf",
        "package",
    ];

    // 读取 dependencies.json 获取依赖项路径（如果需要排除）
    let dependency_paths: Vec<PathBuf> = if opts.exclude_dependencies {
        let deps_file = project_path_obj.join("dependencies.json");
        if deps_file.exists() {
            match fs::read_to_string(&deps_file) {
                Ok(content) => {
                    if let Ok(deps) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(arr) = deps.as_array() {
                            arr.iter()
                                .filter_map(|dep| {
                                    dep.get("path")
                                        .and_then(|p| p.as_str())
                                        .map(|s| PathBuf::from(s))
                                })
                                .collect()
                        } else {
                            Vec::new()
                        }
                    } else {
                        Vec::new()
                    }
                }
                Err(_) => Vec::new(),
            }
        } else {
            Vec::new()
        }
    } else {
        Vec::new()
    };

    // 遍历项目文件夹
    let mut file_count = 0;
    for entry in WalkDir::new(project_path_obj)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            let path = e.path();
            let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            
            // 排除指定目录
            if e.file_type().is_dir() && exclude_dirs.contains(&file_name) {
                return false;
            }

            // 排除依赖项路径（如果依赖项在项目内部）
            for dep_path in &dependency_paths {
                if path.starts_with(dep_path) {
                    return false;
                }
            }

            true
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();
        
        // 跳过项目根目录本身
        if path == project_path_obj {
            continue;
        }

        // 跳过目录，只打包文件
        if !path.is_file() {
            continue;
        }

        // 计算相对路径
        let relative_path = match path.strip_prefix(project_path_obj) {
            Ok(p) => p,
            Err(_) => continue,
        };

        // 转换为字符串路径（使用 / 作为分隔符）
        let zip_path = relative_path
            .to_str()
            .unwrap_or("")
            .replace("\\", "/");

        // 读取文件内容
        let file_content = match fs::read(path) {
            Ok(content) => content,
            Err(e) => {
                println!("警告: 无法读取文件 {}: {}", path.display(), e);
                continue;
            }
        };

        // 添加到 ZIP
        if let Err(e) = zip.start_file(&zip_path, file_options) {
            println!("警告: 无法添加文件到 ZIP {}: {}", zip_path, e);
            continue;
        }

        if let Err(e) = zip.write_all(&file_content) {
            println!("警告: 无法写入文件内容 {}: {}", zip_path, e);
            continue;
        }

        file_count += 1;
    }

    // 完成 ZIP 文件
    if let Err(e) = zip.finish() {
        return PackageResult {
            success: false,
            message: format!("完成 ZIP 文件失败: {}", e),
            output_path: None,
            file_size: None,
        };
    }

    // 获取文件大小
    let file_size = fs::metadata(&output_path)
        .ok()
        .map(|m| m.len());

    println!("打包完成: {} 个文件", file_count);

    PackageResult {
        success: true,
        message: format!("打包成功！已打包 {} 个文件", file_count),
        output_path: Some(output_path.to_string_lossy().to_string()),
        file_size,
    }
}

/// 打包项目 Tauri 命令
#[tauri::command]
fn pack_project(opts: PackageOptions) -> PackageResult {
    package_project_impl(opts)
}

/// 从 project.json 中读取已启用依赖的路径
fn get_dependency_paths_from_project(project_root: &str) -> Vec<String> {
    use std::fs;
    use std::path::Path;

    let mut result = Vec::new();
    let project_json_path = Path::new(project_root).join("project.json");
    if !project_json_path.exists() {
        return result;
    }

    let content = match fs::read_to_string(&project_json_path) {
        Ok(c) => c,
        Err(e) => {
            println!("读取 project.json 失败: {}", e);
            return result;
        }
    };

    let json: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(e) => {
            println!("解析 project.json 失败: {}", e);
            return result;
        }
    };

    if let Some(deps) = json.get("dependencies").and_then(|v| v.as_array()) {
        for dep in deps {
            let enabled = dep
                .get("enabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            if !enabled {
                continue;
            }
            if let Some(path) = dep.get("path").and_then(|v| v.as_str()) {
                result.push(path.to_string());
            }
        }
    }

    result
}

/// 在 .gfx 文件内容中查找指定图标的纹理文件路径
fn find_texture_for_icon_in_gfx(content: &str, icon_name: &str) -> Option<String> {
    let mut in_block = false;
    let mut block_lines: Vec<String> = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        if !in_block {
            // 支持 SpriteType 和 spriteType 两种写法
            if trimmed.starts_with("SpriteType") || trimmed.starts_with("spriteType") {
                in_block = true;
                block_lines.clear();
                block_lines.push(line.to_string());
            }
            continue;
        }

        block_lines.push(line.to_string());

        if trimmed.starts_with('}') {
            let mut name_value: Option<String> = None;
            let mut texture_value: Option<String> = None;

            for bline in &block_lines {
                let t = bline.trim();

                if name_value.is_none() && t.starts_with("name") {
                    if let Some(eq_pos) = t.find('=') {
                        let value_str = t[eq_pos + 1..].trim();
                        let cleaned = value_str
                            .trim_matches('"')
                            .trim_matches('\'')
                            .to_string();
                        name_value = Some(cleaned);
                    }
                } else if texture_value.is_none() && t.starts_with("texturefile") {
                    if let Some(eq_pos) = t.find('=') {
                        let value_str = t[eq_pos + 1..].trim();
                        let cleaned = value_str
                            .trim_matches('"')
                            .trim_matches('\'')
                            .to_string();
                        texture_value = Some(cleaned);
                    }
                }
            }

            if let Some(name) = name_value {
                if name == icon_name {
                    if let Some(texture) = texture_value {
                        return Some(texture);
                    }
                }
            }

            in_block = false;
            block_lines.clear();
        }
    }

    None
}

/// 根据 icon 名称加载国策图标的内部实现
///
/// 会在项目、依赖和游戏目录中的 `gfx/interface/goals/*.gfx` 中查找 SpriteType 定义，
/// 然后解析对应的 DDS/TGA/PNG 等图片并返回 base64。
fn load_focus_icon_impl(
    icon_name: String,
    project_root: Option<String>,
    game_root: Option<String>,
) -> ImageReadResult {
    use std::fs;
    use std::path::PathBuf;

    let icon_name_trimmed = icon_name.trim().to_string();
    
    if icon_name_trimmed.is_empty() {
        return ImageReadResult {
            success: false,
            message: Some("图标名称为空".to_string()),
            base64: None,
            mime_type: None,
        };
    }

    let mut roots: Vec<PathBuf> = Vec::new();

    if let Some(root) = project_root.as_ref() {
        if !root.is_empty() {
            let root_path = PathBuf::from(&root);
            roots.push(root_path.clone());

            let dep_paths = get_dependency_paths_from_project(&root);
            for dep in dep_paths {
                if !dep.is_empty() {
                    roots.push(PathBuf::from(dep));
                }
            }
        }
    }

    if let Some(root) = game_root.as_ref() {
        if !root.is_empty() {
            roots.push(PathBuf::from(root));
        }
    }

    if roots.is_empty() {
        return ImageReadResult {
            success: false,
            message: Some("未提供有效的项目或游戏目录".to_string()),
            base64: None,
            mime_type: None,
        };
    }

    for root in roots.iter() {
        let interface_dir = root.join("interface");
        
        if !interface_dir.exists() || !interface_dir.is_dir() {
            continue;
        }

        let entries = match fs::read_dir(&interface_dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let ext = path
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            if ext != "gfx" {
                continue;
            }

            let content = match fs::read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            if let Some(texture_rel) =
                find_texture_for_icon_in_gfx(&content, &icon_name_trimmed)
            {
                let normalized_rel = texture_rel.replace('\\', "/");
                let texture_path = root.join(normalized_rel);
                let texture_path_str = texture_path.to_string_lossy().to_string();
                return read_image_as_base64(texture_path_str);
            }
        }
    }
    
    ImageReadResult {
        success: false,
        message: Some(format!(
            "未在 gfx/interface/goals/*.gfx 中找到图标定义: {}",
            icon_name_trimmed
        )),
        base64: None,
        mime_type: None,
    }
}

/// 加载国策图标 Tauri 命令
#[tauri::command]
fn load_focus_icon(
    icon_name: String,
    project_root: Option<String>,
    game_root: Option<String>,
) -> ImageReadResult {
    load_focus_icon_impl(icon_name, project_root, game_root)
}

/// 读取图片文件为 base64
/// 
/// # 参数
/// * `file_path` - 图片文件路径
#[tauri::command]
fn read_image_as_base64(file_path: String) -> ImageReadResult {
    use std::fs;
    use std::io::Cursor;
    use image::ImageFormat;
    
    println!("读取图片为 base64: {}", file_path);
    
    // 检查文件是否存在
    if !std::path::Path::new(&file_path).exists() {
        return ImageReadResult {
            success: false,
            message: Some("文件不存在".to_string()),
            base64: None,
            mime_type: None,
        };
    }
    
    // 获取文件扩展名
    let ext = std::path::Path::new(&file_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    // 对于 DDS 文件，使用 image_dds 库处理
    if ext.as_str() == "dds" {
        println!("转换 DDS 图片为 PNG: {}", file_path);
        
        match fs::read(&file_path) {
            Ok(dds_data) => {
                // 先解析 DDS 文件
                match image_dds::ddsfile::Dds::read(&mut Cursor::new(&dds_data)) {
                    Ok(dds) => {
                        // 使用 image_dds 解码 DDS 文件，尝试获取第一个 mipmap
                        match image_dds::image_from_dds(&dds, 0) {
                            Ok(img) => {
                                let mut buffer = Cursor::new(Vec::new());
                                
                                // 转换为 PNG
                                match img.write_to(&mut buffer, ImageFormat::Png) {
                                    Ok(_) => {
                                        use base64::{Engine as _, engine::general_purpose};
                                        let base64_string = general_purpose::STANDARD.encode(buffer.get_ref());
                                        
                                        return ImageReadResult {
                                            success: true,
                                            message: None,
                                            base64: Some(base64_string),
                                            mime_type: Some("image/png".to_string()),
                                        };
                                    },
                                    Err(e) => {
                                        println!("转换 DDS 为 PNG 失败: {}", e);
                                    }
                                }
                            },
                            Err(e) => {
                                println!("无法从 DDS 创建图片: {}", e);
                            }
                        }
                    },
                    Err(e) => {
                        println!("无法解析 DDS 文件: {}", e);
                    }
                }
            },
            Err(e) => {
                println!("无法读取 DDS 文件: {}", e);
            }
        }
    }
    
    // 对于 TGA 文件，使用 image crate 转换为 PNG
    if ext.as_str() == "tga" {
        println!("转换 TGA 图片为 PNG: {}", file_path);
        
        // 打开图片
        match image::open(&file_path) {
            Ok(img) => {
                let mut buffer = Cursor::new(Vec::new());
                
                // 转换为 PNG
                match img.write_to(&mut buffer, ImageFormat::Png) {
                    Ok(_) => {
                        use base64::{Engine as _, engine::general_purpose};
                        let base64_string = general_purpose::STANDARD.encode(buffer.get_ref());
                        
                        return ImageReadResult {
                            success: true,
                            message: None,
                            base64: Some(base64_string),
                            mime_type: Some("image/png".to_string()),
                        };
                    },
                    Err(e) => {
                        println!("转换图片格式失败: {}", e);
                        // 如果转换失败，尝试直接读取（可能前端有办法处理，或者只是为了显示错误）
                    }
                }
            },
            Err(e) => {
                println!("无法使用 image crate 打开图片: {}", e);
                // 失败后继续，尝试直接读取
            }
        }
    }
    
    // 读取文件（原始逻辑）
    match fs::read(&file_path) {
        Ok(bytes) => {
            // 转换为 base64
            use base64::{Engine as _, engine::general_purpose};
            let base64_string = general_purpose::STANDARD.encode(&bytes);
            
            let mime_type = match ext.as_str() {
                "png" => "image/png",
                "jpg" | "jpeg" => "image/jpeg",
                "gif" => "image/gif",
                "bmp" => "image/bmp",
                "webp" => "image/webp",
                "svg" => "image/svg+xml",
                // 如果上面转换失败了，这里仍然返回原始 MIME
                "tga" => "image/x-tga", 
                "dds" => "image/vnd-ms.dds",
                _ => "application/octet-stream",
            };
            
            ImageReadResult {
                success: true,
                message: None,
                base64: Some(base64_string),
                mime_type: Some(mime_type.to_string()),
            }
        }
        Err(e) => ImageReadResult {
            success: false,
            message: Some(format!("读取文件失败: {}", e)),
            base64: None,
            mime_type: None,
        },
    }
}

// ==================== 应用入口 ====================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            create_new_project,
            initialize_project,
            open_project,
            get_recent_projects,
            get_recent_project_stats,
            open_file_dialog,
            exit_application,
            open_settings,
            open_folder,
            read_directory,
            create_file,
            create_folder,
            rename_path,
            delete_path,
            load_settings,
            save_settings,
            validate_game_directory,
            launch_game,
            parse_json,
            stringify_json,
            validate_json,
            merge_json,
            get_json_path,
            set_json_path,
            read_json_file,
            write_json_file,
            read_file_content,
            write_file_content,
            search_files,
            build_directory_tree,
            build_directory_tree_fast,
            match_brackets,
            find_bracket_pair,
            get_bracket_depths,
            country_tags::load_country_tags,
            validate_tags,
            load_ideas,
            reset_idea_cache,
            dependency::load_dependencies,
            dependency::save_dependencies,
            dependency::validate_dependency_path,
            dependency::index_dependency,
            pack_project,
            read_image_as_base64,
            load_focus_icon,
            read_icon_cache,
            write_icon_cache,
            clear_icon_cache
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
