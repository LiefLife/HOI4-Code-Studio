# 创建项目 (Create Project)

## 概述
向导式创建新的 Mod 项目，自动生成标准目录结构和描述文件。

## 输入项
- **项目名称**: Mod 的显示名称。
- **版本号**: Mod 版本 (默认 1.0.0)。
- **保存位置**: 项目父目录。
- **Replace Path**: 可选的替换路径配置 (用于全改 Mod 覆盖原版内容)，支持多选：
  - `common`, `events`, `music`
  - `history/states`, `history/units`, `history/countries`

## 生成逻辑
后端 `create_new_project` 命令会执行：
1. 创建项目根目录。
2. 创建基础子目录 (`interface`, `gfx`, `localisation`)。
3. 创建选中的 `replace_path` 目录。
4. 生成 `descriptor.mod` 文件。
5. 创建 `.hoi4-code-studio` 项目标识文件。

## 交互
成功创建后，应用会自动跳转到编辑器页面并打开新项目。

