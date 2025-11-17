use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// 依赖项类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DependencyType {
    Hoics,
    Hoi4mod,
}

/// 依赖项结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dependency {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub dependency_type: DependencyType,
    #[serde(rename = "addedAt")]
    pub added_at: String,
    pub enabled: bool,
}

/// 依赖项验证结果
#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyValidation {
    pub valid: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "type")]
    pub dependency_type: Option<DependencyType>,
}

/// 依赖项加载结果
#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyLoadResult {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependencies: Option<Vec<Dependency>>,
}

/// 依赖项保存结果
#[derive(Debug, Serialize, Deserialize)]
pub struct DependencySaveResult {
    pub success: bool,
    pub message: String,
}

/// 依赖项索引结果
#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyIndexResult {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "ideaCount")]
    pub idea_count: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "tagCount")]
    pub tag_count: Option<usize>,
}

/// 加载项目的依赖项列表
#[tauri::command]
pub fn load_dependencies(project_path: String) -> DependencyLoadResult {
    let project_json_path = Path::new(&project_path).join("project.json");
    
    // 检查 project.json 是否存在
    if !project_json_path.exists() {
        return DependencyLoadResult {
            success: false,
            message: "项目配置文件不存在".to_string(),
            dependencies: None,
        };
    }
    
    // 读取并解析 project.json
    match fs::read_to_string(&project_json_path) {
        Ok(content) => {
            match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(json) => {
                    // 获取 dependencies 字段
                    let deps = json.get("dependencies")
                        .and_then(|d| d.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| serde_json::from_value::<Dependency>(v.clone()).ok())
                                .collect::<Vec<_>>()
                        })
                        .unwrap_or_default();
                    
                    DependencyLoadResult {
                        success: true,
                        message: format!("成功加载 {} 个依赖项", deps.len()),
                        dependencies: Some(deps),
                    }
                }
                Err(e) => DependencyLoadResult {
                    success: false,
                    message: format!("解析项目配置失败: {}", e),
                    dependencies: None,
                },
            }
        }
        Err(e) => DependencyLoadResult {
            success: false,
            message: format!("读取项目配置失败: {}", e),
            dependencies: None,
        },
    }
}

/// 保存项目的依赖项列表
#[tauri::command]
pub fn save_dependencies(
    project_path: String,
    dependencies: Vec<Dependency>,
) -> DependencySaveResult {
    let project_json_path = Path::new(&project_path).join("project.json");
    
    // 读取现有的 project.json
    match fs::read_to_string(&project_json_path) {
        Ok(content) => {
            match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(mut json) => {
                    // 将依赖项转换为 JSON 值
                    let deps_json = match serde_json::to_value(&dependencies) {
                        Ok(v) => v,
                        Err(e) => {
                            return DependencySaveResult {
                                success: false,
                                message: format!("序列化依赖项失败: {}", e),
                            }
                        }
                    };
                    
                    // 更新 dependencies 字段
                    if let Some(obj) = json.as_object_mut() {
                        obj.insert("dependencies".to_string(), deps_json);
                    }
                    
                    // 写回文件
                    match serde_json::to_string_pretty(&json) {
                        Ok(output) => {
                            match fs::write(&project_json_path, output) {
                                Ok(_) => DependencySaveResult {
                                    success: true,
                                    message: "依赖项保存成功".to_string(),
                                },
                                Err(e) => DependencySaveResult {
                                    success: false,
                                    message: format!("写入文件失败: {}", e),
                                },
                            }
                        }
                        Err(e) => DependencySaveResult {
                            success: false,
                            message: format!("序列化 JSON 失败: {}", e),
                        },
                    }
                }
                Err(e) => DependencySaveResult {
                    success: false,
                    message: format!("解析项目配置失败: {}", e),
                },
            }
        }
        Err(e) => DependencySaveResult {
            success: false,
            message: format!("读取项目配置失败: {}", e),
        },
    }
}

/// 验证依赖项路径
#[tauri::command]
pub fn validate_dependency_path(path: String) -> DependencyValidation {
    let dep_path = Path::new(&path);
    
    // 检查路径是否存在
    if !dep_path.exists() {
        return DependencyValidation {
            valid: false,
            message: "路径不存在".to_string(),
            name: None,
            dependency_type: None,
        };
    }
    
    // 检查是否是目录
    if !dep_path.is_dir() {
        return DependencyValidation {
            valid: false,
            message: "路径必须是一个目录".to_string(),
            name: None,
            dependency_type: None,
        };
    }
    
    // 检查是否是 HOICS 项目（是否存在 project.json）
    let project_json = dep_path.join("project.json");
    if project_json.exists() {
        // 尝试读取项目名称
        match fs::read_to_string(&project_json) {
            Ok(content) => {
                match serde_json::from_str::<serde_json::Value>(&content) {
                    Ok(json) => {
                        let name = json.get("name")
                            .and_then(|n| n.as_str())
                            .unwrap_or("未命名项目")
                            .to_string();
                        
                        return DependencyValidation {
                            valid: true,
                            message: "有效的 HOICS 项目".to_string(),
                            name: Some(name),
                            dependency_type: Some(DependencyType::Hoics),
                        };
                    }
                    Err(_) => {}
                }
            }
            Err(_) => {}
        }
    }
    
    // 检查是否是普通 HOI4 Mod（是否存在 descriptor.mod）
    let descriptor_mod = dep_path.join("descriptor.mod");
    if descriptor_mod.exists() {
        // 尝试读取 Mod 名称
        match fs::read_to_string(&descriptor_mod) {
            Ok(content) => {
                // 简单解析 name 字段
                for line in content.lines() {
                    if line.trim().starts_with("name") {
                        if let Some(name_part) = line.split('=').nth(1) {
                            let name = name_part
                                .trim()
                                .trim_matches('"')
                                .to_string();
                            
                            return DependencyValidation {
                                valid: true,
                                message: "有效的 HOI4 Mod".to_string(),
                                name: Some(name),
                                dependency_type: Some(DependencyType::Hoi4mod),
                            };
                        }
                    }
                }
            }
            Err(_) => {}
        }
        
        // 即使无法读取名称，也认为是有效的 Mod
        return DependencyValidation {
            valid: true,
            message: "有效的 HOI4 Mod".to_string(),
            name: Some("未命名 Mod".to_string()),
            dependency_type: Some(DependencyType::Hoi4mod),
        };
    }
    
    // 如果都不是，则无效
    DependencyValidation {
        valid: false,
        message: "不是有效的 HOICS 项目或 HOI4 Mod".to_string(),
        name: None,
        dependency_type: None,
    }
}

/// 索引依赖项的 Idea 和 Tag 数据
#[tauri::command]
pub fn index_dependency(_dependency_path: String) -> DependencyIndexResult {
    // 这个功能将在第二阶段实现，现在只返回一个占位结果
    DependencyIndexResult {
        success: true,
        message: "依赖项索引功能将在第二阶段实现".to_string(),
        idea_count: Some(0),
        tag_count: Some(0),
    }
}
