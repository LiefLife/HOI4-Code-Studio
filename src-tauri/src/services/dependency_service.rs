// 依赖管理服务
// 提供依赖管理的核心业务逻辑

use std::fs;
use std::path::Path;

/// 依赖管理服务结构体
pub struct DependencyService;

impl DependencyService {
    /// 创建新的依赖服务实例
    pub fn new() -> Self {
        DependencyService
    }

    /// 从 project.json 中读取已启用依赖的路径
    ///
    /// # 参数
    /// * `project_root` - 项目根目录路径
    ///
    /// # 返回值
    /// 返回已启用依赖的路径列表
    pub fn get_dependency_paths_from_project(&self, project_root: &str) -> Vec<String> {
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
                let enabled = dep.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true);
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
}

impl Default for DependencyService {
    fn default() -> Self {
        Self::new()
    }
}
