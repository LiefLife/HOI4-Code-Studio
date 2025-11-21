# 错误提示系统 (Error Tip)

## 概述
负责对 HOI4 脚本进行静态分析，提供语法检查和错误提示功能。

## 核心模块
位于 `src/utils/ErrorTip/`：
- **Tokenizer**: 词法分析器，将文本转换为 Token 流。
- **Rules**:具体的检查规则集合。

## 核心逻辑
1. **Tokenization**: 使用 `tokenize` 函数将代码分解为 Token。
2. **Cleaning**: 使用 `generateCleanContent` 生成用于正则匹配的清洗文本（保留长度，替换注释/字符串为空格）。
3. **Linting**: 遍历规则列表，生成 Diagnostics。

## 规则开发示例
以下是 `braces.ts` (括号匹配规则) 的简化逻辑，展示了如何利用 Token 流进行检查：

```typescript
export const bracesRule: Rule = {
  name: 'braces',
  apply(_content, _lines, _lineStarts, _ctx, tokens): RuleResult {
    const errors = []
    // ... 
    const stack: Token[] = []

    for (const token of tokens) {
      if (token.type !== TokenType.Operator) continue

      if (token.value === '{') {
        stack.push(token)
      } else if (token.value === '}') {
        if (stack.length === 0) {
          // Error: 多余的 '}'
        } else {
          stack.pop()
        }
      }
    }
    // Error: 栈中剩余的未闭合 '{'
    return { errors, ranges }
  }
}
```

## 维护指南
- 添加新规则请在 `rules/` 目录下新建文件并实现 `LintRule` 接口。
- 修改 Tokenizer 逻辑需谨慎，必须保证索引位置与原始文本一致。
