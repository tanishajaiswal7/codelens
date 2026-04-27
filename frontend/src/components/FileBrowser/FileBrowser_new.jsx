import { useState, useEffect } from 'react'
import FileTree from '../FileTree/FileTree.jsx'
import BranchSelector from '../BranchSelector/BranchSelector.jsx'
import FilePreview from '../FilePreview/FilePreview.jsx'
import ReviewPanel from '../ReviewPanel/ReviewPanel.jsx'
import * as fileBrowserApi from '../../api/fileBrowserApi.js'
import './FileBrowser.css'

export default function FileBrowser({ owner, repo, onBack }) {
  const [branches, setBranches] = useState([])
  const [currentRef, setCurrentRef] = useState('main')
  const [currentPath, setCurrentPath] = useState('')
  const [treeItems, setTreeItems] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [isLoadingTree, setIsLoadingTree] = useState(true)
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const [treeError, setTreeError] = useState(null)
  const [reviewResult, setReviewResult] = useState(null)
  const [isReviewing, setIsReviewing] = useState(false)

  useEffect(() => {
    loadBranches()
  }, [owner, repo])

  const loadBranches = async () => {
    try {
      const data = await fileBrowserApi.getBranches(owner, repo)
      setBranches(data)
      const def = data.find(b => b.isDefault) || data[0]
      if (def) {
        setCurrentRef(def.name)
        loadTree('', def.name)
      }
    } catch (err) {
      loadTree('', 'main')
    }
  }

  const loadTree = async (path, ref) => {
    setIsLoadingTree(true)
    setTreeError(null)
    try {
      const items = await fileBrowserApi.getTree(owner, repo, path, ref)
      setTreeItems(items)
      setCurrentPath(path)
    } catch (err) {
      const code = err.response?.data?.code
      if (code === 'GITHUB_NOT_CONNECTED') {
        setTreeError('GitHub not connected. Go to Settings.')
      } else {
        setTreeError(err.response?.data?.error || 'Failed to load files')
      }
      setTreeItems([])
    } finally {
      setIsLoadingTree(false)
    }
  }

  const handleRefChange = (ref) => {
    setCurrentRef(ref)
    setSelectedFile(null)
    setReviewResult(null)
    loadTree('', ref)
  }

  const handleFileClick = async (file) => {
    setIsLoadingFile(true)
    setSelectedFile(null)
    setReviewResult(null)
    try {
      const content = await fileBrowserApi.getFileContent(
        owner, repo, file.path, currentRef
      )
      setSelectedFile(content)
    } catch (err) {
      console.error('File load failed:', err)
    } finally {
      setIsLoadingFile(false)
    }
  }

  const handleReviewFile = async (persona) => {
    if (!selectedFile) return
    setIsReviewing(true)
    setReviewResult(null)
    try {
      const result = await fileBrowserApi.reviewFile(
        owner, repo, selectedFile.path,
        currentRef, selectedFile.content, persona
      )
      setReviewResult(result)
    } catch (err) {
      console.error('Review failed:', err)
    } finally {
      setIsReviewing(false)
    }
  }

  return (
    <div className="file-browser">

      {/* ── Top header bar ── */}
      <div className="fb-header">
        <button className="fb-back-btn" onClick={onBack}>
          ← Back to repos
        </button>
        <span className="fb-repo-label">{owner}/{repo}</span>
        {branches.length > 0 && (
          <BranchSelector
            branches={branches}
            currentRef={currentRef}
            onRefChange={handleRefChange}
          />
        )}
      </div>

      {/* ── Three column workspace ── */}
      <div className={`fb-workspace${reviewResult ? ' has-review' : ''}`}>

        {/* Column 1: File Tree */}
        <div className="fb-col-tree">
          {treeError && (
            <div className="fb-tree-error">{treeError}</div>
          )}
          <FileTree
            items={treeItems}
            currentPath={currentPath}
            isLoading={isLoadingTree}
            onFolderClick={(path) => loadTree(path, currentRef)}
            onFileClick={handleFileClick}
          />
        </div>

        {/* Column 2: Monaco Editor */}
        <div className="fb-col-editor">
          {(selectedFile || isLoadingFile) ? (
            <FilePreview
              file={selectedFile}
              isLoading={isLoadingFile}
              isReviewing={isReviewing}
              onReview={handleReviewFile}
            />
          ) : (
            <div className="fb-empty-editor">
              <div className="fb-empty-icon">📄</div>
              <div className="fb-empty-text">
                Select a file from the tree to preview it
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Review Panel — only when review exists */}
        {reviewResult && (
          <div className="fb-col-review">
            <div className="fb-review-topbar">
              <span className="fb-review-label">AI Review</span>
              <button
                className="fb-review-close"
                onClick={() => setReviewResult(null)}
                title="Close review"
              >
                ✕
              </button>
            </div>
            <div className="fb-review-content">
              <ReviewPanel
                review={reviewResult}
                isLoading={false}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
