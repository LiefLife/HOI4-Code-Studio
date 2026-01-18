use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MioPreviewData {
    pub source_file: String,
    pub mios: Vec<MioDto>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MioDto {
    pub id: String,
    pub traits: Vec<MioTraitDto>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MioTraitDto {
    pub id: String,
    pub name: Option<String>,
    pub icon: Option<String>,

    pub x: i32,
    pub y: i32,
    pub relative_position_id: Option<String>,

    pub any_parent: Vec<String>,
    pub all_parents: Vec<String>,
    pub parent: Option<MioParentDto>,
    pub mutually_exclusive: Vec<String>,

    pub effects_present: Vec<String>,

    pub file: String,
    pub start: usize,
    pub end: usize,
    pub line: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MioParentDto {
    pub traits: Vec<String>,
    pub num_needed: i32,
}

#[derive(Debug, Clone)]
struct MioDef {
    id: String,
    include: Option<String>,
    trait_defs: Vec<MioTraitDef>,
    add_trait_defs: Vec<MioTraitDef>,
    override_trait_defs: Vec<MioTraitDef>,
    remove_trait_ids: Vec<String>,
}

#[derive(Debug, Clone)]
struct MioTraitDef {
    id: Option<String>,
    name: Option<String>,
    icon: Option<String>,

    x: i32,
    y: i32,
    relative_position_id: Option<String>,

    any_parent: Vec<String>,
    all_parents: Vec<String>,
    parent: Option<MioParentDto>,
    mutually_exclusive: Vec<String>,

    effects_present: Vec<String>,

    file: String,
    start: usize,
    end: usize,
    line: usize,
}

#[tauri::command]
pub fn parse_mio_preview(
    file_path: String,
    content_override: Option<String>,
    project_path: Option<String>,
    game_directory: Option<String>,
    dependency_roots: Option<Vec<String>>,
) -> Result<MioPreviewData, String> {
    let source = normalize_path(&file_path);

    let mut roots: Vec<String> = Vec::new();
    if let Some(p) = project_path {
        if !p.trim().is_empty() {
            roots.push(normalize_path(&p));
        }
    }
    if let Some(deps) = dependency_roots {
        for d in deps {
            if !d.trim().is_empty() {
                roots.push(normalize_path(&d));
            }
        }
    }
    if let Some(g) = game_directory {
        if !g.trim().is_empty() {
            roots.push(normalize_path(&g));
        }
    }

    // 优先保证 game/project/dependency 都能提供组织目录内容。
    // 为了支持 include（按 mio id 引用），我们需要把同目录下的其他文件也解析出来。
    let org_rel = "common/military_industrial_organization/organizations";

    // 读取源文件内容（支持未保存内容覆盖）
    let source_content = match content_override {
        Some(c) => c,
        None => fs::read_to_string(&source)
            .map_err(|e| format!("Failed to read file: {} ({})", source, e))?,
    };

    let mut all_mios: HashMap<String, MioDef> = HashMap::new();

    // 解析所有 roots 下 organizations 目录（包含源文件所在目录的同级）
    for root in &roots {
        let folder = Path::new(root).join(org_rel);
        if folder.exists() {
            read_all_mio_files_under(&folder, &mut all_mios);
        }
    }

    // 也把 source 文件所在目录的 organizations 加进来（防止用户开的是依赖/游戏文件）
    if let Some(src_root) = try_find_root_containing_org_dir(&source) {
        let folder = Path::new(&src_root).join(org_rel);
        if folder.exists() {
            read_all_mio_files_under(&folder, &mut all_mios);
        }
    }

    // 确保至少解析了 source 文件。
    let mios_in_source = parse_mio_file(&source, &source_content);
    for m in mios_in_source {
        all_mios.insert(m.id.clone(), m);
    }

    // 读取中文本地化（simp_chinese）
    let loc_map = load_simp_chinese_localization(&roots);

    // 只输出 source 文件中的 mio（预览当前文件的内容），但 include 会引用 all_mios 进行解析。
    let mut result_mios: Vec<MioDto> = Vec::new();
    let source_only = parse_mio_file(&source, &source_content);

    for mio_def in source_only {
        let resolved = resolve_mio(&mio_def.id, &all_mios, &loc_map);
        result_mios.push(resolved);
    }

    result_mios.sort_by(|a, b| a.id.cmp(&b.id));

    Ok(MioPreviewData {
        source_file: source,
        mios: result_mios,
    })
}

fn resolve_mio(id: &str, all: &HashMap<String, MioDef>, loc: &HashMap<String, String>) -> MioDto {
    let mut warnings: Vec<String> = Vec::new();

    let Some(mio_def) = all.get(id) else {
        return MioDto {
            id: id.to_string(),
            traits: Vec::new(),
            warnings: vec![format!("MIO '{}' not found.", id)],
        };
    };

    // include merge
    let mut traits_map: HashMap<String, MioTraitDto> = HashMap::new();

    if let Some(base_id) = &mio_def.include {
        if base_id == id {
            warnings.push(format!("MIO '{}' includes itself.", id));
        } else {
            let base = resolve_mio(base_id, all, loc);
            for t in base.traits {
                traits_map.insert(t.id.clone(), t);
            }
            // include 的 warning 不自动继承到子（避免太吵），但你可以以后改成合并。
        }
    }

    if mio_def.include.is_some() && !mio_def.trait_defs.is_empty() {
        warnings.push(format!(
            "Military industrial organization '{}' has include property. It should use add_trait, remove_trait or override_trait instead of trait.",
            id
        ));
    }
    if mio_def.include.is_none()
        && (!mio_def.add_trait_defs.is_empty()
            || !mio_def.override_trait_defs.is_empty()
            || !mio_def.remove_trait_ids.is_empty())
    {
        warnings.push(format!(
            "Military industrial organization '{}' doesn't have include property. It should use trait instead of add_trait, remove_trait or override_trait.",
            id
        ));
    }

    // trait + add_trait
    for def in mio_def
        .trait_defs
        .iter()
        .chain(mio_def.add_trait_defs.iter())
    {
        let trait_id = def
            .id
            .clone()
            .unwrap_or_else(|| format!("[missing_token_{}]", simple_hash(&format!("{}:{}", def.file, def.start))));

        if def.id.is_none() {
            warnings.push(format!(
                "A trait defined in this file doesn't have token property: {}.",
                def.file
            ));
        }

        let t = MioTraitDto {
            id: trait_id.clone(),
            name: localize_trait_name(def.name.clone(), loc),
            icon: def.icon.clone(),
            x: def.x,
            y: def.y,
            relative_position_id: def.relative_position_id.clone(),
            any_parent: def.any_parent.clone(),
            all_parents: def.all_parents.clone(),
            parent: def.parent.clone(),
            mutually_exclusive: def.mutually_exclusive.clone(),
            effects_present: def.effects_present.clone(),
            file: def.file.clone(),
            start: def.start,
            end: def.end,
            line: def.line,
        };

        if let Some(old) = traits_map.get(&trait_id) {
            warnings.push(format!(
                "There're more than one trait with ID {} in military industrial organization {} in files: {}, {}.",
                trait_id, id, old.file, def.file
            ));
        }

        traits_map.insert(trait_id, t);
    }

    // override_trait
    for def in &mio_def.override_trait_defs {
        let Some(trait_id) = &def.id else {
            warnings.push(format!(
                "An override_trait defined in this file doesn't have token property: {}.",
                def.file
            ));
            continue;
        };

        if let Some(existing) = traits_map.get_mut(trait_id) {
            if def.name.is_some() {
                existing.name = def.name.clone();
            }
            if def.icon.is_some() {
                existing.icon = def.icon.clone();
            }
            existing.x = def.x;
            existing.y = def.y;
            if def.relative_position_id.is_some() {
                existing.relative_position_id = def.relative_position_id.clone();
            }
            if !def.any_parent.is_empty() {
                existing.any_parent = def.any_parent.clone();
            }
            if !def.all_parents.is_empty() {
                existing.all_parents = def.all_parents.clone();
            }
            if def.parent.is_some() {
                existing.parent = def.parent.clone();
            }
            if !def.mutually_exclusive.is_empty() {
                existing.mutually_exclusive = def.mutually_exclusive.clone();
            }
            if !def.effects_present.is_empty() {
                existing.effects_present = def.effects_present.clone();
            }

            // source span 更新为 override 的位置
            existing.file = def.file.clone();
            existing.start = def.start;
            existing.end = def.end;
            existing.line = def.line;
        } else {
            warnings.push(format!(
                "An override_trait referenced a trait that doesn't exist: {}.",
                trait_id
            ));
        }
    }

    // remove_trait -> 从图上直接删除（与原项目的 visible=false 不同，但符合你选的 A：忽略条件，只要 remove_trait 就当不显示）
    for rid in &mio_def.remove_trait_ids {
        traits_map.remove(rid);
    }

    // 校验 relative_position_id 存在性 + 循环
    validate_relative_position(&traits_map, &mut warnings);

    let mut traits: Vec<MioTraitDto> = traits_map.into_values().collect();
    traits.sort_by(|a, b| a.id.cmp(&b.id));

    MioDto {
        id: id.to_string(),
        traits,
        warnings,
    }
}

fn validate_relative_position(traits: &HashMap<String, MioTraitDto>, warnings: &mut Vec<String>) {
    for t in traits.values() {
        if let Some(rel) = &t.relative_position_id {
            if !traits.contains_key(rel) {
                warnings.push(format!(
                    "Relative position ID of trait {} not exist: {}.",
                    t.id, rel
                ));
            }
        }
    }

    let mut visiting: HashSet<String> = HashSet::new();
    let mut visited: HashSet<String> = HashSet::new();

    for t in traits.values() {
        if visited.contains(&t.id) {
            continue;
        }
        if detect_cycle(&t.id, traits, &mut visiting, &mut visited) {
            warnings.push("There're circular reference in relative position ID.".to_string());
            break;
        }
    }
}

fn detect_cycle(
    id: &str,
    traits: &HashMap<String, MioTraitDto>,
    visiting: &mut HashSet<String>,
    visited: &mut HashSet<String>,
) -> bool {
    if visited.contains(id) {
        return false;
    }
    if visiting.contains(id) {
        return true;
    }

    visiting.insert(id.to_string());

    if let Some(t) = traits.get(id) {
        if let Some(next) = &t.relative_position_id {
            if traits.contains_key(next) {
                if detect_cycle(next, traits, visiting, visited) {
                    return true;
                }
            }
        }
    }

    visiting.remove(id);
    visited.insert(id.to_string());
    false
}

fn read_all_mio_files_under(folder: &Path, out: &mut HashMap<String, MioDef>) {
    let Ok(entries) = fs::read_dir(folder) else {
        return;
    };

    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_file() {
            if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                if ext.eq_ignore_ascii_case("txt") {
                    let path_str = p.to_string_lossy().to_string();
                    if let Ok(content) = fs::read_to_string(&p) {
                        for mio in parse_mio_file(&path_str, &content) {
                            out.insert(mio.id.clone(), mio);
                        }
                    }
                }
            }
        }
    }
}

fn parse_mio_file(file: &str, content: &str) -> Vec<MioDef> {
    let mut result = Vec::new();

    let bytes = content.as_bytes();
    let mut i: usize = 0;

    while i < bytes.len() {
        // 跳过空白
        while i < bytes.len() && is_space(bytes[i]) {
            i += 1;
        }
        if i >= bytes.len() {
            break;
        }

        // 行注释
        if bytes[i] == b'#' {
            while i < bytes.len() && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }

        // 读取 key（mio id）
        let key_start = i;
        if !is_ident_start(bytes[i]) {
            i += 1;
            continue;
        }
        i += 1;
        while i < bytes.len() && is_ident_continue(bytes[i]) {
            i += 1;
        }
        let key = content[key_start..i].trim().to_string();

        // 跳过空白
        while i < bytes.len() && is_space(bytes[i]) {
            i += 1;
        }

        if i >= bytes.len() || bytes[i] != b'=' {
            continue;
        }
        i += 1;

        while i < bytes.len() && is_space(bytes[i]) {
            i += 1;
        }

        if i >= bytes.len() || bytes[i] != b'{' {
            continue;
        }

        let block_start = i;
        let block_end = match find_matching_brace(content, block_start) {
            Some(v) => v,
            None => {
                // 无法闭合，停止
                break;
            }
        };

        let block_content = &content[(block_start + 1)..block_end];

        let mio_def = parse_mio_block(&key, file, content, block_start, block_end, block_content);
        result.push(mio_def);

        i = block_end + 1;
    }

    result
}

fn parse_mio_block(
    mio_id: &str,
    file: &str,
    full_content: &str,
    block_start: usize,
    _block_end: usize,
    block_content: &str,
) -> MioDef {
    let include = extract_field_value(block_content, "include");

    let trait_defs = parse_trait_list(file, full_content, block_start, block_content, "trait");
    let add_trait_defs = parse_trait_list(file, full_content, block_start, block_content, "add_trait");
    let override_trait_defs = parse_trait_list(file, full_content, block_start, block_content, "override_trait");
    let remove_trait_ids = parse_string_list(block_content, "remove_trait");

    MioDef {
        id: mio_id.to_string(),
        include,
        trait_defs,
        add_trait_defs,
        override_trait_defs,
        remove_trait_ids,
    }
}

fn parse_trait_list(
    file: &str,
    full_content: &str,
    mio_block_abs_start: usize,
    mio_block_content: &str,
    field: &str,
) -> Vec<MioTraitDef> {
    let mut traits = Vec::new();

    let pattern = format!("{}", field);
    let bytes = mio_block_content.as_bytes();
    let mut i = 0usize;

    while i < bytes.len() {
        // 查找字段名
        if starts_with_word(mio_block_content, i, &pattern) {
            let mut j = i + pattern.len();
            while j < bytes.len() && is_space(bytes[j]) {
                j += 1;
            }
            if j >= bytes.len() || bytes[j] != b'=' {
                i += 1;
                continue;
            }
            j += 1;
            while j < bytes.len() && is_space(bytes[j]) {
                j += 1;
            }
            if j >= bytes.len() || bytes[j] != b'{' {
                i += 1;
                continue;
            }

            let abs_trait_block_start = mio_block_abs_start + 1 + j;
            let trait_block_end_abs = match find_matching_brace(full_content, abs_trait_block_start) {
                Some(v) => v,
                None => break,
            };

            let trait_block_content = &full_content[(abs_trait_block_start + 1)..trait_block_end_abs];

            let def = parse_trait_block(file, full_content, abs_trait_block_start, trait_block_end_abs, trait_block_content);
            traits.push(def);

            // 前进到块结束
            let rel_end = (trait_block_end_abs + 1).saturating_sub(mio_block_abs_start + 1);
            i = rel_end;
            continue;
        }

        i += 1;
    }

    traits
}

fn parse_trait_block(
    file: &str,
    full_content: &str,
    abs_start: usize,
    abs_end: usize,
    block: &str,
) -> MioTraitDef {
    let id = extract_field_value(block, "token");
    let name = extract_field_value(block, "name");
    let icon = extract_field_value(block, "icon");

    let (x, y) = extract_position(block);
    let relative_position_id = extract_field_value(block, "relative_position_id");

    let any_parent = parse_string_list(block, "any_parent");
    let all_parents = parse_string_list(block, "all_parents");
    let mutually_exclusive = parse_string_list(block, "mutually_exclusive");

    let parent = parse_parent(block);

    let mut effects_present: Vec<String> = Vec::new();
    if contains_top_level_assignment(block, "equipment_bonus") {
        effects_present.push("equipment".to_string());
    }
    if contains_top_level_assignment(block, "production_bonus") {
        effects_present.push("production".to_string());
    }
    if contains_top_level_assignment(block, "organization_modifier") {
        effects_present.push("organization".to_string());
    }

    let line = get_line_number(full_content, abs_start);

    MioTraitDef {
        id,
        name,
        icon,
        x,
        y,
        relative_position_id,
        any_parent,
        all_parents,
        parent,
        mutually_exclusive,
        effects_present,
        file: file.to_string(),
        start: abs_start,
        end: abs_end + 1,
        line,
    }
}

fn parse_parent(block: &str) -> Option<MioParentDto> {
    let parent_block = extract_block(block, "parent")?;
    let traits = parse_string_list(&parent_block, "traits");
    if traits.is_empty() {
        return None;
    }
    let num_needed = extract_i32(&parent_block, "num_parents_needed").unwrap_or(1);
    Some(MioParentDto { traits, num_needed })
}

fn extract_position(block: &str) -> (i32, i32) {
    let pos_block = extract_block(block, "position");
    if let Some(p) = pos_block {
        let x = extract_i32(&p, "x").unwrap_or(0);
        let y = extract_i32(&p, "y").unwrap_or(0);
        return (x, y);
    }
    (0, 0)
}

fn extract_i32(block: &str, key: &str) -> Option<i32> {
    let v = extract_field_value(block, key)?;
    v.parse::<f64>().ok().map(|f| f.round() as i32)
}

fn extract_field_value(block: &str, key: &str) -> Option<String> {
    // 非严格：匹配 `key = value`，value 截到行尾/注释/右花括号
    // 支持 quoted/unquoted
    let mut i = 0usize;
    let bytes = block.as_bytes();

    while i < bytes.len() {
        if starts_with_word(block, i, key) {
            let mut j = i + key.len();
            while j < bytes.len() && is_space(bytes[j]) {
                j += 1;
            }
            if j >= bytes.len() || bytes[j] != b'=' {
                i += 1;
                continue;
            }
            j += 1;
            while j < bytes.len() && is_space(bytes[j]) {
                j += 1;
            }
            if j >= bytes.len() {
                return None;
            }

            // quoted
            if bytes[j] == b'"' {
                j += 1;
                let start = j;
                while j < bytes.len() {
                    if bytes[j] == b'"' && (j == 0 || bytes[j - 1] != b'\\') {
                        return Some(block[start..j].trim().to_string());
                    }
                    j += 1;
                }
                return Some(block[start..].trim().to_string());
            }

            let start = j;
            while j < bytes.len() {
                let c = bytes[j];
                // 未加引号的 value：
                // 1) 需要支持 `x=1 y=2` 这种同一行写法（否则会把 `1 y=2` 当成 x 的值）
                // 2) 大多数字段值（数字、token、路径）都不需要包含空格
                if c == b'\n' || c == b'\r' || c == b'#' || c == b'}' || c == b' ' || c == b'\t' {
                    break;
                }
                j += 1;
            }
            return Some(block[start..j].trim().to_string());
        }

        i += 1;
    }

    None
}

fn parse_string_list(block: &str, key: &str) -> Vec<String> {
    let Some(inner) = extract_block(block, key) else {
        return Vec::new();
    };

    let mut result = Vec::new();
    let bytes = inner.as_bytes();
    let mut i = 0usize;

    while i < bytes.len() {
        // skip
        while i < bytes.len() && (is_space(bytes[i]) || bytes[i] == b',' || bytes[i] == b';') {
            i += 1;
        }
        if i >= bytes.len() {
            break;
        }
        if bytes[i] == b'#' {
            while i < bytes.len() && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }

        if is_ident_start(bytes[i]) {
            let start = i;
            i += 1;
            while i < bytes.len() && is_ident_continue(bytes[i]) {
                i += 1;
            }
            let v = inner[start..i].trim();
            if !v.is_empty() {
                result.push(v.to_string());
            }
            continue;
        }

        i += 1;
    }

    result
}

fn extract_block(block: &str, key: &str) -> Option<String> {
    let bytes = block.as_bytes();
    let mut i = 0usize;

    while i < bytes.len() {
        if starts_with_word(block, i, key) {
            let mut j = i + key.len();
            while j < bytes.len() && is_space(bytes[j]) {
                j += 1;
            }
            if j >= bytes.len() || bytes[j] != b'=' {
                i += 1;
                continue;
            }
            j += 1;
            while j < bytes.len() && is_space(bytes[j]) {
                j += 1;
            }
            if j >= bytes.len() || bytes[j] != b'{' {
                i += 1;
                continue;
            }
            let start = j;
            let end = find_matching_brace_local(block, start)?;
            return Some(block[(start + 1)..end].to_string());
        }

        i += 1;
    }

    None
}

fn find_matching_brace_local(content: &str, open_brace_index: usize) -> Option<usize> {
    find_matching_brace(content, open_brace_index)
}

fn find_matching_brace(content: &str, open_brace_index: usize) -> Option<usize> {
    let bytes = content.as_bytes();
    if open_brace_index >= bytes.len() || bytes[open_brace_index] != b'{' {
        return None;
    }

    let mut depth = 1i32;
    let mut i = open_brace_index + 1;
    let mut in_string = false;
    let mut in_line_comment = false;

    while i < bytes.len() {
        let c = bytes[i];

        if !in_string && c == b'#' {
            in_line_comment = true;
            i += 1;
            continue;
        }

        if in_line_comment {
            if c == b'\n' {
                in_line_comment = false;
            }
            i += 1;
            continue;
        }

        if c == b'"' {
            if i == 0 || bytes[i - 1] != b'\\' {
                in_string = !in_string;
            }
            i += 1;
            continue;
        }

        if in_string {
            i += 1;
            continue;
        }

        if c == b'{' {
            depth += 1;
        } else if c == b'}' {
            depth -= 1;
            if depth == 0 {
                return Some(i);
            }
        }

        i += 1;
    }

    None
}

fn get_line_number(content: &str, position: usize) -> usize {
    let mut line = 1usize;
    for (idx, ch) in content.char_indices() {
        if idx >= position {
            break;
        }
        if ch == '\n' {
            line += 1;
        }
    }
    line
}

fn is_space(c: u8) -> bool {
    c == b' ' || c == b'\t' || c == b'\r' || c == b'\n'
}

fn is_ident_start(c: u8) -> bool {
    (c >= b'a' && c <= b'z') || (c >= b'A' && c <= b'Z') || c == b'_' || c == b'@'
}

fn is_ident_continue(c: u8) -> bool {
    is_ident_start(c) || (c >= b'0' && c <= b'9') || c == b'.' || c == b'-'
}

fn starts_with_word(s: &str, idx: usize, word: &str) -> bool {
    if idx + word.len() > s.len() {
        return false;
    }
    let slice = &s[idx..idx + word.len()];
    if slice != word {
        return false;
    }

    let before = if idx == 0 { None } else { s.as_bytes().get(idx - 1).copied() };
    let after = s.as_bytes().get(idx + word.len()).copied();

    let before_ok = before.map(|b| !is_ident_continue(b)).unwrap_or(true);
    let after_ok = after.map(|b| !is_ident_continue(b)).unwrap_or(true);

    before_ok && after_ok
}

fn contains_top_level_assignment(block: &str, key: &str) -> bool {
    // 宽松：只要出现 key = 就算存在（忽略深度差异）
    let needle = format!("{}", key);
    block.contains(&needle) && block.contains('=')
}

fn simple_hash(s: &str) -> String {
    // 非加密 hash：FNV-1a 32bit
    let mut hash: u32 = 2166136261;
    for b in s.as_bytes() {
        hash ^= *b as u32;
        hash = hash.wrapping_mul(16777619);
    }
    format!("{:08x}", hash)
}

fn normalize_path(p: &str) -> String {
    p.replace('\\', "/").replace("//", "/")
}

fn localize_trait_name(name: Option<String>, loc: &HashMap<String, String>) -> Option<String> {
    let Some(n) = name else {
        return None;
    };
    let key = n.trim();
    if key.is_empty() {
        return Some(n);
    }
    if let Some(v) = loc.get(key) {
        return Some(v.clone());
    }
    Some(n)
}

fn load_simp_chinese_localization(roots: &[String]) -> HashMap<String, String> {
    let mut map: HashMap<String, String> = HashMap::new();

    for root in roots {
        if root.trim().is_empty() {
            continue;
        }
        let base = Path::new(root)
            .join("localisation")
            .join("simp_chinese");
        if !base.exists() || !base.is_dir() {
            continue;
        }

        for entry in WalkDir::new(&base)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if !entry.file_type().is_file() {
                continue;
            }
            let path = entry.path();
            let ext = path
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            if ext != "yml" {
                continue;
            }

            let content = match fs::read_to_string(path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            parse_hoi4_localization_yml(&content, &mut map);
        }
    }

    map
}

fn parse_hoi4_localization_yml(content: &str, out: &mut HashMap<String, String>) {
    // 支持：
    // key: "文本"
    // key:0 "文本"
    // 并忽略：l_simp_chinese:
    for raw_line in content.lines() {
        let mut line = raw_line.trim();
        if line.is_empty() {
            continue;
        }

        // 去 BOM
        if line.starts_with('\u{feff}') {
            line = line.trim_start_matches('\u{feff}');
        }

        if line.is_empty() {
            continue;
        }
        if line.starts_with('#') {
            continue;
        }

        // header
        if line.ends_with(':') {
            continue;
        }

        let Some(colon_pos) = line.find(':') else {
            continue;
        };

        let key = line[..colon_pos].trim();
        if key.is_empty() {
            continue;
        }

        let mut rest = line[colon_pos + 1..].trim_start();

        // optional numeric like :0
        if let Some(first) = rest.as_bytes().first().copied() {
            if first.is_ascii_digit() {
                let mut idx = 0usize;
                let bytes = rest.as_bytes();
                while idx < bytes.len() && bytes[idx].is_ascii_digit() {
                    idx += 1;
                }
                rest = rest[idx..].trim_start();
            }
        }

        if !rest.starts_with('"') {
            continue;
        }
        rest = &rest[1..];

        let mut value = String::new();
        let mut chars = rest.chars().peekable();
        while let Some(ch) = chars.next() {
            if ch == '"' {
                break;
            }
            if ch == '\\' {
                // 简单处理转义，保留后续字符
                if let Some(next) = chars.next() {
                    value.push(next);
                    continue;
                }
            }
            value.push(ch);
        }

        if value.trim().is_empty() {
            continue;
        }

        // 不覆盖已有 key（优先让前面的文件生效，保持稳定）
        out.entry(key.to_string()).or_insert(value);
    }
}

fn try_find_root_containing_org_dir(file: &str) -> Option<String> {
    let p = PathBuf::from(file);
    let mut cur = p.parent()?.to_path_buf();
    for _ in 0..10 {
        if cur.join("common").exists() {
            return Some(cur.to_string_lossy().to_string());
        }
        if !cur.pop() {
            break;
        }
    }
    None
}
