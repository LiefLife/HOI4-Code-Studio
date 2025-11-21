# 自动补全 (Auto Complete)

## 概述
提供代码编写时的智能提示，支持关键字、动态加载的 Idea 和 Tag。

## 当前状态
- ✅ 已实现基础框架
- ✅ 支持静态关键字补全
- ✅ 支持动态 Idea 补全
- ✅ 支持动态 Tag 补全

## 核心代码

### 补全项定义 (`src/composables/useGrammarCompletion.ts`)
```typescript
export interface GrammarCompletionItem extends Completion {
  /**
   * 来源标签，标识补全项属于何种数据源
   */
  source: 'keyword' | 'idea' | 'tag'
}
```

### 组合式函数接口
```typescript
export function useGrammarCompletion(): {
  staticItems: ComputedRef<GrammarCompletionItem[]> // 静态关键字
  ideaItems: ComputedRef<GrammarCompletionItem[]>   // Idea (民族精神)
  tagItems: ComputedRef<GrammarCompletionItem[]>    // Tag (国家标签)
  allItems: ComputedRef<GrammarCompletionItem[]>    // 合并后的列表
}
```

### 优先级逻辑
补全项的排序优先级如下：
1. **Keyword** (关键字): `boost: 50`
2. **Tag** (国家标签): `boost: 30`
3. **Idea** (民族精神): `boost: 30`

## 扩展指南
若要添加新的静态关键字，请修改 `STATIC_KEYWORDS` 数组。
若要支持新的动态类型，请参考 `createIdeaCompletions` 编写相应的转换函数，并在 `mergeCompletions` 中注册。
