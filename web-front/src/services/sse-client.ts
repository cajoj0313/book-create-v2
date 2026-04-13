/**
 * SSE 客户端服务 - 用于接收流式生成内容
 * 功能：
 * - 自动重连机制
 * - 心跳检测
 * - 公共SSE解析逻辑
 * - 错误处理
 */

import type { SSEEvent } from '@/types/novel'

type SSEEventHandler = (event: SSEEvent) => void
type ErrorHandler = (error: Error) => void

interface SSEOptions {
  onEvent: SSEEventHandler
  onError?: ErrorHandler
  onComplete?: () => void
  // 重连配置
  reconnect?: boolean
  maxRetries?: number
  retryDelay?: number
  // 心跳检测
  heartbeatInterval?: number
  heartbeatTimeout?: number
}

// 默认重连配置
const DEFAULT_RECONNECT_CONFIG = {
  reconnect: true,
  maxRetries: 3,
  retryDelay: 1000, // 1秒
}

// 默认心跳配置
const DEFAULT_HEARTBEAT_CONFIG = {
  heartbeatInterval: 30000, // 30秒
  heartbeatTimeout: 60000, // 60秒超时
}

/**
 * SSE 解析器 - 公共解析逻辑
 */
class SSEParser {
  private buffer: string = ''

  /**
   * 解析 SSE 数据行
   */
  parse(data: string, onEvent: SSEEventHandler): void {
    this.buffer += data
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data:')) {
        this.parseDataLine(line.slice(5).trim(), onEvent)
      } else if (line.startsWith('event:')) {
        // 事件类型行，可用于区分不同事件
        const eventType = line.slice(6).trim()
        if (eventType === 'heartbeat') {
          // 心跳事件，忽略
          continue
        }
      }
    }
  }

  /**
   * 解析数据行
   */
  private parseDataLine(data: string, onEvent: SSEEventHandler): void {
    // 尝试解析为 JSON 对象
    try {
      const parsed = JSON.parse(data)
      onEvent({
        event: parsed.event || 'chunk',
        data: parsed.content || parsed.data || '',
        timestamp: new Date().toISOString()
      })
      return
    } catch {
      // 不是 JSON 对象，可能是 JSON 转义的字符串
    }

    // 尝试解转义 JSON 字符串（后端使用 json.dumps(text)[1:-1]）
    try {
      // 添加引号使其成为有效的 JSON 字符串
      const unescaped = JSON.parse(`"${data}"`)
      onEvent({
        event: 'chunk',
        data: unescaped,
        timestamp: new Date().toISOString()
      })
      return
    } catch {
      // 解转义失败，作为纯文本
    }

    // 纯文本
    onEvent({
      event: 'chunk',
      data: data,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 重置缓冲区
   */
  reset(): void {
    this.buffer = ''
  }
}

/**
 * SSE 客户端
 * 用于接收世界观、大纲、章节等流式生成内容
 */
export class SSEClient {
  private eventSource: EventSource | null = null
  private abortController: AbortController | null = null
  private parser: SSEParser = new SSEParser()

  // 重连状态
  private retryCount: number = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect: boolean = false

  // 心跳检测
  private lastHeartbeatTime: number = 0
  private heartbeatCheckTimer: ReturnType<typeof setInterval> | null = null

  // 连接配置
  private currentUrl: string = ''
  private currentOptions: SSEOptions | null = null
  private currentBody: Record<string, unknown> | null = null

  /**
   * 连接 SSE 流
   */
  connect(
    url: string,
    options: SSEOptions | { method?: string; body?: string },
    callbacks?: SSEOptions
  ): void {
    this.currentUrl = url

    // 如果 options 包含 method 或 body，使用 POST 方式
    if ('method' in options || 'body' in options) {
      const fetchOptions = options as { method?: string; body?: string }
      const callbackOptions = callbacks as SSEOptions
      this.currentOptions = callbackOptions
      this.currentBody = fetchOptions.body ? JSON.parse(fetchOptions.body) : null
      this.postConnect(url, fetchOptions, callbackOptions)
      return
    }

    // 标准 SSE GET 连接
    const sseOptions = options as SSEOptions
    this.currentOptions = sseOptions
    this.currentBody = null
    this.disconnect()
    this.startGetConnection(url, sseOptions)
  }

  /**
   * GET 方式连接
   */
  private startGetConnection(url: string, options: SSEOptions): void {
    const config = { ...DEFAULT_RECONNECT_CONFIG, ...options }

    try {
      this.eventSource = new EventSource(url)
      this.shouldReconnect = config.reconnect || false

      // 连接开启
      this.eventSource.onopen = () => {
        this.retryCount = 0
        this.startHeartbeat(options)
        options.onEvent({
          event: 'start',
          data: '连接已建立',
          timestamp: new Date().toISOString()
        })
      }

      // 接收消息
      this.eventSource.onmessage = (event) => {
        this.updateHeartbeat()
        this.parser.parse(event.data, options.onEvent)

        // 检查是否完成
        try {
          const data = JSON.parse(event.data)
          if (data.event === 'complete') {
            this.shouldReconnect = false
            options.onComplete?.()
            this.disconnect()
          }
        } catch {
          // 忽略解析错误
        }
      }

      // 错误处理
      this.eventSource.onerror = () => {
        this.handleConnectionError(options, 'SSE 连接错误')
      }

    } catch (error) {
      options.onError?.(error as Error)
    }
  }

  /**
   * POST 方式连接 SSE
   */
  private async postConnect(
    url: string,
    fetchOptions: { method?: string; body?: string },
    callbacks: SSEOptions
  ): Promise<void> {
    const config = { ...DEFAULT_RECONNECT_CONFIG, ...callbacks }
    this.shouldReconnect = config.reconnect || false

    this.disconnect()
    this.abortController = new AbortController()
    this.parser.reset()

    try {
      const response = await fetch(url, {
        method: fetchOptions.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: fetchOptions.body,
        signal: this.abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('响应体为空')
      }

      this.retryCount = 0
      this.startHeartbeat(callbacks)

      callbacks.onEvent({
        event: 'start',
        data: '连接已建立',
        timestamp: new Date().toISOString()
      })

      // 解析 SSE 流
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          this.shouldReconnect = false
          callbacks.onComplete?.()
          break
        }

        this.updateHeartbeat()
        const decoded = decoder.decode(value, { stream: true })
        this.parser.parse(decoded, callbacks.onEvent)
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return
      }
      this.handleConnectionError(callbacks, (error as Error).message)
    }
  }

  /**
   * 处理连接错误（支持重连）
   */
  private handleConnectionError(options: SSEOptions, errorMessage: string): void {
    this.stopHeartbeat()

    const config = { ...DEFAULT_RECONNECT_CONFIG, ...options }

    if (this.shouldReconnect && this.retryCount < (config.maxRetries || 3)) {
      this.retryCount++
      const delay = config.retryDelay || 1000

      // 发送重连事件
      options.onEvent({
        event: 'error',
        data: `连接断开，正在重连 (${this.retryCount}/${config.maxRetries})...`,
        timestamp: new Date().toISOString()
      })

      // 延迟重连
      this.retryTimer = setTimeout(() => {
        this.reconnect(options)
      }, delay * this.retryCount) // 递增延迟

    } else {
      // 重连失败或禁用重连
      this.shouldReconnect = false
      const error = new Error(errorMessage)
      options.onError?.(error)
      options.onEvent({
        event: 'error',
        data: errorMessage,
        timestamp: new Date().toISOString()
      })
      this.disconnect()
    }
  }

  /**
   * 执行重连
   */
  private reconnect(options: SSEOptions): void {
    this.disconnect()

    if (this.currentBody) {
      // POST 重连
      this.postConnect(
        this.currentUrl,
        {
          method: 'POST',
          body: JSON.stringify(this.currentBody)
        },
        this.currentOptions || options
      )
    } else {
      // GET 重连
      this.startGetConnection(this.currentUrl, this.currentOptions || options)
    }
  }

  /**
   * POST 方式发起 SSE 请求
   */
  async post(url: string, body: Record<string, unknown>, options: SSEOptions): Promise<void> {
    this.currentUrl = url
    this.currentBody = body
    this.currentOptions = options

    this.connect(url, { method: 'POST', body: JSON.stringify(body) }, options)
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(options: SSEOptions): void {
    const config = { ...DEFAULT_HEARTBEAT_CONFIG, ...options }
    this.lastHeartbeatTime = Date.now()

    // 心跳超时检测
    this.heartbeatCheckTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastHeartbeatTime
      if (elapsed > (config.heartbeatTimeout || 60000)) {
        // 心跳超时，触发重连
        this.handleConnectionError(options, '心跳超时，连接断开')
      }
    }, 10000) // 每10秒检查一次
  }

  /**
   * 更新心跳时间
   */
  private updateHeartbeat(): void {
    this.lastHeartbeatTime = Date.now()
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatCheckTimer) {
      clearInterval(this.heartbeatCheckTimer)
      this.heartbeatCheckTimer = null
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.shouldReconnect = false
    this.stopHeartbeat()

    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    this.parser.reset()
    this.retryCount = 0
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.eventSource !== null || this.abortController !== null
  }

  /**
   * 获取重连次数
   */
  getRetryCount(): number {
    return this.retryCount
  }
}

// 单例实例
export const sseClient = new SSEClient()

/**
 * Hook: 使用 SSE 流式生成（带重连支持）
 */
import { useState, useCallback, useRef, useEffect } from 'react'

interface UseSSEStreamOptions {
  url: string
  body?: Record<string, unknown>
  onComplete?: (fullContent: string) => void
  onError?: (error: Error) => void
  // 重连配置
  reconnect?: boolean
  maxRetries?: number
}

interface UseSSEStreamReturn {
  content: string
  isStreaming: boolean
  error: Error | null
  retryCount: number
  start: () => void
  stop: () => void
  reset: () => void
  reconnect: () => void
}

export function useSSEStream(options: UseSSEStreamOptions): UseSSEStreamReturn {
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const clientRef = useRef<SSEClient>(new SSEClient())
  const contentRef = useRef('')
  const optionsRef = useRef(options)

  // 更新 options ref
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const start = useCallback(() => {
    setContent('')
    contentRef.current = ''
    setError(null)
    setRetryCount(0)
    setIsStreaming(true)

    const client = clientRef.current
    const currentOptions = optionsRef.current

    const eventHandler = (event: SSEEvent) => {
      if (event.event === 'chunk') {
        contentRef.current += event.data
        setContent(contentRef.current)
      } else if (event.event === 'complete') {
        setIsStreaming(false)
        currentOptions.onComplete?.(contentRef.current)
      } else if (event.event === 'start') {
        setRetryCount(0)
      } else if (event.event === 'error') {
        // 检查是否是重连消息
        if (event.data.includes('重连')) {
          const match = event.data.match(/\((\d+)\/(\d+)\)/)
          if (match) {
            setRetryCount(parseInt(match[1]))
          }
        } else {
          setError(new Error(event.data))
          setIsStreaming(false)
          currentOptions.onError?.(new Error(event.data))
        }
      }
    }

    const sseOptions: SSEOptions = {
      onEvent: eventHandler,
      onError: (err) => {
        setError(err)
        setIsStreaming(false)
        currentOptions.onError?.(err)
      },
      onComplete: () => {
        setIsStreaming(false)
        currentOptions.onComplete?.(contentRef.current)
      },
      reconnect: currentOptions.reconnect ?? true,
      maxRetries: currentOptions.maxRetries ?? 3,
    }

    if (currentOptions.body) {
      client.post(currentOptions.url, currentOptions.body, sseOptions)
    } else {
      client.connect(currentOptions.url, sseOptions)
    }
  }, [])

  const stop = useCallback(() => {
    clientRef.current.disconnect()
    setIsStreaming(false)
  }, [])

  const reset = useCallback(() => {
    setContent('')
    contentRef.current = ''
    setError(null)
    setRetryCount(0)
    setIsStreaming(false)
  }, [])

  const manualReconnect = useCallback(() => {
    clientRef.current.disconnect()
    setRetryCount(0)
    setError(null)
    start()
  }, [start])

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      clientRef.current.disconnect()
    }
  }, [])

  // 获取当前重连次数
  useEffect(() => {
    const timer = setInterval(() => {
      if (isStreaming) {
        setRetryCount(clientRef.current.getRetryCount())
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [isStreaming])

  return { content, isStreaming, error, retryCount, start, stop, reset, reconnect: manualReconnect }
}