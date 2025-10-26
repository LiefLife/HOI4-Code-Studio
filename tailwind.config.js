export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      // OneDark 主题配色
      'onedark': {
        'bg': '#282c34',
        'bg-secondary': '#21252b',
        'fg': '#abb2bf',
        'comment': '#5c6370',
        'border': '#181a1f',
        'selection': '#3e4451',
        'accent': '#61afef',
        'success': '#98c379',
        'warning': '#e5c07b',
        'error': '#e06c75',
        'keyword': '#c678dd',
      },
      // 保留 HOI4 配色（向后兼容）
      'hoi4-dark': '#0a0a0a',
      'hoi4-gray': '#1a1a1a',
      'hoi4-border': '#2a2a2a',
      'hoi4-accent': '#3a3a3a',
      'hoi4-selected': '#3b82f6',
      'hoi4-text': '#e0e0e0',
      'hoi4-text-dim': '#a0a0a0',
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
