const statusEl = document.getElementById('status')

const pending = new Map()

function setStatus(text) {
  if (statusEl) statusEl.textContent = text
}

function invoke(command, payload) {
  const id = `req-${Date.now()}-${Math.random().toString(16).slice(2)}`
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    window.parent.postMessage(
      {
        type: 'hoics.invoke',
        id,
        command,
        payload
      },
      '*'
    )
  })
}

window.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return

  if (data.type === 'hoics.invoke.result') {
    const handler = pending.get(data.id)
    if (!handler) return
    pending.delete(data.id)
    if (data.ok) {
      handler.resolve(data.data)
    } else {
      handler.reject(new Error(data.error || 'Unknown error'))
    }
    return
  }

  if (data.type === 'hoics.host.ready') {
    handleHostReady(data)
  }
})

const sampleThemes = [
  {
    id: 'plugin-ember-atelier',
    name: 'Ember Atelier',
    colors: {
      bg: '#1b1412',
      bgSecondary: '#251c19',
      fg: '#f0d6c6',
      comment: '#a18b82',
      border: '#3b2a24',
      selection: '#3a2620',
      accent: '#f04a3a',
      success: '#9bd06c',
      warning: '#f5b971',
      error: '#f15b5b',
      keyword: '#f28e4b'
    }
  },
  {
    id: 'plugin-salt-marsh',
    name: 'Salt Marsh',
    colors: {
      bg: '#0f1f1e',
      bgSecondary: '#142b29',
      fg: '#cce8e4',
      comment: '#7aa7a1',
      border: '#1c3b37',
      selection: '#1f3b37',
      accent: '#4ac1a3',
      success: '#9ad94a',
      warning: '#f0c46b',
      error: '#f06b6b',
      keyword: '#78c5f5'
    }
  },
  {
    id: 'plugin-moonlit-ink',
    name: 'Moonlit Ink',
    colors: {
      bg: '#101321',
      bgSecondary: '#161a2b',
      fg: '#d9defa',
      comment: '#8f97c1',
      border: '#222745',
      selection: '#1f2440',
      accent: '#8b7bff',
      success: '#56d3b8',
      warning: '#f2b36b',
      error: '#ef6b7b',
      keyword: '#f07ed7'
    }
  }
]

async function handleHostReady(data) {
  const allowed = data?.allowedCommands || []
  if (!allowed.includes('upsert_theme')) {
    setStatus('未授权 upsert_theme，请在 About.hoics.permissions.commands 中添加')
    return
  }

  setStatus('正在写入示例主题...')

  try {
    for (const theme of sampleThemes) {
      await invoke('upsert_theme', { theme })
    }

    if (allowed.includes('list_themes')) {
      const list = await invoke('list_themes', {})
      setStatus(`完成：已写入 ${sampleThemes.length} 个主题；当前自定义主题数=${Array.isArray(list) ? list.length : '未知'}`)
      return
    }

    setStatus(`完成：已写入 ${sampleThemes.length} 个主题。`)
  } catch (err) {
    setStatus(`写入失败：${err?.message || String(err)}`)
  }
}
