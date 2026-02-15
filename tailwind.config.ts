import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      /* === ENHANCED BORDER RADIUS === */
      borderRadius: {
        "xs": "var(--radius-sm)",
        "sm": "calc(var(--radius) - 4px)",
        "md": "calc(var(--radius) - 2px)",
        "lg": "var(--radius)",
        "xl": "var(--radius-lg)",
        "2xl": "var(--radius-xl)",
      },
      
      /* === COMPREHENSIVE COLOR SYSTEM === */
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          active: "hsl(var(--primary-active))",
        },
        
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
          active: "hsl(var(--secondary-active))",
        },
        
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          hover: "hsl(var(--success-hover))",
          light: "hsl(var(--success-light))",
        },
        
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          hover: "hsl(var(--warning-hover))",
          light: "hsl(var(--warning-light))",
        },
        
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
          hover: "hsl(var(--error-hover))",
          light: "hsl(var(--error-light))",
        },
        
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        
        /* === NAVY COLOR PALETTE (v3 Redesign) === */
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#1e3a5f',
          900: '#0f172a',
        },

        /* === SEMANTIC GRAY SCALE === */
        gray: {
          50: "hsl(var(--gray-50))",
          100: "hsl(var(--gray-100))",
          200: "hsl(var(--gray-200))",
          300: "hsl(var(--gray-300))",
          400: "hsl(var(--gray-400))",
          500: "hsl(var(--gray-500))",
          600: "hsl(var(--gray-600))",
          700: "hsl(var(--gray-700))",
          800: "hsl(var(--gray-800))",
          900: "hsl(var(--gray-900))",
        },
        
        /* === FORM ELEMENTS === */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        
        /* === CHART COLORS === */
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        
        /* === SIDEBAR SYSTEM === */
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        /* === V3 SEMANTIC SURFACE COLORS === */
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          raised: 'hsl(var(--surface-raised))',
          overlay: 'hsl(var(--surface-overlay))',
          sunken: 'hsl(var(--surface-sunken))',
        },

        /* === V3 SEMANTIC TEXT COLORS === */
        'text-color': {
          primary: 'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))',
          muted: 'hsl(var(--text-muted))',
          disabled: 'hsl(var(--text-disabled))',
        },

        /* === V3 INTERACTIVE STATES === */
        interactive: {
          hover: 'hsl(var(--interactive-hover))',
          active: 'hsl(var(--interactive-active))',
        },
      },

      /* === V3 SEMANTIC BORDER COLORS === */
      borderColor: {
        subtle: 'hsl(var(--border-subtle))',
        strong: 'hsl(var(--border-strong))',
      },

      /* === ENHANCED SPACING SYSTEM === */
      spacing: {
        "xs": "var(--spacing-xs)",
        "sm": "var(--spacing-sm)",
        "md": "var(--spacing-md)",
        "lg": "var(--spacing-lg)",
        "xl": "var(--spacing-xl)",
        "2xl": "var(--spacing-2xl)",
        "3xl": "var(--spacing-3xl)",
      },
      
      /* === TYPOGRAPHY SYSTEM === */
      fontSize: {
        "xs": ["var(--font-size-xs)", { lineHeight: "var(--line-height-tight)" }],
        "sm": ["var(--font-size-sm)", { lineHeight: "var(--line-height-snug)" }],
        "base": ["var(--font-size-base)", { lineHeight: "var(--line-height-normal)" }],
        "lg": ["var(--font-size-lg)", { lineHeight: "var(--line-height-normal)" }],
        "xl": ["var(--font-size-xl)", { lineHeight: "var(--line-height-relaxed)" }],
        "2xl": ["var(--font-size-2xl)", { lineHeight: "var(--line-height-tight)" }],
        "3xl": ["var(--font-size-3xl)", { lineHeight: "var(--line-height-tight)" }],
        "4xl": ["var(--font-size-4xl)", { lineHeight: "var(--line-height-none)" }],
        "5xl": ["var(--font-size-5xl)", { lineHeight: "var(--line-height-none)" }],
      },
      
      fontWeight: {
        thin: "var(--font-weight-thin)",
        light: "var(--font-weight-light)",
        normal: "var(--font-weight-normal)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
        bold: "var(--font-weight-bold)",
        extrabold: "var(--font-weight-extrabold)",
        black: "var(--font-weight-black)",
      },
      
      lineHeight: {
        none: "var(--line-height-none)",
        tight: "var(--line-height-tight)",
        snug: "var(--line-height-snug)",
        normal: "var(--line-height-normal)",
        relaxed: "var(--line-height-relaxed)",
        loose: "var(--line-height-loose)",
      },
      
      /* === ENHANCED SHADOWS === */
      boxShadow: {
        "xs": "var(--shadow-xs)",
        "sm": "var(--shadow-sm)",
        "md": "var(--shadow-md)",
        "lg": "var(--shadow-lg)",
        "xl": "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        "brand": "0 10px 40px -10px hsl(var(--primary) / 0.3)",
        "success": "0 10px 40px -10px hsl(var(--success) / 0.3)",
        "warning": "0 10px 40px -10px hsl(var(--warning) / 0.3)",
        "error": "0 10px 40px -10px hsl(var(--error) / 0.3)",
      },
      
      /* === TRANSITION DURATIONS === */
      transitionDuration: {
        "fast": "var(--duration-fast)",
        "normal": "var(--duration-normal)",
        "slow": "var(--duration-slow)",
      },
      
      /* === TRANSITION TIMING FUNCTIONS === */
      transitionTimingFunction: {
        "ease-in": "var(--ease-in)",
        "ease-out": "var(--ease-out)",
        "ease-in-out": "var(--ease-in-out)",
      },
      
      /* === BACKDROP BLUR === */
      backdropBlur: {
        "xs": "2px",
        "sm": "4px",
        "md": "8px",
        "lg": "12px",
        "xl": "16px",
        "2xl": "24px",
      },
      
      /* === ENHANCED KEYFRAMES === */
      keyframes: {
        // Existing accordion animations
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        
        // New design system animations
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        
        "slide-up": {
          "0%": { 
            opacity: "0",
            transform: "translateY(20px)" 
          },
          "100%": { 
            opacity: "1",
            transform: "translateY(0)" 
          },
        },
        
        "slide-down": {
          "0%": { 
            opacity: "0",
            transform: "translateY(-20px)" 
          },
          "100%": { 
            opacity: "1",
            transform: "translateY(0)" 
          },
        },
        
        "slide-left": {
          "0%": { 
            opacity: "0",
            transform: "translateX(20px)" 
          },
          "100%": { 
            opacity: "1",
            transform: "translateX(0)" 
          },
        },
        
        "slide-right": {
          "0%": { 
            opacity: "0",
            transform: "translateX(-20px)" 
          },
          "100%": { 
            opacity: "1",
            transform: "translateX(0)" 
          },
        },
        
        "scale-in": {
          "0%": { 
            opacity: "0",
            transform: "scale(0.95)" 
          },
          "100%": { 
            opacity: "1",
            transform: "scale(1)" 
          },
        },
        
        "scale-out": {
          "0%": { 
            opacity: "1",
            transform: "scale(1)" 
          },
          "100%": { 
            opacity: "0",
            transform: "scale(0.95)" 
          },
        },
        
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        
        "bounce-subtle": {
          "0%, 100%": { 
            transform: "translateY(0)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)" 
          },
          "50%": { 
            transform: "translateY(-5px)",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)" 
          },
        },
        
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      
      /* === COMPREHENSIVE ANIMATIONS === */
      animation: {
        // Existing accordion animations
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        
        // New design system animations
        "fade-in": "fade-in var(--duration-normal) var(--ease-out)",
        "slide-up": "slide-up var(--duration-normal) var(--ease-out)",
        "slide-down": "slide-down var(--duration-normal) var(--ease-out)",
        "slide-left": "slide-left var(--duration-normal) var(--ease-out)",
        "slide-right": "slide-right var(--duration-normal) var(--ease-out)",
        "scale-in": "scale-in var(--duration-fast) var(--ease-out)",
        "scale-out": "scale-out var(--duration-fast) var(--ease-in)",
        "pulse-subtle": "pulse-subtle 2s var(--ease-in-out) infinite",
        "bounce-subtle": "bounce-subtle 1s infinite",
        "shimmer": "shimmer 2s linear infinite",
        
        // Specialized animations
        "spin-slow": "spin 3s linear infinite",
        "ping-slow": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      
      /* === GRID SYSTEM === */
      gridTemplateColumns: {
        "auto-fit": "repeat(auto-fit, minmax(0, 1fr))",
        "auto-fill": "repeat(auto-fill, minmax(0, 1fr))",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography"),
  ],
} satisfies Config;
