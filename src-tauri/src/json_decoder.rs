
#![deny(clippy::unwrap_used)]
// serde 序列化/反序列化
use serde::{Deserialize, Serialize};

// serde_json 工具
use serde_json::{Value, json};

// 缓存映射
use std::collections::HashMap;

// ==================== 数据结构 ====================

/// JSON 操作结果结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct JsonResult {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}

/// JSON 验证结果结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct JsonValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}

// ==================== 高性能 JSON 解析器 ====================

pub struct JsonDecoder {
    #[allow(dead_code)]
    cache: HashMap<String, Value>
}

impl JsonDecoder {
    pub fn new() -> Self {
        JsonDecoder {
            cache: HashMap::new(),
        }
    }

    pub fn parse(&mut self, json_str: &str) -> Result<Value, String> {
        serde_json::from_str(json_str)
            .map_err(|e| format!("JSON 解析错误: {}", e))
    }

    #[allow(dead_code)]
    pub fn parse_with_cache(&mut self, key: String, json_str: &str) -> Result<Value, String> {
        match self.parse(json_str) {
            Ok(value) => {
                self.cache.insert(key.clone(), value.clone());
                Ok(value)
            }
            Err(e) => Err(e),
        }
    }

    #[allow(dead_code)]
    pub fn get_cached(&self, key: &str) -> Option<&Value> {
        self.cache.get(key)
    }

    #[allow(dead_code)]
    pub fn clear_cache(&mut self) {
        self.cache.clear();
    }

    pub fn stringify(&self, value: &Value) -> Result<String, String> {
        serde_json::to_string(value)
            .map_err(|e| format!("JSON 序列化错误: {}", e))
    }

    pub fn stringify_pretty(&self, value: &Value) -> Result<String, String> {
        serde_json::to_string_pretty(value)
            .map_err(|e| format!("JSON 序列化错误: {}", e))
    }

    /// 验证 JSON 格式
    pub fn validate(&self, json_str: &str) -> JsonValidationResult {
        match serde_json::from_str::<Value>(json_str) {
            Ok(_) => JsonValidationResult {
                valid: true,
                errors: vec![],
            },
            Err(e) => JsonValidationResult {
                valid: false,
                errors: vec![format!("JSON 格式错误: {}", e)],
            },
        }
    }

    /// 合并两个 JSON 对象（浅合并）
    pub fn merge(&self, base: &Value, overlay: &Value) -> Value {
        match (base, overlay) {
            (Value::Object(base_map), Value::Object(overlay_map)) => {
                let mut result = base_map.clone();
                for (key, value) in overlay_map {
                    result.insert(key.clone(), value.clone());
                }
                Value::Object(result)
            }
            _ => overlay.clone(),
        }
    }

    /// 深度合并 JSON 对象
    pub fn deep_merge(&self, base: &Value, overlay: &Value) -> Value {
        match (base, overlay) {
            (Value::Object(base_map), Value::Object(overlay_map)) => {
                let mut result = base_map.clone();
                for (key, value) in overlay_map {
                    if let Some(base_value) = base_map.get(key) {
                        result.insert(key.clone(), self.deep_merge(base_value, value));
                    } else {
                        result.insert(key.clone(), value.clone());
                    }
                }
                Value::Object(result)
            }
            _ => overlay.clone(),
        }
    }

    /// 获取 JSON 路径值（支持点号分隔）
    pub fn get_path(&self, value: &Value, path: &str) -> Option<Value> {
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = value;

        for part in parts {
            match current {
                Value::Object(map) => {
                    if let Some(next) = map.get(part) {
                        current = next;
                    } else {
                        return None;
                    }
                }
                Value::Array(arr) => {
                    if let Ok(index) = part.parse::<usize>() {
                        if let Some(next) = arr.get(index) {
                            current = next;
                        } else {
                            return None;
                        }
                    } else {
                        return None;
                    }
                }
                _ => return None,
            }
        }

        Some(current.clone())
    }

    /// 设置 JSON 路径值
    pub fn set_path(&self, value: &mut Value, path: &str, new_value: Value) -> bool {
        let parts: Vec<&str> = path.split('.').collect();
        if parts.is_empty() {
            return false;
        }

        let mut current = value;
        for (i, part) in parts.iter().enumerate() {
            if i == parts.len() - 1 {
                if let Value::Object(map) = current {
                    map.insert(part.to_string(), new_value);
                    return true;
                }
                return false;
            }

            if let Value::Object(map) = current {
                if !map.contains_key(*part) {
                    map.insert(part.to_string(), json!({}));
                }
                current = map.get_mut(*part).expect("key should exist after insertion");
            } else {
                return false;
            }
        }

        false
    }
}

impl Default for JsonDecoder {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== Tauri 命令 ====================

/// 解析 JSON 字符串
#[tauri::command]
pub fn parse_json(json_str: String) -> JsonResult {
    let mut decoder = JsonDecoder::new();
    match decoder.parse(&json_str) {
        Ok(value) => JsonResult {
            success: true,
            message: "JSON 解析成功".to_string(),
            data: Some(value),
        },
        Err(e) => JsonResult {
            success: false,
            message: e,
            data: None,
        },
    }
}

/// 序列化 JSON 对象
#[tauri::command]
pub fn stringify_json(value: Value, pretty: bool) -> JsonResult {
    let decoder = JsonDecoder::new();
    let result = if pretty {
        decoder.stringify_pretty(&value)
    } else {
        decoder.stringify(&value)
    };

    match result {
        Ok(json_str) => JsonResult {
            success: true,
            message: "JSON 序列化成功".to_string(),
            data: Some(Value::String(json_str)),
        },
        Err(e) => JsonResult {
            success: false,
            message: e,
            data: None,
        },
    }
}

/// 验证 JSON 格式
#[tauri::command]
pub fn validate_json(json_str: String) -> JsonValidationResult {
    let decoder = JsonDecoder::new();
    decoder.validate(&json_str)
}

/// 合并 JSON 对象
#[tauri::command]
pub fn merge_json(base: Value, overlay: Value, deep: bool) -> JsonResult {
    let decoder = JsonDecoder::new();
    let result = if deep {
        decoder.deep_merge(&base, &overlay)
    } else {
        decoder.merge(&base, &overlay)
    };

    JsonResult {
        success: true,
        message: "JSON 合并成功".to_string(),
        data: Some(result),
    }
}

/// 获取 JSON 路径值
#[tauri::command]
pub fn get_json_path(value: Value, path: String) -> JsonResult {
    let decoder = JsonDecoder::new();
    match decoder.get_path(&value, &path) {
        Some(result) => JsonResult {
            success: true,
            message: format!("成功获取路径 '{}'", path),
            data: Some(result),
        },
        None => JsonResult {
            success: false,
            message: format!("路径 '{}' 不存在", path),
            data: None,
        },
    }
}

/// 设置 JSON 路径值
#[tauri::command]
pub fn set_json_path(mut value: Value, path: String, new_value: Value) -> JsonResult {
    let decoder = JsonDecoder::new();
    if decoder.set_path(&mut value, &path, new_value) {
        JsonResult {
            success: true,
            message: format!("成功设置路径 '{}'", path),
            data: Some(value),
        }
    } else {
        JsonResult {
            success: false,
            message: format!("无法设置路径 '{}'", path),
            data: None,
        }
    }
}

/// 读取 JSON 文件
#[tauri::command]
pub async fn read_json_file(file_path: String) -> JsonResult {
    use std::fs;
    match fs::read_to_string(&file_path) {
        Ok(content) => {
            let mut decoder = JsonDecoder::new();
            match decoder.parse(&content) {
                Ok(value) => JsonResult {
                    success: true,
                    message: format!("成功读取文件 '{}'", file_path),
                    data: Some(value),
                },
                Err(e) => JsonResult {
                    success: false,
                    message: format!("解析文件失败: {}", e),
                    data: None,
                },
            }
        }
        Err(e) => JsonResult {
            success: false,
            message: format!("读取文件失败: {}", e),
            data: None,
        },
    }
}

/// 写入 JSON 文件
#[tauri::command]
pub async fn write_json_file(file_path: String, value: Value, pretty: bool) -> JsonResult {
    use std::fs;
    let decoder = JsonDecoder::new();
    let json_str = if pretty {
        decoder.stringify_pretty(&value)
    } else {
        decoder.stringify(&value)
    };

    match json_str {
        Ok(content) => {
            match fs::write(&file_path, content) {
                Ok(_) => JsonResult {
                    success: true,
                    message: format!("成功写入文件 '{}'", file_path),
                    data: None,
                },
                Err(e) => JsonResult {
                    success: false,
                    message: format!("写入文件失败: {}", e),
                    data: None,
                },
            }
        }
        Err(e) => JsonResult {
            success: false,
            message: format!("序列化失败: {}", e),
            data: None,
        },
    }
}

// ==================== 单元测试 ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_json() {
        let mut decoder = JsonDecoder::new();
        let json_str = r#"{"name": "test", "value": 123}"#;
        let result = decoder.parse(json_str);
        assert!(result.is_ok());
    }

    #[test]
    fn test_merge_json() {
        let decoder = JsonDecoder::new();
        let base = json!({"a": 1, "b": 2});
        let overlay = json!({"b": 3, "c": 4});
        let result = decoder.merge(&base, &overlay);
        assert_eq!(result["a"], 1);
        assert_eq!(result["b"], 3);
        assert_eq!(result["c"], 4);
    }

    #[test]
    fn test_get_path() {
        let decoder = JsonDecoder::new();
        let value = json!({"user": {"name": "Alice", "age": 30}});
        let result = decoder.get_path(&value, "user.name");
        assert_eq!(result, Some(Value::String("Alice".to_string())));
    }
}
