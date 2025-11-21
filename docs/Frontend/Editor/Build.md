# 一键打包 (Build/Package)

## 概述
将 Mod 项目打包为标准的 `.zip` 格式，便于发布到 Paradox Mods 或 Steam Workshop。

## 功能流程
1. **配置**: 用户输入目标文件名 (默认 `project.zip`)。
2. **验证**: 检查文件名合法性 (必须以 `.zip` 结尾)。
3. **执行**: 调用后端打包命令。
4. **反馈**: 显示打包进度和最终结果，提供"打开输出文件夹"的快捷入口。

## 核心组件
- `src/components/editor/PackageDialog.vue`: 打包 UI 对话框。
- `src-tauri/src/lib.rs`: 后端 `package_project` 命令实现 (基于 `zip` crate)。

## 排除规则
打包过程会自动排除以下开发文件：
- `.git/` 相关目录
- `node_modules/`
- 系统隐藏文件 (以 `.` 开头的文件)

