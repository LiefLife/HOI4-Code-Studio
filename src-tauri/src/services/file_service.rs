// 文件操作服务
// 提供文件操作的核心业务逻辑

use std::path::{Path, PathBuf};

/// 文件操作服务结构体
pub struct FileService;

impl FileService {
    /// 创建新的文件服务实例
    pub fn new() -> Self {
        FileService
    }

    /// 规范化路径
    ///
    /// 将路径中的反斜杠替换为正斜杠，并移除重复的斜杠
    ///
    /// # 参数
    /// * `p` - 要规范化的路径字符串
    ///
    /// # 返回值
    /// 返回规范化后的路径字符串
    pub fn normalize_path(&self, p: &str) -> String {
        let mut s = p.replace('\\', "/");
        while s.contains("//") {
            s = s.replace("//", "/");
        }
        s
    }

    /// 规范化路径用于拼接
    ///
    /// 将路径规范化并移除开头的斜杠，适用于路径拼接场景
    ///
    /// # 参数
    /// * `p` - 要规范化的路径字符串
    ///
    /// # 返回值
    /// 返回规范化后的路径字符串（不含开头斜杠）
    pub fn normalize_path_for_join(&self, p: &str) -> String {
        let mut s = p.replace('\\', "/");
        while s.contains("//") {
            s = s.replace("//", "/");
        }
        s.trim_start_matches('/').to_string()
    }

    /// 查找现有的纹理文件路径
    ///
    /// 在给定的根目录列表中搜索纹理文件，支持自动查找 .dds 替代文件
    ///
    /// # 参数
    /// * `texturefile` - 纹理文件的相对路径
    /// * `roots` - 搜索根目录列表
    ///
    /// # 返回值
    /// 如果找到文件，返回 Some(PathBuf)，否则返回 None
    pub fn find_existing_texture_path(
        &self,
        texturefile: &str,
        roots: &[PathBuf],
    ) -> Option<PathBuf> {
        let normalized_rel = self.normalize_path_for_join(texturefile);

        // 1) 绝对路径
        let tex_path = PathBuf::from(texturefile);
        if tex_path.is_absolute() && tex_path.exists() {
            return Some(tex_path);
        }

        // 2) 搜索根目录
        for root in roots {
            let p = root.join(&normalized_rel);
            if p.exists() {
                return Some(p);
            }
        }

        // 3) 回退：如果 .png/.tga 不存在，尝试 .dds
        let lower = normalized_rel.to_lowercase();
        if lower.ends_with(".png") || lower.ends_with(".tga") {
            let dds_rel = format!("{}{}", &normalized_rel[..normalized_rel.len() - 4], ".dds");
            for root in roots {
                let p = root.join(&dds_rel);
                if p.exists() {
                    return Some(p);
                }
            }
        }

        None
    }

    /// 递归收集目录中的文件
    ///
    /// # 参数
    /// * `dir` - 要扫描的目录
    /// * `files` - 用于存储结果的文件列表
    /// * `include_all_files` - 是否包含所有文件类型
    pub fn collect_files(&self, dir: &Path, files: &mut Vec<PathBuf>, include_all_files: bool) {
        use std::fs;

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
                    self.collect_files(&path, files, include_all_files);
                }
            }
        }
    }

    /// 在 .gfx 文件内容中查找指定图标的纹理文件路径
    ///
    /// # 参数
    /// * `content` - .gfx 文件内容
    /// * `icon_name` - 图标名称
    ///
    /// # 返回值
    /// 如果找到，返回 Some(String)，否则返回 None
    pub fn find_texture_for_icon_in_gfx(&self, content: &str, icon_name: &str) -> Option<String> {
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
                            let cleaned =
                                value_str.trim_matches('"').trim_matches('\'').to_string();
                            name_value = Some(cleaned);
                        }
                    } else if texture_value.is_none() && t.starts_with("texturefile") {
                        if let Some(eq_pos) = t.find('=') {
                            let value_str = t[eq_pos + 1..].trim();
                            let cleaned =
                                value_str.trim_matches('"').trim_matches('\'').to_string();
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

    /// 计算字符串中指定字节位置的行号
    ///
    /// # 参数
    /// * `content` - 文本内容
    /// * `byte_pos` - 字节位置
    ///
    /// # 返回值
    /// 返回行号（从 1 开始）
    pub fn count_line_number(&self, content: &str, byte_pos: usize) -> i32 {
        let mut line: i32 = 1;
        let mut i: usize = 0;
        for b in content.as_bytes() {
            if i >= byte_pos {
                break;
            }
            if *b == b'\n' {
                line += 1;
            }
            i += 1;
        }
        line
    }
}

impl Default for FileService {
    fn default() -> Self {
        Self::new()
    }
}
