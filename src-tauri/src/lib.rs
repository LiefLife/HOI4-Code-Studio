// 禁止使用 unwrap()，避免 panic
#![deny(clippy::unwrap_used)]

// serde 序列化/反序列化
use serde::{Deserialize, Serialize};
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
pub struct FileDialogResult {
    success: bool,
    path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LaunchGameResult {
    success: bool,
    message: String,
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

    // Steam 版本启动
    if use_steam {
        let steam_url = "steam://rungameid/394360";
        
        #[cfg(target_os = "windows")]
        {
            match Command::new("cmd")
                .args(&["/C", "start", steam_url])
                .spawn()
            {
                Ok(_) => {
                    return LaunchGameResult {
                        success: true,
                        message: "正在通过 Steam 启动游戏...".to_string(),
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
                        message: "正在通过 Steam 启动游戏...".to_string(),
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

        #[cfg(target_os = "windows")]
        {
            let game_exe = Path::new(game_path).join("dowser.exe");

            if !game_exe.exists() {
                return LaunchGameResult {
                    success: false,
                    message: format!("找不到游戏文件: {}，请确认游戏目录包含 dowser.exe", game_exe.display()),
                };
            }

            match Command::new(&game_exe)
                .current_dir(game_path)
                .spawn()
            {
                Ok(_) => {
                    return LaunchGameResult {
                        success: true,
                        message: "正在启动游戏...".to_string(),
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
    // 首先尝试读取便携模式配置
    let portable_path = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|p| p.to_path_buf()))
        .map(|dir| dir.join("config").join("settings.json"));
    
    // 如果便携模式配置存在，优先使用
    if let Some(ref path) = portable_path {
        if path.exists() {
            return path.clone();
        }
    }
    
    // 否则尝试读取 AppData 中的配置，检查是否设置了便携模式
    let config_dir = dirs::config_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    let appdata_path = config_dir.join("HOI4_GUI_Editor").join("settings.json");
    
    // 如果 AppData 配置存在，读取并检查 configLocation 设置
    if appdata_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&appdata_path) {
            if let Ok(settings) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(location) = settings.get("configLocation").and_then(|v| v.as_str()) {
                    if location == "portable" {
                        // 用户选择了便携模式，返回便携路径
                        if let Some(path) = portable_path {
                            return path;
                        }
                    }
                }
            }
        }
    }
    
    // 默认使用 AppData 路径
    appdata_path
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

    // 递归收集所有文件
    fn collect_files(dir: &Path, files: &mut Vec<std::path::PathBuf>) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    files.push(path);
                } else if path.is_dir() {
                    collect_files(&path, files);
                }
            }
        }
    }

    let mut all_files = Vec::new();
    collect_files(dir_path, &mut all_files);

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
    println!("快速构建文件树（多线程）: {}, 最大深度: {}", path, max_depth);
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
            open_file_dialog,
            exit_application,
            open_settings,
            open_folder,
            read_directory,
            create_file,
            create_folder,
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
            dependency::index_dependency
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
