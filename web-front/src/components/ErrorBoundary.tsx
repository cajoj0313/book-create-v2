/**
 * ErrorBoundary 组件 - 错误边界
 * 用于捕获子组件的渲染错误，显示友好的错误页面
 */

import { Component, ReactNode, useCallback } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)

    // 可选：上报错误到监控系统
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 使用自定义fallback或默认错误页面
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-paper-cream flex items-center justify-center p-8">
          <div className="paper p-8 max-w-lg text-center animate-slide-up">
            {/* 错误图标 */}
            <div className="w-16 h-16 bg-vermilion-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-vermilion-600 text-3xl">✗</span>
            </div>

            {/* 错误标题 */}
            <h1 className="text-title-xl text-ink-800 mb-4">
              页面出错了
            </h1>

            {/* 错误描述 */}
            <p className="text-prose text-ink-600 mb-6">
              很抱歉，页面遇到了一些问题。请尝试刷新页面或返回首页。
            </p>

            {/* 错误详情（开发环境显示） */}
            {this.state.error && (
              <div className="bg-ink-50 rounded-paper-md p-4 mb-6 overflow-auto max-h-48">
                <pre className="text-title-xs text-vermilion-700 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-title-xs text-ink-500 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleRetry}
                className="btn-outline-ink"
              >
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-indigo"
              >
                刷新页面
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-vermilion"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 使用ErrorBoundary的便捷Hook
 */
export function useErrorBoundary() {
  const showBoundary = useCallback(() => {
    // 用于手动触发错误边界
    throw new Error('Manual error boundary trigger')
  }, [])

  return { showBoundary }
}