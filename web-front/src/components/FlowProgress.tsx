/**
 * 进度条组件 - 短篇小说 MVP 流程进度
 * 显示 4 阶段进度：世界观 (25%) → 大纲 (50%) → 故事梗概 (75%) → 章节 (100%)
 */

import { useParams, useNavigate } from 'react-router-dom'

interface FlowProgressProps {
  currentPhase: 'world_building' | 'outline' | 'synopsis' | 'chapter_writing'
  completedChapters: number
  targetChapters: number
}

export default function FlowProgress({ currentPhase, completedChapters, targetChapters }: FlowProgressProps) {
  const { novelId } = useParams<{ novelId: string }>()
  const navigate = useNavigate()

  // 定义 4 个阶段
  const stages = [
    {
      id: 'world_building',
      label: '世界观',
      progress: 25,
      path: `/novels/${novelId}/world-setting`,
      status: currentPhase === 'world_building' ? 'current' : currentPhase === 'outline' || currentPhase === 'synopsis' || currentPhase === 'chapter_writing' ? 'completed' : 'pending',
    },
    {
      id: 'outline',
      label: '大纲',
      progress: 50,
      path: `/novels/${novelId}/outline`,
      status: currentPhase === 'outline' ? 'current' : currentPhase === 'synopsis' || currentPhase === 'chapter_writing' ? 'completed' : 'pending',
    },
    {
      id: 'synopsis',
      label: '故事梗概',
      progress: 75,
      path: `/novels/${novelId}/synopsis`,
      status: currentPhase === 'synopsis' ? 'current' : currentPhase === 'chapter_writing' ? 'completed' : 'pending',
    },
    {
      id: 'chapter_writing',
      label: '章节',
      progress: 100,
      path: `/novels/${novelId}/chapters/1`,
      status: currentPhase === 'chapter_writing' ? 'current' : 'pending',
      chapterProgress: completedChapters / targetChapters,
    },
  ]

  return (
    <div className="bg-paper-white border-b border-ink-200 py-4">
      <div className="max-w-6xl mx-auto px-6">
        {/* 阶段导航 */}
        <div className="flex items-center gap-2">
          {stages.map((stage, idx) => (
            <div key={stage.id} className="flex items-center flex-1">
              {/* 阶段按钮 */}
              <button
                onClick={() => navigate(stage.path)}
                disabled={stage.status === 'pending'}
                className={`flex items-center gap-3 py-2 px-4 rounded-paper-md transition-all ${
                  stage.status === 'current' ? 'bg-vermilion-50 border-2 border-vermilion-500' :
                  stage.status === 'completed' ? 'bg-indigo-50 border-2 border-indigo-500 hover:bg-indigo-100' :
                  'bg-paper-cream border-2 border-ink-200 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-title-sm ${
                  stage.status === 'current' ? 'bg-vermilion-500 text-white' :
                  stage.status === 'completed' ? 'bg-indigo-500 text-white' :
                  'bg-ink-200 text-ink-400'
                }`}>
                  {stage.status === 'completed' ? '✓' : idx + 1}
                </div>
                <div className="text-left">
                  <div className={`font-title-sm ${
                    stage.status === 'current' ? 'text-vermilion-700' :
                    stage.status === 'completed' ? 'text-indigo-700' :
                    'text-ink-400'
                  }`}>
                    {stage.label}
                  </div>
                  <div className="text-title-xs text-ink-500">
                    {stage.status === 'completed' ? '已完成' : stage.status === 'current' ? '进行中' : '待开始'}
                  </div>
                </div>
              </button>

              {/* 连接箭头 */}
              {idx < stages.length - 1 && (
                <div className="flex-1 flex items-center justify-center px-2">
                  <svg className={`w-4 h-4 ${
                    stage.status === 'completed' ? 'text-indigo-500' : 'text-ink-200'
                  }`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 章节进度条（仅当进入章节写作阶段显示） */}
        {currentPhase === 'chapter_writing' && (
          <div className="mt-4 pt-4 border-t border-ink-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-title-xs text-ink-600">章节进度</span>
              <span className="text-title-xs text-ink-600">{completedChapters}/{targetChapters}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill bg-vermilion-gradient"
                style={{ width: `${Math.min(100, (completedChapters / targetChapters) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
