<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MarkdownIt from 'markdown-it'
import { loadSettings, saveSettings, readDirectory, readFileContent, writeFileContent } from '../../api/tauri'
import { logger } from '../../utils/logger'

type ChatRole = 'user' | 'assistant' | 'system'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  reasoning?: string
  showReasoning?: boolean
  startedAt?: number
  finishedAt?: number
  reasoningMs?: number
  createdAt: number
  pending?: boolean
}

type ToolName = 'list_dir' | 'read_file' | 'edit_file'

interface ToolCallBase {
  tool: ToolName
}

interface ToolCallListDir extends ToolCallBase {
  tool: 'list_dir'
  path: string
}

interface ToolCallReadFile extends ToolCallBase {
  tool: 'read_file'
  path: string
  offset?: number
  limit?: number
}

interface ToolCallEditFile extends ToolCallBase {
  tool: 'edit_file'
  path: string
  content: string
  confirm?: boolean
}

type ToolCall = ToolCallListDir | ToolCallReadFile | ToolCallEditFile

const MAX_CONTINUE_TURNS = 5

const messages = ref<ChatMessage[]>([])
const input = ref('')
const isSending = ref(false)

const settingsOpen = ref(false)
const openaiApiKey = ref('')
const openaiBaseUrl = ref('https://api.openai.com')
const openaiModel = ref('gpt-4o-mini')
const renderMarkdown = ref(false)
const requestReasoning = ref(false)
const SYSTEM_PROMPT = `你是 HOI4 Code Studio 内置 AI 助手。请根据用户提供的上下文与问题，给出准确、可执行的建议与修改方案。

【工具调用（你可以直接调用）】
你可以在回复中输出一个或多个工具块，前端会自动执行并把结果追加到对话上下文中。
工具块格式必须严格如下：

\`\`\`tool
{"tool":"list_dir","path":"绝对路径"}
\`\`\`

\`\`\`tool
{"tool":"read_file","path":"绝对路径","offset":1,"limit":120}
\`\`\`

\`\`\`tool
{"tool":"edit_file","path":"绝对路径","content":"新的完整文件内容","confirm":true}
\`\`\`

【工具说明】
1) list_dir: 列出目录内容（用于确认项目结构/文件是否存在）
2) read_file: 读取文件内容（offset/limit 按“行号/行数”裁剪展示）
3) edit_file: 写入文件内容（为了安全，必须带 confirm:true 才会执行）

【继续执行协议】
当你需要基于工具结果继续自动进行下一轮推理/行动，请在回复末尾追加：<continue>
（兼容拼写 <contiune>）

【输出约束】
- 不要编造不存在的文件/函数/字段；不确定就先用 list_dir/read_file。
- 避免一次性修改大量文件；必要时先给计划。
- 工具块尽量放在回复末尾，便于解析。`
const aiRule = ref('')
const aiAgentMode = ref<'plan' | 'code' | 'ask'>('plan')
const agentModeMenuOpen = ref(false)
const agentModeMenuOpenSettings = ref(false)

const route = useRoute()
const projectRootPath = computed(() => {
  const p = route.query.path
  return typeof p === 'string' ? p : ''
})

const messagesEl = ref<HTMLElement | null>(null)

const canSend = computed(() => {
  return !isSending.value && input.value.trim().length > 0
})

const groupedMessages = computed(() => {
  const groups: Array<{ user: ChatMessage; items: ChatMessage[] }> = []
  let current: { user: ChatMessage; items: ChatMessage[] } | null = null

  for (const m of messages.value) {
    if (m.role === 'user') {
      current = { user: m, items: [] }
      groups.push(current)
      continue
    }
    if (!current) {
      continue
    }
    current.items.push(m)
  }

  return groups
})

function createId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function appendMessage(role: ChatRole, content: string, pending?: boolean) {
  messages.value.push({
    id: createId(),
    role,
    content,
    createdAt: Date.now(),
    pending
  })
}

function setMessageContent(id: string, content: string) {
  const idx = messages.value.findIndex(m => m.id === id)
  if (idx === -1) return
  messages.value[idx] = {
    ...messages.value[idx],
    content,
    pending: false
  }
}

function appendToMessage(id: string, delta: { content?: string; reasoning?: string }) {
  const idx = messages.value.findIndex(m => m.id === id)
  if (idx === -1) return

  const prev = messages.value[idx]
  messages.value[idx] = {
    ...prev,
    content: `${prev.content || ''}${delta.content || ''}`,
    reasoning: `${prev.reasoning || ''}${delta.reasoning || ''}`
  }
}

function markMessageDone(id: string) {
  const idx = messages.value.findIndex(m => m.id === id)
  if (idx === -1) return
  const now = Date.now()
  const startedAt = messages.value[idx].startedAt
  messages.value[idx] = {
    ...messages.value[idx],
    pending: false,
    finishedAt: now,
    reasoningMs: typeof startedAt === 'number' ? Math.max(0, now - startedAt) : undefined
  }
}

function stripContinueToken(text: string) {
  const trimmed = (text || '').trimEnd()
  const has = trimmed.endsWith('<continue>') || trimmed.endsWith('<contiune>')
  if (!has) return { text, continue: false }
  const cleaned = trimmed
    .replace(/<continue>\s*$/i, '')
    .replace(/<contiune>\s*$/i, '')
    .trimEnd()
  return { text: cleaned, continue: true }
}

function extractToolCalls(text: string) {
  const toolRegex = /```tool\s*([\s\S]*?)```/gi
  const calls: ToolCall[] = []
  let cleaned = text

  cleaned = cleaned.replace(toolRegex, (_full, raw) => {
    try {
      const obj = JSON.parse(String(raw).trim()) as ToolCall
      if (obj && (obj as any).tool) {
        calls.push(obj)
      }
    } catch {
      // ignore
    }
    return ''
  })

  return { calls, cleaned: cleaned.trim() }
}

function sliceByLines(content: string, offset?: number, limit?: number) {
  if (!content) return ''
  if (typeof offset !== 'number' && typeof limit !== 'number') return content
  const lines = content.split(/\r?\n/)
  const start = Math.max(0, (offset || 1) - 1)
  const end = typeof limit === 'number' ? Math.min(lines.length, start + Math.max(0, limit)) : lines.length
  return lines.slice(start, end).join('\n')
}

function isAbsolutePath(p: string) {
  if (!p) return false
  // Windows drive path: C:\ or C:/
  if (/^[a-zA-Z]:[\\/]/.test(p)) return true
  // UNC: \\server\share
  if (p.startsWith('\\\\')) return true
  // POSIX: /root
  if (p.startsWith('/')) return true
  return false
}

function resolveAgainst(base: string, inputPath: string) {
  const raw = (inputPath || '').trim()
  if (!raw) return ''
  if (isAbsolutePath(raw)) return raw

  const root = (base || '').trim()
  if (!root) return raw

  const preferBackslash = root.includes('\\')
  const sep = preferBackslash ? '\\' : '/'

  const baseNorm = root.replace(/[\\/]+$/g, '')
  let rel = raw.replace(/^\.[\\/]/, '')
  rel = rel.replace(/^[\\/]+/g, '')
  const combined = `${baseNorm}${sep}${rel}`

  // normalize .. and . segments
  const parts = combined.split(/[\\/]+/g)
  const out: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') {
      // keep "C:" as root on Windows
      if (out.length > 0 && out[out.length - 1] !== '..' && !/^[a-zA-Z]:$/.test(out[out.length - 1])) {
        out.pop()
      } else {
        out.push('..')
      }
      continue
    }
    out.push(part)
  }
  const normalized = out.join(sep)
  // restore leading // for UNC if present
  if (preferBackslash && baseNorm.startsWith('\\\\') && !normalized.startsWith('\\\\')) {
    return `\\\\${normalized.replace(/^\\+/, '')}`
  }
  return normalized
}

async function executeToolCall(call: ToolCall) {
  if (call.tool === 'list_dir') {
    const resolvedPath = resolveAgainst(projectRootPath.value, call.path)
    const res = await readDirectory(resolvedPath)
    return { ...res, resolved_path: resolvedPath }
  }
  if (call.tool === 'read_file') {
    const resolvedPath = resolveAgainst(projectRootPath.value, call.path)
    const res = await readFileContent(resolvedPath)
    if (res?.success && typeof (res as any).content === 'string') {
      return {
        ...res,
        resolved_path: resolvedPath,
        content: sliceByLines((res as any).content, call.offset, call.limit)
      }
    }
    return { ...res, resolved_path: resolvedPath }
  }
  if (call.tool === 'edit_file') {
    if (!call.confirm) {
      return {
        success: false,
        message: '拒绝执行 edit_file：缺少 confirm:true'
      }
    }
    const resolvedPath = resolveAgainst(projectRootPath.value, call.path)
    const res = await writeFileContent(resolvedPath, call.content)
    return { ...res, resolved_path: resolvedPath }
  }

  return { success: false, message: '未知工具' }
}

function appendToolResultMessage(call: ToolCall, result: any) {
  const safeResult = (() => {
    try {
      return JSON.stringify(result, null, 2)
    } catch {
      return String(result)
    }
  })()

  appendMessage(
    'system',
    `TOOL_RESULT\ntool: ${call.tool}\ninput: ${JSON.stringify(call)}\noutput:\n${safeResult}`
  )
}

function isToolResultMessage(m: ChatMessage) {
  return m.role === 'system' && typeof m.content === 'string' && m.content.startsWith('TOOL_RESULT')
}

function toolResultSummary(m: ChatMessage) {
  const lines = (m.content || '').split(/\r?\n/)
  const toolLine = lines.find(l => l.startsWith('tool:')) || ''
  const tool = toolLine.replace(/^tool:\s*/i, '').trim() || 'tool'
  const outputLine = lines.find(l => l.startsWith('output:'))
  const rawJson = outputLine ? lines.slice(lines.indexOf(outputLine) + 1).join('\n') : ''

  try {
    const parsed = rawJson ? JSON.parse(rawJson) : null
    const success = typeof parsed?.success === 'boolean' ? parsed.success : undefined
    const message = typeof parsed?.message === 'string' ? parsed.message : ''
    const suffix = success === undefined ? '' : success ? '成功' : '失败'
    const msg = message ? `：${message}` : ''
    return `${tool}${suffix ? `（${suffix}）` : ''}${msg}`
  } catch {
    return tool
  }
}

function getChatRequestUrl() {
  const base = (openaiBaseUrl.value || '').trim().replace(/\/+$/, '')
  return `${base}/v1/chat/completions`
}

function isOfficialOpenAiBaseUrl() {
  const base = (openaiBaseUrl.value || '').trim().replace(/\/+$/, '')
  return base === 'https://api.openai.com'
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

function assistantHtml(m: ChatMessage) {
  return md.render(m.content || '')
}

function getAgentPrompt(mode: 'plan' | 'code' | 'ask') {
  if (mode === 'code') {
    return `你现在处于 Code 模式。你的目标是在保证正确性的前提下，尽量给出可直接应用的代码改动

【核心原则】
1 直接可用：优先给出可粘贴/可替换的代码（或精确到文件/函数的修改点）。
2 最小解释：只解释“为什么必须这样改”和“用户需要注意什么”，避免长篇理论。
3 不做假设：遇到缺少信息时，先给出你需要的最少信息；但如果能通过合理默认值完成，也可先实现并标注默认值。
4 错误处理与边界：必须考虑空值、异常、加载失败、兼容旧配置等边界情况。
5 保持一致：遵循项目现有风格（命名、状态管理、UI 类名、持久化方式）。

【输出结构（严格）】
A 变更摘要
- 说明改了什么、影响面多大

B 修改清单（按文件）
- 文件路径：
  - 改动点（函数/组件/关键段落）
  - 关键代码片段

C 验证方式
- 如何手动验证（步骤）
- 若有，如何观察日志/报错点

D 注意事项（可选）
- 兼容性/迁移/可能影响的行为

【约束】
- 不输出会破坏项目结构的大改（除非用户明确要求）。
- 不编造不存在的字段/组件；不确定就先问或先查。`
  }
  if (mode === 'ask') {
    return `你现在处于 Ask 模式（澄清优先）。你的目标是回复用户的问题、给出代码辅助用户编码

【风险控制】
- 不得编造项目结构/函数名/接口字段。
- 若用户描述与现有实现可能冲突，必须指出冲突点并询问确认。
- 若存在多种实现路线，给出推荐路线 + 选择理由 + 风险对比。`
  }
  return `你现在处于 Plan 模式。你的目标是先输出可执行的计划，再按步骤推进实现，并在每一步保持可验证性与最小改动。

【核心原则】
1 先计划后实施：先给清晰计划，再给实施细节。
2 小步可验证：每一步都应能通过“观察 UI / 运行 / 日志 / 单测”验证。
3 最小必要改动：优先选择影响面小、风险低的改动；避免大范围重构，除非明确必要。
4 明确依赖与风险：对高风险点或不确定点提前说明，并提供替代方案。
5 结构化输出：让用户能快速扫读并知道你接下来要做什么。

【输出结构（严格）】
A 目标复述
- 复述用户目标与边界，确保对齐

B 执行计划（必须）
- 2-6 个步骤，按顺序编号
- 每步包含：
  - 目标（这一步做什么）
  - 触达点（会改哪些模块/文件/组件/函数，尽量具体）
  - 验证方式（如何确认这一步成功）

C 实施细节（按需）
- 列出关键逻辑/关键数据流/关键 UI 状态
- 若涉及配置或持久化，说明字段名与迁移策略

D 输出与回滚
- 最终会得到什么效果
- 若用户不满意，如何回滚或调整（例如开关/配置/可逆改动）

【编码风格约束】
- 避免无意义的抽象；可读性优先。
- 若需要改动 API/数据结构，明确所有调用方需要同步调整的位置。
- 不输出未经验证的“可能存在的文件/函数”。`
}

function buildOpenAiMessages(): Array<{ role: ChatRole; content: string }> {
  const rule = aiRule.value.trim()
  const agentPrompt = getAgentPrompt(aiAgentMode.value).trim()

  const injected: Array<{ role: ChatRole; content: string }> = [{ role: 'system', content: SYSTEM_PROMPT }]
  if (rule) {
    injected.push({ role: 'system', content: `规则：${rule}` })
  }
  if (agentPrompt) {
    injected.push({ role: 'system', content: agentPrompt })
  }

  const base = messages.value
    .filter(m => !m.pending)
    .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
    .map(m => ({ role: m.role, content: m.content }))

  return [...injected, ...base]
}

async function callOpenAiChatCompletion(userContent: string) {
  const apiKey = openaiApiKey.value.trim()
  if (!apiKey) {
    throw new Error('未配置 OpenAI API Key')
  }

  const url = getChatRequestUrl()
  const payload: Record<string, unknown> = {
    model: openaiModel.value.trim() || 'gpt-4o-mini',
    stream: true,
    messages: [...buildOpenAiMessages(), { role: 'user' as const, content: userContent }]
  }

  if (requestReasoning.value && !isOfficialOpenAiBaseUrl()) {
    payload.include_reasoning = true
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    let detail = ''
    try {
      const errJson = await res.json()
      detail = (errJson?.error?.message as string) || JSON.stringify(errJson)
    } catch {
      detail = await res.text()
    }
    throw new Error(`请求失败 (${res.status}): ${detail || res.statusText}`)
  }

  if (!res.body) {
    throw new Error('响应不支持流式读取')
  }

  return res.body
}

function normalizeSseLines(buffer: string) {
  return buffer.split(/\r?\n/)
}

function tryParseSseDataLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return null
  return trimmed.slice('data:'.length).trim()
}

function extractDeltaFromChunk(json: any): { content?: string; reasoning?: string } {
  const delta = json?.choices?.[0]?.delta || json?.choices?.[0]?.message || {}
  const content = (delta?.content as string) || ''

  const reasoning =
    (delta?.reasoning as string) ||
    (delta?.reasoning_content as string) ||
    (delta?.reasoningContent as string) ||
    ''

  return {
    content: content || undefined,
    reasoning: reasoning || undefined
  }
}

async function consumeSseStream(stream: ReadableStream<Uint8Array>, onDelta: (delta: { content?: string; reasoning?: string }) => void) {
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = normalizeSseLines(buffer)
    buffer = lines.pop() || ''

    for (const line of lines) {
      const data = tryParseSseDataLine(line)
      if (!data) continue
      if (data === '[DONE]') return

      try {
        const json = JSON.parse(data)
        const delta = extractDeltaFromChunk(json)
        if (delta.content || delta.reasoning) {
          onDelta(delta)
        }
      } catch {
        // ignore
      }
    }
  }
}

function toggleReasoning(m: ChatMessage) {
  m.showReasoning = !m.showReasoning
}

async function handleSend() {
  if (!canSend.value) return

  const content = input.value.trim()
  input.value = ''

  appendMessage('user', content)

  await runAiTurns(content)
}

async function runAiTurns(firstUserContent: string) {
  let turns = 0
  let nextUserContent: string | null = firstUserContent

  while (nextUserContent !== null && turns < MAX_CONTINUE_TURNS) {
    const userContent = nextUserContent
    nextUserContent = null
    turns += 1

    isSending.value = true
    const pendingId = createId()
    messages.value.push({
      id: pendingId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      pending: true,
      reasoning: '',
      showReasoning: false,
      startedAt: Date.now()
    })

    try {
      const stream = await callOpenAiChatCompletion(userContent)
      await consumeSseStream(stream, (delta) => {
        appendToMessage(pendingId, delta)
      })

      markMessageDone(pendingId)
      const final = messages.value.find(m => m.id === pendingId)?.content || ''
      const { text: noContinueText, continue: shouldContinue } = stripContinueToken(final)
      const { calls, cleaned } = extractToolCalls(noContinueText)

      if (cleaned !== final) {
        setMessageContent(pendingId, cleaned || '（无内容返回）')
      } else if (!cleaned.trim()) {
        setMessageContent(pendingId, '（无内容返回）')
      }

      for (const call of calls) {
        try {
          const result = await executeToolCall(call)
          appendToolResultMessage(call, result)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          appendToolResultMessage(call, { success: false, message: msg })
        }
      }

      const forceContinue = calls.length > 0
      if (shouldContinue || forceContinue) {
        nextUserContent = `你已经进行了以下操作：\n\n${cleaned || '（上次输出为空）'}\n\n现在你需要继续下一步。`
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('AI 发送失败:', err)
      setMessageContent(pendingId, `请求失败：${msg}`)
      nextUserContent = null
    } finally {
      isSending.value = false
    }
  }
}

function handleInputKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter') return

  if (e.ctrlKey) {
    e.preventDefault()
    const target = e.target as HTMLTextAreaElement | null
    if (!target) {
      input.value += '\n'
      return
    }

    const start = target.selectionStart ?? input.value.length
    const end = target.selectionEnd ?? input.value.length
    input.value = `${input.value.slice(0, start)}\n${input.value.slice(end)}`
    void nextTick(() => {
      try {
        target.selectionStart = target.selectionEnd = start + 1
      } catch {
        // ignore
      }
    })
    return
  }

  e.preventDefault()
  void handleSend()
}

async function loadAiSettings() {
  try {
    const result = await loadSettings()
    if (result.success && result.data) {
      const data = result.data as Record<string, unknown>
      openaiApiKey.value = (data.openaiApiKey as string) || ''
      openaiBaseUrl.value = (data.openaiBaseUrl as string) || 'https://api.openai.com'
      openaiModel.value = (data.openaiModel as string) || 'gpt-4o-mini'
      renderMarkdown.value = (data.aiRenderMarkdown as boolean) || false
      requestReasoning.value = (data.aiRequestReasoning as boolean) || false
      aiRule.value = (data.aiRule as string) || (data.aiSystemPrompt as string) || ''
      aiAgentMode.value = ((data.aiAgentMode as 'plan' | 'code' | 'ask') || 'plan')
    }
  } catch (err) {
    logger.error('加载AI设置失败:', err)
  }
}

async function saveAiSettings() {
  try {
    const result = await loadSettings()
    const current = (result.success && result.data) ? (result.data as Record<string, unknown>) : {}
    await saveSettings({
      ...current,
      openaiApiKey: openaiApiKey.value,
      openaiBaseUrl: openaiBaseUrl.value,
      openaiModel: openaiModel.value,
      aiRenderMarkdown: renderMarkdown.value,
      aiRequestReasoning: requestReasoning.value,
      aiRule: aiRule.value,
      aiAgentMode: aiAgentMode.value
    })
  } catch (err) {
    logger.error('保存AI设置失败:', err)
  }
}

function openSettings() {
  settingsOpen.value = true
}

async function closeSettings() {
  settingsOpen.value = false
  await saveAiSettings()
}

onMounted(() => {
  void loadAiSettings()
})

watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    const el = messagesEl.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  }
)
</script>

<template>
  <div class="h-full overflow-hidden flex flex-col">
    <div class="px-3 pt-3">
      <div class="flex items-center justify-between px-3 py-2 bg-hoi4-gray/70 border border-hoi4-border/60 rounded-2xl shadow-lg backdrop-blur-sm">
        <div class="text-hoi4-text font-bold text-sm tracking-wide">AI</div>
        <button
          class="px-3 py-1 rounded-xl text-sm bg-hoi4-accent/80 hover:bg-hoi4-border/80 active:scale-95 transition-all shadow-sm"
          @click="openSettings"
        >
          设置
        </button>
      </div>
    </div>

    <div ref="messagesEl" class="flex-1 overflow-y-auto p-3 space-y-2">
      <div v-if="messages.length === 0" class="text-hoi4-text-dim text-sm">
        还没有对话，输入内容开始聊天。
      </div>
      <div v-for="g in groupedMessages" :key="g.user.id" class="space-y-2">
        <div
          class="rounded-xl px-3 py-2 border bg-hoi4-accent/20 border-hoi4-border/60 text-hoi4-text"
        >
          <div class="text-xs text-hoi4-text-dim mb-1">user</div>
          <div class="text-sm whitespace-pre-wrap break-words">{{ g.user.content }}</div>
        </div>

        <div
          v-if="g.items.length > 0"
          class="rounded-xl px-3 py-2 border bg-hoi4-gray/40 border-hoi4-border/60 text-hoi4-text"
        >
          <div class="text-xs text-hoi4-text-dim mb-2">assistant</div>
          <div class="space-y-2">
            <div v-for="m in g.items" :key="m.id">
              <div v-if="m.reasoning && m.reasoning.trim().length > 0" class="mb-2">
                <button
                  class="text-xs px-2 py-1 rounded-lg border border-hoi4-border/60 bg-hoi4-gray/60 hover:bg-hoi4-border/60 transition-colors"
                  :class="m.showReasoning ? 'text-hoi4-text' : 'text-hoi4-text-dim'"
                  @click="toggleReasoning(m)"
                >
                  {{ m.showReasoning ? '隐藏推理链' : '显示推理链' }}
                </button>

                <span v-if="typeof m.reasoningMs === 'number'" class="ml-2 text-xs text-hoi4-text-dim">
                  推理耗时 {{ (m.reasoningMs / 1000).toFixed(2) }}s
                </span>

                <div
                  v-if="m.showReasoning"
                  class="mt-2 rounded-xl border border-hoi4-border/60 bg-hoi4-gray/80 px-3 py-2"
                >
                  <div class="text-xs text-hoi4-text-dim mb-1">reasoning</div>
                  <div class="text-xs whitespace-pre-wrap break-words text-hoi4-text">
                    {{ m.reasoning }}
                  </div>
                </div>
              </div>

              <div
                class="text-sm whitespace-pre-wrap break-words"
                :class="m.pending ? 'animate-pulse text-hoi4-text-dim' : ''"
              >
                <template v-if="isToolResultMessage(m)">
                  <details class="rounded-xl border border-hoi4-border/60 bg-hoi4-gray/60 px-3 py-2">
                    <summary class="cursor-pointer select-none text-xs text-hoi4-text">
                      {{ toolResultSummary(m) }}
                    </summary>
                    <pre class="mt-2 text-xs whitespace-pre-wrap break-words text-hoi4-text-dim">{{ m.content }}</pre>
                  </details>
                </template>
                <template v-else-if="renderMarkdown && m.role === 'assistant'">
                  <span v-html="assistantHtml(m)"></span>
                </template>
                <template v-else>
                  {{ m.content }}
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-transparent p-3 pt-0">
      <div class="relative rounded-2xl bg-hoi4-gray/70 border border-hoi4-border/60 shadow-lg">
        <div class="absolute left-2 bottom-2 flex items-center gap-2">
          <div class="text-xs text-hoi4-text-dim">智能体：</div>
          <div class="relative">
            <button
              class="px-2 py-1 rounded-lg text-xs border border-hoi4-border/60 bg-hoi4-gray/60 hover:bg-hoi4-border/60 transition-colors text-hoi4-text"
              @click="agentModeMenuOpen = !agentModeMenuOpen"
            >
              {{ aiAgentMode === 'plan' ? 'Plan' : aiAgentMode === 'code' ? 'Code' : 'Ask' }}
            </button>
            <div
              v-if="agentModeMenuOpen"
              class="absolute left-0 bottom-8 min-w-32 rounded-xl border border-hoi4-border shadow-2xl overflow-hidden z-50 ai-solid-dropdown"
            >
              <button
                class="w-full text-left px-3 py-2 text-xs transition-colors"
                :class="aiAgentMode === 'plan' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
                @click="aiAgentMode = 'plan'; agentModeMenuOpen = false; void saveAiSettings()"
              >
                Plan
              </button>
              <button
                class="w-full text-left px-3 py-2 text-xs transition-colors"
                :class="aiAgentMode === 'code' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
                @click="aiAgentMode = 'code'; agentModeMenuOpen = false; void saveAiSettings()"
              >
                Code
              </button>
              <button
                class="w-full text-left px-3 py-2 text-xs transition-colors"
                :class="aiAgentMode === 'ask' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
                @click="aiAgentMode = 'ask'; agentModeMenuOpen = false; void saveAiSettings()"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
        <textarea
          v-model="input"
          class="w-full resize-none rounded-2xl bg-transparent text-hoi4-text text-sm px-3 py-3 pr-20 pb-12 focus:outline-none focus:border-hoi4-accent"
          :rows="3"
          placeholder="输入消息... (Enter 发送，Ctrl+Enter 换行)"
          @keydown="handleInputKeydown"
        />
        <button
          class="absolute right-2 bottom-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
          :class="canSend ? 'bg-hoi4-accent/80 hover:bg-hoi4-border/80 text-hoi4-text' : 'bg-hoi4-border/40 text-hoi4-text-dim cursor-not-allowed'"
          :disabled="!canSend"
          @click="handleSend"
        >
          {{ isSending ? '发送中...' : '发送' }}
        </button>
      </div>
    </div>

    <div
      v-if="settingsOpen"
      class="fixed inset-0 flex items-center justify-center z-50 bg-black/55 backdrop-blur-sm"
      @click.self="closeSettings"
      tabindex="-1"
    >
      <div
        class="border border-hoi4-border rounded-2xl shadow-2xl overflow-hidden w-[520px] max-w-[90vw] max-h-[85vh] ai-solid-dropdown"
        @click.stop
      >
        <div class="px-6 py-4 border-b border-hoi4-border">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-hoi4-text">AI 设置</h3>
            <button
              class="px-3 text-hoi4-text-dim hover:text-hoi4-text rounded-full hover:bg-hoi4-border/60 transition-colors"
              @click="closeSettings"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="px-6 py-5 space-y-4 overflow-y-auto" style="max-height: calc(85vh - 128px);">
          <div>
            <div class="text-sm font-bold text-hoi4-text mb-2">规则</div>
            <textarea
              v-model="aiRule"
              class="w-full resize-none rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
              :rows="5"
              placeholder="填写规则（单条）..."
            />
            <div class="text-hoi4-text-dim text-xs mt-2">
              层级顺序：系统提示词（内置） &gt; 规则 &gt; 智能体（Plan/Code/Ask） &gt; 用户输入。
            </div>
          </div>

          <div class="rounded-xl border border-hoi4-border/60 bg-hoi4-gray/40 px-3 py-2">
            <div class="text-sm font-bold text-hoi4-text mb-2">智能体</div>
            <div class="relative inline-block">
              <button
                class="px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 bg-hoi4-border/40 hover:bg-hoi4-border/60 text-hoi4-text"
                @click="agentModeMenuOpenSettings = !agentModeMenuOpenSettings"
              >
                {{ aiAgentMode === 'plan' ? 'Plan' : aiAgentMode === 'code' ? 'Code' : 'Ask' }}
              </button>
              <div
                v-if="agentModeMenuOpenSettings"
                class="absolute left-0 top-12 min-w-44 rounded-xl border border-hoi4-border shadow-2xl overflow-hidden z-50 ai-solid-dropdown"
              >
                <button
                  class="w-full text-left px-3 py-2 text-sm transition-colors"
                  :class="aiAgentMode === 'plan' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
                  @click="aiAgentMode = 'plan'; agentModeMenuOpenSettings = false"
                >
                  Plan
                </button>
                <button
                  class="w-full text-left px-3 py-2 text-sm transition-colors"
                  :class="aiAgentMode === 'code' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
                  @click="aiAgentMode = 'code'; agentModeMenuOpenSettings = false"
                >
                  Code
                </button>
                <button
                  class="w-full text-left px-3 py-2 text-sm transition-colors"
                  :class="aiAgentMode === 'ask' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
                  @click="aiAgentMode = 'ask'; agentModeMenuOpenSettings = false"
                >
                  Ask
                </button>
              </div>
            </div>
            <div class="text-hoi4-text-dim text-xs mt-2">
              内置智能体：Plan（先规划后执行）、Code（偏代码实现）、Ask（先澄清再行动）。
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-bold text-hoi4-text">Markdown 渲染</div>
              <div class="text-hoi4-text-dim text-xs mt-1">assistant 输出使用 Markdown 格式渲染</div>
            </div>
            <button
              class="px-3 py-1 rounded-xl text-sm transition-colors font-medium"
              :class="renderMarkdown ? 'bg-hoi4-accent/80 hover:bg-hoi4-border/80 text-hoi4-text' : 'bg-hoi4-border/40 hover:bg-hoi4-border/60 text-hoi4-text-dim'"
              @click="renderMarkdown = !renderMarkdown"
            >
              {{ renderMarkdown ? '开启' : '关闭' }}
            </button>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-bold text-hoi4-text">返回推理</div>
              <div class="text-hoi4-text-dim text-xs mt-1">向 OpenAI 兼容服务请求返回 reasoning（官方 OpenAI 默认不发送该参数）</div>
            </div>
            <button
              class="px-3 py-1 rounded-xl text-sm transition-colors font-medium"
              :class="requestReasoning ? 'bg-hoi4-accent/80 hover:bg-hoi4-border/80 text-hoi4-text' : 'bg-hoi4-border/40 hover:bg-hoi4-border/60 text-hoi4-text-dim'"
              @click="requestReasoning = !requestReasoning"
            >
              {{ requestReasoning ? '开启' : '关闭' }}
            </button>
          </div>

          <div>
            <div class="text-sm font-bold text-hoi4-text mb-2">OpenAI API Key</div>
            <input
              v-model="openaiApiKey"
              class="w-full rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
              placeholder="sk-..."
              type="password"
              autocomplete="off"
              spellcheck="false"
            />
          </div>

          <div>
            <div class="text-sm font-bold text-hoi4-text mb-2">Base URL</div>
            <input
              v-model="openaiBaseUrl"
              class="w-full rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
              placeholder="https://api.openai.com"
              type="text"
              autocomplete="off"
              spellcheck="false"
            />
            <div class="text-hoi4-text-dim text-xs mt-2">
              兼容 OpenAI 的服务地址（会自动拼接 `/v1/chat/completions`）。
            </div>
          </div>

          <div>
            <div class="text-sm font-bold text-hoi4-text mb-2">Model</div>
            <input
              v-model="openaiModel"
              class="w-full rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
              placeholder="gpt-4o-mini"
              type="text"
              autocomplete="off"
              spellcheck="false"
            />
            <div class="text-hoi4-text-dim text-xs mt-2">
              使用的模型名称（不同 OpenAI 兼容服务可能不同）。
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t-2 flex justify-end gap-3" style="border-color: #2a2a2a;">
          <button
            class="px-5 py-2 rounded text-sm transition-colors font-medium"
            style="background-color: #2a2a2a; color: #a0a0a0;"
            @click="closeSettings"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
