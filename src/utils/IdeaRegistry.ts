import { buildDirectoryTreeFast, readFileContent, type FileTreeResult } from '../api/tauri'

// 简易 Idea 注册表：在前端内存缓存，仅在根路径改变或手动刷新时重新扫描
let projectRootPath: string | undefined
let gameRootPath: string | undefined
let ideaSet: Set<string> = new Set()
let refreshing: Promise<void> | null = null
let lastScanKey = ''

function norm(p?: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+/g, '/').trim()
}

function joinPath(a: string, b: string): string {
  if (!a) return b
  if (!b) return a
  return a.replace(/[\\/]+$/, '') + '/' + b.replace(/^[\\/]+/, '')
}

function flattenTree(nodes: any[] | undefined, out: string[]) {
  if (!nodes) return
  for (const n of nodes) {
    if (n.is_directory) {
      flattenTree(n.children, out)
    } else {
      out.push(n.path)
    }
  }
}

function stripLineComments(s: string): string {
  return s
    .split('\n')
    .map(l => l.split('#', 1)[0])
    .join('\n')
}

function findEqAndOpenCurly(doc: string, start: number): number {
  let i = start
  let sawEq = false
  let inLineComment = false
  while (i < doc.length) {
    const ch = doc[i]
    if (inLineComment) {
      if (ch === '\n') inLineComment = false
      i++; continue
    }
    if (ch === '#') { inLineComment = true; i++; continue }
    if (!sawEq) { if (ch === '=') sawEq = true; i++; continue }
    if (ch === '{') return i
    i++
  }
  return -1
}

function findMatchingClose(doc: string, openIndex: number): number {
  let depth = 1
  let i = openIndex + 1
  let inLineComment = false
  while (i < doc.length) {
    const ch = doc[i]
    if (inLineComment) { if (ch === '\n') inLineComment = false; i++; continue }
    if (ch === '#') { inLineComment = true; i++; continue }
    if (ch === '{') depth++
    else if (ch === '}') depth--
    if (depth === 0) return i
    i++
  }
  return -1
}

function findBlockRangeByKey(doc: string, key: string): [number, number] | null {
  // 搜索关键字（边界）
  const re = new RegExp(`(^|[^A-Za-z0-9_])${key}([^A-Za-z0-9_]|$)`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(doc)) !== null) {
    const pos = m.index + (m[1] ? 1 : 0)
    const open = findEqAndOpenCurly(doc, pos)
    if (open >= 0) {
      const close = findMatchingClose(doc, open)
      if (close > open) return [open, close]
    }
  }
  return null
}

function collectCountryIdeasFromContent(content: string): string[] {
  const noComments = stripLineComments(content)
  const ideasRange = findBlockRangeByKey(noComments, 'ideas')
  if (!ideasRange) return []
  const [ideasOpen, ideasClose] = ideasRange
  const ideasBody = noComments.slice(ideasOpen + 1, ideasClose)
  const countryRange = findBlockRangeByKey(ideasBody, 'country')
  if (!countryRange) return []
  const [countryOpen, countryClose] = countryRange
  const body = ideasBody.slice(countryOpen + 1, countryClose)

  // 在 country 块内提取 depth==1 的 key = { ... } 的 key 名称
  const list: string[] = []
  let i = 0
  let depth = 0
  while (i < body.length) {
    const ch = body[i]
    if (ch === '{') { depth++; i++; continue }
    if (ch === '}') { depth--; i++; continue }
    if (depth === 0) {
      // 解析 identifier = {
      // 读取标识符
      const idStart = i
      // 跳过空白
      while (i < body.length && /\s/.test(body[i])) i++
      let j = i
      while (j < body.length && /[A-Za-z0-9_\.-]/.test(body[j])) j++
      if (j > i) {
        const ident = body.slice(i, j)
        // 跳过空白
        let k = j
        while (k < body.length && /\s/.test(body[k])) k++
        if (body[k] === '=') {
          k++
          while (k < body.length && /\s/.test(body[k])) k++
          if (body[k] === '{') {
            // 命中一个 idea 定义
            list.push(ident)
          }
        }
        i = j
        continue
      }
      i = idStart + 1
    } else {
      i++
    }
  }
  return list
}

async function scanIdeasUnder(dirPath: string): Promise<Set<string>> {
  const out = new Set<string>()
  try {
    const res: FileTreeResult = await buildDirectoryTreeFast(dirPath, 5)
    if (!res.success || !res.tree) return out
    const files: string[] = []
    flattenTree(res.tree, files)
    for (const p of files) {
      // 仅扫描 .txt
      if (!/\.txt$/i.test(p)) continue
      const file = await readFileContent(p as any)
      if (file && (file as any).success && typeof (file as any).content === 'string') {
        const ideas = collectCountryIdeasFromContent((file as any).content)
        for (const id of ideas) out.add(id)
      }
    }
  } catch (e) {
    // 忽略扫描错误，尽力而为
  }
  return out
}

export function setRoots(projectRoot?: string, gameDirectory?: string) {
  const pr = norm(projectRoot)
  const gr = norm(gameDirectory)
  projectRootPath = pr || undefined
  gameRootPath = gr || undefined
}

export function getRegistry(): Set<string> {
  return ideaSet
}

export function ensureRefreshed() {
  const pr = projectRootPath ? joinPath(projectRootPath, 'common/ideas') : ''
  const gr = gameRootPath ? joinPath(gameRootPath, 'common/ideas') : ''
  const key = `${pr}||${gr}`
  if (key === lastScanKey && (refreshing || ideaSet.size > 0)) return
  lastScanKey = key
  refreshing = (async () => {
    const next = new Set<string>()
    if (pr) {
      const s = await scanIdeasUnder(pr)
      for (const id of s) next.add(id)
    }
    if (gr) {
      const s = await scanIdeasUnder(gr)
      for (const id of s) next.add(id)
    }
    ideaSet = next
  })()
}
