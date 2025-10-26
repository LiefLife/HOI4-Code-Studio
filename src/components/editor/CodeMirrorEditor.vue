<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, indentOnInput, indentUnit } from '@codemirror/language'
import { closeBrackets } from '@codemirror/autocomplete'
import { indentWithTab } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { hoi4 } from '../../lang/hoi4'

const props = defineProps<{
  content: string
  isReadOnly: boolean
  fileName?: string
}>()

const emit = defineEmits<{
  'update:content': [value: string]
  cursorChange: [line: number, column: number]
  scroll: []
}>()

const editorContainer = ref<HTMLDivElement | null>(null)
let editorView: EditorView | null = null

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
      return [hoi4()]
    default:
      return []
  }
}

// 初始化编辑器
function initEditor() {
  if (!editorContainer.value) return
  
  const startState = EditorState.create({
    doc: props.content,
    extensions: [
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
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
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
        }
      }),
      oneDark,
      ...getLanguageExtension()
    ]
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
  editorView
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
  overflow: auto;
}

.codemirror-editor .cm-editor {
  height: 100%;
}

.codemirror-editor .cm-scroller {
  overflow: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 21px;
}
</style>
