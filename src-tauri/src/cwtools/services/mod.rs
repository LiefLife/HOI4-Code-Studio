//! 服务层模块
//!
//! 提供解析和验证的高级服务接口

pub mod parser_service;
pub mod validation_service;

pub use parser_service::{ParserService, TextChange};
pub use validation_service::{ServiceError, ValidationResponse, ValidationService};
