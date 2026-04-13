/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ============================================
        // 灵笔品牌设计系统 - 墨韵书香
        // ============================================

        // 墨色系（主色调）
        ink: {
          50: '#f7f7f5',   // 浅墨灰
          100: '#e8e6e1',  // 淡墨
          200: '#d4d0c8',  // 轻墨
          300: '#b8b2a4',  // 中淡墨
          400: '#9c9482',  // 中墨
          500: '#786f5e',  // 重墨
          600: '#5c5447',  // 深墨
          700: '#3d372d',  // 浓墨
          800: '#2a2520',  // 极浓墨
          900: '#1a1815',  // 墨黑
          950: '#0d0c0a',  // 玄墨
        },

        // 纸色系（背景色）
        paper: {
          white: '#fffef9',    // 纯白纸
          cream: '#faf8f0',    // 米黄纸
          aged: '#f5f2e8',     // 古纸色
          yellow: '#f0ece0',   // 黄宣纸
          grey: '#e8e4d8',     // 灰宣纸
        },

        // 朱砂色系（点缀色/强调色）
        vermilion: {
          50: '#fef2f2',   // 淡朱
          100: '#fee4e2',  // 浅朱
          200: '#fdd4d0',  // 轻朱
          300: '#fbb8b2',  // 中淡朱
          400: '#f89890',  // 朱红淡
          500: '#e53935',  // 朱砂红（主色）
          600: '#c62b28',  // 深朱砂
          700: '#a32220',  // 浓朱砂
          800: '#821a18',  // 极浓朱
          900: '#6b1514',  // 暗朱
          950: '#4a0f0e',  // 玄朱
        },

        // 靛蓝色系（辅助色）
        indigo: {
          50: '#e8f4f8',   // 淡靛
          100: '#d1e9f0',  // 浅靛
          200: '#a8d3e2',  // 轻靛
          300: '#7ab8d4',  // 中靛
          400: '#4a9cc6',  // 靛蓝淡
          500: '#2b7eb8',  // 靛蓝（主色）
          600: '#1f66a0',  // 深靛
          700: '#164f82',  // 浓靛
          800: '#0d3864',  // 极浓靛
          900: '#082246',  // 暗靛
        },

        // 金色系（装饰色）
        gold: {
          50: '#fdf8e7',   // 淡金
          100: '#f9f0c8',  // 浅金
          200: '#f2e098',  // 轻金
          300: '#e8c868',  // 中金
          400: '#d4a838',  // 金黄
          500: '#c49a22',  // 古金
          600: '#a67c18',  // 深金
          700: '#885e14',  // 浓金
          800: '#6a4010',  // 极浓金
          900: '#4c280c',  // 暗金
        },

        // 状态色（功能色）
        status: {
          draft: '#b8b2a4',      // 草稿 - 墨灰色
          generating: '#2b7eb8', // 生成中 - 靛蓝
          reviewing: '#c49a22',  // 审核中 - 金色
          success: '#4a9cc6',    // 成功 - 靛蓝淡
          error: '#e53935',      // 错误 - 朱砂
          warning: '#d4a838',    // 警告 - 金黄
          completed: '#5c5447',  // 完成 - 深墨
        },

        // 语义化快捷色
        brand: {
          primary: '#e53935',    // 朱砂红
          secondary: '#2b7eb8',  // 靛蓝
          accent: '#c49a22',     // 古金
          background: '#faf8f0', // 米黄纸
          text: '#2a2520',       // 浓墨
          muted: '#786f5e',      // 重墨
          border: '#d4d0c8',     // 轻墨
        },
      },

      fontFamily: {
        // 标题字体 - 无衬线
        title: ['Noto Sans SC', 'system-ui', 'sans-serif'],
        // 正文字体 - 衬线（宋体风格）
        prose: ['Noto Serif SC', 'Georgia', 'serif'],
        // 写作字体 - 衬线（优化阅读）
        writing: ['Noto Serif SC', 'Source Han Serif SC', 'serif'],
        // 代码字体
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        // 写作模式字号
        'writing-xs': ['12px', { lineHeight: '1.6' }],
        'writing-sm': ['14px', { lineHeight: '1.7' }],
        'writing-base': ['16px', { lineHeight: '1.8' }],
        'writing-lg': ['18px', { lineHeight: '2' }],
        'writing-xl': ['20px', { lineHeight: '2.2' }],

        // 标题字号
        'title-xs': ['12px', { lineHeight: '1.4', letterSpacing: '0.05em' }],
        'title-sm': ['14px', { lineHeight: '1.4', letterSpacing: '0.05em' }],
        'title-base': ['16px', { lineHeight: '1.5', letterSpacing: '0.02em' }],
        'title-lg': ['20px', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        'title-xl': ['24px', { lineHeight: '1.3', letterSpacing: '0' }],
        'title-2xl': ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'title-3xl': ['40px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },

      spacing: {
        // 内容宽度
        'content-sm': '480px',
        'content-base': '640px',
        'content-lg': '720px',
        'content-xl': '840px',
        'content-full': '960px',

        // 章节内容专用
        'chapter-content': '720px',
      },

      boxShadow: {
        // 墨韵风格阴影
        'ink-sm': '0 1px 2px rgba(26, 24, 21, 0.08)',
        'ink': '0 2px 4px rgba(26, 24, 21, 0.12)',
        'ink-md': '0 4px 8px rgba(26, 24, 21, 0.16)',
        'ink-lg': '0 8px 16px rgba(26, 24, 21, 0.20)',
        'ink-xl': '0 16px 32px rgba(26, 24, 21, 0.24)',

        // 纸张浮起效果
        'paper': '0 2px 8px rgba(26, 24, 21, 0.06), 0 8px 24px rgba(26, 24, 21, 0.10)',
        'paper-hover': '0 4px 12px rgba(26, 24, 21, 0.08), 0 12px 32px rgba(26, 24, 21, 0.14)',

        // 朱砂强调
        'vermilion': '0 0 0 3px rgba(229, 57, 53, 0.20)',
        'vermilion-focus': '0 0 0 2px rgba(229, 57, 53, 0.30)',
      },

      borderRadius: {
        'paper': '4px',
        'paper-md': '8px',
        'paper-lg': '12px',
        'seal': '50%',  // 印章圆形
      },

      animation: {
        // 墨韵动画
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-in',
        'scale-in': 'scaleIn 0.3s ease-out',

        // 状态动画
        'pulse-gentle': 'pulseGentle 2s ease-in-out infinite',
        'pulse-ink': 'pulseInk 1.5s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',

        // 书写动画
        'writing-cursor': 'writingCursor 1s ease-in-out infinite',

        // 流式生成动画
        'stream-flow': 'streamFlow 0.8s linear infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        pulseInk: {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(229, 57, 53, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 0 8px rgba(229, 57, 53, 0)',
          },
        },
        writingCursor: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        streamFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },

      backgroundImage: {
        // 纸张纹理
        'paper-texture': 'linear-gradient(to bottom, rgba(250,248,240,0.9), rgba(250,248,240,1))',

        // 水墨渐变
        'ink-gradient': 'linear-gradient(135deg, #2a2520 0%, #3d372d 50%, #5c5447 100%)',

        // 朱砂渐变
        'vermilion-gradient': 'linear-gradient(135deg, #e53935 0%, #c62b28 100%)',

        // 靛蓝渐变
        'indigo-gradient': 'linear-gradient(135deg, #2b7eb8 0%, #1f66a0 100%)',

        // 流式生成进度条
        'stream-progress': 'linear-gradient(90deg, #2b7eb8 0%, #4a9cc6 50%, #2b7eb8 100%)',
      },
    },
  },
  plugins: [],
}