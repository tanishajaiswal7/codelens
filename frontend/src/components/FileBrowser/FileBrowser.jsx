import { useState, useEffect } from 'react'
import FileTree from '../FileTree/FileTree.jsx'
import BranchSelector from '../BranchSelector/BranchSelector.jsx'
import FilePreview from '../FilePreview/FilePreview.jsx'
import ReviewPanel from '../ReviewPanel/ReviewPanel.jsx'
import SocraticPanel from '../SocraticPanel/SocraticPanel.jsx'
import * as fileBrowserApi from '../../api/fileBrowserApi.js'
import { socraticApi } from '../../api/socraticApi.js'
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
  const [mode, setMode] = useState('review')
  const [socraticSessionId, setSocraticSessionId] = useState(null)
  const [socraticMessages, setSocraticMessages] = useState([])
  const [socraticTurnCount, setSocraticTurnCount] = useState(0)
  const [socraticMaxTurns, setSocraticMaxTurns] = useState(10)
  const [socraticCompleted, setSocraticCompleted] = useState(false)
  const [isSocraticLoading, setIsSocraticLoading] = useState(false)
  const [editedFileContent, setEditedFileContent] = useState(null)

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
    setSocraticSessionId(null)
    setEditedFileContent(null)
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

  const handleModeChange = (newMode) => {
    setMode(newMode)
    setReviewResult(null)
    setEditedFileContent(null)
  }

  const handleFileCodeChange = (code) => {
    setEditedFileContent(code)
  }

  const handleStartSocratic = async (persona) => {
    if (!selectedFile) return
    setIsSocraticLoading(true)
    setSocraticSessionId(null)
    setSocraticMessages([])
    setSocraticTurnCount(0)
    setSocraticCompleted(false)
    setEditedFileContent(null)
    try {
      const context = {
        source: 'github_file',
        repoFullName: `${owner}/${repo}`,
        filePath: selectedFile.path,
        ref: currentRef,
      }
      const response = await socraticApi.startSession(
        selectedFile.content,
        persona,
        context
      )
      if (import.meta.env.DEV) {
        console.log('Socratic start response:', response)
      }
      
      const { sessionId, question, turnNumber, maxTurns } = response.session
      setSocraticSessionId(sessionId)
      setSocraticMessages([
        {
          role: 'ai',
          content: question,
          timestamp: new Date(),
        },
      ])
      setSocraticTurnCount(turnNumber)
      setSocraticMaxTurns(maxTurns)
      setMode('socratic')
    } catch (err) {
      console.error('Socratic start failed:', err.response?.data || err.message)
    } finally {
      setIsSocraticLoading(false)
    }
  }

  const handleSocraticReply = async (userMessage) => {
    if (!socraticSessionId) return
    setIsSocraticLoading(true)
    try {
      setSocraticMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: userMessage,
          timestamp: new Date(),
        },
      ])
      
      // Send edited code if it changed, otherwise send original
      const codeToSend = editedFileContent || selectedFile?.content || null
      
      const response = await socraticApi.sendReply(
        socraticSessionId,
        userMessage,
        codeToSend
      )
      
      if (import.meta.env.DEV) {
        console.log('Socratic reply response:', response)
      }
      
      const { question, turnNumber, maxTurns, isCompleted } = response.session
      
      setSocraticMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: question,
          timestamp: new Date(),
        },
      ])
      setSocraticTurnCount(turnNumber)
      setSocraticMaxTurns(maxTurns)
      if (isCompleted) {
        setSocraticCompleted(true)
      }
    } catch (err) {
      console.error('Socratic reply failed:', err.response?.data || err.message)
    } finally {
      setIsSocraticLoading(false)
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
      <div className={`fb-workspace${(reviewResult || socraticSessionId) ? ' has-review' : ''}`}>

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
              mode={mode}
              onModeChange={handleModeChange}
              onStartSocratic={handleStartSocratic}
              isSocraticLoading={isSocraticLoading}
              onCodeChange={handleFileCodeChange}
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

        {/* Column 3: Review or Socratic Panel */}
        {(reviewResult || socraticSessionId) && (
          <div className="fb-col-review">
            <div className="fb-review-topbar">
              <span className="fb-review-label">
                {mode === 'socratic' ? 'Socratic Mode' : 'AI Review'}
              </span>
              <button
                className="fb-review-close"
                onClick={() => {
                  setReviewResult(null)
                  setSocraticSessionId(null)
                  setSocraticMessages([])
                  setSocraticTurnCount(0)
                  setSocraticCompleted(false)
                  setEditedFileContent(null)
                }}
                title="Close panel"
              >
                ✕
              </button>
            </div>
            <div className="fb-review-content">
              {mode === 'socratic' && socraticSessionId ? (
                <SocraticPanel
                  messages={socraticMessages}
                  turnCount={socraticTurnCount}
                  maxTurns={socraticMaxTurns}
                  completed={socraticCompleted}
                  onReply={handleSocraticReply}
                  isWaiting={isSocraticLoading}
                  onSwitchMode={() => setMode('review')}
                />
              ) : reviewResult ? (
                <ReviewPanel
                  review={reviewResult}
                  isLoading={false}
                />
              ) : null}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
