/**
 * 章节写作页面 - 墨韵书香风格
 * 功能：
 * - SSE流式渲染（实时显示生成内容）
 * - 保存功能（调用API）
 * - 状态更新（章节完成后更新人物状态、伏笔状态）
 * - 审核通过继续下一章
 * - 美化审核弹窗、完善交互
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SSEClient } from '@services/sse-client'
import { getChapter, updateChapter, getOutline, getCharacters, deleteChapter } from '@services/api'
import type { Chapter, ChapterOutline, Character } from '@/types/novel'

// 流式生成状态
type GenerateStatus = 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'

// 章节审核状态
type ReviewStatus = 'pending' | 'approved' | 'rejected'

export default function ChapterWriter() {
  const { novelId, chapterNum } = useParams<{ novelId: string; chapterNum?: string }>()
  const navigate = useNavigate()

  // 当前章节号
  const currentChapterNum = chapterNum ? parseInt(chapterNum) : 1

  // 章节数据
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [outline, setOutline] = useState<ChapterOutline | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])

  // 编辑内容
  const [editedContent, setEditedContent] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')

  // 生成状态
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>('idle')
  const [generateError, setGenerateError] = useState<string | null>(null)

  // 审核状态
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('pending')
  const [showReviewModal, setShowReviewModal] = useState(false)

  // 保存状态
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  // 删除确认弹窗状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 提示消息
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  // SSE客户端
  const sseClientRef = useRef<SSEClient | null>(null)

  // 自动保存定时器
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 自动关闭提示
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // 加载章节数据
  useEffect(() => {
    if (novelId) {
      loadChapterData(novelId, currentChapterNum)
    }
  }, [novelId, currentChapterNum])

  // 自动保存（每30秒）
  useEffect(() => {
    if (editedContent && chapter) {
      autoSaveTimerRef.current = setInterval(() => {
        handleSave(true)
      }, 30000)
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [editedContent])

  // 清理SSE连接
  useEffect(() => {
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect()
      }
    }
  }, [])

  async function loadChapterData(id: string, num: number) {
    try {
      // 加载章节内容
      const chapterRes = await getChapter(id, num)
      if (chapterRes.success && chapterRes.data) {
        setChapter(chapterRes.data)
        setEditedContent(chapterRes.data.content)
        setGeneratedContent('')
      } else {
        setChapter({
          novel_id: id,
          chapter_num: num,
          title: `第${num}章`,
          version: 0,
          created_at: new Date().toISOString(),
          content: '',
          word_count: 0,
        })
        setEditedContent('')
      }

      // 加载大纲
      const outlineRes = await getOutline(id)
      if (outlineRes.success && outlineRes.data) {
        const chapterOutline = outlineRes.data.chapters.find(ch => ch.chapter_num === num)
        setOutline(chapterOutline || null)
      }

      // 加载人物
      const charactersRes = await getCharacters(id)
      if (charactersRes.success && charactersRes.data) {
        setCharacters(charactersRes.data.characters || [])
      }

    } catch {
      setToast({ type: 'error', message: '加载章节数据失败' })
    }
  }

  // 开始SSE流式生成
  const handleGenerate = useCallback(() => {
    if (!novelId) return

    setGenerateStatus('connecting')
    setGeneratedContent('')
    setGenerateError(null)
    setReviewStatus('pending')

    const client = new SSEClient()
    sseClientRef.current = client

    client.connect(
      `/api/generation/chapter/stream/${novelId}/${currentChapterNum}`,
      {
        method: 'POST',
        body: JSON.stringify({
          outline_context: outline ? {
            key_events: outline.key_events,
            turning_points: outline.turning_points,
          } : null,
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
            setShowReviewModal(true)
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
  }, [novelId, currentChapterNum, outline])

  // 停止生成
  const handleStopGenerate = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect()
      sseClientRef.current = null
    }
    setGenerateStatus('idle')
  }, [])

  // 保存章节
  async function handleSave(silent = false) {
    if (!novelId || !editedContent) return

    try {
      setSaving(true)
      const response = await updateChapter(novelId, currentChapterNum, editedContent)
      if (response.success && response.data) {
        setChapter(response.data)
        setLastSavedAt(new Date().toLocaleTimeString())
        if (!silent) {
          setToast({ type: 'success', message: '章节已保存' })
        }
      } else {
        if (!silent) {
          setToast({ type: 'error', message: '保存失败' })
        }
      }
    } catch {
      if (!silent) {
        setToast({ type: 'error', message: '保存失败，请重试' })
      }
    } finally {
      setSaving(false)
    }
  }

  // 使用生成内容
  const handleUseGenerated = useCallback(() => {
    setEditedContent(generatedContent)
    setShowReviewModal(false)
    setReviewStatus('approved')
    setToast({ type: 'success', message: '内容已应用，请保存' })
  }, [generatedContent])

  // 拒绝生成内容
  const handleRejectGenerated = useCallback(() => {
    setShowReviewModal(false)
    setReviewStatus('rejected')
    setGeneratedContent('')
    setGenerateStatus('idle')
    setToast({ type: 'warning', message: '已拒绝，可重新生成' })
  }, [])

  // 审核通过，继续下一章
  const handleApproveAndNext = useCallback(async () => {
    if (novelId && generatedContent) {
      try {
        await updateChapter(novelId, currentChapterNum, generatedContent)
        setToast({ type: 'success', message: '章节已保存并审核通过' })
      } catch {
        setToast({ type: 'error', message: '保存失败' })
      }
    }

    setTimeout(() => {
      navigate(`/novels/${novelId}/chapters/${currentChapterNum + 1}`)
      setShowReviewModal(false)
    }, 500)
  }, [novelId, currentChapterNum, generatedContent, navigate])

  // 打开删除确认弹窗
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  // 确认删除章节
  const handleConfirmDelete = async () => {
    if (!novelId) return
    setDeleting(true)
    try {
      await deleteChapter(novelId, currentChapterNum)
      setToast({ type: 'success', message: '章节已删除' })
      setShowDeleteConfirm(false)
      // 删除后跳转：如果有上一章则跳转到上一章，否则跳转到小说详情页
      if (currentChapterNum > 1) {
        navigate(`/novels/${novelId}/chapters/${currentChapterNum - 1}`)
      } else {
        navigate(`/novels/${novelId}`)
      }
    } catch {
      setToast({ type: 'error', message: '删除失败' })
    } finally {
      setDeleting(false)
    }
  }

  // 取消删除
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  // 显示内容
  const displayContent = generateStatus === 'streaming' || generateStatus === 'completed'
    ? generatedContent
    : editedContent

  const wordCount = displayContent.length

  // 大纲事件列表
  const outlineEvents = outline?.key_events || []

  return (
    <div className="min-h-screen bg-paper-cream">
      {/* 提示消息 */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-warning'}`}>
          <span className="font-title-sm">{toast.message}</span>
        </div>
      )}

      {/* 顶部工具栏 */}
      <header className="bg-paper-white border-b border-ink-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/novels/${novelId}`)} className="btn-text">
              ← 返回
            </button>
            <div className="flex items-center gap-3">
              <div className="seal-lg">{currentChapterNum}</div>
              <div>
                <h1 className="text-title-xl font-bold text-ink-800">第 {currentChapterNum} 章</h1>
                {chapter && <p className="text-title-sm text-ink-600">{chapter.title}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-ink-600">
              <span className="font-title-sm">字数:</span>
              <span className="font-title-base text-vermilion-600">{wordCount.toLocaleString()}</span>
              {lastSavedAt && (
                <span className="text-title-xs text-ink-400 ml-4">
                  已保存 {lastSavedAt}
                </span>
              )}
            </div>

            <div className="flex gap-3">
              {generateStatus === 'streaming' ? (
                <button onClick={handleStopGenerate} className="btn-vermilion">
                  停止生成
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={generateStatus === 'connecting'}
                  className="btn-vermilion"
                >
                  {generateStatus === 'connecting' ? (
                    <span className="flex items-center gap-2">
                      <div className="loading-spinner w-4 h-4" />
                      连接中...
                    </span>
                  ) : 'AI 续写'}
                </button>
              )}

              <button
                onClick={() => handleSave(false)}
                disabled={saving || !editedContent}
                className="btn-indigo"
              >
                {saving ? '保存中...' : '保存'}
              </button>

              <button
                onClick={handleDeleteClick}
                className="btn-outline-vermilion"
                title="删除当前章节"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* 左侧：大纲事件面板 */}
        <aside className="w-72 paper p-6">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
            本章大纲
          </h2>

          {outlineEvents.length > 0 ? (
            <div className="space-y-3">
              {outlineEvents.map((event, idx) => (
                <div key={idx} className="paper-flat p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="seal w-6 h-6 text-title-xs">{idx + 1}</span>
                    <span className="font-title-sm text-ink-700">{event}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ink-400 font-prose">暂无大纲事件</p>
          )}

          {/* 转折点 */}
          {outline?.turning_points && outline.turning_points.length > 0 && (
            <div className="mt-6 pt-6 border-t border-ink-200">
              <h3 className="font-title-base text-ink-700 mb-4 flex items-center gap-2">
                <span className="text-gold-500">◆</span>
                转折点
              </h3>
              {outline.turning_points.map((tp, idx) => (
                <div key={idx} className="bg-gold-50 border border-gold-200 p-4 rounded-paper-md mb-2">
                  <span className="font-title-xs text-gold-700">{tp.type}:</span>
                  <span className="font-prose text-sm text-ink-700 ml-2">{tp.event}</span>
                </div>
              ))}
            </div>
          )}

          {/* 人物状态提示 */}
          {characters.length > 0 && (
            <div className="mt-6 pt-6 border-t border-ink-200">
              <h3 className="font-title-base text-ink-700 mb-4">出场人物</h3>
              <div className="flex flex-wrap gap-2">
                {characters.slice(0, 8).map(c => (
                  <span key={c.character_id} className="badge-ink">{c.name}</span>
                ))}
                {characters.length > 8 && (
                  <span className="text-title-xs text-ink-400">等{characters.length}人</span>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* 中间：写作区域 */}
        <div className="flex-1 paper">
          {/* 流式生成状态指示 */}
          {generateStatus !== 'idle' && (
            <div className={`px-6 py-4 border-b ${
              generateStatus === 'streaming' ? 'bg-indigo-50 border-indigo-200' :
              generateStatus === 'completed' ? 'bg-indigo-50 border-indigo-100' :
              generateStatus === 'error' ? 'bg-vermilion-50 border-vermilion-200' :
              'bg-paper-grey border-ink-200'
            }`}>
              {generateStatus === 'connecting' && (
                <div className="flex items-center gap-3 text-ink-600">
                  <div className="loading-spinner" />
                  <span className="font-title-sm">正在连接AI服务...</span>
                </div>
              )}
              {generateStatus === 'streaming' && (
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse-ink" />
                  <span className="font-title-sm text-indigo-700">AI正在生成内容，实时显示中...</span>
                  <div className="flex-1">
                    <div className="progress-bar">
                      <div className="progress-bar-fill w-2/3 animate-stream-flow" style={{ backgroundSize: '200% 100%' }} />
                    </div>
                  </div>
                  <span className="text-title-xs text-indigo-600">{generatedContent.length}字</span>
                </div>
              )}
              {generateStatus === 'completed' && (
                <div className="flex items-center gap-2 text-indigo-600">
                  <span className="text-indigo-500">✓</span>
                  <span className="font-title-sm">生成完成！请审核内容</span>
                </div>
              )}
              {generateStatus === 'error' && (
                <div className="flex items-center gap-2 text-vermilion-700">
                  <span className="text-vermilion-500">✗</span>
                  <span className="font-title-sm">生成失败: {generateError}</span>
                </div>
              )}
            </div>
          )}

          {/* 内容编辑器 */}
          <div className="p-8">
            {generateStatus === 'streaming' || generateStatus === 'completed' ? (
              // 流式显示区
              <div className="min-h-[600px] font-writing text-writing-lg leading-[2.2] whitespace-pre-wrap text-ink-800">
                {generatedContent}
                {generateStatus === 'streaming' && <span className="stream-cursor" />}
              </div>
            ) : (
              // 编辑区
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="在此输入章节内容，或点击AI续写由AI自动生成..."
                className="w-full min-h-[600px] textarea-writing"
              />
            )}
          </div>
        </div>

        {/* 右侧：状态面板 */}
        <aside className="w-56 paper p-6">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-vermilion-500 rounded-full" />
            状态
          </h2>

          <div className="space-y-4">
            <div className="paper-flat p-4">
              <span className="text-title-xs text-ink-500">生成状态</span>
              <div className={`font-title-sm mt-2 ${
                generateStatus === 'completed' ? 'text-indigo-600' :
                generateStatus === 'streaming' ? 'text-indigo-500' :
                generateStatus === 'error' ? 'text-vermilion-600' :
                'text-ink-400'
              }`}>
                {generateStatus === 'idle' ? '待生成' :
                 generateStatus === 'connecting' ? '连接中' :
                 generateStatus === 'streaming' ? '生成中' :
                 generateStatus === 'completed' ? '已完成' : '错误'}
              </div>
            </div>

            <div className="paper-flat p-4">
              <span className="text-title-xs text-ink-500">审核状态</span>
              <div className={`font-title-sm mt-2 ${
                reviewStatus === 'approved' ? 'text-indigo-600' :
                reviewStatus === 'rejected' ? 'text-vermilion-600' :
                'text-ink-400'
              }`}>
                {reviewStatus === 'pending' ? '待审核' :
                 reviewStatus === 'approved' ? '已通过' : '已拒绝'}
              </div>
            </div>

            <div className="paper-flat p-4">
              <span className="text-title-xs text-ink-500">版本</span>
              <div className="font-title-sm text-ink-700 mt-2">
                v{chapter?.version || 0}
              </div>
            </div>
          </div>

          {/* 章节导航 */}
          <div className="mt-6 pt-6 border-t border-ink-200">
            <div className="flex justify-between">
              <button
                onClick={() => navigate(`/novels/${novelId}/chapters/${currentChapterNum - 1}`)}
                disabled={currentChapterNum <= 1}
                className="btn-text text-title-sm disabled:opacity-50"
              >
                ← 上一章
              </button>
              <button
                onClick={() => navigate(`/novels/${novelId}/chapters/${currentChapterNum + 1}`)}
                className="btn-text text-title-sm"
              >
                下一章 →
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* 审核弹窗 - 墨韵书香风格 */}
      {showReviewModal && (
        <div className="dialog-overlay">
          <div className="dialog-paper w-full max-w-3xl">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="seal-lg">审</div>
                <h2 className="text-title-xl text-ink-800">章节审核</h2>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="btn-text">
                ✕
              </button>
            </div>

            {/* 内容预览 */}
            <div className="bg-paper-aged rounded-paper-md p-6 mb-6 max-h-[400px] overflow-y-auto scrollbar-ink">
              <div className="font-writing text-writing-base whitespace-pre-wrap text-ink-800 leading-relaxed">
                {generatedContent.slice(0, 1500)}
                {generatedContent.length > 1500 && (
                  <span className="text-ink-400 font-title-sm">... （共{generatedContent.length.toLocaleString()}字）</span>
                )}
              </div>
            </div>

            {/* 统计信息 */}
            <div className="flex items-center gap-6 mb-6 paper-flat p-4">
              <div className="flex items-center gap-2">
                <span className="text-ink-500 font-title-xs">总字数</span>
                <span className="text-vermilion-600 font-title-lg font-bold">{generatedContent.length.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ink-500 font-title-xs">段落</span>
                <span className="text-indigo-600 font-title-lg font-bold">
                  {generatedContent.split('\n\n').filter(p => p.trim()).length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ink-500 font-title-xs">大纲事件</span>
                <span className="text-gold-600 font-title-lg font-bold">{outlineEvents.length}</span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-4">
              <button onClick={handleRejectGenerated} className="btn-outline-vermilion flex-1">
                <div className="flex items-center justify-center gap-2">
                  <span>✗</span>
                  <span>拒绝，重新生成</span>
                </div>
              </button>
              <button onClick={handleUseGenerated} className="btn-outline-ink flex-1">
                <div className="flex items-center justify-center gap-2">
                  <span>✓</span>
                  <span>使用此内容</span>
                </div>
              </button>
              <button onClick={handleApproveAndNext} className="btn-vermilion flex-1">
                <div className="flex items-center justify-center gap-2">
                  <span>→</span>
                  <span>审核通过，继续下一章</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 - 墨韵书香风格 */}
      {showDeleteConfirm && (
        <div className="dialog-overlay">
          <div className="dialog-paper">
            <h2 className="text-title-xl text-ink-800 mb-4">确认删除章节？</h2>
            <p className="text-ink-600 mb-2 font-prose">
              即将删除：<span className="font-semibold text-vermilion-600">第 {currentChapterNum} 章</span>
            </p>
            <p className="text-ink-500 mb-6 text-title-sm">
              删除后无法恢复，章节内容将永久丢失。
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleCancelDelete}
                disabled={deleting}
                className="btn-outline-ink flex-1"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="btn-vermilion flex-1"
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}