// 括号匹配算法模块
// 使用Rust高级特性：宏、泛型、迭代器等

use serde::{Deserialize, Serialize};

/// 括号类型枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BracketType {
    Round,   // ()
    Square,  // []
    Curly,   // {}
}

/// 括号信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BracketInfo {
    /// 括号类型
    pub bracket_type: BracketType,
    /// 起始位置
    pub start: usize,
    /// 结束位置
    pub end: usize,
    /// 嵌套深度
    pub depth: usize,
    /// 是否匹配
    pub matched: bool,
}

/// 括号匹配结果
#[derive(Debug, Serialize, Deserialize)]
pub struct BracketMatchResult {
    pub success: bool,
    pub message: String,
    /// 所有括号对
    pub brackets: Vec<BracketInfo>,
    /// 未匹配的括号位置
    pub unmatched: Vec<usize>,
}

/// 宏：判断是否为开括号
macro_rules! is_open_bracket {
    ($ch:expr) => {
        matches!($ch, '(' | '[' | '{')
    };
}

/// 宏：判断是否为闭括号
macro_rules! is_close_bracket {
    ($ch:expr) => {
        matches!($ch, ')' | ']' | '}')
    };
}

/// 获取括号类型
fn get_bracket_type(ch: char) -> BracketType {
    match ch {
        '(' | ')' => BracketType::Round,
        '[' | ']' => BracketType::Square,
        '{' | '}' => BracketType::Curly,
        _ => BracketType::Round, // 默认值
    }
}

/// 宏：判断括号是否匹配
macro_rules! brackets_match {
    ($open:expr, $close:expr) => {
        match ($open, $close) {
            ('(', ')') => true,
            ('[', ']') => true,
            ('{', '}') => true,
            _ => false,
        }
    };
}

/// 查找括号匹配
/// 
/// # 参数
/// * `content` - 文本内容
/// 
/// # 返回
/// 括号匹配结果
pub fn find_bracket_matches(content: &str) -> BracketMatchResult {
    let mut stack: Vec<(char, usize, usize)> = Vec::new(); // (字符, 位置, 深度)
    let mut brackets = Vec::new();
    let mut unmatched = Vec::new();
    let mut current_depth: usize = 0;
    
    // 遍历所有字符
    for (pos, ch) in content.chars().enumerate() {
        if is_open_bracket!(ch) {
            // 开括号：压栈
            current_depth += 1;
            stack.push((ch, pos, current_depth));
        } else if is_close_bracket!(ch) {
            // 闭括号：尝试匹配
            if let Some((_open_ch, open_pos, depth)) = stack.pop() {
                if brackets_match!(_open_ch, ch) {
                    // 匹配成功
                    brackets.push(BracketInfo {
                        bracket_type: get_bracket_type(ch),
                        start: open_pos,
                        end: pos,
                        depth,
                        matched: true,
                    });
                    current_depth = current_depth.saturating_sub(1);
                } else {
                    // 括号类型不匹配
                    unmatched.push(open_pos);
                    unmatched.push(pos);
                }
            } else {
                // 没有对应的开括号
                unmatched.push(pos);
            }
        }
    }
    
    // 栈中剩余的都是未匹配的开括号
    for (_, pos, _) in stack {
        unmatched.push(pos);
    }
    
    // 按位置排序
    brackets.sort_by_key(|b| b.start);
    unmatched.sort();
    
    BracketMatchResult {
        success: unmatched.is_empty(),
        message: if unmatched.is_empty() {
            format!("找到 {} 对匹配的括号", brackets.len())
        } else {
            format!("找到 {} 对匹配的括号，{} 个未匹配", brackets.len(), unmatched.len())
        },
        brackets,
        unmatched,
    }
}

/// 查找光标位置的匹配括号
/// 
/// # 参数
/// * `content` - 文本内容
/// * `cursor_pos` - 光标位置
/// 
/// # 返回
/// 匹配的括号位置（如果有）
pub fn find_matching_bracket(content: &str, cursor_pos: usize) -> Option<usize> {
    let chars: Vec<char> = content.chars().collect();
    
    if cursor_pos >= chars.len() {
        return None;
    }
    
    let current_char = chars[cursor_pos];
    
    if is_open_bracket!(current_char) {
        // 向后查找匹配的闭括号
        find_closing_bracket(&chars, cursor_pos)
    } else if is_close_bracket!(current_char) {
        // 向前查找匹配的开括号
        find_opening_bracket(&chars, cursor_pos)
    } else {
        None
    }
}

/// 向后查找匹配的闭括号
fn find_closing_bracket(chars: &[char], start: usize) -> Option<usize> {
    let open_char = chars[start];
    let close_char = match open_char {
        '(' => ')',
        '[' => ']',
        '{' => '}',
        _ => return None,
    };
    
    let mut depth = 1;
    
    for (i, &ch) in chars.iter().enumerate().skip(start + 1) {
        if ch == open_char {
            depth += 1;
        } else if ch == close_char {
            depth -= 1;
            if depth == 0 {
                return Some(i);
            }
        }
    }
    
    None
}

/// 向前查找匹配的开括号
fn find_opening_bracket(chars: &[char], start: usize) -> Option<usize> {
    let close_char = chars[start];
    let open_char = match close_char {
        ')' => '(',
        ']' => '[',
        '}' => '{',
        _ => return None,
    };
    
    let mut depth = 1;
    
    for i in (0..start).rev() {
        let ch = chars[i];
        if ch == close_char {
            depth += 1;
        } else if ch == open_char {
            depth -= 1;
            if depth == 0 {
                return Some(i);
            }
        }
    }
    
    None
}

/// 获取括号深度映射
/// 
/// # 参数
/// * `content` - 文本内容
/// 
/// # 返回
/// 每个位置的括号深度
pub fn get_bracket_depth_map(content: &str) -> Vec<usize> {
    let mut depth_map = Vec::with_capacity(content.len());
    let mut current_depth: usize = 0;
    
    for ch in content.chars() {
        if is_open_bracket!(ch) {
            current_depth += 1;
            depth_map.push(current_depth);
        } else if is_close_bracket!(ch) {
            depth_map.push(current_depth);
            current_depth = current_depth.saturating_sub(1);
        } else {
            depth_map.push(current_depth);
        }
    }
    
    depth_map
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_find_bracket_matches() {
        let content = "function test() { return [1, 2, 3]; }";
        let result = find_bracket_matches(content);
        assert!(result.success);
        assert_eq!(result.brackets.len(), 3); // (), [], {}
    }
    
    #[test]
    fn test_unmatched_brackets() {
        let content = "function test() { return [1, 2, 3; }";
        let result = find_bracket_matches(content);
        assert!(!result.success);
        assert!(!result.unmatched.is_empty());
    }
    
    #[test]
    fn test_find_matching_bracket() {
        let content = "function test() { }";
        let chars: Vec<char> = content.chars().collect();
        
        // 查找 '(' 的匹配
        let open_paren_pos = chars.iter().position(|&c| c == '(').unwrap();
        let close_paren_pos = find_matching_bracket(content, open_paren_pos);
        assert!(close_paren_pos.is_some());
        assert_eq!(chars[close_paren_pos.unwrap()], ')');
    }
    
    #[test]
    fn test_bracket_depth_map() {
        let content = "{ [ ( ) ] }";
        let depth_map = get_bracket_depth_map(content);
        assert_eq!(depth_map.iter().max(), Some(&3));
    }
}
