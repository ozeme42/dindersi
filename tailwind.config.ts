import type {Config} from 'tailwindcss';

const colorNames = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Creates a regex pattern like: /^(bg|text|border)-(slate|gray|...)-(50|100|...)$/
const colorPattern = new RegExp(
  `^(bg|text|border|ring|fill|stroke)-(${colorNames.join('|')})-(${shades.join('|')})$`
);


export default {
  darkMode: ['class'],
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    {
      pattern: colorPattern,
    },
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ['"Inter"', 'sans-serif'],
        headline: ['"Poppins"', 'serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "shake": {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        "shake-game": {
            "0%": { transform: "translateX(0)" },
            "25%": { transform: "translateX(-5px)" },
            "50%": { transform: "translateX(5px)" },
            "75%": { transform: "translateX(-5px)" },
            "100%": { transform: "translateX(0)" },
        },
        "tada": {
          "0%": { transform: "scale(1)" },
          "10%, 20%": { transform: "scale(0.9) rotate(-3deg)" },
          "30%, 50%, 70%, 90%": { transform: "scale(1.1) rotate(3deg)" },
          "40%, 60%, 80%": { transform: "scale(1.1) rotate(-3deg)" },
          "100%": { transform: "scale(1) rotate(0)" }
        },
        "bubbleFloat": {
            "0%": { transform: "translate(0px, 0px) scale(1)", opacity: "0.9" },
            "50%": { transform: "translate(var(--translate-x), var(--translate-y)) scale(1.02)", opacity: "0.95" },
            "100%": { transform: "translate(0px, 0px) scale(1)", opacity: "0.9" },
        },
        "fadeAndScaleIn": {
            from: { opacity: "0", transform: "scale(0.9)" },
            to: { opacity: "1", transform: "scale(1)" },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "shake": "shake 0.82s cubic-bezier(.36,.07,.19,.97) both",
        "tada": "tada 1s ease-in-out",
        "shake-game": "shake-game .3s ease-out",
        "bubbleFloat": "bubbleFloat var(--animation-duration, 5s) ease-in-out var(--animation-delay, 0s) infinite alternate",
        "fadeAndScaleIn": "fadeAndScaleIn .3s ease-out",
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;
