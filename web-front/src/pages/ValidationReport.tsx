/**
 * 校验报告页面 - 墨韵书香风格
 * 功能：
 * - 规则分类展示（L/G/S/P/F/B/E 七大类）
 * - 问题列表展示（严重度、置信度、位置、建议）
 * - 自动修复功能
 * - 章节选择器
 * - 执行校验交互
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { validateChapter, validateNovel, getValidationReport, getChapterList, applyValidationFix } from '@services/api'
import type { ValidationIssue, ValidationReport, Chapter } from '@/types/novel'

// 校验类型
type ValidationType = 'single_chapter' | 'full_novel'

// 规则分类定义
const RULE_CATEGORIES = {
  'L': { name: '逻辑一致性', color: 'vermilion', count: 5 },
  'G': { name: '语法规范', color: 'indigo', count: 5 },
  'S': { name: '风格一致性', color: 'gold', count: 3 },
  'P': { name: '人物一致性', color: 'purple', count: 4 },
  'F': { name: '伏笔一致性', color: 'cyan', count: 3 },
  'B': { name: '商业逻辑', color: 'amber', count: 8 },
  'E': { name: '感情线', color: 'rose', count: 8 },
}

// 严重度颜色映射
const SEVERITY_COLORS = {
  high: { bg: 'bg-vermilion-100', text: 'text-vermilion-700', badge: 'badge-vermilion' },
  medium: { bg: 'bg-gold-100', text: 'text-gold-700', badge: 'badge-gold' },
  low: { bg: 'bg-ink-100', text: 'text-ink-600', badge: 'badge-ink' },
}

// 状态映射
const STATUS_LABELS = {
  pending: '待处理',
  auto_fixed: '已自动修复',
  user_fixed: '已手动修复',
  ignored: '已忽略',
}

export default function ValidationReport() {
  const { novelId, chapterNum } = useParams<{ novelId: string; chapterNum?: string }>()
  const navigate = useNavigate()

  // 章节列表
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapter, setSelectedChapter] = useState<number>(chapterNum ? parseInt(chapterNum) : 1)

  // 校验类型
  const [validationType, setValidationType] = useState<ValidationType>('single_chapter')

  // 校验报告
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)

  // 筛选状态
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // 提示消息
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  // 展开的问题
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())

  // 自动关闭提示
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // 加载章节列表
  useEffect(() => {
    if (novelId) {
      loadChapters(novelId)
    }
  }, [novelId])

  // 加载已有报告
  useEffect(() => {
    if (novelId && validationType === 'single_chapter') {
      loadExistingReport(novelId, selectedChapter)
    }
  }, [novelId, selectedChapter, validationType])

  async function loadChapters(id: string) {
    try {
      const response = await getChapterList(id)
      if (response.success && response.data) {
        setChapters(response.data)
      }
    } catch (err) {
      console.error('加载章节列表失败:', err)
    }
  }

  async function loadExistingReport(id: string, chapter: number) {
    try {
      setLoading(true)
      const response = await getValidationReport(id, chapter)
      if (response.success && response.data) {
        setReport(response.data)
      }
    } catch {
      // 无报告时显示空状态
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  // 执行校验
  const handleValidate = useCallback(async () => {
    if (!novelId) return

    setValidating(true)
    setReport(null)

    try {
      let response
      if (validationType === 'single_chapter') {
        response = await validateChapter(novelId, selectedChapter)
      } else {
        response = await validateNovel(novelId)
      }

      if (response.success && response.data) {
        // 全书校验返回数组，取第一个或合并统计
        if (validationType === 'full_novel' && Array.isArray(response.data)) {
          // 合合多章报告为一个
          const mergedReport: ValidationReport = {
            novel_id: novelId,
            validated_at: response.data[0]?.validated_at || new Date().toISOString(),
            validation_type: 'full_novel',
            issues: response.data.flatMap(r => r.issues),
            statistics: {
              total_issues: response.data.reduce((sum, r) => sum + r.statistics.total_issues, 0),
              high_severity: response.data.reduce((sum, r) => sum + r.statistics.high_severity, 0),
              medium_severity: response.data.reduce((sum, r) => sum + r.statistics.medium_severity, 0),
              low_severity: response.data.reduce((sum, r) => sum + r.statistics.low_severity, 0),
              auto_fixed: response.data.reduce((sum, r) => sum + r.statistics.auto_fixed, 0),
              pending: response.data.reduce((sum, r) => sum + r.statistics.pending, 0),
            },
          }
          setReport(mergedReport)
        } else {
          setReport(response.data as ValidationReport)
        }
        setToast({ type: 'success', message: '校验完成' })
      } else {
        setToast({ type: 'error', message: '校验失败，请重试' })
      }
    } catch {
      setToast({ type: 'error', message: '校验失败，请重试' })
    } finally {
      setValidating(false)
    }
  }, [novelId, validationType, selectedChapter])

  // 应用修复
  const handleApplyFix = useCallback(async (issueId: string) => {
    if (!novelId) return

    try {
      const response = await applyValidationFix(novelId, issueId)
      if (response.success) {
        // 更新报告状态
        if (report) {
          const updatedIssues = report.issues.map(issue =>
            issue.issue_id === issueId
              ? { ...issue, status: 'auto_fixed' as const }
              : issue
          )
          setReport({ ...report, issues: updatedIssues })
        }
        setToast({ type: 'success', message: '修复已应用' })
      } else {
        setToast({ type: 'error', message: '修复失败' })
      }
    } catch {
      setToast({ type: 'error', message: '修复失败，请重试' })
    }
  }, [novelId, report])

  // 切换问题展开
  const toggleIssueExpand = useCallback((issueId: string) => {
    setExpandedIssues(prev => {
      const newSet = new Set(prev)
      if (newSet.has(issueId)) {
        newSet.delete(issueId)
      } else {
        newSet.add(issueId)
      }
      return newSet
    })
  }, [])

  // 筛选问题
  const filteredIssues = report?.issues.filter(issue => {
    if (filterCategory !== 'all' && !issue.rule_id.startsWith(filterCategory)) return false
    if (filterSeverity !== 'all' && issue.severity !== filterSeverity) return false
    if (filterStatus !== 'all' && issue.status !== filterStatus) return false
    return true
  }) || []

  // 统计信息
  const statistics = report?.statistics || {
    total_issues: 0,
    high_severity: 0,
    medium_severity: 0,
    low_severity: 0,
    auto_fixed: 0,
    pending: 0,
  }

  // 按分类统计
  const categoryStats = Object.keys(RULE_CATEGORIES).map(cat => ({
    category: cat,
    count: report?.issues.filter(i => i.rule_id.startsWith(cat)).length || 0,
  }))

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
              <div className="seal-lg">验</div>
              <h1 className="text-title-xl font-bold text-ink-800">文案校验</h1>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleValidate} disabled={validating} className="btn-vermilion">
              {validating ? (
                <span className="flex items-center gap-2">
                  <div className="loading-spinner w-4 h-4" />
                  校验中...
                </span>
              ) : '执行校验'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* 校验配置面板 */}
        <div className="paper p-8 mb-8">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-vermilion-500 rounded-full" />
            校验配置
          </h2>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-title-sm text-ink-600 mb-2">校验范围</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setValidationType('single_chapter')}
                  className={`flex-1 ${validationType === 'single_chapter' ? 'btn-vermilion' : 'btn-outline-ink'}`}
                >
                  单章校验
                </button>
                <button
                  onClick={() => setValidationType('full_novel')}
                  className={`flex-1 ${validationType === 'full_novel' ? 'btn-vermilion' : 'btn-outline-ink'}`}
                >
                  全书校验
                </button>
              </div>
            </div>

            {validationType === 'single_chapter' && chapters.length > 0 && (
              <div>
                <label className="block text-title-sm text-ink-600 mb-2">选择章节</label>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
                  className="input-ink"
                >
                  {chapters.map(ch => (
                    <option key={ch.chapter_num} value={ch.chapter_num}>
                      第 {ch.chapter_num} 章 - {ch.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 规则分类展示 */}
          <div className="mt-8 pt-6 border-t border-ink-200">
            <h3 className="font-title-base text-ink-700 mb-4">校验规则（36条）</h3>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
              {Object.entries(RULE_CATEGORIES).map(([key, cat]) => (
                <div key={key} className="paper-flat p-4 text-center">
                  <div className={`seal w-8 h-8 mx-auto mb-2 bg-${cat.color}-100 text-${cat.color}-700`}>
                    {key}
                  </div>
                  <div className="font-title-sm text-ink-700">{cat.name}</div>
                  <div className="text-title-xs text-ink-400">{cat.count} 条</div>
                  <div className="mt-2 text-title-xs text-ink-500">
                    {categoryStats.find(c => c.category === key)?.count || 0} 问题
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner" />
            <span className="ml-4 text-ink-600">加载校验报告...</span>
          </div>
        )}

        {/* 校验报告展示 */}
        {report && (
          <div className="space-y-8">
            {/* 统计概览 */}
            <section className="paper p-8">
              <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-500 rounded-full" />
                <span>校验概览</span>
                <span className="badge-indigo">
                  {validationType === 'single_chapter' ? `第 ${selectedChapter} 章` : '全书'}
                </span>
              </h2>

              <div className="grid grid-cols-6 gap-4">
                <div className="paper-flat p-4 text-center">
                  <div className="text-title-2xl font-bold text-ink-800">{statistics.total_issues}</div>
                  <div className="text-title-xs text-ink-500">总问题</div>
                </div>
                <div className="paper-flat p-4 text-center bg-vermilion-50">
                  <div className="text-title-2xl font-bold text-vermilion-700">{statistics.high_severity}</div>
                  <div className="text-title-xs text-vermilion-500">高严重</div>
                </div>
                <div className="paper-flat p-4 text-center bg-gold-50">
                  <div className="text-title-2xl font-bold text-gold-700">{statistics.medium_severity}</div>
                  <div className="text-title-xs text-gold-500">中严重</div>
                </div>
                <div className="paper-flat p-4 text-center bg-ink-50">
                  <div className="text-title-2xl font-bold text-ink-600">{statistics.low_severity}</div>
                  <div className="text-title-xs text-ink-400">低严重</div>
                </div>
                <div className="paper-flat p-4 text-center bg-indigo-50">
                  <div className="text-title-2xl font-bold text-indigo-700">{statistics.auto_fixed}</div>
                  <div className="text-title-xs text-indigo-500">已修复</div>
                </div>
                <div className="paper-flat p-4 text-center bg-vermilion-50">
                  <div className="text-title-2xl font-bold text-vermilion-600">{statistics.pending}</div>
                  <div className="text-title-xs text-vermilion-400">待处理</div>
                </div>
              </div>

              {/* 校验时间 */}
              <div className="mt-4 text-title-xs text-ink-400 text-right">
                校验时间: {report.validated_at}
              </div>
            </section>

            {/* 筛选器 */}
            <section className="paper-flat p-4 flex items-center gap-6">
              <span className="font-title-sm text-ink-600">筛选:</span>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="input-ink text-sm"
              >
                <option value="all">全部分类</option>
                {Object.entries(RULE_CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>{cat.name} ({key})</option>
                ))}
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="input-ink text-sm"
              >
                <option value="all">全部严重度</option>
                <option value="high">高严重</option>
                <option value="medium">中严重</option>
                <option value="low">低严重</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-ink text-sm"
              >
                <option value="all">全部状态</option>
                <option value="pending">待处理</option>
                <option value="auto_fixed">已修复</option>
                <option value="ignored">已忽略</option>
              </select>

              <div className="flex-1 text-right text-title-sm text-ink-500">
                显示 {filteredIssues.length} / {report.issues.length} 问题
              </div>
            </section>

            {/* 问题列表 */}
            <section className="paper p-8">
              <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
                <div className="w-2 h-8 bg-vermilion-500 rounded-full" />
                <span>问题详情</span>
              </h2>

              {filteredIssues.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full mx-auto flex items-center justify-center mb-4">
                    <span className="text-indigo-500 text-2xl">✓</span>
                  </div>
                  <div className="font-title-base text-ink-700">无问题发现</div>
                  <div className="text-ink-400 font-prose mt-2">所有校验规则均已通过</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIssues.map((issue) => (
                    <IssueCard
                      key={issue.issue_id}
                      issue={issue}
                      expanded={expandedIssues.has(issue.issue_id)}
                      onToggle={() => toggleIssueExpand(issue.issue_id)}
                      onApplyFix={() => handleApplyFix(issue.issue_id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 无报告提示 */}
        {!loading && !report && (
          <div className="paper p-12 text-center">
            <div className="w-20 h-20 bg-paper-aged rounded-full mx-auto flex items-center justify-center mb-6">
              <span className="text-ink-400 text-3xl">验</span>
            </div>
            <div className="font-title-lg text-ink-700 mb-2">暂无校验报告</div>
            <div className="text-ink-500 font-prose mb-6">
              点击"执行校验"按钮，AI 将检查章节内容是否符合设定规则
            </div>
            <button onClick={handleValidate} disabled={validating} className="btn-vermilion">
              {validating ? (
                <span className="flex items-center gap-2">
                  <div className="loading-spinner w-4 h-4" />
                  校验中...
                </span>
              ) : '执行校验'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// 问题卡片组件
function IssueCard({
  issue,
  expanded,
  onToggle,
  onApplyFix,
}: {
  issue: ValidationIssue
  expanded: boolean
  onToggle: () => void
  onApplyFix: () => void
}) {
  const categoryKey = issue.rule_id.charAt(0)
  const category = RULE_CATEGORIES[categoryKey as keyof typeof RULE_CATEGORIES]
  const severityStyle = SEVERITY_COLORS[issue.severity]

  return (
    <div className={`paper-flat p-4 ${issue.status === 'auto_fixed' ? 'bg-indigo-50 border-indigo-200' : ''}`}>
      {/* 问题头部 */}
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className={`seal w-8 h-8 bg-${category?.color || 'ink'}-100 text-${category?.color || 'ink'}-700`}>
            {categoryKey}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`${severityStyle.badge}`}>{issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}</span>
              <span className="text-title-xs text-ink-400">{issue.rule_id}</span>
              <span className={`badge ${
                issue.status === 'auto_fixed' ? 'badge-indigo' :
                issue.status === 'pending' ? 'badge-vermilion' : 'badge-ink'
              }`}>
                {STATUS_LABELS[issue.status]}
              </span>
            </div>
            <div className="font-title-sm text-ink-800 mt-1">
              {issue.description.length > 60 && !expanded
                ? issue.description.slice(0, 60) + '...'
                : issue.description}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {issue.confidence > 0 && (
            <span className="text-title-xs text-ink-400">
              置信度: {issue.confidence}%
            </span>
          )}
          <button className="btn-text text-title-xs">
            {expanded ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {/* 问题详情 */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-ink-200">
          {/* 位置信息 */}
          {issue.location && (
            <div className="mb-4 paper-flat p-3">
              <span className="text-title-xs text-ink-500">位置: </span>
              {issue.location.start_line && (
                <span className="text-title-sm text-ink-700">
                  第 {issue.location.start_line} 行
                  {issue.location.end_line && issue.location.end_line !== issue.location.start_line &&
                    ` - 第 ${issue.location.end_line} 行`}
                </span>
              )}
            </div>
          )}

          {/* 修复建议 */}
          <div className="mb-4">
            <h4 className="font-title-sm text-ink-700 mb-2 flex items-center gap-2">
              <span className="text-indigo-500">◆</span>
              修复建议
            </h4>
            <div className="paper-flat p-4 font-prose text-ink-700">
              {issue.suggestion}
            </div>
          </div>

          {/* 自动修复内容 */}
          {issue.auto_fix_available && issue.auto_fix_text && (
            <div className="mb-4 bg-indigo-50 border border-indigo-200 p-4 rounded-paper-md">
              <h4 className="font-title-sm text-indigo-700 mb-2 flex items-center gap-2">
                <span className="text-indigo-500">✓</span>
                自动修复内容
              </h4>
              <div className="font-prose text-ink-800">
                {issue.auto_fix_text}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-4">
            {issue.status === 'pending' && issue.auto_fix_available && (
              <button onClick={onApplyFix} className="btn-indigo">
                应用自动修复
              </button>
            )}
            {issue.status === 'pending' && (
              <button className="btn-outline-ink">
                手动编辑
              </button>
            )}
            <button className="btn-outline-vermilion">
              忽略此问题
            </button>
          </div>
        </div>
      )}
    </div>
  )
}