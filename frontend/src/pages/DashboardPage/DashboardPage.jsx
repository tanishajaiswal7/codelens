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
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute.jsx';
import Topbar from '../../components/Topbar/Topbar.jsx';
import { OnboardingModal } from '../../components/HelpModals';
import { reviewApi } from '../../api/reviewApi.js';
import { historyApi } from '../../api/historyApi.js';
import { applyTheme } from '../../utils/themeUtils.js';
import './DashboardPage.css';

function DashboardContent({ user }) {
  const [mode, setMode] = useState('code'); // 'code' or 'github'
  const [selectedPersona, setSelectedPersona] = useState('faang');
  const [currentReview, setCurrentReview] = useState(null);
  const [previousReview, setPreviousReview] = useState(null);
  const [originalReviewCode, setOriginalReviewCode] = useState(null);
  const [isReReviewing, setIsReReviewing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socraticMode, setSocraticMode] = useState(false);
  const [socraticCodeChanged, setSocraticCodeChanged] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [rateLimitUsed, setRateLimitUsed] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const splitContainerRef = useRef(null);
  const pollCancelRef = useRef(null);

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

  const pollJob = (jobId, onResult, onError) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/jobs/${jobId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to poll job status');
        }

        const data = await response.json();

        if (data.status === 'done') {
          clearInterval(intervalId);
          onResult(data.result);
        } else if (data.status === 'failed') {
          clearInterval(intervalId);
          onError(data.error || 'Re-review failed');
        }
      } catch (pollError) {
        clearInterval(intervalId);
        onError(pollError.message || 'Failed to poll re-review job');
      }
    }, 1200);

    return () => clearInterval(intervalId);
  };

  useEffect(() => {
    return () => {
      if (pollCancelRef.current) {
        pollCancelRef.current();
      }
    };
  }, []);

  const handleSubmitReview = async (code, isSocratic) => {
    setCurrentCode(code);
    
    if (isSocratic) {
      setSocraticMode(true);
      setSocraticCodeChanged(false);
      setError(null);
    } else {
      setSocraticMode(false);
      setSocraticCodeChanged(false);
      setIsLoading(true);
      setError(null);
      try {
        const response = await reviewApi.submitReview(
          code,
          selectedPersona,
          'standard'
        );
        setCurrentReview(response.review);
        setPreviousReview(null);
        setOriginalReviewCode(code);
        setHistoryRefreshKey((prev) => prev + 1);
        
        // Update rate limit - increment by 1 after successful review
        setRateLimitUsed((prev) => {
          const updated = prev + 1;
          return Math.min(updated, 20); // Cap at 20
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Review submission failed:', error);
        }
        const errorMessage = error.response?.data?.error || 'Failed to get review. Please try again.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSwitchMode = () => {
    setSocraticMode(false);
    setSocraticCodeChanged(false);
  };

  const handleSocraticToggle = (enabled) => {
    setSocraticMode(enabled);
    if (!enabled) {
      setSocraticCodeChanged(false);
    }
  };

  const handleCodeChange = (nextCode) => {
    setCurrentCode(nextCode);
    if (socraticMode && nextCode !== originalReviewCode) {
      setSocraticCodeChanged(true);
    }
  };

  const handleReReview = async () => {
    if (!currentReview || currentCode === originalReviewCode) {
      return;
    }

    setIsReReviewing(true);
    setError(null);

    try {
      const { jobId } = await reviewApi.submitReReview(
        originalReviewCode,
        currentCode,
        selectedPersona,
        currentReview.suggestions,
        currentReview.reviewId || currentReview._id || null
      );

      if (pollCancelRef.current) {
        pollCancelRef.current();
      }

      pollCancelRef.current = pollJob(
        jobId,
        (result) => {
          setPreviousReview(currentReview);
          setCurrentReview({
            ...result,
            summary: currentReview.summary,
            verdict: currentReview.verdict,
            suggestions: [
              ...result.unchangedSuggestions,
              ...result.newSuggestions,
            ],
          });
          setOriginalReviewCode(currentCode);
          setIsReReviewing(false);
          pollCancelRef.current = null;
        },
        (pollError) => {
          console.error('Re-review failed:', pollError);
          setError(typeof pollError === 'string' ? pollError : 'Failed to complete re-review. Please try again.');
          setIsReReviewing(false);
          pollCancelRef.current = null;
        }
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to submit re-review. Please try again.');
      setIsReReviewing(false);
    }
  };

  const handleSelectReview = async (reviewId) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await historyApi.getReview(reviewId);
      setCurrentReview(response.review);
      setPreviousReview(null);
      setOriginalReviewCode(response.review?.code || null);
      setCurrentCode(response.review?.code || '');
      setSocraticMode(false);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load review:', error);
      }
      const errorMessage = error.response?.data?.error || 'Failed to load review. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
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
            rateLimitUsed={rateLimitUsed}
            rateLimitTotal={20}
            refreshKey={historyRefreshKey}
          />
        )}

        <div className="dashboard-main">
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
                    onSubmit={handleSubmitReview}
                    socraticMode={socraticMode}
                    onSocraticToggle={handleSocraticToggle}
                    onCodeChange={handleCodeChange}
                    reviewExists={!!currentReview}
                    hasChanges={currentCode !== originalReviewCode}
                    isReReviewing={isReReviewing}
                    onReReview={handleReReview}
                    socraticCodeChanged={socraticCodeChanged}
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
                      code={currentCode} 
                      persona={selectedPersona}
                      codeSnapshot={currentCode}
                      codeChanged={socraticCodeChanged}
                      onReplySent={() => setSocraticCodeChanged(false)}
                      onSwitchMode={handleSwitchMode}
                    />
                  ) : (
                    <ReviewPanel 
                      review={currentReview}
                      previousReview={previousReview}
                      resolvedSuggestionIds={currentReview?.resolvedSuggestionIds || []}
                      isLoading={isLoading}
                      error={error}
                      onRetry={() => handleSubmitReview(currentCode, false)}
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

