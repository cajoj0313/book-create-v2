import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@components/ErrorBoundary'
import NovelList from '@pages/NovelList'
import NovelDetail from '@pages/NovelDetail'
import WorldBuilder from '@pages/WorldBuilder'
import OutlineEditor from '@pages/OutlineEditor'
import StorySynopsisViewer from '@pages/StorySynopsisViewer'
import ChapterWriter from '@pages/ChapterWriter'
import ValidationReport from '@pages/ValidationReport'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-paper-cream">
          <Routes>
            {/* 小说列表 */}
            <Route path="/" element={<NovelList />} />
            <Route path="/novels" element={<Navigate to="/" replace />} />

            {/* 小说详情 */}
            <Route path="/novels/:novelId" element={<NovelDetail />} />

            {/* 世界观构建 */}
            <Route path="/novels/:novelId/world-setting" element={<WorldBuilder />} />

            {/* 大纲编辑 */}
            <Route path="/novels/:novelId/outline" element={<OutlineEditor />} />

            {/* 故事梗概 */}
            <Route path="/novels/:novelId/synopsis" element={<StorySynopsisViewer />} />

            {/* 章节写作 */}
            <Route path="/novels/:novelId/chapters" element={<ChapterWriter />} />
            <Route path="/novels/:novelId/chapters/:chapterNum" element={<ChapterWriter />} />

            {/* 校验报告 */}
            <Route path="/novels/:novelId/validation" element={<ValidationReport />} />
            <Route path="/novels/:novelId/chapters/:chapterNum/validation" element={<ValidationReport />} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App