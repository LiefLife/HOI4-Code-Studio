# HOI4 Code Studio API 文档

欢迎查阅 HOI4 Code Studio 项目的 API 文档。本文档详细描述了项目中各个模块的接口、数据结构和交互方式。

## 📚 文档结构

### 快速参考
- **[API 快速参考](./QUICK_REFERENCE.md)**: 常用 API 快速查找和代码示例

### 前端 API
- **[Frontend API](./Frontend/README.md)**: 前端接口文档
  - [Tauri API](./Frontend/TauriAPI.md): Tauri 桥接接口
  - [组件 API](./Frontend/Components.md): Vue 组件接口
  - [组合式函数 API](./Frontend/Composables.md): Vue Composables 接口

### 后端 API
- **[Backend API](./Backend/README.md)**: 后端接口文档
  - [核心模块](./Backend/CoreModules.md): Rust 核心模块接口
  - [命令接口](./Backend/Commands.md): Tauri 命令接口
  - [数据类型](./Backend/DataTypes.md): 数据结构定义

### 集成 API
- **[Integration API](./Integration/README.md)**: 集成接口文档
  - 前后端通信协议
  - 数据序列化格式
  - 错误处理机制

## 🚀 快速开始

1. 了解项目架构：查看 [项目概述](../README.md)
2. 选择感兴趣的模块：浏览相应的 API 文档
3. 查看示例代码：每个 API 文档都包含使用示例
4. 参考集成指南：了解如何正确使用各个模块

## 📝 文档约定

- 所有 API 接口都使用 TypeScript 类型注解
- Rust 代码使用 Rust 语法高亮
- 示例代码可直接复制使用
- 重要变更会在文档中标注版本信息

## 🎯 API 快速导航

### 常用功能快速链接

#### 项目管理
- [创建项目](./Backend/Commands.md#项目管理api)：`create_new_project`, `initialize_project`
- [打开项目](./Backend/Commands.md#项目管理api)：`open_project`, `get_recent_projects`
- [项目配置](./Backend/Commands.md#设置管理api)：`load_settings`, `save_settings`

#### 文件操作
- [读取文件](./Backend/Commands.md#文件操作api)：`read_file_content`, `read_directory`
- [写入文件](./Backend/Commands.md#文件操作api)：`write_file_content`, `create_file`
- [文件搜索](./Backend/Commands.md#搜索功能api)：`search_files`

#### 编辑器功能
- [语法高亮](./Frontend/Composables.md#usesyntaxhighlight)：`useSyntaxHighlight`
- [自动补全](./Frontend/Composables.md#usegrammarcompletion)：`useGrammarCompletion`
- [错误提示](./Frontend/Composables.md#useerrortip)：`useErrorTip`

#### 游戏内容处理
- [国家标签](./Backend/Commands.md#国家标签api)：`load_country_tags`
- [Idea注册](./Backend/Commands.md#idea注册api)：`load_ideas`
- [标签验证](./Backend/Commands.md#标签验证api)：`validate_tags`

### 按使用场景导航

#### 前端开发
1. [组件开发](./Frontend/Components.md)：了解 Vue 组件接口
2. [状态管理](./Frontend/Composables.md)：使用 Composables 管理状态
3. [后端通信](./Frontend/TauriAPI.md)：调用 Rust 后端功能

#### 后端开发
1. [核心模块](./Backend/CoreModules.md)：了解 Rust 核心功能
2. [命令接口](./Backend/Commands.md)：实现 Tauri 命令
3. [数据类型](./Backend/DataTypes.md)：定义数据结构

#### 集成开发
1. [通信协议](./Integration/README.md#-ipc-通信协议)：了解前后端通信
2. [数据序列化](./Integration/README.md#-数据序列化规范)：处理数据交换
3. [错误处理](./Integration/README.md#️-错误处理机制)：统一错误处理

## 🔗 相关链接

- [项目主页](../../README.md)
- [开发指南](../README.md)
- [测试文档](../Testing/README.md)

---

**注意**: 本文档随代码更新而同步更新，如有疑问请提交 Issue 或 PR。