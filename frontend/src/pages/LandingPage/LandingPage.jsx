import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingNav from '../../components/LandingNav/LandingNav.jsx';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const featureCards = [
  {
    tone: 'feature-card__icon--indigo',
    icon: '⌕',
    title: 'AI code review',
    description: 'Instant suggestions with confidence scores. Know which issues actually matter.',
  },
  {
    tone: 'feature-card__icon--purple',
    icon: '💬',
    title: 'Socratic mode',
    description: 'AI guides you to discover bugs yourself through questions. Learn, not just fix.',
  },
  {
    tone: 'feature-card__icon--green',
    icon: '✓',
    title: 'Live re-review',
    description: 'Fix your code and verify instantly in the same screen. See exactly which issues resolved.',
  },
  {
    tone: 'feature-card__icon--amber',
    icon: '◫',
    title: 'Team workspaces',
    description: 'Manager sees all team PR reviews in one dashboard. No GitHub account needed.',
  },
  {
    tone: 'feature-card__icon--red',
    icon: '➜',
    title: 'Release readiness',
    description: 'One click tells your manager: ready to ship or not. With exact blockers listed.',
  },
  {
    tone: 'feature-card__icon--blue',
    icon: '⚡',
    title: '3 review personas',
    description: 'FAANG Engineer, Startup CTO, or Security Auditor. Pick the lens that fits your goal.',
  },
];

const personas = [
  {
    tone: 'persona-card__tag--indigo',
    tag: 'Scalability',
    title: 'FAANG Engineer',
    description: 'Focuses on Big-O complexity, SOLID principles, design patterns, and long-term maintainability.',
  },
  {
    tone: 'persona-card__tag--amber',
    tag: 'Ship speed',
    title: 'Startup CTO',
    description: 'Pragmatic. Flags real blockers. Calls out over-engineering. Prioritises delivery over perfection.',
  },
  {
    tone: 'persona-card__tag--red',
    tag: 'OWASP',
    title: 'Security Auditor',
    description: 'OWASP vulnerabilities, injection risks, authentication flaws. CVE references where relevant.',
  },
];

const pricingCards = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    featured: false,
    cta: 'Get started',
    features: ['20 reviews per day', 'All 3 personas', 'Socratic mode', 'GitHub file browser', 'Review history'],
  },
  {
    name: 'Pro',
    price: '$19',
    period: 'per month',
    featured: true,
    cta: 'Start Pro trial',
    features: ['Unlimited reviews', 'All personas + All-personas mode', 'Live re-review', 'Review history timeline', 'Priority support'],
  },
  {
    name: 'Team',
    price: '$49',
    period: 'per workspace / month',
    featured: false,
    cta: 'Start team trial',
    features: ['Everything in Pro', 'Manager dashboard', 'Release readiness report', 'Email notifications', 'Approve / reject workflow', 'Unlimited team members'],
  },
];

const teamSteps = [
  'Developer opens PR',
  'AI reviews it',
  'Manager sees dashboard',
  'Approve or request changes',
  'Developer notified by email',
];

const codeLines = [
  'def get_user(user_id):',
  '    query = f"SELECT * FROM users WHERE id = {user_id}"',
  '    result = db.execute(query)',
  '    if not result:',
  '        return None',
  '    return result[0]',
];

const demoTabs = [
  { id: 'review', label: 'Review' },
  { id: 'socratic', label: 'Socratic' },
  { id: 'dashboard', label: 'Team Dashboard' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('review');

  const scrollToSection = (target) => {
    const element = document.getElementById(target);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const activeDemoContent = useMemo(() => {
    if (activeTab === 'socratic') {
      return {
        title: 'Socratic coaching',
        body: 'The AI asks why the query is vulnerable and helps the developer reason toward the fix.',
        primary: 'What happens if user input reaches the query directly?',
        secondary: 'What would prevent this class of bug from coming back?',
      };
    }

    if (activeTab === 'dashboard') {
      return {
        title: 'Team dashboard',
        body: 'Managers see release readiness, high-risk issues, and review volume in one place.',
        primary: '3 critical blockers',
        secondary: 'Ready to ship: no',
      };
    }

    return {
      title: 'AI review output',
      body: 'CodeLens highlights issues with confidence levels and helps the developer fix them quickly.',
      primary: '2 high-confidence findings',
      secondary: '1 security blocker',
    };
  }, [activeTab]);

  return (
    <div className="landing-page">
      <LandingNav onNavigateSection={scrollToSection} />

      <main className="landing-page__shell">
        <section className="hero" id="top">
          <div className="hero__badge">
            <span className="hero__badge-dot" aria-hidden="true" />
            AI-powered code review for developers and managers
          </div>

          <h1 className="hero__title">
            Review code smarter.
            <span>Ship with confidence.</span>
          </h1>

          <p className="hero__subtitle">
            The only code reviewer that teaches your developers why their code is wrong — and tells your manager when it is safe to ship.
          </p>

          <div className="hero__cta-row">
            <button type="button" className="hero__primary" onClick={() => navigate('/register')}>
              Start reviewing free
            </button>
            <button type="button" className="hero__secondary" onClick={() => scrollToSection('how-it-works')}>
              See how it works
            </button>
          </div>

          <p className="hero__trust-line">Free forever for solo developers · No credit card required</p>
        </section>

        <section className="demo-card" aria-label="Product demo">
          <div className="demo-card__tabs">
            {demoTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`demo-card__tab ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="demo-card__content">
            <div className="demo-editor">
              <div className="demo-editor__header">
                <span>app.py</span>
                <span>Python</span>
              </div>

              <div className="demo-editor__code" role="presentation">
                {codeLines.map((line, index) => {
                  const highlight = index === 1 || index === 2;
                  return (
                    <div key={line} className={`demo-editor__line ${highlight ? 'is-highlighted' : ''}`}>
                      <span className="demo-editor__line-number">{index + 1}</span>
                      <code>{line}</code>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="demo-results">
              <div className="demo-results__header">
                <strong>{activeDemoContent.title}</strong>
                <span>{activeDemoContent.body}</span>
              </div>

              <div className="suggestion-card">
                <div className="suggestion-card__top">
                  <span className="badge badge--red">Critical</span>
                  <strong>SQL Injection vulnerability</strong>
                </div>
                <div className="confidence">
                  <div className="confidence__label">
                    <span>Confidence</span>
                    <strong>94%</strong>
                  </div>
                  <div className="confidence__bar"><span className="confidence__bar-fill confidence__bar-fill--green" /></div>
                </div>
                <p>Untrusted input is interpolated directly into the query, so attackers can alter the SQL structure.</p>
              </div>

              <div className="suggestion-card">
                <div className="suggestion-card__top">
                  <span className="badge badge--amber">Medium</span>
                  <strong>No error handling</strong>
                </div>
                <div className="confidence">
                  <div className="confidence__label">
                    <span>Confidence</span>
                    <strong>71%</strong>
                  </div>
                  <div className="confidence__bar"><span className="confidence__bar-fill confidence__bar-fill--amber" /></div>
                </div>
                <p>Add an explicit error path so users receive a controlled response instead of a silent crash.</p>
              </div>

              <div className="demo-results__actions">
                <button type="button" className="demo-results__ghost demo-results__ghost--accent">
                  Check my fix
                </button>
                <button type="button" className="demo-results__ghost">
                  Ask Socratic
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <p className="section-label">Features</p>
          <h2>Everything your team needs</h2>
          <p className="section-subtitle">Built for developers who want to learn and managers who need to ship.</p>

          <div className="feature-grid">
            {featureCards.map((card) => (
              <article key={card.title} className="feature-card">
                <div className={`feature-card__icon ${card.tone}`} aria-hidden="true">
                  {card.icon}
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="personas" id="personas">
          <p className="section-label">Personas</p>
          <h2>One codebase. Three perspectives.</h2>
          <p className="section-subtitle">Each persona applies different standards. Run all three at once to see where they agree — and where they conflict.</p>

          <div className="persona-grid">
            {personas.map((persona) => (
              <article key={persona.title} className="persona-card">
                <span className={`persona-card__tag ${persona.tone}`}>{persona.tag}</span>
                <h3>{persona.title}</h3>
                <p>{persona.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="how-it-works" id="how-it-works">
          <p className="section-label">For teams</p>
          <h2>Manager to developer in one flow</h2>
          <p className="section-subtitle">No more chasing people on Slack. Manager sees everything. Developer gets notified automatically.</p>

          <div className="flow">
            {teamSteps.map((step, index) => (
              <Fragment key={step}>
                <div key={step} className="flow-step">
                  <span className="flow-step__index">{index + 1}</span>
                  <span className="flow-step__text">{step}</span>
                </div>
                {index < teamSteps.length - 1 && <div className="flow-arrow" aria-hidden="true">→</div>}
              </Fragment>
            ))}
          </div>
        </section>

        <section className="socratic" id="how-it-works-socratic">
          <div className="socratic__copy">
            <p className="section-label">Only on CodeLens AI</p>
            <h2>Your AI that teaches, not just tells.</h2>
            <p>
              Every other code reviewer tells you what is wrong. CodeLens AI asks you why you think it happened.
            </p>
            <p>
              Through guided Socratic questions, you discover the problem yourself. Which means you never make the same mistake twice.
            </p>
            <p>
              This is how senior developers actually mentor juniors. We just made it available at scale, at any time.
            </p>
          </div>

          <div className="socratic-chat">
            <div className="socratic-chat__banner">You edited the code — AI will ask about your change</div>
            <div className="socratic-chat__message socratic-chat__message--ai">
              What happens to this SQL query if someone types 1 OR 1=1 as the user ID?
            </div>
            <div className="socratic-chat__message socratic-chat__message--user">
              Oh, it would return all users in the database...
            </div>
            <div className="socratic-chat__message socratic-chat__message--ai">
              Exactly. So what does that tell you about how user input should reach a SQL query?
            </div>
          </div>
        </section>

        <section className="pricing" id="pricing">
          <p className="section-label">Pricing</p>
          <h2>Start free. Scale when ready.</h2>
          <p className="section-subtitle">No credit card required. Upgrade when your team grows.</p>

          <div className="pricing-grid">
            {pricingCards.map((card) => (
              <article key={card.name} className={`pricing-card ${card.featured ? 'is-featured' : ''}`}>
                {card.featured && <span className="pricing-card__badge">Most popular</span>}
                <h3>{card.name}</h3>
                <div className="pricing-card__price">
                  <strong>{card.price}</strong>
                  <span>{card.period}</span>
                </div>

                <ul>
                  {card.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`pricing-card__cta ${card.featured ? 'pricing-card__cta--primary' : ''}`}
                  onClick={() => navigate('/register')}
                >
                  {card.cta}
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__brand">
          <span className="landing-footer__mark" aria-hidden="true">CL</span>
          <strong>CodeLens AI</strong>
        </div>
        <p>Built for developers who want to get better, and managers who need to ship.</p>
        <div className="landing-footer__links">
          <Link to="/privacy" className="landing-footer__link">Privacy</Link>
          <Link to="/terms" className="landing-footer__link">Terms</Link>
          <a href="https://github.com/tanishajaiswal7/codelens" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}