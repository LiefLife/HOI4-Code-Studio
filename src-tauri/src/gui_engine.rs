use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::fs;
use std::path::Path;
use regex::Regex;

/// GUI 节点类型
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum GuiNodeType {
    ContainerWindow,
    Icon,
    Button,
    InstantTextBox,
    GridBox,
    Window,
    WindowType,
}

/// GUI 属性
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct GuiProperties {
    pub name: Option<String>,
    pub position: Option<Position>,
    pub size: Option<Size>,
    pub orientation: Option<String>,
    pub origo: Option<String>,
    pub sprite_type: Option<String>,
    pub quad_texture_sprite: Option<String>,
    pub background: Option<String>,
    pub font: Option<String>,
    pub text: Option<String>,
    pub format: Option<String>,
    pub vertical_alignment: Option<String>,
    pub max_width: Option<i32>,
    pub max_height: Option<i32>,
    pub scale: Option<f32>,
    pub frame: Option<i32>,
    pub clipping: Option<bool>,
    pub fixedsize: Option<bool>,
    pub slotsize: Option<Size>,
    pub add_horizontal: Option<bool>,
    pub max_slots_horizontal: Option<i32>,
    pub max_slots_vertical: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Size {
    pub width: i32,
    pub height: i32,
}

/// GUI 节点结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GuiNode {
    pub node_type: GuiNodeType,
    pub properties: GuiProperties,
    pub children: Vec<GuiNode>,
}

/// 解析 GUI 文件内容并返回所有顶层窗口
#[tauri::command]
pub fn parse_gui_content(content: String) -> Result<Value, String> {
    let content = strip_comments(&content);
    // 基础解析：查找 containerWindowType 或 windowType
    let mut windows = Vec::new();
    let re_window = Regex::new(r"(?i)(containerWindowType|windowType)\s*=\s*\{").unwrap();
    let mut current_pos = 0;
    
    while let Some(mat) = re_window.find_at(&content, current_pos) {
        let start = mat.start();
        // 查找匹配的闭合括号
        if let Some(end) = find_matching_bracket(&content, mat.end()) {
            let block = &content[start..end];
            if let Some(node) = parse_node(block) {
                windows.push(node);
            }
            current_pos = end;
        } else {
            current_pos = mat.end();
        }
    }
    
    Ok(json!({
        "success": true,
        "windows": windows
    }))
}

/// 解析 GUI 文件并返回所有顶层窗口
#[tauri::command]
pub fn parse_gui_file(path: String) -> Result<Value, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut res = parse_gui_content(content)?;
    if let Some(obj) = res.as_object_mut() {
        obj.insert("path".to_string(), json!(path));
    }
    Ok(res)
}

/// 解析 GFX 文件获取 Sprite 定义
#[tauri::command]
pub fn parse_gfx_file(path: String) -> Result<Value, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let content = strip_comments(&content);
    let mut sprites = std::collections::HashMap::new();
    
    let re_sprite = Regex::new(r"(?i)(spriteType|frameAnimatedSpriteType|corneredTileSpriteType)\s*=\s*\{").unwrap();
    let mut current_pos = 0;
    
    while let Some(mat) = re_sprite.find_at(&content, current_pos) {
        let start = mat.start();
        if let Some(end) = find_matching_bracket(&content, mat.end()) {
            let block = &content[start..end];
            let name = extract_value(block, "name");
            let texturefile = extract_value(block, "texturefile");
            let noofframes = extract_value(block, "noOfFrames")
                .and_then(|v| v.parse::<i32>().ok())
                .unwrap_or(1);
            
            // 提取 borderSize (用于 9 宫格渲染)
            let border_size = extract_xy_value(block, "borderSize");
            
            if let Some(n) = name {
                sprites.insert(n, json!({
                    "texturefile": texturefile,
                    "noOfFrames": noofframes,
                    "borderSize": border_size
                }));
            }
            current_pos = end;
        } else {
            current_pos = mat.end();
        }
    }
    
    Ok(json!({
        "success": true,
        "sprites": sprites
    }))
}

/// 查找资源文件路径
#[tauri::command]
pub async fn resolve_gui_resource(
    name: String, 
    project_path: String, 
    game_directory: String,
    dependency_roots: Vec<String>
) -> Result<Value, String> {
    // 1. 搜寻所有可能的根目录：项目 > 依赖 > 游戏目录
    let mut search_roots = vec![Path::new(&project_path).to_path_buf()];
    for root in dependency_roots {
        search_roots.push(Path::new(&root).to_path_buf());
    }
    if !game_directory.is_empty() {
        search_roots.push(Path::new(&game_directory).to_path_buf());
    }

    // 2. 搜寻所有的 .gfx 文件，寻找名为 name 的 spriteType
    for root in &search_roots {
        let interface_dir = root.join("interface");
        if !interface_dir.exists() { continue; }

        if let Ok(entries) = fs::read_dir(interface_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("gfx") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        // 快速检查是否包含该名称
                        if content.contains(&name) {
                            // 使用 parse_gfx_file 的逻辑解析
                            let res = parse_gfx_file(path.to_string_lossy().to_string())?;
                            if let Some(sprite) = res["sprites"].get(&name) {
                                if let Some(texture_rel_path) = sprite["texturefile"].as_str() {
                                    // 3. 在所有根目录下寻找这个 texturefile
                                    for t_root in &search_roots {
                                        let full_path = t_root.join(texture_rel_path.replace("\\", "/"));
                                        if full_path.exists() {
                                            return Ok(json!({
                                                "success": true,
                                                "path": full_path.to_string_lossy(),
                                                "noOfFrames": sprite["noOfFrames"],
                                                "borderSize": sprite["borderSize"]
                                            }));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Err(format!("Resource not found: {}", name))
}

/// 辅助函数：去除注释
fn strip_comments(content: &str) -> String {
    content.lines()
        .map(|line| {
            if let Some(pos) = line.find('#') {
                &line[..pos]
            } else {
                line
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// 辅助函数：查找匹配的括号
fn find_matching_bracket(content: &str, start_pos: usize) -> Option<usize> {
    let mut count = 1;
    let bytes = content.as_bytes();
    for i in start_pos..bytes.len() {
        if bytes[i] == b'{' {
            count += 1;
        } else if bytes[i] == b'}' {
            count -= 1;
            if count == 0 {
                return Some(i + 1);
            }
        }
    }
    None
}

/// 辅助函数：解析单个 GUI 节点
fn parse_node(content: &str) -> Option<GuiNode> {
    let node_type_match = Regex::new(
        r"(?i)^\s*(containerWindowType|windowType|iconType|buttonType|instantTextBoxType|gridBoxType)\s*=",
    )
    .unwrap()
    .captures(content);

    let node_type = node_type_match
        .and_then(|cap| cap.get(1).map(|m| m.as_str().to_ascii_lowercase()))
        .map(|t| match t.as_str() {
            "containerwindowtype" => GuiNodeType::ContainerWindow,
            "windowtype" => GuiNodeType::WindowType,
            "icontype" => GuiNodeType::Icon,
            "buttontype" => GuiNodeType::Button,
            "instanttextboxtype" => GuiNodeType::InstantTextBox,
            "gridboxtype" => GuiNodeType::GridBox,
            _ => GuiNodeType::Window,
        })
        .unwrap_or(GuiNodeType::Window);

    let mut children = Vec::new();
    let mut child_spans: Vec<(usize, usize)> = Vec::new();

    let re_child = Regex::new(
        r"(?i)(containerWindowType|windowType|iconType|buttonType|instantTextBoxType|gridBoxType)\s*=\s*\{",
    )
    .unwrap();

    let mut current_pos = 0;
    while let Some(mat) = re_child.find_at(content, current_pos) {
        // 如果匹配的是当前节点本身（起始位置），跳过
        if mat.start() < 5 && current_pos == 0 {
            current_pos = mat.end();
            continue;
        }

        if let Some(end) = find_matching_bracket(content, mat.end()) {
            let block = &content[mat.start()..end];
            if let Some(child) = parse_node(block) {
                children.push(child);
            }
            child_spans.push((mat.start(), end));
            current_pos = end;
        } else {
            current_pos = mat.end();
        }
    }

    let mut stripped = content.to_string();
    child_spans.sort_by(|a, b| b.0.cmp(&a.0));
    for (start, end) in child_spans {
        let len = end.saturating_sub(start);
        stripped.replace_range(start..end, &" ".repeat(len));
    }

    let properties = GuiProperties {
        name: extract_value(&stripped, "name"),
        position: extract_position(&stripped),
        size: extract_size(&stripped),
        orientation: extract_value(&stripped, "orientation"),
        origo: extract_value(&stripped, "origo"),
        sprite_type: extract_value(&stripped, "spriteType").or_else(|| extract_value(&stripped, "sprite_type")),
        quad_texture_sprite: extract_value(&stripped, "quadTextureSprite"),
        background: extract_background_sprite(&stripped),
        font: extract_value(&stripped, "font").or_else(|| extract_value(&stripped, "buttonFont")),
        text: extract_value(&stripped, "text").or_else(|| extract_value(&stripped, "buttonText")),
        format: extract_value(&stripped, "format"),
        vertical_alignment: extract_value(&stripped, "vertical_alignment").or_else(|| extract_value(&stripped, "verticalAlignment")),
        max_width: extract_int_value(&stripped, "maxWidth").or_else(|| extract_int_value(&stripped, "max_width")),
        max_height: extract_int_value(&stripped, "maxHeight").or_else(|| extract_int_value(&stripped, "max_height")),
        scale: extract_value(&stripped, "scale").and_then(|v| v.parse().ok()),
        frame: extract_int_value(&stripped, "frame"),
        clipping: extract_value(&stripped, "clipping").map(|v| v.to_lowercase() == "yes"),
        fixedsize: extract_value(&stripped, "fixedsize").map(|v| v.to_lowercase() == "yes"),
        slotsize: extract_slotsize(&stripped),
        add_horizontal: extract_value(&stripped, "add_horizontal").map(|v| v.to_lowercase() == "yes"),
        max_slots_horizontal: extract_int_value(&stripped, "max_slots_horizontal"),
        max_slots_vertical: extract_int_value(&stripped, "max_slots_vertical"),
    };

    Some(GuiNode {
        node_type,
        properties,
        children,
    })
}

/// 辅助函数：提取属性值
fn extract_value(content: &str, key: &str) -> Option<String> {
    // 支持 key = value, key = "value"
    let re = Regex::new(&format!(r#"(?i){}\s*=\s*("(?:[^"\\]|\\.)*"|[^\s{{}}]+)"#, key)).unwrap();
    re.captures(content).map(|cap| {
        cap[1].trim_matches('"').to_string()
    })
}

/// 辅助函数：提取位置
fn extract_position(content: &str) -> Option<Position> {
    // 1. 尝试解析 position = { x = 10 y = 20 }
    let re_block = Regex::new(r"(?i)position\s*=\s*\{([^{}]*)\}").unwrap();
    if let Some(cap) = re_block.captures(content) {
        let block = &cap[1];
        let x = extract_int_value(block, "x").unwrap_or(0);
        let y = extract_int_value(block, "y").unwrap_or(0);
        return Some(Position { x, y });
    }
    
    // 2. 尝试直接解析顶级 x = ... 和 y = ...
    let x = extract_int_value(content, "x");
    let y = extract_int_value(content, "y");
    if x.is_some() || y.is_some() {
        return Some(Position { x: x.unwrap_or(0), y: y.unwrap_or(0) });
    }

    None
}

/// 辅助函数：提取尺寸
fn extract_size(content: &str) -> Option<Size> {
    // 1. 尝试解析 size = { width = 100 height = 200 } 或 { x = 100 y = 200 }
    let re_block = Regex::new(r"(?i)size\s*=\s*\{([^{}]*)\}").unwrap();
    if let Some(cap) = re_block.captures(content) {
        let block = &cap[1];
        let width = extract_int_value(block, "width").or_else(|| extract_int_value(block, "x")).unwrap_or(0);
        let height = extract_int_value(block, "height").or_else(|| extract_int_value(block, "y")).unwrap_or(0);
        return Some(Size { width, height });
    }

    // 2. 尝试直接解析顶级 width = ... 和 height = ...
    let width = extract_int_value(content, "width");
    let height = extract_int_value(content, "height");
    if width.is_some() || height.is_some() {
        return Some(Size { width: width.unwrap_or(0), height: height.unwrap_or(0) });
    }

    None
}

/// 辅助函数：提取格子尺寸
fn extract_slotsize(content: &str) -> Option<Size> {
    let re_block = Regex::new(r"(?i)slotsize\s*=\s*\{([^{}]*)\}").unwrap();
    if let Some(cap) = re_block.captures(content) {
        let block = &cap[1];
        let width = extract_int_value(block, "width").or_else(|| extract_int_value(block, "x")).unwrap_or(0);
        let height = extract_int_value(block, "height").or_else(|| extract_int_value(block, "y")).unwrap_or(0);
        return Some(Size { width, height });
    }
    None
}

/// 辅助函数：从块中提取整数值
fn extract_int_value(content: &str, key: &str) -> Option<i32> {
    let re = Regex::new(&format!(r"(?i){}\s*=\s*(-?\d+)", key)).unwrap();
    re.captures(content).and_then(|cap| cap[1].parse().ok())
}

/// 辅助函数：提取背景中的 Sprite
fn extract_background_sprite(content: &str) -> Option<String> {
    let re_bg = Regex::new(r"(?i)background\s*=\s*\{([^{}]*)\}").unwrap();
    if let Some(cap) = re_bg.captures(content) {
        let block = &cap[1];
        return extract_value(block, "spriteType")
            .or_else(|| extract_value(block, "quadTextureSprite"))
            .or_else(|| extract_value(block, "sprite_type"));
    }
    None
}

/// 辅助函数：提取 x/y 结构的值 (常用于 borderSize 或 size)
fn extract_xy_value(content: &str, key: &str) -> Option<Value> {
    let re = Regex::new(&format!(r"(?i){}\s*=\s*\{{([^{{}}]*)\}}", key)).unwrap();
    if let Some(cap) = re.captures(content) {
        let block = &cap[1];
        let x = extract_int_value(block, "x").unwrap_or(0);
        let y = extract_int_value(block, "y").unwrap_or(0);
        return Some(json!({ "x": x, "y": y }));
    }
    None
}
