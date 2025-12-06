# 代码高亮 (Syntax Highlighting)

## 概述
基于 `PrismJS` 和自定义逻辑实现的语法高亮系统，特别针对 HOI4 脚本进行了优化。

## 核心逻辑 (`useSyntaxHighlight.ts`)
1. **语言识别**: 根据扩展名自动切换模式。
   - `.txt` -> `hoi4` (自定义语法)
   - `.mod` -> `mod`
   - `.yml` -> `yaml`
   - `.json` -> `json`
2. **Highlight.js 高亮**: 使用 highlight.js 进行基础的词法着色。
3. **括号分级高亮 (Rainbow Brackets)**:
   - 调用 Rust 后端 `getBracketDepths` 获取括号深度映射。
   - 动态生成带有 `brace-depth-N` 样式的 `span` 标签，实现彩虹括号效果。
4. **错误行高亮**: 结合 Linter 结果，为包含错误的行添加红色背景标记。

## 性能优化
- 使用 `document.createTreeWalker` 仅遍历文本节点进行括号替换，避免破坏现有的 Prism HTML 结构。
- 异步更新括号高亮 (`nextTick`)，避免阻塞主渲染线程。

