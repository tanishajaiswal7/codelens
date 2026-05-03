import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar/Sidebar.jsx';
import SidebarEnhanced from '../../components/Sidebar/SidebarEnhanced.jsx';
import PersonaPicker from '../../components/PersonaPicker/PersonaPicker.jsx';
import CodeEditor from '../../components/CodeEditor/CodeEditor.jsx';
import ReviewPanel from '../../components/ReviewPanel/ReviewPanel.jsx';
import SocraticPanel from '../../components/SocraticPanel/SocraticPanel.jsx';
import RepoSelector from '../../components/RepoSelector/RepoSelector.jsx';
import PRSelector from '../../components/PRSelector/PRSelector.jsx';
import PRFileSelector from '../../components/PRFileSelector/PRFileSelector.jsx';
import PRReviewPanel from '../../components/PRReviewPanel/PRReviewPanel.jsx';
import FileBrowser from '../../components/FileBrowser/FileBrowser.jsx';
import HistoryReviewViewer from '../../components/HistoryReviewViewer/HistoryReviewViewer.jsx';
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute.jsx';
import Topbar from '../../components/Topbar/Topbar.jsx';
import { OnboardingModal } from '../../components/HelpModals';
import { reviewApi } from '../../api/reviewApi.js';
import socraticApi from '../../api/socraticApi'
import { pollJob } from '../../utils/jobPoller'
import { historyApi } from '../../api/historyApi.js';
import { applyTheme } from '../../utils/themeUtils.js';
import './DashboardPage.css';

function DashboardContent({ user }) {
  const [mode, setMode] = useState('code'); // 'code' or 'github'
  const [selectedPersona, setSelectedPersona] = useState('faang');
  const [currentReview, setCurrentReview] = useState(null);
  const [previousReview, setPreviousReview] = useState(null);
  const [originalCode, setOriginalCode] = useState(null);
  const [isReReviewing, setIsReReviewing] = useState(false);
  const [reReviewMeta, setReReviewMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socraticMode, setSocraticMode] = useState(false);
  const [socraticCodeChanged, setSocraticCodeChanged] = useState(false);
  const [socraticSession, setSocraticSession] = useState(null);
  const [socraticCompleted, setSocraticCompleted] = useState(false);
  const [socraticCompletionData, setCompletionData] = useState(null);
  const [socraticKnownBugs, setSocraticKnownBugs] = useState([])
  const [isSocraticLoading, setIsSocraticLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [socraticOptimizedCode, setSocraticOptimizedCode] = useState(null);
  const [rateLimitUsed, setRateLimitUsed] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [historyView, setHistoryView] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const splitContainerRef = useRef(null);
  const editorRef = useRef(null);
  const dashboardMainRef = useRef(null);

  // GitHub PR flow state
  const [gitHubStep, setGitHubStep] = useState('repos'); // 'repos', 'prs', 'filebrowser', 'files', 'review'
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedPR, setSelectedPR] = useState(null);
  const [prReview, setPrReview] = useState(null);

  // Load settings from localStorage on mount and listen for theme changes
  useEffect(() => {
    // Apply theme immediately when dashboard loads
    const theme = localStorage.getItem('codelens-theme') || 'dark';
    applyTheme(theme);

    // Check if this is first visit
    const hasSeenOnboarding = localStorage.getItem('codelens-onboarding-seen');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    // Listen for theme changes from other tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'codelens-theme' && e.newValue) {
        applyTheme(e.newValue);
      }
    };

    // Listen for custom theme change events from SettingsPage
    const handleThemeChange = () => {
      const theme = localStorage.getItem('codelens-theme') || 'dark';
      applyTheme(theme);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themeChanged', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  const navigate = useNavigate();

  // Redirect user back to a pending workspace invite after GitHub OAuth login
  useEffect(() => {
    const pendingInvite = localStorage.getItem('pendingInvite');
    if (pendingInvite) {
      localStorage.removeItem('pendingInvite');
      navigate(`/join/${pendingInvite}`);
    }
  }, [navigate]);

  // Load default persona and rate limit
  useEffect(() => {
    // Load default persona
    const savedPersona = localStorage.getItem('codelens-default-persona');
    if (savedPersona) {
      setSelectedPersona(savedPersona);
    }

    // Load initial rate limit count
    const loadRateLimitCount = async () => {
      try {
        const response = await historyApi.getHistory();
        if (response.reviewsUsedToday !== undefined) {
          setRateLimitUsed(response.reviewsUsedToday);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to load rate limit count:', error);
        }
      }
    };

    loadRateLimitCount();
  }, []);

  // If persona changes during Socratic Mode, start a fresh session with the new mentor style.
  useEffect(() => {
    if (!socraticMode) return;
    if (!currentCode || currentCode.trim().length < 10) return;

    setSocraticSession(null);
    setSocraticCompleted(false);
    setSocraticOptimizedCode(null);
    setError(null);

    handleStartSocraticSession(currentCode);
  }, [selectedPersona]);

  // Handle drag-resize for editor/review split panel.
  useEffect(() => {
    if (!isResizing) return undefined;

    const handleMouseMove = (event) => {
      if (!splitContainerRef.current) return;

      const rect = splitContainerRef.current.getBoundingClientRect();
      if (rect.width === 0) return;

      const ratio = ((event.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(75, Math.max(25, ratio));
      setSplitRatio(clamped);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizerKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setSplitRatio((prev) => Math.max(25, prev - 2));
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setSplitRatio((prev) => Math.min(75, prev + 2));
    }
  };

  const runStandardReview = async (code) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await reviewApi.submitReview(code, selectedPersona, 'standard');
      setCurrentReview(response.review);
      setPreviousReview(null);
      setOriginalCode(code);
      setReReviewMeta(null);
      setHistoryRefreshKey((prev) => prev + 1);

      setRateLimitUsed((prev) => {
        const updated = prev + 1;
        return Math.min(updated, 20);
      });

      return response.review;
    } catch (reviewError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Review submission failed:', reviewError);
      }
      const errorMessage = reviewError.response?.data?.error || 'Failed to get review. Please try again.';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (code, isSocratic) => {
    setCurrentCode(code)

    if (isSocratic) {
      setSocraticMode(true)
      setSocraticCodeChanged(false)
      setError(null)
      setSocraticCompleted(false)
      setCompletionData(null)
      setSocraticSession(null)
      return
    }

    // Standard review flow
    setSocraticMode(false)
    setSocraticCodeChanged(false)
    setSocraticSession(null)
    setSocraticCompleted(false)
    setCompletionData(null)
    await runStandardReview(code)
  };

  const handleSwitchMode = () => {
    setSocraticMode(false);
    setSocraticCodeChanged(false);
    setSocraticSession(null);
    setSocraticCompleted(false);
  };

  const handleStartSocraticSession = async (code) => {
    if (!code || code.trim().length < 10) {
      setError('Please paste at least 10 characters of code to begin.');
      return;
    }

    setIsSocraticLoading(true);
    setError(null);

    try {
      console.log('[Socratic] Starting session with persona:', selectedPersona);
      
      const response = await socraticApi.startSession(code, selectedPersona);
      console.log('[Socratic] API Response:', response);

      if (!response.jobId) {
        throw new Error('No jobId returned from API');
      }

      const { jobId } = response;

      const cancel = pollJob(
        jobId,
        (result) => {
          console.log('[Socratic] Job completed with result:', result);
          
          setSocraticSession({
            sessionId: result.sessionId,
            messages: result.messages || [],
            turnCount: result.turnCount || 0,
            maxTurns: result.maxTurns || 10,
            totalBugs: result.totalBugs || 0,
            discoveredCount: result.discoveredCount || 0,
            currentState: result.currentState || 'QUESTIONING',
            language: result.language || 'javascript',
          });
          setIsSocraticLoading(false);
        },
        (error) => {
          console.error('[Socratic] Session failed:', error);
          setIsSocraticLoading(false);
          setError('Failed to start session: ' + (error?.message || 'Unknown error'));
        }
      );

      return () => cancel();
    } catch (err) {
      console.error('[Socratic] Error:', err);
      setIsSocraticLoading(false);
      setError('Failed to start session: ' + (err?.message || 'Please try again'));
    }
  };

  const handleSocraticToggle = async (enabled) => {
    setSocraticMode(enabled);
    if (!enabled) {
      setSocraticCodeChanged(false);
      setSocraticCompleted(false);
      setSocraticSession(null);
      setSocraticOptimizedCode(null);
      return;
    }

    setSocraticCodeChanged(false);
    setSocraticCompleted(false);
    setSocraticSession(null);
    setSocraticOptimizedCode(null);
    setError(null);
  };

  const handleCodeChange = (nextCode) => {
    setCurrentCode(nextCode);
    if (socraticMode && nextCode !== originalCode) {
      setSocraticCodeChanged(true);
    }
  };

  const handleSocraticReply = async (userMessage) => {
    if (!socraticSession?.sessionId || isSocraticLoading) return

    // Optimistically show user message
    setSocraticSession(prev => ({
      ...prev,
      messages: [...prev.messages, { role: 'user', content: userMessage }],
      isWaiting: true,
    }))

    try {
      const { jobId } = await socraticApi.sendReply(
        socraticSession.sessionId,
        userMessage,
        currentCode || null
      )

      const cancel = pollJob(
        jobId,
        (result) => {
          setSocraticSession(prev => ({
            ...prev,
            messages: [
              ...prev.messages,
              { role: 'ai', content: result.aiMessage },
              ...(result.nextBugQuestion ? [{ role: 'ai', content: result.nextBugQuestion }] : []),
            ],
            turnCount: result.turnCount,
            totalBugs: result.totalBugs,
            discoveredCount: result.discoveredCount,
            maxTurns: result.maxTurns || prev.maxTurns,
            currentState: result.currentState || prev.currentState,
            isWaiting: false,
          }))

          if (result.completed) {
            setSocraticCompleted(true)
            if (result.optimizedCode) {
              setSocraticOptimizedCode(result.optimizedCode)
            }
          }
        },
        (error) => {
          console.error('Reply failed:', error)
          setSocraticSession(prev => ({ ...prev, isWaiting: false }))
        }
      )

      return () => cancel()
    } catch (err) {
      console.error('Reply error:', err)
      setSocraticSession(prev => ({ ...prev, isWaiting: false }))
    }
  }

  const handleReReview = async () => {
    if (!currentReview || currentCode === originalCode) {
      return;
    }

    setIsReReviewing(true);
    setError(null);

    try {
      const result = await reviewApi.reReview(
        originalCode,
        currentCode,
        currentReview.suggestions,
        selectedPersona
      );

      setPreviousReview(currentReview);
      setCurrentReview((previous) => ({
        ...previous,
        summary: result.summary || previous.summary,
        suggestions: result.suggestions || previous.suggestions,
      }));
      setReReviewMeta({
        resolved: result.resolved || 0,
        newCount: result.newCount || 0,
        persistent: result.persistent || 0,
      });
      setOriginalCode(currentCode);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to submit re-review. Please try again.');
    } finally {
      setIsReReviewing(false);
    }
  };

  const handleSelectReview = async (reviewId) => {
    try {
      setIsLoadingHistory(true);
      setError(null);
      const response = await historyApi.getReview(reviewId);
      setHistoryView(response.review);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load review:', error);
      }
      alert('Could not load this review. Please try again.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFreshReview = (code, persona) => {
    // Close history view
    setHistoryView(null);
    // Switch to paste tab
    setMode('code');
    // Load the code into editor
    if (editorRef?.current && code) {
      editorRef.current.setValue(code);
    }
    // Set the persona
    if (persona) setSelectedPersona(persona);
  };

  const handleNewReview = () => {
    setHistoryView(null);
    setMode('code');
    setGitHubStep('repos');
    setSelectedRepo(null);
    setSelectedPR(null);
    setPrReview(null);

    if (window.innerWidth <= 900) {
      setSidebarOpen(false);
    }

    requestAnimationFrame(() => {
      dashboardMainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // GitHub PR flow handlers
  const handleRepoSelect = (fullName) => {
    setSelectedRepo(fullName);
    setGitHubStep('prs');
  };

  const handleBrowseFiles = (owner, repo) => {
    setSelectedRepo(`${owner}/${repo}`);
    setGitHubStep('filebrowser');
  };

  const handlePRSelect = (prNumber, prTitle, prUrl) => {
    setSelectedPR({ number: prNumber, title: prTitle, url: prUrl });
    setGitHubStep('files');
  };

  const handleReviewStart = (result) => {
    setPrReview(result);
    setGitHubStep('review');
  };

  const handleBackToRepos = () => {
    setGitHubStep('repos');
    setSelectedRepo(null);
    setSelectedPR(null);
  };

  const handleBackToPRs = () => {
    setGitHubStep('prs');
    setSelectedPR(null);
  };

  const handleBackToFiles = () => {
    setGitHubStep('files');
  };

  const handleBackFromFileBrowser = () => {
    setGitHubStep('repos');
    setSelectedRepo(null);
  };

  const getBackHandler = () => {
    if (mode === 'github') {
      switch (gitHubStep) {
        case 'prs':
          return handleBackToRepos;
        case 'filebrowser':
          return handleBackFromFileBrowser;
        case 'files':
          return handleBackToPRs;
        case 'review':
          return handleBackToFiles;
        default:
          return null;
      }
    }
    return null;
  };

  return (
    <div className="dashboard">
      <Topbar 
        user={user} 
        showBackButton={mode === 'github' && gitHubStep !== 'repos'}
        onBack={getBackHandler()}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="dashboard-body">
        {sidebarOpen && (
          <SidebarEnhanced 
            onReviewSelect={handleSelectReview}
            onNewReview={handleNewReview}
            rateLimitUsed={rateLimitUsed}
            rateLimitTotal={20}
            refreshKey={historyRefreshKey}
          />
        )}

        <div className="dashboard-main" ref={dashboardMainRef}>
          {/* History View — shown when user clicks a history item */}
          {historyView && (
            <HistoryReviewViewer
              review={historyView}
              onClose={() => setHistoryView(null)}
              onReReview={handleFreshReview}
            />
          )}

          {/* Normal dashboard — shown when no history item selected */}
          {!historyView && (
            <>
              {/* Mode Tabs */}
              <div className="mode-tabs">
                <button
                  className={`mode-tab ${mode === 'code' ? 'active' : ''}`}
                  onClick={() => setMode('code')}
                >
                  Paste Code
                </button>
            <button
              className={`mode-tab ${mode === 'github' ? 'active' : ''}`}
              onClick={() => setMode('github')}
            >
              Import from GitHub
            </button>
          </div>

          {/* Paste Code Tab */}
          {mode === 'code' && (
            <div className="paste-workspace">
              <PersonaPicker
                selectedPersona={selectedPersona}
                onPersonaChange={setSelectedPersona}
              />
              <div
                className="paste-split"
                ref={splitContainerRef}
                style={{ '--split-left': `${splitRatio}%` }}
              >
                <div className="paste-column editor-column">
                  <CodeEditor 
                    editorRef={editorRef}
                    onSubmit={handleSubmitReview}
                    socraticMode={socraticMode}
                    onSocraticToggle={handleSocraticToggle}
                    onCodeChange={handleCodeChange}
                    reviewExists={!!currentReview}
                    hasChanges={currentCode !== originalCode}
                    isReReviewing={isReReviewing}
                    onReReview={handleReReview}
                    socraticCodeChanged={socraticCodeChanged}
                    isLoading={isSocraticLoading || isLoading}
                  />
                </div>

                <div
                  className="split-resizer"
                  role="separator"
                  aria-label="Resize editor and review panels"
                  aria-orientation="vertical"
                  aria-valuemin={25}
                  aria-valuemax={75}
                  aria-valuenow={Math.round(splitRatio)}
                  tabIndex={0}
                  onMouseDown={() => setIsResizing(true)}
                  onKeyDown={handleResizerKeyDown}
                />

                <div className="paste-column panel-column">
                  {socraticMode ? (
                    <SocraticPanel
                      messages={socraticSession?.messages || []}
                      turnCount={socraticSession?.turnCount || 0}
                      maxTurns={socraticSession?.maxTurns || 10}
                      totalBugs={socraticSession?.totalBugs || 0}
                      discoveredCount={socraticSession?.discoveredCount || 0}
                      isWaiting={isSocraticLoading || socraticSession?.isWaiting || false}
                      completed={socraticCompleted}
                      optimizedCode={socraticOptimizedCode}
                      originalCode={originalCode}
                      error={error}
                      language={socraticSession?.language || 'javascript'}
                      onReply={handleSocraticReply}
                      onStartSession={() => handleStartSocraticSession(currentCode)}
                      onSwitchToReview={() => {
                        setSocraticMode(false)
                        setSocraticCompleted(false)
                        setSocraticOptimizedCode(null)
                      }}
                    />
                  ) : (
                    <ReviewPanel 
                      review={currentReview}
                      previousReview={previousReview}
                      resolvedSuggestionIds={currentReview?.resolvedSuggestionIds || []}
                      isLoading={isLoading}
                      error={error}
                      onRetry={() => handleSubmitReview(currentCode, false)}
                      onReReview={handleReReview}
                      isReReviewing={isReReviewing}
                      reReviewMeta={reReviewMeta}
                      originalCode={originalCode}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* GitHub Tab */}
          {mode === 'github' && (
            <div className="github-workspace">
              {gitHubStep === 'repos' && (
                <RepoSelector 
                  onRepoSelect={handleRepoSelect}
                  onBrowseFiles={handleBrowseFiles}
                />
              )}
              {gitHubStep === 'prs' && selectedRepo && (
                <PRSelector 
                  repoFullName={selectedRepo}
                  onPRSelect={handlePRSelect}
                  onBack={handleBackToRepos}
                />
              )}
              {gitHubStep === 'files' && selectedRepo && selectedPR && (
                <PRFileSelector 
                  repoFullName={selectedRepo}
                  prNumber={selectedPR.number}
                  prTitle={selectedPR.title}
                  prUrl={selectedPR.url}
                  onBack={handleBackToPRs}
                  onReviewStart={handleReviewStart}
                />
              )}
              {gitHubStep === 'filebrowser' && selectedRepo && (
                <FileBrowser 
                  owner={selectedRepo.split('/')[0]}
                  repo={selectedRepo.split('/')[1]}
                  onBack={handleBackFromFileBrowser}
                />
              )}
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      {(user) => <DashboardContent user={user} />}
    </ProtectedRoute>
  );
}

