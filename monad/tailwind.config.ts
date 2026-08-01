import type { Config } from 'tailwindcss';

/**
 * Design tokens read directly from themonad.app's computed styles.
 * Paper ground, ink text, brass rules, ledger-green calls to action.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /*
       * Every integer 0–100.
       *
       * Tailwind ships a coarse default scale (…60, 70, 75, 80…) and silently
       * renders anything off it at FULL opacity — no error, no warning. 96
       * usages across 25 files (text-ink/72, /65, /45, /55 …) were rendering
       * opaque, which was the single largest visual drift from the reference.
       */
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, i) => [String(i), String(i / 100)]),
      ),
      colors: {
        ink: '#0f1215',
        midnight: '#151c24',
        paper: '#f2ede3',
        /* The app shell ground and its raised panels. A step darker and warmer
           than paper: the landing page is a document, the app is a surface with
           cards on it, and cream-on-cream leaves every card flat. */
        shell: '#ece7dd',
        panel: '#faf8f0',
        bone: '#ddd4c3',
        brass: { DEFAULT: '#c2a05b', deep: '#9a7b3f' },
        ledger: { DEFAULT: '#22382d', mid: '#2f7050', light: '#3e8862' },
        oxblood: '#57302f',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Fraunces', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        // Measured from the live site: 10.5px mono carries 2.31px tracking.
        eyebrow: '0.22em',
        nav: '0.18em',
        label: '0.14em',
      },
      maxWidth: { measure: '36rem', band: '68rem', card: '30rem' },
      keyframes: {
        'drawing-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'word-in': {
          from: { opacity: '0', transform: 'translateY(0.4em)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          '0%,100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(180deg)' },
        },
      },
      animation: {
        'drawing-pulse': 'drawing-pulse 1.6s ease-in-out infinite',
        'fade-up': 'fade-up .7s cubic-bezier(.16,1,.3,1) both',
        'word-in': 'word-in .8s cubic-bezier(.16,1,.3,1) both',
        drift: 'drift 300s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
