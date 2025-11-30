# 前端 API 文档

本文档描述了 HOI4 Code Studio 前端部分的 API 接口，包括 Vue 组件、组合式函数和与后端的通信接口。

## 📋 模块概览

### [Tauri API](./TauriAPI.md)
Tauri 桥接接口，负责前端与 Rust 后端的通信：
- 文件系统操作
- 项目管理命令
- 系统级功能调用

### [组件 API](./Components.md)
Vue 组件接口定义：
- 编辑器组件
- 面板组件
- 对话框组件
- 工具栏组件

### [组合式函数 API](./Composables.md)
Vue Composables 接口：
- 状态管理
- 业务逻辑封装
- 响应式数据处理

### [主题系统](../../Frontend/Themes.md)
HOI4 Code Studio 主题系统：
- 50+ 预定义主题
- HOI4国家主题
- 无障碍友好主题
- 主题自定义指南

## 🔄 数据流

```
用户交互 → Vue 组件 → Composables → Tauri API → Rust 后端
                ↑                              ↓
                ←←←←←←←←←← 响应数据 ←←←←←←←←←←
```

## 🛠️ 技术栈

- **Vue 3**: 前端框架
- **TypeScript**: 类型安全
- **Tauri**: 前后端桥接
- **Vite**: 构建工具
- **Pinia**: 状态管理

## 📖 使用指南

1. **组件使用**: 参考 [组件 API](./Components.md) 了解各组件的 props、events 和 slots
2. **状态管理**: 查看 [Composables API](./Composables.md) 了解如何使用组合式函数
3. **后端通信**: 阅读 [Tauri API](./TauriAPI.md) 了解如何调用后端功能

## 🔗 相关链接

- [API 主页](../README.md)
- [后端 API](../Backend/README.md)
- [集成 API](../Integration/README.md)

---

**注意**: 所有前端 API 都遵循 Vue 3 Composition API 规范，建议使用 TypeScript 进行开发。