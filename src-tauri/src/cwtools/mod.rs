//! cwtools HOI4 语法验证模块
//!
//! 本模块实现了 Paradox 脚本的解析、验证和诊断功能

pub mod models;
pub mod parser;
pub mod validator;
pub mod rules;
pub mod services;
pub mod diagnostic;
pub mod formatter;
pub mod error_logger;
pub mod fallback;
pub mod config;
pub mod commands;
