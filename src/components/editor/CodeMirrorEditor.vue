<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentMore, indentLess } from '@codemirror/commands'
import { bracketMatching, indentOnInput, indentUnit } from '@codemirror/language'
import { closeBrackets, autocompletion, type CompletionContext } from '@codemirror/autocomplete'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { javascript } from '@codemirror/lang-javascript'
import { hoi4 } from '../../lang/hoi4'
import { createLinter } from '../../utils/ErrorTip'
import { setIdeaRoots, ensureIdeaRegistry } from '../../composables/useIdeaRegistry'
import { useGrammarCompletion } from '../../composables/useGrammarCompletion'
import { rainbowBrackets, rainbowTheme } from './rainbowBrackets'
import { useEditorTheme } from '../../composables/useEditorTheme'
import { useRGBColorDisplay } from '../../composables/useRGBColorDisplay'
import { useEditorFont } from '../../composables/useEditorFont'

const props = defineProps<{
  content: string
  isReadOnly: boolean
  fileName?: string
  filePath?: string
  projectRoot?: string
  gameDirectory?: string
}>()

const emit = defineEmits<{
  'update:content': [value: string]
  cursorChange: [line: number, column: number]
  scroll: []
  contextmenu: [event: MouseEvent]
}>()

const editorContainer = ref<HTMLDivElement | null>(null)
let editorView: EditorView | null = null

// GrammarCompletion 组合式，提供统一的补全项视图
const { allItems } = useGrammarCompletion()

// 编辑器主题
const { editorThemeVersion, getCurrentEditorTheme } = useEditorTheme()

// RGB颜色显示
const { 
  createRGBColorField, 
  loadSettingsFromStorage,
  getEnabled,
} = useRGBColorDisplay()

// 编辑器字体设置
const { 
  fontConfig, 
  fontConfigVersion, 
  createEditorFontTheme 
} = useEditorFont()

/**
 * 基于 CodeMirror CompletionContext 的补全源
 * 通过匹配前缀筛选 GrammarCompletion 项目，并在显式触发时展示全集
 */
function grammarCompletionSource(context: CompletionContext) {
  const word = context.matchBefore(/[A-Za-z0-9_\.\-]+/)
  if (!word) {
    if (!context.explicit) {
      return null
    }
    return {
      from: context.pos,
      options: allItems.value
    }
  }

  const prefix = word.text.toUpperCase()
  const filtered = allItems.value.filter((item) => item.label.toUpperCase().startsWith(prefix))

  if (filtered.length === 0 && !context.explicit) {
    return null
  }

  return {
    from: word.from,
    options: filtered.length > 0 ? filtered : allItems.value
  }
}

// 根据文件名获取语言扩展
function getLanguageExtension() {
  if (!props.fileName) return []
  
  const ext = props.fileName.split('.').pop()?.toLowerCase()
  
  switch (ext) {
    case 'json':
      return [json()]
    case 'yaml':
    case 'yml':
      return [yaml()]
    case 'js':
    case 'ts':
      return [javascript()]
    case 'txt':
      // HOI4 脚本
      // 设置 Idea 注册表根并触发扫描
      setIdeaRoots(props.projectRoot, props.gameDirectory)
      ensureIdeaRegistry()
      return [
        hoi4(),
        rainbowBrackets,
        rainbowTheme,
        autocompletion({
          override: [grammarCompletionSource]
        }),
        ...createLinter({
          contextProvider: () => ({ filePath: props.filePath, projectRoot: props.projectRoot, gameDirectory: props.gameDirectory })
        })
      ]
    default:
      return []
  }
}

// 自定义换行后自动缩进的扩展
const autoIndentOnEnter = EditorView.domEventHandlers({
  keydown: (event, view) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const { state } = view
      const { from, to } = state.selection.main
      
      // 获取当前行
      const line = state.doc.lineAt(from)
      const lineText = line.text
      
      // 获取当前行的缩进
      const indent = lineText.match(/^\s*/)?.[0] || ''
      
      // 检查是否在大括号、中括号等后面
      const beforeCursor = lineText.slice(0, from - line.from).trim()
      const afterCursor = lineText.slice(to - line.from).trim()
      
      let extraIndent = ''
      let needsExtraLine = false
      
      // 如果光标前是开括号 { [ (，增加缩进
      if (beforeCursor.endsWith('{') || beforeCursor.endsWith('[') || beforeCursor.endsWith('(')) {
        extraIndent = '    ' // 4个空格
        
        // 如果光标后是闭括号，需要在中间插入额外的空行
        if (afterCursor.startsWith('}') || afterCursor.startsWith(']') || afterCursor.startsWith(')')) {
          needsExtraLine = true
        }
      }
      
      // 构建要插入的文本
      let insertText = '\n' + indent + extraIndent
      
      if (needsExtraLine) {
        insertText += '\n' + indent
      }
      
      // 插入换行和缩进
      view.dispatch({
        changes: { from, to, insert: insertText },
        selection: { anchor: from + insertText.length - (needsExtraLine ? indent.length : 0) },
        scrollIntoView: true
      })
      
      event.preventDefault()
      return true
    }
    return false
  }
})

// 自定义 Tab 键处理，支持多行缩进
const smartTab = keymap.of([
  {
    key: 'Tab',
    run: (view) => {
      const { state } = view
      const { from, to } = state.selection.main
      
      // 如果有选中文本，缩进所有选中的行
      if (from !== to) {
        return indentMore(view)
      }
      
      // 否则插入缩进
      view.dispatch(state.update(state.replaceSelection('    '), { scrollIntoView: true }))
      return true
    }
  },
  {
    key: 'Shift-Tab',
    run: indentLess
  }
])

// 初始化编辑器
async function initEditor() {
  if (!editorContainer.value) return
  // 清空容器，避免残留的旧编辑器 DOM 节点导致多个滚动条/多实例叠加
  editorContainer.value.innerHTML = ''
  
  // 加载RGB颜色显示设置
  await loadSettingsFromStorage()
  
  // 构建编辑器扩展
  const extensions: any[] = [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    history(),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    indentUnit.of('    '), // 4 spaces
    EditorView.lineWrapping,
    EditorView.editable.of(!props.isReadOnly),
    autoIndentOnEnter,
    smartTab,
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString()
        emit('update:content', newContent)
      }
      
      if (update.selectionSet) {
        const pos = update.state.selection.main.head
        const line = update.state.doc.lineAt(pos)
        const lineNumber = line.number
        const column = pos - line.from + 1
        emit('cursorChange', lineNumber, column)
      }
    }),
    EditorView.domEventHandlers({
      scroll: () => {
        emit('scroll')
      },
      contextmenu: (event: MouseEvent) => {
        event.preventDefault()
        emit('contextmenu', event)
        return true
      }
    }),
    // 添加字体设置
    createEditorFontTheme(fontConfig.value),
    getCurrentEditorTheme(),
    ...getLanguageExtension()
  ]
  
  // 条件性添加RGB颜色显示扩展
  if (getEnabled()) {
    extensions.push(createRGBColorField())
  }

  const startState = EditorState.create({
    doc: props.content,
    extensions
  })
  
  editorView = new EditorView({
    state: startState,
    parent: editorContainer.value
  })
}

// 监听内容变化
watch(() => props.content, (newContent) => {
  if (!editorView) return
  
  const currentContent = editorView.state.doc.toString()
  if (currentContent !== newContent) {
    const transaction = editorView.state.update({
      changes: { from: 0, to: currentContent.length, insert: newContent }
    })
    editorView.dispatch(transaction)
  }
})

// 监听只读状态变化
watch(() => props.isReadOnly, () => {
  if (!editorView) return
  
  // 重新初始化编辑器以应用只读状态
  editorView.destroy()
  nextTick(() => {
    initEditor()
  })
})

// 监听文件名变化（切换语言）
watch(() => props.fileName, () => {
  if (!editorView) return
  
  // 重新初始化编辑器以应用新的语言扩展
  editorView.destroy()
  nextTick(() => {
    initEditor()
  })
})

// 监听文件路径或项目根变化（刷新 Linter 上下文）
watch(() => props.filePath, () => {
  if (!editorView) return
  editorView.destroy()
  nextTick(() => {
    initEditor()
  })
})

watch(() => props.projectRoot, () => {
  if (!editorView) return
  editorView.destroy()
  nextTick(() => {
    initEditor()
  })
})

watch(() => props.gameDirectory, () => {
  if (!editorView) return
  editorView.destroy()
  nextTick(() => {
    initEditor()
  })
})

// 监听主题变化，重新初始化编辑器
watch(editorThemeVersion, () => {
  if (!editorView) return
  editorView.destroy()
  nextTick(() => {
    initEditor()
  })
})

// 监听字体设置变化，重新初始化编辑器
watch(fontConfigVersion, () => {
  if (!editorView) return
  editorView.destroy()
  nextTick(() => {
    initEditor()
  })
})

onMounted(() => {
  initEditor()
})

onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})

defineExpose({
  getEditorView: () => editorView,
  getSelectedText: () => {
    if (!editorView) return ''
    const selection = editorView.state.selection.main
    return editorView.state.doc.sliceString(selection.from, selection.to)
  },
  insertText: (text: string) => {
    if (!editorView) return
    const selection = editorView.state.selection.main
    editorView.dispatch({
      changes: { from: selection.from, to: selection.to, insert: text }
    })
  },
  getCursorPosition: () => {
    if (!editorView) return { line: 1, column: 1 }
    const pos = editorView.state.selection.main.head
    const line = editorView.state.doc.lineAt(pos)
    return {
      line: line.number,
      column: pos - line.from + 1
    }
  },
  cutSelection: () => {
    if (!editorView) return ''
    const selection = editorView.state.selection.main
    const text = editorView.state.doc.sliceString(selection.from, selection.to)
    editorView.dispatch({
      changes: { from: selection.from, to: selection.to, insert: '' }
    })
    return text
  },
  copySelection: () => {
    if (!editorView) return ''
    const selection = editorView.state.selection.main
    return editorView.state.doc.sliceString(selection.from, selection.to)
  }
})
</script>

<template>
  <div 
    ref="editorContainer" 
    class="codemirror-editor w-full h-full"
  ></div>
</template>

<style>
.codemirror-editor {
  height: 100%;
  overflow: hidden;
}

.codemirror-editor .cm-editor {
  height: 100%;
  border-radius: 0.75rem;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
}

.codemirror-editor .cm-scroller {
  overflow: auto;
  font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Segoe UI', monospace;
  font-size: 14px;
  line-height: 21px;
}

.codemirror-editor .cm-tooltip.cm-tooltip-autocomplete {
  border-radius: 0.75rem;
  padding: 0.25rem;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
}

.codemirror-editor .cm-tooltip.cm-tooltip-autocomplete ul {
  padding: 0.125rem;
}

.codemirror-editor .cm-tooltip.cm-tooltip-autocomplete li {
  border-radius: 0.5rem;
  margin: 0.125rem 0;
  padding: 0.125rem 0.375rem;
}

.codemirror-editor .cm-tooltip.cm-tooltip-autocomplete .cm-completionLabel {
  font-weight: 500;
}

.codemirror-editor .cm-tooltip.cm-tooltip-autocomplete .cm-completionDetail {
  opacity: 0.7;
}
</style>
