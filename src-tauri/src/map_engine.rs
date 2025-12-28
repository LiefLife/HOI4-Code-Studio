#![deny(clippy::unwrap_used)]
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path};

use std::collections::HashMap;
use image::GenericImageView;
use rayon::prelude::*;
use std::sync::Mutex;

/// 地图上下文状态 (常驻内存)
pub struct MapContext {
    pub width: u32,
    pub height: u32,
    pub province_ids: Vec<u32>,
    #[allow(dead_code)]
    pub definitions: HashMap<u32, ProvinceDefinition>,
    #[allow(dead_code)]
    pub country_colors: HashMap<String, RGBColor>,
    #[allow(dead_code)]
    pub state_owners: HashMap<u32, String>, // province_id -> owner_tag
    
    // 渲染查找表 (LUT) - 索引为 Province ID
    // 使用 Vec<[u8; 3]> 替代 HashMap 以获得 O(1) 访问速度
    pub province_color_lut: Vec<[u8; 3]>,
    pub country_color_lut: Vec<[u8; 3]>,
    pub terrain_color_lut: Vec<[u8; 3]>,

    // 缓存每个省份的包围盒，用于快速提取轮廓
    pub province_bounds: HashMap<u32, BoundingBox>,
}

pub struct MapState(pub Mutex<Option<MapContext>>);

impl Default for MapState {
    fn default() -> Self {
        MapState(Mutex::new(None))
    }
}

/// 省份定义结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvinceDefinition {
    pub id: u32,
    pub r: u8,
    pub g: u8,
    pub b: u8,
    #[serde(rename = "type")]
    pub province_type: String,
    pub coastal: bool,
    pub terrain: String,
    pub continent: u32,
}

/// 区域范围
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub min_x: u32,
    pub min_y: u32,
    pub max_x: u32,
    pub max_y: u32,
}

/// 颜色结构
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct RGBColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}

/// 扩展省份定义，包含位置信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvinceInstance {
    pub definition: ProvinceDefinition,
    pub bounding_box: Option<BoundingBox>,
    pub pixels_count: u32,
}

/// 边缘点集合
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvinceEdge {
    pub from_id: u32,
    pub to_id: u32,
    pub points: Vec<(u32, u32)>,
}

/// 地图位图数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvinceMapData {
    pub width: u32,
    pub height: u32,
    pub province_ids: Vec<u32>,
    pub instances: Vec<ProvinceInstance>,
    pub edges: Vec<ProvinceEdge>,
}

/// 地图配置结构 (来自 default.map)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefaultMap {
    pub definitions: String,
    pub provinces: String,
    pub adjacencies: String,
    pub continent: String,
    pub rivers: String,
    pub terrain_definition: Option<String>,
}

/// 带有编码检测的文件读取
fn read_file_with_encoding(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    
    // 使用 chardetng 检测编码
    let mut detector = chardetng::EncodingDetector::new();
    detector.feed(&bytes, true);
    let detected_encoding = detector.guess(None, true);
    
    let (decoded, _, had_errors) = detected_encoding.decode(&bytes);
    if !had_errors {
        return Ok(decoded.to_string());
    }

    // 如果检测失败，尝试 Windows-1252 (HOI4 常用)
    let (decoded, _, had_errors) = encoding_rs::WINDOWS_1252.decode(&bytes);
    if !had_errors {
        return Ok(decoded.to_string());
    }

    // 最后回退到 UTF-8 Lossy
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

/// 解析 definition.csv
pub fn parse_definition_csv(path: &Path) -> Result<Vec<ProvinceDefinition>, String> {
    let content = read_file_with_encoding(path)?;
    let mut provinces = Vec::new();

    for line in content.lines() {
        let parts: Vec<&str> = line.split(|c| c == ';' || c == ',').collect();
        if parts.len() >= 8 {
            let id = parts[0].trim().parse::<u32>().map_err(|e| format!("ID parse error: {}", e))?;
            let r = parts[1].trim().parse::<u8>().map_err(|e| format!("R parse error: {}", e))?;
            let g = parts[2].trim().parse::<u8>().map_err(|e| format!("G parse error: {}", e))?;
            let b = parts[3].trim().parse::<u8>().map_err(|e| format!("B parse error: {}", e))?;
            let province_type = parts[4].trim().to_string();
            let coastal = parts[5].trim().to_owned().to_lowercase() == "true";
            let terrain = parts[6].trim().to_string();
            let continent = parts[7].trim().parse::<u32>().unwrap_or(0);

            provinces.push(ProvinceDefinition {
                id,
                r,
                g,
                b,
                province_type,
                coastal,
                terrain,
                continent,
            });
        }
    }

    Ok(provinces)
}

/// 解析 default.map
pub fn parse_default_map(path: &Path) -> Result<DefaultMap, String> {
    let content = read_file_with_encoding(path)?;
    
    let mut definitions = "definition.csv".to_string();
    let mut provinces = "provinces.bmp".to_string();
    let mut adjacencies = "adjacencies.csv".to_string();
    let mut continent = "continent.txt".to_string();
    let mut rivers = "rivers.bmp".to_string();
    let mut terrain_definition = None;

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split('=').collect();
        if parts.len() == 2 {
            let key = parts[0].trim().to_lowercase();
            let value = parts[1].trim().trim_matches('"').to_string();

            match key.as_str() {
                "definitions" => definitions = value,
                "provinces" => provinces = value,
                "adjacencies" => adjacencies = value,
                "continent" => continent = value,
                "rivers" => rivers = value,
                "terrain_definition" => terrain_definition = Some(value),
                _ => {}
            }
        }
    }

    Ok(DefaultMap {
        definitions,
        provinces,
        adjacencies,
        continent,
        rivers,
        terrain_definition,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MapLoadResult<T> {
    pub success: bool,
    pub message: String,
    pub data: Option<T>,
}

#[tauri::command]
pub fn load_map_definitions(path: String) -> MapLoadResult<Vec<ProvinceDefinition>> {
    match parse_definition_csv(Path::new(&path)) {
        Ok(provinces) => MapLoadResult {
            success: true,
            message: format!("成功加载 {} 个省份定义", provinces.len()),
            data: Some(provinces),
        },
        Err(e) => MapLoadResult {
            success: false,
            message: e,
            data: None,
        },
    }
}

/// 计算省份边界
pub fn detect_edges(
    width: u32,
    height: u32,
    province_ids: &[u32],
) -> Vec<ProvinceEdge> {
    use std::collections::HashSet;
    use std::sync::Mutex;

    // 使用分块并行处理来加速边缘检测
    // 每一个 (id1, id2) 关系映射到一个点集
    let edge_results = Mutex::new(HashMap::<(u32, u32), HashSet<(u32, u32)>>::new());

    // 按行并行处理
    (0..height).into_par_iter().for_each(|y| {
        let mut local_edges = HashMap::<(u32, u32), HashSet<(u32, u32)>>::new();
        
        for x in 0..width {
            let idx = (y * width + x) as usize;
            let current_id = province_ids[idx];

            // 检查右侧
            if x + 1 < width {
                let right_id = province_ids[idx + 1];
                if current_id != right_id {
                    let key = if current_id < right_id { (current_id, right_id) } else { (right_id, current_id) };
                    let points = local_edges.entry(key).or_insert_with(HashSet::new);
                    points.insert((x, y));
                    points.insert((x + 1, y));
                }
            }

            // 检查下方
            if y + 1 < height {
                let down_id = province_ids[idx + (width as usize)];
                if current_id != down_id {
                    let key = if current_id < down_id { (current_id, down_id) } else { (down_id, current_id) };
                    let points = local_edges.entry(key).or_insert_with(HashSet::new);
                    points.insert((x, y));
                    points.insert((x, y + 1));
                }
            }
        }

        // 合并到全局结果
        let mut global_edges = edge_results.lock().expect("Failed to lock edge_results");
        for (key, points) in local_edges {
            global_edges.entry(key).or_insert_with(HashSet::new).extend(points);
        }
    });

    // 将结果转换为 ProvinceEdge 列表
    edge_results.into_inner().expect("Failed to get inner edge_results").into_iter().map(|((from_id, to_id), point_set)| {
        ProvinceEdge {
            from_id,
            to_id,
            points: point_set.into_iter().collect(),
        }
    }).collect()
}

/// 解析 provinces.bmp 并映射到省份 ID
pub fn parse_provinces_bmp(
    path: &Path,
    definitions: &[ProvinceDefinition],
) -> Result<ProvinceMapData, String> {
    // 1. 加载图片
    let img = image::open(path).map_err(|e| format!("无法打开位图文件: {}", e))?;
    let (width, height) = img.dimensions();

    // 2. 创建颜色到 ID 的映射表
    let mut color_to_id = HashMap::with_capacity(definitions.len());
    for def in definitions {
        color_to_id.insert((def.r, def.g, def.b), def.id);
    }

    // 3. 获取像素数据并转换为 ID
    let rgb_data = img.to_rgb8();
    let pixels = rgb_data.as_raw();

    let province_ids: Vec<u32> = pixels
        .par_chunks_exact(3)
        .map(|chunk| {
            let r = chunk[0];
            let g = chunk[1];
            let b = chunk[2];
            *color_to_id.get(&(r, g, b)).unwrap_or(&0)
        })
        .collect();

    // 4. 计算每个省份的包围盒和像素计数
    // 使用 HashMap 存储中间状态：(min_x, min_y, max_x, max_y, count)
    let mut stats: HashMap<u32, (u32, u32, u32, u32, u32)> = HashMap::with_capacity(definitions.len());

    for (idx, &id) in province_ids.iter().enumerate() {
        if id == 0 { continue; }
        
        let x = (idx as u32) % width;
        let y = (idx as u32) / width;

        let entry = stats.entry(id).or_insert((x, y, x, y, 0));
        entry.0 = entry.0.min(x);
        entry.1 = entry.1.min(y);
        entry.2 = entry.2.max(x);
        entry.3 = entry.3.max(y);
        entry.4 += 1;
    }

    // 5. 组装 ProvinceInstance
    let instances = definitions.iter().map(|def| {
        let stat = stats.get(&def.id);
        ProvinceInstance {
            definition: def.clone(),
            bounding_box: stat.map(|s| BoundingBox {
                min_x: s.0,
                min_y: s.1,
                max_x: s.2,
                max_y: s.3,
            }),
            pixels_count: stat.map(|s| s.4).unwrap_or(0),
        }
    }).collect();

    // 6. 边缘检测
    let edges = detect_edges(width, height, &province_ids);

    Ok(ProvinceMapData {
        width,
        height,
        province_ids,
        instances,
        edges,
    })
}

#[tauri::command]
pub fn load_default_map(path: String) -> MapLoadResult<DefaultMap> {
    match parse_default_map(Path::new(&path)) {
        Ok(config) => MapLoadResult {
            success: true,
            message: "成功加载地图配置".to_string(),
            data: Some(config),
        },
        Err(e) => MapLoadResult {
            success: false,
            message: e,
            data: None,
        },
    }
}

#[tauri::command]
pub fn load_provinces_bmp(
    path: String,
    definitions: Vec<ProvinceDefinition>,
) -> MapLoadResult<ProvinceMapData> {
    match parse_provinces_bmp(Path::new(&path), &definitions) {
        Ok(data) => MapLoadResult {
            success: true,
            message: format!("成功解析地图位图 ({}x{})", data.width, data.height),
            data: Some(data),
        },
        Err(e) => MapLoadResult {
            success: false,
            message: e,
            data: None,
        },
    }
}

/// 获取地图原始 ID 数据的二进制流 (更高效)
#[tauri::command]
pub fn get_province_map_binary(
    path: String,
    definitions: Vec<ProvinceDefinition>,
) -> Result<Vec<u8>, String> {
    let data = parse_provinces_bmp(Path::new(&path), &definitions)?;
    
    // 将 Vec<u32> 转换为 Vec<u8> (小端字节序)
    let mut binary_data = Vec::with_capacity(data.province_ids.len() * 4);
    for id in data.province_ids {
        binary_data.extend_from_slice(&id.to_le_bytes());
    }
    
    Ok(binary_data)
}

/// 根据提供的颜色映射生成着色地图数据 (RGBA)，支持下采样 (性能模式)
#[tauri::command]
pub fn generate_colored_map(
    province_ids: Vec<u32>,
    color_map: HashMap<u32, RGBColor>,
    default_color: RGBColor,
    width: u32,
    height: u32,
    downsample: Option<u32>,
) -> Vec<u8> {
    let scale = downsample.unwrap_or(1).max(1);
    
    if scale == 1 {
        // 原有逻辑：全分辨率渲染
        return province_ids
            .par_iter()
            .flat_map(|&id| {
                let color = color_map.get(&id).unwrap_or(&default_color);
                vec![color.r, color.g, color.b, color.a]
            })
            .collect();
    }

    // 性能模式：下采样渲染
    let new_width = width / scale;
    let new_height = height / scale;
    let mut pixels = Vec::with_capacity((new_width * new_height * 4) as usize);

    for y in 0..new_height {
        for x in 0..new_width {
            let orig_x = x * scale;
            let orig_y = y * scale;
            let idx = (orig_y * width + orig_x) as usize;
            
            if idx < province_ids.len() {
                let id = province_ids[idx];
                let color = color_map.get(&id).unwrap_or(&default_color);
                pixels.push(color.r);
                pixels.push(color.g);
                pixels.push(color.b);
                pixels.push(color.a);
            } else {
                pixels.extend_from_slice(&[default_color.r, default_color.g, default_color.b, default_color.a]);
            }
        }
    }
    
    pixels
}

/// 获取省份定义的原始颜色映射 (用于“省份”或“地形”图层)
#[tauri::command]
pub fn get_definition_color_map(
    definitions: Vec<ProvinceDefinition>,
) -> HashMap<u32, RGBColor> {
    let mut color_map = HashMap::with_capacity(definitions.len());
    for def in definitions {
        color_map.insert(def.id, RGBColor {
            r: def.r,
            g: def.g,
            b: def.b,
            a: 255,
        });
    }
    color_map
}

/// 简单的国家颜色解析逻辑 (common/countries/colors.txt)
#[tauri::command]
pub fn load_country_colors(path: String) -> HashMap<String, RGBColor> {
    let mut colors = HashMap::new();
    let p = Path::new(&path);
    let content = read_file_with_encoding(p).unwrap_or_default();
    
    // 使用简单的正则匹配 TAG = { color = { r g b } }
    // 兼容多种空格和换行
    let re = Regex::new(r"(?m)^([A-Z0-9]{3})\s*=\s*\{\s*color\s*=\s*(?:rgb)?\s*\{\s*(\d+)\s+(\d+)\s+(\d+)\s*\}").ok();
    if let Some(re) = re {
        for cap in re.captures_iter(&content) {
            let tag = cap[1].to_string();
            let r = cap[2].parse().unwrap_or(0);
            let g = cap[3].parse().unwrap_or(0);
            let b = cap[4].parse().unwrap_or(0);
            colors.insert(tag, RGBColor { r, g, b, a: 255 });
        }
    }
    
    colors
}

/// 根据州所有权和国家颜色生成省份颜色映射
#[tauri::command]
pub fn get_province_owner_color_map(
    states: Vec<StateDefinition>,
    country_colors: HashMap<String, RGBColor>,
) -> HashMap<u32, RGBColor> {
    let mut province_color_map = HashMap::new();
    for state in states {
        if let Some(color) = country_colors.get(&state.owner) {
            for &province_id in &state.provinces {
                province_color_map.insert(province_id, *color);
            }
        }
    }
    province_color_map
}

/// 州定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateDefinition {
    pub id: u32,
    pub name: String,
    pub provinces: Vec<u32>,
    pub owner: String,
}

/// 解析州文件 (history/states/*.txt)
pub fn parse_state_file(path: &Path) -> Result<StateDefinition, String> {
    let content = read_file_with_encoding(path)?;
    
    let mut id = 0;
    let mut name = String::new();
    let mut provinces = Vec::new();
    let mut owner = String::new();
    
    // 使用简单的文本解析 (实际应使用 HOI4 脚本解析器)
    // 查找 id = XXX
    if let Some(caps) = Regex::new(r"id\s*=\s*(\d+)").ok().and_then(|re| re.captures(&content)) {
        id = caps[1].parse().unwrap_or(0);
    }
    
    // 查找 name = "XXX"
    if let Some(caps) = Regex::new(r#"name\s*=\s*"([^"]*)""#).ok().and_then(|re| re.captures(&content)) {
        name = caps[1].to_string();
    }
    
    // 查找 owner = TAG
    if let Some(caps) = Regex::new(r"owner\s*=\s*([A-Z0-9]{3})").ok().and_then(|re| re.captures(&content)) {
        owner = caps[1].to_string();
    }
    
    // 查找 provinces = { 1 2 3 }
    // 注意：provinces 可能跨多行
    if let Some(start_idx) = content.find("provinces") {
        if let Some(open_brace) = content[start_idx..].find('{') {
            if let Some(close_brace) = content[start_idx + open_brace..].find('}') {
                let province_str = &content[start_idx + open_brace + 1..start_idx + open_brace + close_brace];
                for p in province_str.split_whitespace() {
                    if let Ok(p_id) = p.parse::<u32>() {
                        provinces.push(p_id);
                    }
                }
            }
        }
    }
    
    Ok(StateDefinition { id, name, provinces, owner })
}

/// 批量解析州目录
#[tauri::command]
pub fn load_all_states(states_dir: String) -> Vec<StateDefinition> {
    let mut states = Vec::new();
    let path = Path::new(&states_dir);
    if path.exists() && path.is_dir() {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() && p.extension().map_or(false, |ext| ext == "txt") {
                    if let Ok(state) = parse_state_file(&p) {
                        states.push(state);
                    }
                }
            }
        }
    }
    states
}

#[tauri::command]
pub fn initialize_map_context(
    state: tauri::State<MapState>,
    map_path: String,
    definitions_path: String,
    states_path: String,
    country_colors_path: String,
) -> Result<String, String> {
    // 1. Load Definitions
    let definitions_vec = parse_definition_csv(Path::new(&definitions_path))?;
    let mut definitions = HashMap::new();
    for def in definitions_vec {
        definitions.insert(def.id, def);
    }

    // 2. Load Provinces BMP
    let img = image::open(Path::new(&map_path)).map_err(|e| e.to_string())?;
    let (width, height) = img.dimensions();
    let rgb = img.to_rgb8();
    
    // Fast color lookup
    let mut color_to_id = HashMap::with_capacity(definitions.len());
    for def in definitions.values() {
        color_to_id.insert((def.r, def.g, def.b), def.id);
    }
    
    // Parse IDs (Parallel)
    let province_ids: Vec<u32> = rgb.as_raw()
        .par_chunks_exact(3)
        .map(|chunk| {
            *color_to_id.get(&(chunk[0], chunk[1], chunk[2])).unwrap_or(&0)
        })
        .collect();

    // 3. Load Country Colors
    let country_colors: HashMap<String, RGBColor> = load_country_colors(country_colors_path).into_iter().collect();

    // 4. Load States & Owners
    let states = load_all_states(states_path);
    let mut state_owners = HashMap::new();
    
    for state in states {
        for &p_id in &state.provinces {
            state_owners.insert(p_id, state.owner.clone());
        }
    }

    // 5. Generate Look-Up Tables (LUTs) for high-performance rendering
    let max_id = definitions.keys().max().copied().unwrap_or(0);
    let lut_size = (max_id + 1) as usize;
    
    let mut province_color_lut = vec![[0, 0, 0]; lut_size];
    let mut country_color_lut = vec![[40, 40, 40]; lut_size]; // Default dark gray for no owner
    let mut terrain_color_lut = vec![[100, 100, 100]; lut_size]; // Default gray

    for def in definitions.values() {
        let id = def.id as usize;
        if id >= lut_size { continue; }
        
        // Province Mode Color
        province_color_lut[id] = [def.r, def.g, def.b];
        
        // Country Mode Color
        if let Some(owner) = state_owners.get(&def.id) {
            if let Some(c) = country_colors.get(owner) {
                country_color_lut[id] = [c.r, c.g, c.b];
            } else {
                country_color_lut[id] = [128, 128, 128]; // Unknown country color
            }
        }
        
        // Terrain Mode Color
        terrain_color_lut[id] = match def.terrain.as_str() {
             "plains" => [247, 166, 86],
             "forest" => [85, 139, 47],
             "hills" => [255, 215, 0],
             "mountain" => [139, 69, 19],
             "urban" => [128, 128, 128],
             "jungle" => [34, 139, 34],
             "marsh" => [47, 79, 79],
             "desert" => [244, 164, 96],
             "water" | "ocean" => [65, 105, 225],
             "lakes" => [65, 155, 225], // Slightly different for lakes
             _ => [200, 200, 200]
        };
    }

    // Calculate province bounds
    let mut province_bounds = HashMap::new();
    for (idx, &id) in province_ids.iter().enumerate() {
        if id == 0 { continue; }
        let x = (idx as u32) % width;
        let y = (idx as u32) / width;
        
        province_bounds.entry(id)
            .and_modify(|b: &mut BoundingBox| {
                b.min_x = b.min_x.min(x);
                b.min_y = b.min_y.min(y);
                b.max_x = b.max_x.max(x);
                b.max_y = b.max_y.max(y);
            })
            .or_insert(BoundingBox { min_x: x, min_y: y, max_x: x, max_y: y });
    }

    // 6. Store in State
    let mut lock = state.0.lock().map_err(|_| "Failed to lock state")?;
    *lock = Some(MapContext {
        width,
        height,
        province_ids,
        definitions,
        country_colors,
        state_owners,
        province_color_lut,
        country_color_lut,
        terrain_color_lut,
        province_bounds,
    });

    Ok(format!("Map initialized: {}x{}", width, height))
}

#[tauri::command]
pub fn get_province_outline(
    state: tauri::State<MapState>,
    province_id: u32,
) -> Result<Vec<(u32, u32)>, String> {
    let context_guard = state.0.lock().map_err(|_| "Failed to lock map state")?;
    let context = context_guard.as_ref().ok_or("Map context not initialized")?;

    let bounds = context.province_bounds.get(&province_id).ok_or("Province bounds not found")?;

    let min_x = bounds.min_x;
    let min_y = bounds.min_y;
    let max_x = bounds.max_x;
    let max_y = bounds.max_y;
    let width = context.width;
    let height = context.height;
    
    let mut edge_pixels = Vec::new();

    // Scan only the bounding box
    for y in min_y..=max_y {
        for x in min_x..=max_x {
            let idx = (y * width + x) as usize;
            if idx >= context.province_ids.len() { continue; }
            
            if context.province_ids[idx] == province_id {
                // Check 4 neighbors
                let mut is_edge = false;
                
                // Top
                if y == 0 || context.province_ids[((y - 1) * width + x) as usize] != province_id {
                    is_edge = true;
                }
                // Bottom
                else if y == height - 1 || context.province_ids[((y + 1) * width + x) as usize] != province_id {
                    is_edge = true;
                }
                // Left
                else if x == 0 || context.province_ids[(y * width + x - 1) as usize] != province_id {
                    is_edge = true;
                }
                // Right
                else if x == width - 1 || context.province_ids[(y * width + x + 1) as usize] != province_id {
                    is_edge = true;
                }

                if is_edge {
                    edge_pixels.push((x, y));
                }
            }
        }
    }

    Ok(edge_pixels)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapMetadata {
    pub width: u32,
    pub height: u32,
    pub province_count: usize,
}

#[tauri::command]
pub fn get_map_metadata(state: tauri::State<MapState>) -> Result<MapMetadata, String> {
    let lock = state.0.lock().map_err(|_| "Failed to lock state")?;
    let ctx = lock.as_ref().ok_or("Map not initialized")?;
    
    Ok(MapMetadata {
        width: ctx.width,
        height: ctx.height,
        province_count: ctx.province_ids.len(),
    })
}

#[tauri::command]
pub fn get_map_preview(
    state: tauri::State<MapState>,
    target_width: u32,
    target_height: u32,
    mode: String,
) -> Result<Vec<u8>, String> {
    let lock = state.0.lock().map_err(|_| "Failed to lock state")?;
    let ctx = lock.as_ref().ok_or("Map not initialized")?;

    let map_width = ctx.width;
    let map_height = ctx.height;
    
    let scale_x = map_width as f32 / target_width as f32;
    let scale_y = map_height as f32 / target_height as f32;
    
    let mut pixels = vec![0u8; (target_width * target_height * 4) as usize];
    
    // Select LUT based on mode
    let lut = match mode.as_str() {
        "province" => &ctx.province_color_lut,
        "country" => &ctx.country_color_lut,
        "terrain" => &ctx.terrain_color_lut,
        _ => &ctx.province_color_lut, // Default fallback
    };
    
    // Parallel rendering for preview
    pixels.par_chunks_exact_mut(4)
        .enumerate()
        .for_each(|(i, pixel)| {
            let x = i as u32 % target_width;
            let y = i as u32 / target_width;
            
            let src_x = (x as f32 * scale_x) as u32;
            let src_y = (y as f32 * scale_y) as u32;
            
            if src_x < map_width && src_y < map_height {
                let idx = (src_y * map_width + src_x) as usize;
                if idx < ctx.province_ids.len() {
                    let pid = ctx.province_ids[idx] as usize;
                    
                    if pid < lut.len() {
                        let c = lut[pid];
                        pixel[0] = c[0];
                        pixel[1] = c[1];
                        pixel[2] = c[2];
                        pixel[3] = 255; // Alpha
                    } else {
                        // Invalid ID?
                         pixel[0] = 0; pixel[1] = 0; pixel[2] = 0; pixel[3] = 255;
                    }
                }
            }
        });

    Ok(pixels)
}

#[tauri::command]
pub fn get_province_at_point(
    state: tauri::State<MapState>,
    x: u32,
    y: u32,
) -> Result<Option<u32>, String> {
    let lock = state.0.lock().map_err(|_| "Failed to lock state")?;
    let ctx = lock.as_ref().ok_or("Map not initialized")?;

    if x >= ctx.width || y >= ctx.height {
        return Ok(None);
    }

    let idx = (y * ctx.width + x) as usize;
    if idx < ctx.province_ids.len() {
        Ok(Some(ctx.province_ids[idx]))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn get_map_tile_direct(
    state: tauri::State<MapState>,
    x: u32,
    y: u32,
    zoom: u32,
    mode: String,
) -> Result<Vec<u8>, String> {
    let lock = state.0.lock().map_err(|_| "Failed to lock state")?;
    let ctx = lock.as_ref().ok_or("Map not initialized")?;

    let tile_size = 512;
    let scale = zoom.max(1);
    let mut pixels = vec![0u8; (tile_size * tile_size * 4) as usize];
    
    let map_width = ctx.width;
    let map_height = ctx.height;

    let src_x_start = x * tile_size * scale;
    let src_y_start = y * tile_size * scale;
    
    // Select LUT based on mode
    let lut = match mode.as_str() {
        "province" => &ctx.province_color_lut,
        "country" => &ctx.country_color_lut,
        "terrain" => &ctx.terrain_color_lut,
        _ => &ctx.province_color_lut, // Default fallback
    };
    
    // Using Rayon for parallel processing of rows within the tile if zoom is large?
    // Actually, for 512x512, single thread is usually fast enough if logic is simple.
    // But let's keep it simple sequential for now to avoid overhead, as simple array lookup is extremely fast.
    // However, if we want extreme speed, we can use par_chunks_mut for the output buffer.
    
    // Let's use parallel iterator for the rows to maximize speed
    pixels.par_chunks_exact_mut(tile_size as usize * 4)
        .enumerate()
        .for_each(|(ty_idx, row_pixels)| {
            let ty = ty_idx as u32;
            let src_y = src_y_start + ty * scale;
            
            if src_y >= map_height {
                 return; // Leave as transparent/black
            }
            
            let row_start_idx = (src_y * map_width) as usize;

            for tx in 0..tile_size {
                let src_x = src_x_start + tx * scale;
                
                if src_x < map_width {
                    let idx = row_start_idx + src_x as usize;
                    
                    // Safety check for bounds
                    if idx < ctx.province_ids.len() {
                        let pid = ctx.province_ids[idx] as usize;
                        
                        if pid < lut.len() {
                            let c = lut[pid];
                            let p_idx = (tx * 4) as usize;
                            row_pixels[p_idx] = c[0];
                            row_pixels[p_idx+1] = c[1];
                            row_pixels[p_idx+2] = c[2];
                            row_pixels[p_idx+3] = 255;
                        }
                    }
                }
            }
        });

    Ok(pixels)
}

