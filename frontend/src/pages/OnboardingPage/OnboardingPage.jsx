import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute.jsx';
import CodeEditor from '../../components/CodeEditor/CodeEditor.jsx';
import GitHubLoginButton from '../../components/GitHubLoginButton/GitHubLoginButton.jsx';
import { authApi } from '../../api/authApi.js';
import { reviewApi } from '../../api/reviewApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import './OnboardingPage.css';

const sampleCode = `def login(user_id):
    query = f"SELECT * FROM users WHERE id={user_id}"
    return db.execute(query)`;

const stepMessages = [
  {
    role: 'ai',
    text: 'What happens to this SQL query if the user_id contains OR 1=1?',
  },
  {
    role: 'user',
    text: 'Oh... it would bypass the WHERE clause entirely',
  },
  {
    role: 'ai',
    text: 'Exactly. So what should happen to user input before it reaches SQL?',
  },
  {
    role: 'user',
    text: 'It should be sanitised... or parameterised',
  },
  {
    role: 'ai',
    text: 'You just discovered SQL injection protection yourself.',
  },
];

const teamCards = [
  {
    title: 'Browse repo files',
    description: 'Review any file directly without leaving the workspace.',
  },
  {
    title: 'Import pull requests',
    description: 'Inspect PR diffs and review changes in context.',
  },
  {
    title: 'Team PR reviews',
    description: 'Give managers a dashboard of release readiness and blockers.',
  },
];

function StepDots({ step }) {
  return (
    <div className="ob-progress" aria-label={`Step ${step} of 4`}>
      {[1, 2, 3, 4].map((index) => (
        <div key={index} className="ob-progress__item">
          <span className={`ob-dot ${index <= step ? 'active' : ''}`} />
          {index < 4 && <span className="ob-progress__line" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}

function OnboardingWizard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(() => {
    const initialStep = Number.parseInt(searchParams.get('step') || '1', 10);
    return Number.isNaN(initialStep) ? 1 : Math.min(4, Math.max(1, initialStep));
  });
  const [reviewResult, setReviewResult] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const autoCompletedRef = useRef(false);

  useEffect(() => {
    const requestedStep = Number.parseInt(searchParams.get('step') || '1', 10);
    if (!Number.isNaN(requestedStep)) {
      setStep(Math.min(4, Math.max(1, requestedStep)));
    }
  }, [searchParams]);

  useEffect(() => {
    if (step !== 3) {
      return undefined;
    }

    const timers = [250, 1200, 2200, 3200, 4300].map((delay, index) =>
      window.setTimeout(() => {
        const bubble = document.querySelector(`.ob-chat-bubble--${index + 1}`);
        if (bubble) {
          bubble.classList.add('is-visible');
        }
      }, delay)
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [step]);

  useEffect(() => {
    const shouldAutoComplete = step === 4 && searchParams.get('connected') === '1' && !autoCompletedRef.current;
    if (!shouldAutoComplete) {
      return;
    }

    autoCompletedRef.current = true;
    void handleComplete('You are all set! Start reviewing your first real project.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, step]);

  const currentReview = useMemo(() => {
    if (!reviewResult) {
      return null;
    }

    return {
      ...reviewResult,
      suggestions: (reviewResult.suggestions || []).slice(0, 2),
    };
  }, [reviewResult]);

  const handleComplete = async (message) => {
    if (isCompleting) {
      return;
    }

    setIsCompleting(true);
    try {
      await authApi.completeOnboarding();
      await refreshUser();
      setToastMessage(message);
      window.setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1100);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setToastMessage('Could not finish onboarding. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReview = async (code) => {
    setIsReviewing(true);
    try {
      const response = await reviewApi.submitReview(code, 'security', 'standard');
      setReviewResult(response.review || response);
    } catch (error) {
      console.error('Onboarding review failed:', error);
      setReviewResult({
        verdict: 'needs_revision',
        summary: error.response?.data?.error || 'Review failed. Please try again.',
        suggestions: [],
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const goToNext = () => setStep((current) => Math.min(4, current + 1));
  const goBack = () => setStep((current) => Math.max(1, current - 1));

  const stepTitle = {
    1: `Welcome to CodeLens AI, ${user?.name || 'there'}`,
    2: 'Try your first review right now',
    3: 'This is where CodeLens AI is different',
    4: 'Connect GitHub for more power',
  }[step];

  const stepSubtext = {
    1: 'You are 3 minutes away from your first AI code review. Let us show you around.',
    2: 'Paste any code below. We will review it in seconds.',
    3: 'Most tools just tell you what is wrong. Socratic mode teaches you to discover it yourself.',
    4: 'Optional but unlocks the best features.',
  }[step];

  return (
    <div className="onboarding-page">
      {step > 1 && (
        <button type="button" className="onboarding-page__back" onClick={goBack} aria-label="Go back one step">
          ←
        </button>
      )}

      <div className="onboarding-page__shell">
        <div className="onboarding-page__topbar">
          <StepDots step={step} />
          <div className="ob-step-counter">Step {step} of 4</div>
        </div>

        <section className="ob-step ob-step--visible">
          <h1 className="ob-heading">{stepTitle}</h1>
          <p className="ob-subtext">{stepSubtext}</p>

          {step === 1 && (
            <>
              <div className="ob-pills">
                <span className="ob-pill">AI reviews your code</span>
                <span className="ob-pill">Teaches you why it is wrong</span>
                <span className="ob-pill">Tells managers when to ship</span>
              </div>

              <div className="ob-actions ob-actions--stacked">
                <button type="button" className="ob-primary-btn" onClick={goToNext}>
                  Let&apos;s start →
                </button>
                <button type="button" className="ob-skip-link" onClick={() => handleComplete('You are all set! Start reviewing your first real project.')}>
                  Skip and go to dashboard
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="ob-editor-card">
                <CodeEditor
                  onSubmit={handleReview}
                  socraticMode={false}
                  onSocraticToggle={() => {}}
                  onCodeChange={() => {}}
                  isLoading={isReviewing}
                  initialCode={sampleCode}
                  initialLanguage="python"
                  hideSocraticToggle
                  hideLanguageSelector
                  minLinesToSubmit={1}
                />
              </div>

              {currentReview && (
                <div className="ob-review-summary">
                  <div className="ob-review-summary__header">
                    <span className={`ob-verdict ob-verdict--${currentReview.verdict || 'needs_revision'}`}>
                      {(currentReview.verdict || 'needs_revision').replace('_', ' ')}
                    </span>
                    <p>{currentReview.summary}</p>
                  </div>

                  <div className="ob-review-suggestions">
                    {(currentReview.suggestions || []).slice(0, 2).map((suggestion) => (
                      <article key={suggestion.id} className="ob-suggestion-card">
                        <div className="ob-suggestion-card__top">
                          <strong>{suggestion.title}</strong>
                          <span>{suggestion.severity}</span>
                        </div>
                        <p>{suggestion.description}</p>
                      </article>
                    ))}
                  </div>

                  <div className="ob-review-note">You just got your first AI review.</div>

                  <div className="ob-actions">
                    <button type="button" className="ob-primary-btn" onClick={goToNext}>
                      Next: See what Socratic mode can do →
                    </button>
                  </div>
                </div>
              )}

              <div className="ob-actions ob-actions--bottom-link">
                <button type="button" className="ob-skip-link" onClick={() => handleComplete('You are all set! Start reviewing your first real project.') }>
                  Skip and go to dashboard
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="ob-step-layout ob-step-layout--socratic">
                <div className="ob-card">
                  <h2>Why it sticks</h2>
                  <p>
                    Most tools just tell you what is wrong.
                  </p>
                  <p>
                    Socratic mode teaches you to discover it yourself.
                  </p>
                  <p>
                    Instead of: &apos;Line 2 has a SQL injection.&apos;
                  </p>
                  <p>
                    It asks: &apos;What happens if someone types 1 OR 1=1 as the user ID?&apos;
                  </p>
                  <p>
                    You figure it out. You remember it. You never make that mistake again.
                  </p>
                  <div className="ob-highlight-box">
                    Used by senior developers to mentor juniors for decades. Now available at any time, for any code.
                  </div>
                </div>

                <div className="ob-chat" aria-label="Socratic chat mockup">
                  {stepMessages.map((message, index) => (
                    <div
                      key={message.text}
                      className={`ob-chat-bubble ${message.role} ob-chat-bubble--${index + 1}`}
                    >
                      {message.text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="ob-actions ob-actions--stacked">
                <button type="button" className="ob-primary-btn" onClick={goToNext}>
                  Got it, what else? →
                </button>
                <button type="button" className="ob-skip-link" onClick={() => handleComplete('You are all set! Start reviewing your first real project.') }>
                  Skip onboarding
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="ob-team-grid">
                {teamCards.map((card) => (
                  <article key={card.title} className="ob-feature-card">
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </article>
                ))}
              </div>

              <div className="ob-actions ob-actions--stacked">
                <GitHubLoginButton
                  label="Connect GitHub →"
                  redirectPath="/onboarding?step=4&connected=1"
                />
                <button
                  type="button"
                  className="ob-skip-link ob-skip-link--button"
                  onClick={() => handleComplete('You are all set! Start reviewing your first real project.') }
                  disabled={isCompleting}
                >
                  Skip for now →
                </button>
              </div>

              <p className="ob-note">You can always connect later in Settings.</p>
            </>
          )}
        </section>
      </div>

      {toastMessage && <div className="ob-toast">{toastMessage}</div>}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingWizard />
    </ProtectedRoute>
  );
}
