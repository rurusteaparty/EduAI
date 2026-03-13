/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          50:  '#f0f7ff',
          100: '#e0effe',
          200: '#baddfd',
          300: '#7dc4fb',
          400: '#38a4f6',
          500: '#0e87e7',
          600: '#0268c5',
          700: '#0352a0',
          800: '#074684',
          900: '#0c3c6e',
          950: '#082548',
        },
        // Science mode
        science: {
          DEFAULT: '#0e87e7',
          light: '#e0effe',
          dark: '#0352a0',
        },
        // Arts mode
        arts: {
          DEFAULT: '#9333ea',
          light: '#f3e8ff',
          dark: '#6b21a8',
        },
        // Semantic
        success: { DEFAULT: '#22c55e', light: '#dcfce7' },
        warning: { DEFAULT: '#f59e0b', light: '#fef3c7' },
        danger: { DEFAULT: '#ef4444', light: '#fee2e2' },
        // Dark mode bg
        dark: {
          bg:      '#0f172a',
          surface: '#1e293b',
          border:  '#334155',
          muted:   '#475569',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        dyslexic: ['OpenDyslexic', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'dyslexic-sm': ['1rem', { lineHeight: '1.8', letterSpacing: '0.05em' }],
        'dyslexic-base': ['1.125rem', { lineHeight: '1.9', letterSpacing: '0.05em' }],
        'dyslexic-lg': ['1.25rem', { lineHeight: '2.0', letterSpacing: '0.05em' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounceGentle 1s infinite',
        'typing': 'typing 1.2s steps(3) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        typing: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
      },
      boxShadow: {
        'brand': '0 0 0 3px rgba(14, 135, 231, 0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        'glow-brand': '0 0 20px rgba(14, 135, 231, 0.3)',
      },
    },
  },
  plugins: [],
}
