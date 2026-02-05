// 缓存管理服务
// 提供缓存管理的核心业务逻辑

use base64::Engine;
use image::ImageFormat;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};

/// 缓存管理服务结构体
pub struct CacheService;

impl CacheService {
    /// 创建新的缓存服务实例
    pub fn new() -> Self {
        CacheService
    }

    /// 获取配置文件路径
    ///
    /// # 返回值
    /// 返回应用配置文件的路径
    fn get_config_path(&self) -> PathBuf {
        let config_dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        config_dir.join("HOI4_GUI_Editor").join("settings.json")
    }

    /// 获取缓存目录路径
    ///
    /// # 返回值
    /// 返回缓存目录的路径
    pub fn get_cache_dir(&self) -> PathBuf {
        let config_path = self.get_config_path();
        let cache_dir = config_path
            .parent()
            .map(|p| p.join("temp").join("focus-icon-cache"))
            .unwrap_or_else(|| {
                let config_dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
                config_dir
                    .join("HOI4_GUI_Editor")
                    .join("temp")
                    .join("focus-icon-cache")
            });

        // 确保缓存目录存在
        if let Err(e) = fs::create_dir_all(&cache_dir) {
            println!("创建缓存目录失败: {}", e);
        }

        cache_dir
    }

    /// 获取 GFX 预览缓存目录
    ///
    /// # 返回值
    /// 返回 GFX 预览缓存目录的路径
    pub fn get_gfx_preview_cache_dir(&self) -> PathBuf {
        let base = self.get_cache_dir();
        let dir = base
            .parent()
            .map(|p| p.join("gfx-preview-cache"))
            .unwrap_or_else(|| base.join("gfx-preview-cache"));

        if let Err(e) = fs::create_dir_all(&dir) {
            println!("创建 GFX 预览缓存目录失败: {}", e);
        }

        dir
    }

    /// 计算字符串的哈希值，用于缓存文件名
    ///
    /// # 参数
    /// * `s` - 要计算哈希的字符串
    ///
    /// # 返回值
    /// 返回十六进制格式的哈希字符串
    pub fn hash_string(&self, s: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        s.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }

    /// 清理图标缓存文件名
    ///
    /// 将文件名中的非法字符替换为下划线
    ///
    /// # 参数
    /// * `icon_name` - 图标名称
    ///
    /// # 返回值
    /// 返回清理后的文件名
    pub fn sanitize_icon_cache_filename(&self, icon_name: &str) -> String {
        let trimmed = icon_name.trim();
        if trimmed.is_empty() {
            return "unknown".to_string();
        }

        let mut out = String::with_capacity(trimmed.len());
        for ch in trimmed.chars() {
            if ch.is_ascii_alphanumeric() || matches!(ch, '_' | '-' | '.') {
                out.push(ch);
            } else {
                out.push('_');
            }
        }
        if out.is_empty() {
            "unknown".to_string()
        } else {
            out
        }
    }

    /// 获取图标缓存路径
    ///
    /// # 参数
    /// * `icon_name` - 图标名称
    ///
    /// # 返回值
    /// 返回图标缓存文件的路径
    pub fn get_icon_cache_path(&self, icon_name: &str) -> PathBuf {
        let cache_dir = self.get_cache_dir();
        let safe = self.sanitize_icon_cache_filename(icon_name);
        cache_dir.join(format!("{}.png", safe))
    }

    /// 获取旧版图标缓存路径
    ///
    /// # 参数
    /// * `icon_name` - 图标名称
    ///
    /// # 返回值
    /// 返回旧版图标缓存文件的路径
    pub fn get_legacy_icon_cache_path(&self, icon_name: &str) -> PathBuf {
        let cache_dir = self.get_cache_dir();
        let hash = self.hash_string(icon_name);
        cache_dir.join(format!("{}.png", hash))
    }

    /// 读取图标缓存
    ///
    /// # 参数
    /// * `icon_name` - 图标名称
    ///
    /// # 返回值
    /// 返回包含缓存数据的 JSON 对象
    pub fn read_icon_cache(&self, icon_name: &str) -> serde_json::Value {
        let cache_path = self.get_icon_cache_path(icon_name);

        if cache_path.exists() {
            match fs::read(&cache_path) {
                Ok(data) => {
                    let base64 = base64::engine::general_purpose::STANDARD.encode(&data);
                    serde_json::json!({
                        "success": true,
                        "base64": base64,
                        "mime_type": "image/png"
                    })
                }
                Err(e) => {
                    serde_json::json!({
                        "success": false,
                        "message": format!("读取缓存失败: {}", e)
                    })
                }
            }
        } else {
            let legacy_path = self.get_legacy_icon_cache_path(icon_name);
            if legacy_path.exists() {
                match fs::read(&legacy_path) {
                    Ok(data) => {
                        let _ = fs::write(&cache_path, &data);
                        let base64 = base64::engine::general_purpose::STANDARD.encode(&data);
                        serde_json::json!({
                            "success": true,
                            "base64": base64,
                            "mime_type": "image/png"
                        })
                    }
                    Err(e) => serde_json::json!({
                        "success": false,
                        "message": format!("读取缓存失败: {}", e)
                    }),
                }
            } else {
                serde_json::json!({
                    "success": false,
                    "message": "缓存不存在"
                })
            }
        }
    }

    /// 写入图标缓存
    ///
    /// # 参数
    /// * `icon_name` - 图标名称
    /// * `base64` - Base64 编码的图片数据
    /// * `mime_type` - MIME 类型
    ///
    /// # 返回值
    /// 返回操作结果的 JSON 对象
    pub fn write_icon_cache(
        &self,
        icon_name: &str,
        base64: &str,
        mime_type: &str,
    ) -> serde_json::Value {
        // 只处理 png 格式
        if mime_type != "image/png" {
            return serde_json::json!({
                "success": false,
                "message": "只支持png格式的图标缓存"
            });
        }

        let cache_path = self.get_icon_cache_path(icon_name);

        // 解码 base64
        match base64::engine::general_purpose::STANDARD.decode(base64) {
            Ok(data) => match fs::write(&cache_path, data) {
                Ok(_) => {
                    serde_json::json!({
                        "success": true,
                        "message": "缓存写入成功"
                    })
                }
                Err(e) => {
                    serde_json::json!({
                        "success": false,
                        "message": format!("写入缓存失败: {}", e)
                    })
                }
            },
            Err(e) => {
                serde_json::json!({
                    "success": false,
                    "message": format!("base64解码失败: {}", e)
                })
            }
        }
    }

    /// 清理图标缓存
    ///
    /// # 返回值
    /// 返回操作结果的 JSON 对象
    pub fn clear_icon_cache(&self) -> serde_json::Value {
        let cache_dir = self.get_cache_dir();

        if cache_dir.exists() {
            match fs::remove_dir_all(&cache_dir) {
                Ok(_) => {
                    // 重新创建缓存目录
                    if let Err(e) = fs::create_dir_all(&cache_dir) {
                        println!("重新创建缓存目录失败: {}", e);
                    }
                    serde_json::json!({
                        "success": true,
                        "message": "缓存清理成功"
                    })
                }
                Err(e) => {
                    serde_json::json!({
                        "success": false,
                        "message": format!("清理缓存失败: {}", e)
                    })
                }
            }
        } else {
            serde_json::json!({
                "success": true,
                "message": "缓存目录不存在，无需清理"
            })
        }
    }

    /// 从纹理文件写入 PNG 缓存
    ///
    /// # 参数
    /// * `texture_path` - 纹理文件路径
    ///
    /// # 返回值
    /// 成功返回缓存文件路径，失败返回错误信息
    pub fn write_png_cache_from_texture(&self, texture_path: &Path) -> Result<PathBuf, String> {
        let src = texture_path
            .to_str()
            .ok_or_else(|| "Invalid texture path".to_string())?
            .to_string();

        let meta = fs::metadata(texture_path)
            .map_err(|e| format!("Failed to stat texture: {} ({})", src, e))?;
        let mtime = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let cache_dir = self.get_gfx_preview_cache_dir();
        let key = format!("{}@{}", src, mtime);
        let file_name = format!("{}.png", self.hash_string(&key));
        let out_path = cache_dir.join(file_name);

        if out_path.exists() {
            println!("[gfx-preview] cache hit: {} -> {}", src, out_path.display());
            return Ok(out_path);
        }

        println!("[gfx-preview] cache miss: {}", src);

        let ext = texture_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        // 转换为 PNG 字节
        let png_bytes: Vec<u8> = if ext == "png" {
            println!("[gfx-preview] use png as-is: {}", src);
            fs::read(texture_path).map_err(|e| format!("Failed to read png: {} ({})", src, e))?
        } else if ext == "dds" {
            println!("[gfx-preview] convert dds -> png: {}", src);
            let dds_data = fs::read(texture_path)
                .map_err(|e| format!("Failed to read dds: {} ({})", src, e))?;
            let dds = image_dds::ddsfile::Dds::read(&mut Cursor::new(&dds_data))
                .map_err(|e| format!("Failed to parse dds: {} ({})", src, e))?;
            let img = image_dds::image_from_dds(&dds, 0)
                .map_err(|e| format!("Failed to decode dds: {} ({})", src, e))?;
            let mut buffer = Cursor::new(Vec::new());
            img.write_to(&mut buffer, ImageFormat::Png)
                .map_err(|e| format!("Failed to encode png: {} ({})", src, e))?;
            buffer.into_inner()
        } else {
            println!("[gfx-preview] decode image -> png: {} (ext={})", src, ext);
            let img = image::open(texture_path)
                .map_err(|e| format!("Failed to decode image: {} ({})", src, e))?;
            let mut buffer = Cursor::new(Vec::new());
            img.write_to(&mut buffer, ImageFormat::Png)
                .map_err(|e| format!("Failed to encode png: {} ({})", src, e))?;
            buffer.into_inner()
        };

        fs::write(&out_path, png_bytes)
            .map_err(|e| format!("Failed to write png cache: {} ({})", out_path.display(), e))?;
        println!("[gfx-preview] wrote png cache: {}", out_path.display());
        Ok(out_path)
    }
}

impl Default for CacheService {
    fn default() -> Self {
        Self::new()
    }
}
