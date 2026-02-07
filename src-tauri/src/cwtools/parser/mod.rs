//! 解析器模块
//!
//! 负责将 Paradox 脚本文本转换为抽象语法树（AST）

pub mod lexer;
pub mod parser;

pub use lexer::{LexError, Lexer};
pub use parser::{ParseError, ParseErrorType, Parser};
