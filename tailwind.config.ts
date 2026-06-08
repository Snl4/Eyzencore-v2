import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg:        'var(--bg)',
        'bg-1':    'var(--bg-1)',
        'bg-2':    'var(--bg-2)',
        'bg-3':    'var(--bg-3)',
        fg:        'var(--fg)',
        'fg-1':    'var(--fg-1)',
        'fg-2':    'var(--fg-2)',
        'fg-3':    'var(--fg-3)',
        accent:    'var(--accent)',
        'accent-2':'var(--accent-2)',
        'accent-3':'var(--accent-3)',
        green:     'var(--green)',
        red:       'var(--red)',
        amber:     'var(--amber)',
        line:      'var(--line)',
      },
      fontFamily: {
        sans:    ['var(--font-sans)'],
        mono:    ['var(--font-mono)'],
        display: ['var(--font-display)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      maxWidth: {
        container: '1200px',
        wide:      '1240px',
      },
    },
  },
  plugins: [],
};

export default config;
