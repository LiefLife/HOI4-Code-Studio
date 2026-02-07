//! 验证器模块
//!
//! 负责基于规则验证 AST 的正确性

pub mod scope;
pub mod reference;
pub mod core;

pub use scope::{Scope, ScopeError, ScopeManager, ScopeTransition};
pub use reference::ReferenceChecker;
pub use core::{Validator, ValidationContext, ValidationResult};
