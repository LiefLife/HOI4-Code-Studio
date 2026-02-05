// 服务层模块
//
// 此模块包含所有业务逻辑实现，负责：
// - 核心业务逻辑处理
// - 状态管理
// - 资源管理
// - 数据持久化

// 声明服务模块
pub mod cache_service;
pub mod dependency_service;
pub mod file_service;
pub mod project_service;

// 重新导出服务结构体，便于外部使用
pub use cache_service::CacheService;
pub use dependency_service::DependencyService;
pub use file_service::FileService;
pub use project_service::ProjectService;
