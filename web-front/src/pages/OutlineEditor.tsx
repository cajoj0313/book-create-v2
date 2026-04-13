import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'

// 简化版大纲编辑页
export default function OutlineEditor() {
  const { novelId } = useParams()
  const navigate = useNavigate()
  const [targetChapters, setTargetChapters] = useState(200)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!novelId) return
    setGenerating(true)
    // TODO: 调用大纲生成API
    setTimeout(() => {
      setGenerating(false)
      navigate(`/novels/${novelId}/chapters`)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-paper-cream p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(`/novels/${novelId}`)}
          className="text-ink-500 hover:text-ink-700 mb-4"
        >
          ← 返回详情
        </button>

        <h1 className="text-title-3xl font-bold text-ink-800 mb-8">
          大纲生成
        </h1>

        <div className="paper p-6">
          <h2 className="text-title-xl font-semibold mb-4">目标章节数</h2>
          <input
            type="number"
            value={targetChapters}
            onChange={(e) => setTargetChapters(Number(e.target.value))}
            className="border border-ink-200 rounded-paper px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-vermilion-500"
            min={50}
            max={500}
            disabled={generating}
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-4 ml-4 btn-vermilion"
          >
            {generating ? '生成大纲中...' : '生成大纲'}
          </button>
        </div>

        {generating && (
          <div className="text-center py-8 text-ink-500">
            AI正在生成大纲，请稍候...
          </div>
        )}
      </div>
    </div>
  )
}