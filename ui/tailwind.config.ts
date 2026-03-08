import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d1117',
        bg2: '#161b22',
        bg3: '#21262d',
        bg4: '#2d333b',
        border: '#30363d',
        border2: '#444c56',
        indigo: {
          DEFAULT: '#818cf8',
          dim: 'rgba(129,140,248,0.12)',
          dark: '#3730a3',
        },
        teal: {
          DEFAULT: '#2dd4bf',
          dim: 'rgba(45,212,191,0.12)',
        },
        text1: '#e6edf3',
        text2: '#8b949e',
        text3: '#6e7681',
        success: '#3fb950',
        danger: '#f85149',
        warning: '#e3b341',
        purple: '#bc8cff',
      },
      fontFamily: {
        ui: ["'Segoe UI'", '-apple-system', 'system-ui', 'sans-serif'],
        mono: ["'SF Mono'", 'Consolas', "'Fira Code'", 'monospace'],
      },
      fontSize: {
        '2xs': '10px',
        xs: '11px',
        sm: '12px',
        base: '13px',
      },
    },
  },
  plugins: [],
} satisfies Config
