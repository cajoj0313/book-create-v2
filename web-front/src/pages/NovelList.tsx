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
                className="paper p-6 cursor-pointer hover:shadow-paper-hover transition cursor-pointer"
              >
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
    </div>
  )
}