import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { NovelMeta } from '@/types/novel'
import { novelApi } from '@services/api'

export default function NovelList() {
  const navigate = useNavigate()
  const [novels, setNovels] = useState<NovelMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  // 删除确认弹窗状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingNovel, setDeletingNovel] = useState<NovelMeta | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadNovels()
  }, [])

  const loadNovels = async () => {
    try {
      const data = await novelApi.listNovels()
      setNovels(data)
    } catch (err) {
      console.error('Failed to load novels:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const novel = await novelApi.createNovel({
        title: newTitle,
        genre: '都市职场',
        target_chapters: 200
      })
      navigate(`/novels/${novel.novel_id}/world-setting`)
    } catch (err) {
      console.error('Failed to create novel:', err)
    } finally {
      setCreating(false)
      setNewTitle('')
    }
  }

  // 打开删除确认弹窗
  const handleDeleteClick = (novel: NovelMeta, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止触发卡片点击导航
    setDeletingNovel(novel)
    setShowDeleteConfirm(true)
  }

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deletingNovel) return
    setDeleting(true)
    try {
      await novelApi.deleteNovel(deletingNovel.novel_id)
      setNovels(prev => prev.filter(n => n.novel_id !== deletingNovel.novel_id))
      setShowDeleteConfirm(false)
      setDeletingNovel(null)
    } catch (err) {
      console.error('Failed to delete novel:', err)
    } finally {
      setDeleting(false)
    }
  }

  // 取消删除
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeletingNovel(null)
  }

  return (
    <div className="min-h-screen bg-paper-cream p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-title-3xl font-bold text-ink-800 mb-8">
          灵笔 - AI小说生成平台
        </h1>

        {/* 创建新小说 */}
        <div className="paper p-6 mb-8">
          <h2 className="text-title-xl font-semibold mb-4">创建新小说</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="输入小说标题..."
              className="flex-1 border border-ink-200 rounded-paper px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vermilion-500"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              className="btn-vermilion"
            >
              {creating ? '创建中...' : '创建'}
            </button>
          </div>
        </div>

        {/* 小说列表 */}
        {loading ? (
          <div className="text-center py-8 text-ink-500">加载中...</div>
        ) : novels.length === 0 ? (
          <div className="text-center py-8 text-ink-400">
            暂无小说，请创建新小说开始创作
          </div>
        ) : (
          <div className="grid gap-4">
            {novels.map((novel) => (
              <div
                key={novel.novel_id}
                onClick={() => navigate(`/novels/${novel.novel_id}`)}
                className="paper p-6 cursor-pointer hover:shadow-paper-hover transition group relative"
              >
                {/* 删除按钮 */}
                <button
                  onClick={(e) => handleDeleteClick(novel, e)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-ink-400 hover:text-vermilion-600 p-1"
                  title="删除小说"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                <h3 className="text-title-lg font-semibold">{novel.title}</h3>
                <div className="text-ink-500 mt-2">
                  {novel.genre} | {novel.completed_chapters}/{novel.target_chapters}章 | {novel.word_count}字
                </div>
                <div className="text-ink-400 text-title-sm mt-1">
                  状态: {novel.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 删除确认弹窗 - 墨韵书香风格 */}
      {showDeleteConfirm && deletingNovel && (
        <div className="dialog-overlay">
          <div className="dialog-paper">
            <h2 className="text-title-xl text-ink-800 mb-4">确认删除？</h2>
            <p className="text-ink-600 mb-2 font-prose">
              即将删除小说：<span className="font-semibold text-vermilion-600">{deletingNovel.title}</span>
            </p>
            <p className="text-ink-500 mb-6 text-title-sm">
              删除后无法恢复，所有章节、人物、大纲等数据将永久丢失。
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