import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

// 校验报告页
export default function ValidationReport() {
  const { novelId, chapterNum } = useParams()
  const navigate = useNavigate()
  const [issues, setIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: 调用校验API
    setTimeout(() => {
      setIssues([
        { rule_id: 'L001', severity: 'high', description: '时间线矛盾示例', status: 'pending' },
        { rule_id: 'G001', severity: 'low', description: '错别字示例', status: 'auto_fixed' },
      ])
      setLoading(false)
    }, 1000)
  }, [novelId, chapterNum])

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
          校验报告
        </h1>

        {loading ? (
          <div className="text-center py-8 text-ink-500">加载中...</div>
        ) : (
          <div className="paper">
            <div className="p-6 border-b border-ink-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-title-2xl font-bold text-ink-800">{issues.length}</div>
                  <div className="text-ink-500">总问题</div>
                </div>
                <div>
                  <div className="text-title-2xl font-bold text-vermilion-600">
                    {issues.filter(i => i.severity === 'high').length}
                  </div>
                  <div className="text-ink-500">高严重</div>
                </div>
                <div>
                  <div className="text-title-2xl font-bold text-indigo-600">
                    {issues.filter(i => i.status === 'auto_fixed').length}
                  </div>
                  <div className="text-ink-500">已修复</div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {issues.length === 0 ? (
                <div className="text-center text-ink-400">无问题</div>
              ) : (
                <div className="space-y-4">
                  {issues.map((issue, idx) => (
                    <div key={idx} className="border border-ink-200 rounded-paper p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-paper text-title-xs ${
                          issue.severity === 'high' ? 'bg-vermilion-100 text-vermilion-600' : 'bg-gold-100 text-gold-600'
                        }`}>
                          {issue.severity}
                        </span>
                        <span className="text-ink-400 text-title-xs">{issue.rule_id}</span>
                      </div>
                      <div className="text-ink-700">{issue.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}