import { ref, computed } from 'vue'
import { loadSettings, saveSettings } from '../api/tauri'

/**
 * 主题定义接口
 */
export interface Theme {
  id: string
  name: string
  colors: {
    bg: string
    bgSecondary: string
    fg: string
    comment: string
    border: string
    selection: string
    accent: string
    success: string
    warning: string
    error: string
    keyword: string
  }
}

/**
 * 预定义主题列表
 */
export const themes: Theme[] = [
  {
    id: 'onedark',
    name: 'One Dark',
    colors: {
      bg: '#282c34',
      bgSecondary: '#21252b',
      fg: '#abb2bf',
      comment: '#5c6370',
      border: '#181a1f',
      selection: '#3e4451',
      accent: '#61afef',
      success: '#98c379',
      warning: '#e5c07b',
      error: '#e06c75',
      keyword: '#c678dd'
    }
  },
  {
    id: 'one-light',
    name: 'One Light',
    colors: {
      bg: '#fafafa',
      bgSecondary: '#f0f0f0',
      fg: '#383a42',
      comment: '#a0a1a7',
      border: '#d3d4d5',
      selection: '#e5e5e6',
      accent: '#4078f2',
      success: '#50a14f',
      warning: '#c18401',
      error: '#e45649',
      keyword: '#a626a4'
    }
  },
  {
    id: 'vscode',
    name: 'VS Code Dark',
    colors: {
      bg: '#1e1e1e',
      bgSecondary: '#252526',
      fg: '#d4d4d4',
      comment: '#6a9955',
      border: '#3c3c3c',
      selection: '#264f78',
      accent: '#569cd6',
      success: '#4ec9b0',
      warning: '#dcdcaa',
      error: '#f14c4c',
      keyword: '#c586c0'
    }
  },
  {
    id: 'github',
    name: 'GitHub Dark',
    colors: {
      bg: '#0d1117',
      bgSecondary: '#161b22',
      fg: '#c9d1d9',
      comment: '#8b949e',
      border: '#30363d',
      selection: '#388bfd26',
      accent: '#58a6ff',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149',
      keyword: '#ff7b72'
    }
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    colors: {
      bg: '#1e1e2e',
      bgSecondary: '#181825',
      fg: '#cdd6f4',
      comment: '#6c7086',
      border: '#313244',
      selection: '#45475a',
      accent: '#89b4fa',
      success: '#a6e3a1',
      warning: '#f9e2af',
      error: '#f38ba8',
      keyword: '#cba6f7'
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    colors: {
      bg: '#282a36',
      bgSecondary: '#21222c',
      fg: '#f8f8f2',
      comment: '#6272a4',
      border: '#44475a',
      selection: '#44475a',
      accent: '#8be9fd',
      success: '#50fa7b',
      warning: '#f1fa8c',
      error: '#ff5555',
      keyword: '#ff79c6'
    }
  },
  {
    id: 'monokai',
    name: 'Monokai',
    colors: {
      bg: '#272822',
      bgSecondary: '#1e1f1c',
      fg: '#f8f8f2',
      comment: '#75715e',
      border: '#3e3d32',
      selection: '#49483e',
      accent: '#66d9ef',
      success: '#a6e22e',
      warning: '#e6db74',
      error: '#f92672',
      keyword: '#ae81ff'
    }
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    colors: {
      bg: '#ffffff',
      bgSecondary: '#f6f8fa',
      fg: '#24292e',
      comment: '#6a737d',
      border: '#e1e4e8',
      selection: '#0366d626',
      accent: '#0366d6',
      success: '#28a745',
      warning: '#d73a49',
      error: '#cb2431',
      keyword: '#d73a49'
    }
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    colors: {
      bg: '#fdf6e3',
      bgSecondary: '#eee8d5',
      fg: '#657b83',
      comment: '#93a1a1',
      border: '#d8d0c0',
      selection: '#eee8d5',
      accent: '#268bd2',
      success: '#859900',
      warning: '#b58900',
      error: '#dc322f',
      keyword: '#859900'
    }
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    colors: {
      bg: '#002b36',
      bgSecondary: '#073642',
      fg: '#839496',
      comment: '#586e75',
      border: '#002b36',
      selection: '#073642',
      accent: '#268bd2',
      success: '#859900',
      warning: '#b58900',
      error: '#dc322f',
      keyword: '#859900'
    }
  },
  {
    id: 'nord',
    name: 'Nord',
    colors: {
      bg: '#2e3440',
      bgSecondary: '#3b4252',
      fg: '#eceff4',
      comment: '#4c566a',
      border: '#434c5e',
      selection: '#4c566a',
      accent: '#81a1c1',
      success: '#a3be8c',
      warning: '#ebcb8b',
      error: '#bf616a',
      keyword: '#b48ead'
    }
  },
  {
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    colors: {
      bg: '#282828',
      bgSecondary: '#3c3836',
      fg: '#ebdbb2',
      comment: '#928374',
      border: '#504945',
      selection: '#665c54',
      accent: '#83a598',
      success: '#b8bb26',
      warning: '#fabd2f',
      error: '#fb4934',
      keyword: '#8ec07c'
    }
  },
  {
    id: 'material-dark',
    name: 'Material Dark',
    colors: {
      bg: '#263238',
      bgSecondary: '#2e3c43',
      fg: '#eeffff',
      comment: '#546e7a',
      border: '#37474f',
      selection: '#37474f',
      accent: '#82aaff',
      success: '#c3e88d',
      warning: '#ffcb6b',
      error: '#f07178',
      keyword: '#c792ea'
    }
  },
  {
    id: 'oceanic-next',
    name: 'Oceanic Next',
    colors: {
      bg: '#1b2b34',
      bgSecondary: '#343d46',
      fg: '#c0c5ce',
      comment: '#65737e',
      border: '#343d46',
      selection: '#4f5b66',
      accent: '#6699cc',
      success: '#99c794',
      warning: '#fac863',
      error: '#ec5f67',
      keyword: '#c594c5'
    }
  }
]

// 当前主题ID
const currentThemeId = ref('onedark')

// 主题面板可见性
const themePanelVisible = ref(false)

/**
 * 获取当前主题
 */
const currentTheme = computed(() => {
  return themes.find(t => t.id === currentThemeId.value) || themes[0]
})

/**
 * 应用主题到 CSS 变量
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement
  const colors = theme.colors
  
  root.style.setProperty('--theme-bg', colors.bg)
  root.style.setProperty('--theme-bg-secondary', colors.bgSecondary)
  root.style.setProperty('--theme-fg', colors.fg)
  root.style.setProperty('--theme-comment', colors.comment)
  root.style.setProperty('--theme-border', colors.border)
  root.style.setProperty('--theme-selection', colors.selection)
  root.style.setProperty('--theme-accent', colors.accent)
  root.style.setProperty('--theme-success', colors.success)
  root.style.setProperty('--theme-warning', colors.warning)
  root.style.setProperty('--theme-error', colors.error)
  root.style.setProperty('--theme-keyword', colors.keyword)
  
  // 同时设置 HOI4 兼容变量
  root.style.setProperty('--hoi4-dark', colors.bg)
  root.style.setProperty('--hoi4-gray', colors.bgSecondary)
  root.style.setProperty('--hoi4-border', colors.border)
  root.style.setProperty('--hoi4-accent', colors.accent)
  root.style.setProperty('--hoi4-text', colors.fg)
  root.style.setProperty('--hoi4-comment', colors.comment)
}

/**
 * 设置主题
 */
async function setTheme(themeId: string, saveToSettings = true) {
  const theme = themes.find(t => t.id === themeId)
  if (!theme) return
  
  currentThemeId.value = themeId
  applyTheme(theme)
  
  // 保存到设置
  if (saveToSettings) {
    try {
      const result = await loadSettings()
      if (result.success && result.data) {
        const settings = result.data as Record<string, unknown>
        settings.theme = themeId
        await saveSettings(settings)
      }
    } catch (error) {
      console.error('保存主题设置失败:', error)
    }
  }
}

/**
 * 从设置加载主题
 */
async function loadThemeFromSettings() {
  try {
    const result = await loadSettings()
    if (result.success && result.data) {
      const settings = result.data as Record<string, unknown>
      const savedTheme = settings.theme as string
      if (savedTheme && themes.some(t => t.id === savedTheme)) {
        currentThemeId.value = savedTheme
        applyTheme(currentTheme.value)
      } else {
        // 默认主题
        applyTheme(themes[0])
      }
    } else {
      applyTheme(themes[0])
    }
  } catch (error) {
    console.error('加载主题设置失败:', error)
    applyTheme(themes[0])
  }
}

/**
 * 切换主题面板可见性
 */
function toggleThemePanel() {
  themePanelVisible.value = !themePanelVisible.value
}

/**
 * 关闭主题面板
 */
function closeThemePanel() {
  themePanelVisible.value = false
}

/**
 * 主题系统 Composable
 */
export function useTheme() {
  return {
    themes,
    currentThemeId,
    currentTheme,
    themePanelVisible,
    setTheme,
    loadThemeFromSettings,
    toggleThemePanel,
    closeThemePanel,
    applyTheme
  }
}
