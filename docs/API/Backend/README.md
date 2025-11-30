# 后端 API 文档

本文档描述了 HOI4 Code Studio 后端 Rust 代码的 API 接口，包括核心模块、命令接口和数据类型定义。

## 📋 模块概览

### [核心模块](./CoreModules.md)
Rust 核心模块详细文档：
- file_tree模块：文件树构建和管理
- json_decoder模块：JSON解析和处理
- bracket_matcher模块：括号匹配算法
- country_tags模块：国家标签加载和缓存
- idea_registry模块：Idea注册和管理
- tag_validator模块：标签引用验证
- dependency模块：依赖项管理

### [命令接口](./Commands.md)
Tauri 命令API详细文档：
- 项目管理API：create_new_project, initialize_project, open_project等
- 文件操作API：read_directory, read_file_content, write_file_content等
- 设置管理API：load_settings, save_settings等
- 搜索功能API：search_files
- 文件树构建API：build_directory_tree等
- JSON处理API：parse_json, stringify_json等
- 括号匹配API：match_brackets等
- 国家标签API：load_country_tags
- Idea注册API：load_ideas等
- 标签验证API：validate_tags
- 依赖项管理API：load_dependencies等
- 项目打包API：pack_project
- 图片处理API：read_image_as_base64等
- 系统API：open_file_dialog等

### [数据类型](./DataTypes.md)
数据结构定义详细文档：
- 项目管理相关类型：CreateProjectResult, OpenProjectResult等
- 文件操作相关类型：FileDialogResult, SearchResult等
- 设置管理相关类型：JsonResult, LaunchGameResult等
- 文件树相关类型：FileNode, FileTreeResult等
- JSON处理相关类型：JsonValidationResult
- 括号匹配相关类型：BracketType, BracketInfo等
- 国家标签相关类型：TagSource, TagEntry等
- Idea注册相关类型：IdeaSource, IdeaEntry等
- 标签验证相关类型：TagValidationError等
- 依赖项管理相关类型：Dependency, DependencyValidation等
- 项目打包相关类型：PackageOptions, PackageResult等
- 图片处理相关类型：ImageReadResult
- 系统相关类型：FileDialogMode

## 🏗️ 架构设计

```
前端请求 → Tauri 命令 → 核心模块 → 系统调用
                ↓              ↓
            参数验证        结果处理
                ↓              ↓
            错误处理 ←←←←←←←←←←←←
```

## 🦀 技术栈

- **Rust**: 后端核心语言
- **Tauri**: 前后端桥接框架
- **Serde**: 序列化/反序列化
- **Tokio**: 异步运行时
- **Regex**: 正则表达式处理

## 📦 模块结构

```
src-tauri/src/
├── lib.rs              # 库入口
├── main.rs             # 主程序入口
├── commands/           # Tauri 命令
├── file_tree.rs        # 文件树处理
├── json_decoder.rs     # JSON 解析
├── dependency.rs       # 依赖管理
├── country_tags.rs     # 国家标签
├── idea_registry.rs    # 想法注册表
├── tag_validator.rs    # 标签验证
└── bracket_matcher.rs  # 括号匹配
```

## 🔧 核心功能

### 项目管理
- 创建新HOI4 Code Studio项目
- 初始化现有HOI4 Mod项目
- 打开和管理项目
- 最近项目列表管理
- 项目配置文件管理

### 文件系统操作
- 目录内容读取和遍历
- 文件内容读写（支持多种编码）
- 文件和文件夹创建
- 文件和文件夹重命名
- 文件树构建（单线程和多线程版本）
- 文件搜索（支持正则表达式）

### 数据处理
- JSON解析、序列化和验证
- JSON路径操作（获取和设置）
- JSON对象合并（浅合并和深度合并）
- 括号匹配算法
- 括号深度计算

### 游戏内容管理
- 国家标签加载和缓存
- Idea注册和管理
- 标签引用验证
- 依赖项管理（HOICS项目和HOI4 Mod）
- 依赖项验证和索引

### 图片处理
- 图片文件读取为base64
- 支持多种格式（PNG, JPG, GIF, DDS, TGA等）
- DDS和TGA格式自动转换为PNG
- 国策图标加载和缓存
- 图标缓存管理

### 系统集成
- 文件选择对话框
- 文件夹打开
- 游戏启动（Steam和学习版）
- 应用程序设置管理
- 游戏目录验证

### 项目打包
- 项目打包为ZIP文件
- 可选择排除依赖项
- 自动排除不必要的文件和目录
- 打包结果统计

## 📖 使用指南

1. **模块使用**: 参考 [核心模块](./CoreModules.md) 了解各模块的功能和接口
2. **命令调用**: 查看 [命令接口](./Commands.md) 了解如何调用后端功能
3. **数据结构**: 阅读 [数据类型](./DataTypes.md) 了解数据格式和约束

## 🔗 相关链接

- [API 主页](../README.md)
- [前端 API](../Frontend/README.md)
- [集成 API](../Integration/README.md)

---

**注意**: 所有后端 API 都遵循 Rust 的安全性和性能最佳实践，确保内存安全和线程安全。