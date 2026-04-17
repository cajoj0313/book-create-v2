/**
 * 故事梗概页面 - 短篇小说 MVP
 * 功能：
 * - SSE 流式故事梗概生成
 * - 3000-5000 字完整故事展示
 * - 关键情节节点展示
 * - 人物成长弧光展示
 * - 确认按钮（生成后需确认）
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SSEClient } from '@services/sse-client'
import { getWorldSetting, getOutline } from '@services/api'
import type { WorldSetting, Outline } from '@/types/novel'

// 生成状态
type GenerateStatus = 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'

// 确认对话框
type ConfirmDialog = 'none' | 'confirm' | 'success'

interface StorySynopsis {
  novel_id: string
  story_content: string
  key_plot_points: Array<{
    point: number
    chapter_range: string
    event: string
    emotion_stage: string
  }>
  character_arc: {
    male_lead_arc: string
    female_lead_arc: string
  }
}

export default function StorySynopsisViewer() {
  const { novelId } = useParams<{ novelId: string }>()
  const navigate = useNavigate()

  // 生成状态
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>('idle')
  const [generatedContent, setGeneratedContent] = useState('')
  const [generateError, setGenerateError] = useState<string | null>(null)

  // 解析后的故事梗概数据
  const [synopsis, setSynopsis] = useState<StorySynopsis | null>(null)
  const [pendingSynopsis, setPendingSynopsis] = useState<StorySynopsis | null>(null)

  // 加载状态
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 世界观和大纲（用于展示上下文）
  const [worldSetting, setWorldSetting] = useState<WorldSetting | null>(null)
  const [outline, setOutline] = useState<Outline | null>(null)

  // 确认对话框
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>('none')

  // 提示消息
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  // SSE 客户端
  const sseClientRef = useRef<SSEClient | null>(null)

  // 自动关闭提示
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // 加载已有数据
  useEffect(() => {
    if (novelId) {
      loadExistingData(novelId)
    }
  }, [novelId])

  // 清理 SSE 连接
  useEffect(() => {
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect()
      }
    }
  }, [])

  // 当生成内容变化时，尝试解析 JSON
  useEffect(() => {
    if (generateStatus === 'completed' && generatedContent) {
      const parsed = tryParseJSON(generatedContent)
      if (parsed) {
        setPendingSynopsis(parsed)
        setConfirmDialog('confirm')
      }
    }
  }, [generateStatus, generatedContent])

  async function loadExistingData(id: string) {
    try {
      setLoading(true)

      // 加载世界观
      const worldRes = await getWorldSetting(id)
      if (worldRes.success && worldRes.data) {
        setWorldSetting(worldRes.data)
      }

      // 加载大纲
      const outlineRes = await getOutline(id)
      if (outlineRes.success && outlineRes.data) {
        setOutline(outlineRes.data)
      }

      // 加载已有故事梗概（如果有）
      // 注：当前 API 没有直接获取故事梗概的接口，暂时省略

    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  // 尝试解析 JSON
  function tryParseJSON(content: string): StorySynopsis | null {
    try {
      let jsonContent = content
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1]
      }
      const parsed = JSON.parse(jsonContent)
      if (parsed.story_content && parsed.key_plot_points) {
        return parsed
      }
      return null
    } catch {
      return null
    }
  }

  // 开始生成
  const handleGenerate = useCallback(() => {
    if (!novelId) return

    setGenerateStatus('connecting')
    setGeneratedContent('')
    setGenerateError(null)
    setSynopsis(null)
    setPendingSynopsis(null)

    const client = new SSEClient()
    sseClientRef.current = client

    client.connect(
      `/api/generation/synopsis/stream`,
      {
        method: 'POST',
        body: JSON.stringify({
          novel_id: novelId,
        }),
      },
      {
        onEvent: (event) => {
          if (event.event === 'start') {
            setGenerateStatus('streaming')
          } else if (event.event === 'chunk') {
            setGeneratedContent(prev => prev + event.data)
          } else if (event.event === 'complete') {
            setGenerateStatus('completed')
          } else if (event.event === 'error') {
            setGenerateStatus('error')
            setGenerateError(event.data)
          }
        },
        onError: (err) => {
          setGenerateStatus('error')
          setGenerateError(err.message)
        },
        onComplete: () => {
          setGenerateStatus('completed')
        },
      }
    )
  }, [novelId])

  // 停止生成
  const handleStopGenerate = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect()
      sseClientRef.current = null
    }
    setGenerateStatus('idle')
  }, [])

  // 确认使用生成的故事梗概
  const handleConfirmUse = useCallback(() => {
    if (pendingSynopsis) {
      setSynopsis(pendingSynopsis)
      setConfirmDialog('success')
      setToast({ type: 'success', message: '故事梗概已生成，可继续下一步' })
    }
  }, [pendingSynopsis])

  // 拒绝生成结果，重新生成
  const handleRejectAndRegenerate = useCallback(() => {
    setConfirmDialog('none')
    setPendingSynopsis(null)
    setGeneratedContent('')
    setGenerateStatus('idle')
  }, [])

  // 继续下一步（跳转章节写作）
  const handleNextStep = useCallback(() => {
    navigate(`/novels/${novelId}/chapters/1`)
  }, [novelId, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-cream flex items-center justify-center">
        <div className="flex items-center gap-4">
          <div className="loading-spinner" />
          <span className="loading-text">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper-cream">
      {/* 提示消息 */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-warning'}`}>
          <span className="font-title-sm">{toast.message}</span>
        </div>
      )}

      {/* 头部 */}
      <header className="bg-paper-white border-b border-ink-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/novels/${novelId}`)} className="btn-text">
              ← 返回
            </button>
            <div className="flex items-center gap-3">
              <div className="seal-lg">概</div>
              <h1 className="text-title-xl font-bold text-ink-800">故事梗概</h1>
            </div>
          </div>

          {synopsis && (
            <div className="flex gap-3">
              <button onClick={handleNextStep} className="btn-vermilion">
                开始写作 →
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* 生成控制面板 */}
        {!synopsis && (
          <div className="paper p-8 mb-8">
            <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-vermilion-500 rounded-full" />
              生成故事梗概
            </h2>

            <div className="mb-6">
              <p className="font-prose text-ink-700 mb-4">
                故事梗概是完整的 3000-5000 字故事概要，包含所有章节的关键事件和因果链。
                生成后将基于此拆分章节，确保章节之间有因果联系。
              </p>

              {/* 上下文提示 */}
              {worldSetting && outline && (
                <div className="paper-flat p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-indigo-500">◆</span>
                    <span className="font-title-sm text-ink-700">基于已有世界观和大纲生成</span>
                  </div>
                  <div className="font-prose text-sm text-ink-600">
                    <div>城市：{worldSetting.background?.city || '未设定'} · 职场：{worldSetting.background?.workplace || '未设定'}</div>
                    <div>男主：{worldSetting.male_lead?.name || '未设定'} · 女主：{worldSetting.female_lead?.name || '未设定'}</div>
                    <div>章节数：{outline.chapters?.length || 0}章</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              {generateStatus === 'streaming' ? (
                <button onClick={handleStopGenerate} className="btn-vermilion">
                  停止生成
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={generateStatus === 'connecting' || !worldSetting || !outline}
                  className="btn-vermilion"
                >
                  {generateStatus === 'connecting' ? (
                    <span className="flex items-center gap-2">
                      <div className="loading-spinner w-4 h-4" />
                      连接中...
                    </span>
                  ) : '开始生成故事梗概'}
                </button>
              )}
            </div>

            {!worldSetting && (
              <div className="mt-6 bg-amber-50 border border-amber-200 p-4 rounded-paper-md">
                <div className="flex items-center gap-2 text-amber-700">
                  <span>⚠</span>
                  <span className="font-title-sm">需先创建世界观</span>
                </div>
                <button
                  onClick={() => navigate(`/novels/${novelId}/world-setting`)}
                  className="mt-3 btn-outline-vermilion"
                >
                  前往创建世界观
                </button>
              </div>
            )}

            {worldSetting && !outline && (
              <div className="mt-6 bg-amber-50 border border-amber-200 p-4 rounded-paper-md">
                <div className="flex items-center gap-2 text-amber-700">
                  <span>⚠</span>
                  <span className="font-title-sm">需先创建大纲</span>
                </div>
                <button
                  onClick={() => navigate(`/novels/${novelId}/outline`)}
                  className="mt-3 btn-outline-vermilion"
                >
                  前往创建大纲
                </button>
              </div>
            )}
          </div>
        )}

        {/* 生成状态指示 */}
        {generateStatus !== 'idle' && (
          <div className={`paper-flat p-6 mb-8 ${
            generateStatus === 'streaming' ? 'border-indigo-300' :
            generateStatus === 'completed' ? 'border-indigo-200' :
            generateStatus === 'error' ? 'border-vermilion-300' : ''
          }`}>
            {generateStatus === 'connecting' && (
              <div className="flex items-center gap-3 text-ink-600">
                <div className="loading-spinner" />
                <span>正在连接 AI 服务...</span>
              </div>
            )}
            {generateStatus === 'streaming' && (
              <div className="flex items-center gap-3 text-indigo-700">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse-ink" />
                <span className="font-title-sm">AI 正在生成故事梗概，实时显示中...</span>
                <div className="flex-1">
                  <div className="progress-bar">
                    <div className="progress-bar-fill w-1/2 animate-stream-flow" style={{ backgroundSize: '200% 100%' }} />
                  </div>
                </div>
              </div>
            )}
            {generateStatus === 'completed' && (
              <div className="flex items-center gap-2 text-indigo-600">
                <span className="text-indigo-500">✓</span>
                <span className="font-title-sm">生成完成，请确认内容</span>
              </div>
            )}
            {generateStatus === 'error' && (
              <div className="flex items-center gap-2 text-vermilion-700">
                <span className="text-vermilion-500">✗</span>
                <span className="font-title-sm">生成失败：{generateError}</span>
              </div>
            )}
          </div>
        )}

        {/* 流式生成内容（未解析时显示） */}
        {(generateStatus === 'streaming' || (generateStatus === 'completed' && !pendingSynopsis)) && generatedContent && (
          <div className="paper p-8 mb-8">
            <h2 className="font-title-lg text-ink-800 mb-4">生成内容</h2>
            <div className="bg-paper-aged rounded-paper-md p-6 max-h-96 overflow-y-auto scrollbar-ink">
              <pre className="font-prose text-writing-base whitespace-pre-wrap text-ink-800">
                {generatedContent}
              </pre>
              {generateStatus === 'streaming' && <span className="stream-cursor" />}
            </div>
          </div>
        )}

        {/* 故事梗概可视化展示 */}
        {synopsis && (
          <SynopsisViewer synopsis={synopsis} />
        )}
      </main>

      {/* 确认对话框 - 生成结果确认 */}
      {confirmDialog === 'confirm' && pendingSynopsis && !synopsis && (
        <div className="dialog-overlay">
          <div className="dialog-paper w-full max-w-2xl">
            <h2 className="font-title-xl text-ink-800 mb-4 flex items-center gap-3">
              <div className="seal">确</div>
              确认使用此故事梗概？
            </h2>

            <div className="bg-paper-aged rounded-paper-md p-4 mb-6 max-h-48 overflow-y-auto scrollbar-ink">
              <div className="font-prose text-sm text-ink-700">
                <p className="mb-2"><strong>故事字数：</strong>约{pendingSynopsis.story_content?.length || 0}字</p>
                <p className="mb-2"><strong>情节节点：</strong>{pendingSynopsis.key_plot_points?.length || 0}个</p>
                {pendingSynopsis.key_plot_points?.slice(0, 3).map((point, idx) => (
                  <p key={idx} className="mb-1 text-xs">
                    <span className="text-indigo-600">节点{point.point}：</span>{point.event?.slice(0, 50)}...
                  </p>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={handleRejectAndRegenerate} className="btn-outline-vermilion flex-1">
                拒绝，重新生成
              </button>
              <button onClick={handleConfirmUse} className="btn-vermilion flex-1">
                确认使用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成功提示 */}
      {confirmDialog === 'success' && (
        <div className="dialog-overlay">
          <div className="dialog-paper">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl">
                ✓
              </div>
              <h2 className="font-title-xl text-ink-800">故事梗概生成成功</h2>
            </div>
            <p className="text-ink-600 mb-6 font-prose">
              现在可以开始拆分章节了。
            </p>
            <button onClick={() => setConfirmDialog('none')} className="btn-indigo w-full">
              开始写作
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 故事梗概可视化组件
function SynopsisViewer({ synopsis }: { synopsis: StorySynopsis }) {
  return (
    <div className="space-y-8">
      {/* 故事梗概正文 */}
      <section className="paper p-8">
        <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
          <div className="w-2 h-8 bg-indigo-500 rounded-full" />
          <span>完整故事</span>
          <span className="badge-indigo">{synopsis.story_content?.length || 0}字</span>
        </h2>

        <div className="bg-paper-aged rounded-paper-md p-8 max-h-[600px] overflow-y-auto scrollbar-ink">
          <div className="font-prose text-base text-ink-800 leading-relaxed whitespace-pre-wrap">
            {synopsis.story_content}
          </div>
        </div>
      </section>

      {/* 关键情节节点 */}
      {synopsis.key_plot_points && synopsis.key_plot_points.length > 0 && (
        <section className="paper p-8">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-gold-500 rounded-full" />
            <span>关键情节节点</span>
            <span className="badge-gold">{synopsis.key_plot_points.length}个</span>
          </h2>

          <div className="space-y-4">
            {synopsis.key_plot_points.map((point, idx) => (
              <div key={idx} className="paper-flat p-6 float-paper">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center font-title-sm text-gold-700 font-bold">
                    {point.point}
                  </div>
                  <span className="badge-ink">{point.chapter_range}</span>
                  <span className="badge-indigo">{point.emotion_stage}</span>
                </div>
                <div className="font-prose text-ink-700">{point.event}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 人物成长弧光 */}
      {synopsis.character_arc && (
        <section className="paper p-8">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-vermilion-500 rounded-full" />
            <span>人物成长弧光</span>
          </h2>

          <div className="grid grid-cols-2 gap-6">
            <div className="paper-flat p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge-vermilion">男主</span>
                <span className="font-title-sm text-ink-800">成长路径</span>
              </div>
              <div className="font-prose text-ink-700">{synopsis.character_arc.male_lead_arc}</div>
            </div>
            <div className="paper-flat p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge-indigo">女主</span>
                <span className="font-title-sm text-ink-800">成长路径</span>
              </div>
              <div className="font-prose text-ink-700">{synopsis.character_arc.female_lead_arc}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
