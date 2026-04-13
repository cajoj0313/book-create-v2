/**
 * 灵笔品牌设计系统
 *
 * 配色方案：墨韵书香 - 中国传统水墨风格
 * 主色：墨黑 + 纸白 + 朱砂点缀
 */

// 品牌色板
export const colors = {
  // 主色调
  primary: {
    50: '#f5f5f5',    // 浅墨
    100: '#e5e5e5',
    200: '#d4d4d4',
    300: '#a3a3a3',
    400: '#737373',
    500: '#404040',   // 墨色
    600: '#262626',   // 深墨
    700: '#171717',
    800: '#0a0a0a',
    900: '#000000',   // 纯墨
  },

  // 朱砂点缀色
  accent: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#c9a86c',   // 朱砂金
    600: '#b45309',   // 朱砂红
    700: '#92400e',
    800: '#78350f',
    900: '#451a03',
  },

  // 书纸背景色
  paper: {
    50: '#fafaf9',    // 宣纸白
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
  },

  // 状态色
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
}

// 字体系统
export const typography = {
  fontFamily: {
    // 正文 - 宋体风格
    body: '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif',
    // 标题 - 黑体风格
    heading: '"Noto Sans SC", "Source Han Sans SC", "SimHei", sans-serif',
    // UI文字
    ui: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  },
}

// 间距系统
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
}

// 圆角系统
export const borderRadius = {
  none: '0',
  sm: '0.125rem',  // 2px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  full: '9999px',
}

// 阴影系统
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  // 墨韵阴影 - 特殊效果
  ink: '0 4px 20px 0 rgba(64, 64, 64, 0.15)',
}

// 动画时长
export const transitions = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
}

// TailwindCSS 配置扩展
export const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        ink: colors.primary,
        vermilion: colors.accent,
        paper: colors.paper,
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      boxShadow: {
        ink: shadows.ink,
      },
    },
  },
}

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  tailwindConfig,
}