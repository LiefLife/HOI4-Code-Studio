# 后端库 (Backend Libraries)

## 概述
记录后端使用的关键 Rust 库及其用途，基于 `Cargo.toml`。

## 核心依赖列表
- **tauri**: 2.x 版本，应用框架核心。
- **serde / serde_json**: 强大的序列化/反序列化库，用于前后端 JSON 通信及文件读写。
- **rayon**: 数据并行库，用于加速全局文件搜索 (`file_tree.rs`)。
- **walkdir**: 高效递归遍历文件系统。
- **regex**: 正则表达式引擎，用于文本搜索和 Tokenizer 辅助。
- **chrono**: 日期时间处理。
- **rfd**: Native File Dialog (跨平台文件选择对话框)。
- **dirs**: 获取系统标准目录 (如 AppData, Documents)。
- **zip**: 用于文件打包/压缩 (导出 Mod)。
- **image / image_dds**: 图像处理，支持 HOI4 特有的 `.dds` 和 `.tga` 格式转换预览。
- **chardetng / encoding_rs**: 字符编码检测与转换 (处理非 UTF-8 的老旧文本)。

