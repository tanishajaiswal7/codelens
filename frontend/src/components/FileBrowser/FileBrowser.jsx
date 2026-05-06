import { useState, useEffect } from 'react'
import FileTree from '../FileTree/FileTree.jsx'
import BranchSelector from '../BranchSelector/BranchSelector.jsx'
import FilePreview from '../FilePreview/FilePreview.jsx'
import ReviewPanel from '../ReviewPanel/ReviewPanel.jsx'
import SocraticPanel from '../SocraticPanel/SocraticPanel.jsx'
import * as fileBrowserApi from '../../api/fileBrowserApi.js'
import { reviewApi } from '../../api/reviewApi.js'
import { socraticApi } from '../../api/socraticApi.js'
import { pollJob } from '../../utils/jobPoller'
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
  const [reviewPersona, setReviewPersona] = useState('faang')
  const [originalCode, setOriginalCode] = useState(null)
  const [isReReviewing, setIsReReviewing] = useState(false)
  const [reReviewMeta, setReReviewMeta] = useState(null)
  const [mode, setMode] = useState('review')
  const [socraticSessionId, setSocraticSessionId] = useState(null)
  const [socraticMessages, setSocraticMessages] = useState([])
  const [socraticTurnCount, setSocraticTurnCount] = useState(0)
  const [socraticMaxTurns, setSocraticMaxTurns] = useState(10)
  const [socraticTotalBugs, setSocraticTotalBugs] = useState(0)
  const [socraticDiscoveredCount, setSocraticDiscoveredCount] = useState(0)
  const [socraticCompleted, setSocraticCompleted] = useState(false)
  const [socraticRetryRequired, setSocraticRetryRequired] = useState(false)
  const [socraticOptimizedCode, setSocraticOptimizedCode] = useState(null)
  const [socraticError, setSocraticError] = useState(null)
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
    setOriginalCode(null)
    setReReviewMeta(null)
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
    setReviewPersona(persona)
    setOriginalCode(editedFileContent || selectedFile.content)
    setReReviewMeta(null)
    try {
      const result = await fileBrowserApi.reviewFile(
        owner, repo, selectedFile.path,
        currentRef, editedFileContent || selectedFile.content, persona
      )
      setReviewResult(result)
    } catch (err) {
      console.error('Review failed:', err)
    } finally {
      setIsReviewing(false)
    }
  }

  const handleReReview = async () => {
    const currentCode = editedFileContent || selectedFile?.content || ''
    if (!reviewResult || !originalCode || currentCode === originalCode) {
      alert('No changes detected since last review.')
      return
    }

    setIsReReviewing(true)
    try {
      const resp = await reviewApi.reReview(
        originalCode,
        currentCode,
        reviewResult.suggestions,
        reviewPersona
      )

      if (resp && resp.jobId) {
        const cancel = pollJob(
          resp.jobId,
          (jobResult) => {
            const result = jobResult || {}
            setReviewResult((previous) => ({
              ...previous,
              summary: result.summary || previous.summary,
              suggestions: result.suggestions || previous.suggestions,
            }))
            setReReviewMeta({
              resolved: result.resolved || 0,
              newCount: result.newCount || 0,
              persistent: result.persistent || 0,
            })
            setOriginalCode(currentCode)
          },
          (errMsg) => {
            console.error('Re-review job failed:', errMsg)
          }
        )
      } else {
        const result = resp || {}
        setReviewResult((previous) => ({
          ...previous,
          summary: result.summary || previous.summary,
          suggestions: result.suggestions || previous.suggestions,
        }))
        setReReviewMeta({
          resolved: result.resolved || 0,
          newCount: result.newCount || 0,
          persistent: result.persistent || 0,
        })
        setOriginalCode(currentCode)
      }
    } catch (err) {
      console.error('Re-review failed:', err)
    } finally {
      setIsReReviewing(false)
    }
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
    setReviewResult(null)
    setReReviewMeta(null)
    setEditedFileContent(null)
  }

  const handleFileCodeChange = (code) => {
    setEditedFileContent(code)
  }

  const handleStartSocratic = async (persona) => {
    if (!selectedFile) return
    setMode('socratic')
    setIsSocraticLoading(true)
    setSocraticError(null)
    setReviewPersona(persona)
    setSocraticSessionId(null)
    setSocraticMessages([])
    setSocraticTurnCount(0)
    setSocraticMaxTurns(10)
    setSocraticTotalBugs(0)
    setSocraticDiscoveredCount(0)
    setSocraticCompleted(false)
    setSocraticRetryRequired(false)
    setSocraticOptimizedCode(null)
    try {
      const context = {
        source: 'github_file',
        repoFullName: `${owner}/${repo}`,
        filePath: selectedFile.path,
        repoRef: currentRef,
      }
      const response = await socraticApi.startSession(
        editedFileContent || selectedFile.content,
        persona,
        context
      )
      if (import.meta.env.DEV) {
        console.log('Socratic start response:', response)
      }
      
      if (!response?.jobId) {
        setSocraticSessionId(response.sessionId || null)
        setSocraticMessages(response.messages || [])
        setSocraticTurnCount(response.turnCount || 0)
        setSocraticMaxTurns(response.maxTurns || 10)
        setSocraticTotalBugs(response.totalBugs || 0)
        setSocraticDiscoveredCount(response.discoveredCount || 0)
        setSocraticCompleted(Boolean(response.completed))
        setSocraticRetryRequired(Boolean(response.retryRequired))
        setMode('socratic')
        setIsSocraticLoading(false)
        return
      }

      const cancel = pollJob(
        response.jobId,
        (result) => {
          setSocraticSessionId(result.sessionId)
          setSocraticMessages(result.messages || [])
          setSocraticTurnCount(result.turnCount || 0)
          setSocraticMaxTurns(result.maxTurns || 10)
          setSocraticTotalBugs(result.totalBugs || 0)
          setSocraticDiscoveredCount(result.discoveredCount || 0)
          setSocraticCompleted(Boolean(result.completed))
          setSocraticRetryRequired(Boolean(result.retryRequired))
          setMode('socratic')
          setIsSocraticLoading(false)
        },
        (error) => {
          console.error('Socratic start polling failed:', error)
          setSocraticError(error?.message || 'Failed to start Socratic session.')
          setIsSocraticLoading(false)
        }
      )

      return () => cancel()
    } catch (err) {
      console.error('Socratic start failed:', err.response?.data || err.message)
      setSocraticError(err.response?.data?.error || err.message || 'Failed to start Socratic session.')
      setSocraticSessionId(null)
      setIsSocraticLoading(false)
    } finally {
      // Keep loading active until job polling callback resolves the request.
    }
  }

  const handleSocraticReply = async (userMessage) => {
    if (!socraticSessionId) return
    setIsSocraticLoading(true)
    setSocraticError(null)

    setSocraticMessages((prev) => [...prev, { role: 'user', content: userMessage }])

    try {
      const response = await socraticApi.sendReply(
        socraticSessionId,
        userMessage,
        editedFileContent || selectedFile?.content || null
      )
      
      if (import.meta.env.DEV) {
        console.log('Socratic reply response:', response)
      }
      
      if (!response?.jobId) {
        setSocraticMessages((prev) => [...prev, { role: 'ai', content: response.aiMessage || 'Let us continue.' }])
        setSocraticTurnCount(response.turnCount || socraticTurnCount)
        setSocraticMaxTurns(response.maxTurns || socraticMaxTurns)
        setSocraticTotalBugs(response.totalBugs || socraticTotalBugs)
        setSocraticDiscoveredCount(response.discoveredCount || socraticDiscoveredCount)
        if (response.completed) {
          setSocraticCompleted(true)
          setSocraticOptimizedCode(response.optimizedCode || null)
          await handleReviewFile(reviewPersona)
        }
        setIsSocraticLoading(false)
        return
      }

      const cancel = pollJob(
        response.jobId,
        async (result) => {
          setSocraticMessages((prev) => [...prev, { role: 'ai', content: result.aiMessage || 'Let us continue.' }])
          setSocraticTurnCount(result.turnCount || 0)
          setSocraticMaxTurns(result.maxTurns || socraticMaxTurns)
          setSocraticTotalBugs(result.totalBugs || 0)
          setSocraticDiscoveredCount(result.discoveredCount || 0)

          if (result.completed) {
            setSocraticCompleted(true)
            setSocraticOptimizedCode(result.optimizedCode || null)
            await handleReviewFile(reviewPersona)
          }

          setIsSocraticLoading(false)
        },
        (error) => {
          console.error('Socratic reply polling failed:', error)
          setSocraticError(error?.message || 'Failed to continue Socratic session.')
          setIsSocraticLoading(false)
        }
      )

      return () => cancel()
    } catch (err) {
      console.error('Socratic reply failed:', err.response?.data || err.message)
      setSocraticError(err.response?.data?.error || err.message || 'Failed to continue Socratic session.')
    } finally {
      if (!isSocraticLoading) {
        setIsSocraticLoading(false)
      }
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
        {(reviewResult || socraticSessionId || (mode === 'socratic' && isSocraticLoading)) && (
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
                  setSocraticMaxTurns(10)
                  setSocraticTotalBugs(0)
                  setSocraticDiscoveredCount(0)
                  setSocraticCompleted(false)
                  setSocraticRetryRequired(false)
                  setSocraticOptimizedCode(null)
                  setSocraticError(null)
                  setEditedFileContent(null)
                  setOriginalCode(null)
                  setReReviewMeta(null)
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
                  totalBugs={socraticTotalBugs}
                  discoveredCount={socraticDiscoveredCount}
                  completed={socraticCompleted}
                  retryRequired={socraticRetryRequired}
                  optimizedCode={socraticOptimizedCode}
                  error={socraticError}
                  onReply={handleSocraticReply}
                  onRetry={() => handleStartSocratic(reviewPersona)}
                  isWaiting={isSocraticLoading}
                  onSwitchToReview={() => {
                    setMode('review')
                    setSocraticCompleted(false)
                    setSocraticRetryRequired(false)
                  }}
                />
              ) : reviewResult ? (
                <ReviewPanel
                  review={reviewResult}
                  isLoading={false}
                  onReReview={handleReReview}
                  isReReviewing={isReReviewing}
                  reReviewMeta={reReviewMeta}
                  originalCode={originalCode}
                />
              ) : null}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
