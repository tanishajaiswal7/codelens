import { useState, useEffect } from 'react';
import './OnboardingModal.css';

export default function OnboardingModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Check if user has seen onboarding
  useEffect(() => {
    const seen = localStorage.getItem('codelens-onboarding-seen');
    setHasSeenOnboarding(!!seen);
    if (!seen && isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const steps = [
    {
      title: '👋 Welcome to CodeLens AI',
      description: 'The intelligent code review tool powered by AI',
      content: 'Get professional code reviews with personalized personas, learn through the Socratic method, and improve your coding skills.',
      icon: '🚀'
    },
    {
      title: '📝 Two Ways to Review Code',
      description: 'Choose your preferred method',
      content: 'Paste Code: Quickly review code snippets | Import from GitHub: Review pull requests directly from your repositories',
      icon: '🔄'
    },
    {
      title: '🎭 Select Your Reviewer',
      description: 'Choose from multiple personas',
      content: 'FAANG SWE: Industry-standard practices | Startup Founder: Innovation & speed | Security Auditor: Security-focused reviews',
      icon: '👨‍💼'
    },
    {
      title: '💭 Socratic Method',
      description: 'Learn by asking questions',
      content: 'Instead of just answers, our AI asks guiding questions to help you discover solutions yourself. Toggle Socratic Mode anytime.',
      icon: '❓'
    },
    {
      title: '📊 Track Your Progress',
      description: 'Keep your review history',
      content: 'All your reviews are saved in the sidebar. Quickly access past reviews, see different perspectives, and track your improvement.',
      icon: '📈'
    },
    {
      title: '⚙️ Customize Your Experience',
      description: 'Personalize CodeLens',
      content: 'Visit Settings to change your default persona, preferred language, theme, and notification preferences. You can change these anytime.',
      icon: '⚡'
    }
  ];

  const handleClose = () => {
    if (!hasSeenOnboarding) {
      localStorage.setItem('codelens-onboarding-seen', 'true');
    }
    onClose();
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="onboarding-overlay" onClick={handleClose}>
      <div className="onboarding-modal" onClick={(e) => e.stopPropagation()}>
        <button className="onboarding-close" onClick={handleClose}>✕</button>

        <div className="onboarding-content">
          <div className="onboarding-icon">{step.icon}</div>
          <h2>{step.title}</h2>
          <p className="onboarding-subtitle">{step.description}</p>
          <p className="onboarding-text">{step.content}</p>
        </div>

        <div className="onboarding-dots">
          {steps.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentStep ? 'active' : ''}`}
              onClick={() => setCurrentStep(index)}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        <div className="onboarding-footer">
          <button 
            className="onboarding-btn secondary"
            onClick={handlePrevStep}
            disabled={currentStep === 0}
          >
            ← Previous
          </button>
          
          <span className="onboarding-counter">
            {currentStep + 1} / {steps.length}
          </span>

          <button 
            className="onboarding-btn primary"
            onClick={handleNextStep}
          >
            {currentStep === steps.length - 1 ? 'Get Started →' : 'Next →'}
          </button>
        </div>

        <p className="onboarding-skip">
          <button onClick={handleClose} className="skip-link">
            Skip tutorial
          </button>
        </p>
      </div>
    </div>
  );
}
