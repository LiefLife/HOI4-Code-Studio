export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      // 动态主题配色（使用 CSS 变量）
      'theme': {
        'bg': 'var(--theme-bg)',
        'bg-secondary': 'var(--theme-bg-secondary)',
        'fg': 'var(--theme-fg)',
        'comment': 'var(--theme-comment)',
        'border': 'var(--theme-border)',
        'selection': 'var(--theme-selection)',
        'accent': 'var(--theme-accent)',
        'success': 'var(--theme-success)',
        'warning': 'var(--theme-warning)',
        'error': 'var(--theme-error)',
        'keyword': 'var(--theme-keyword)',
      },
      // OneDark 主题配色（向后兼容）
      'onedark': {
        'bg': 'var(--theme-bg)',
        'bg-secondary': 'var(--theme-bg-secondary)',
        'fg': 'var(--theme-fg)',
        'comment': 'var(--theme-comment)',
        'border': 'var(--theme-border)',
        'selection': 'var(--theme-selection)',
        'accent': 'var(--theme-accent)',
        'success': 'var(--theme-success)',
        'warning': 'var(--theme-warning)',
        'error': 'var(--theme-error)',
        'keyword': 'var(--theme-keyword)',
      },
      // 保留 HOI4 配色（向后兼容）
      'hoi4-dark': 'var(--theme-bg)',
      'hoi4-gray': 'var(--theme-bg-secondary)',
      'hoi4-border': 'var(--theme-border)',
      'hoi4-accent': 'var(--theme-accent)',
      'hoi4-selected': '#3b82f6',
      'hoi4-text': 'var(--theme-fg)',
      'hoi4-text-dim': 'var(--theme-comment)',
      'hoi4-comment': 'var(--theme-comment)',
      'black': '#000000',
      'white': '#ffffff',
      'red': {
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
      },
      'blue': {
        500: '#3b82f6',
      },
      'transparent': 'transparent',
    },
  },
}
