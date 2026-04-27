import { useState } from 'react';
import './HelpModals.css';

export default function FAQModal({ isOpen, onClose }) {
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  if (!isOpen) return null;

  const faqs = [
    {
      id: 1,
      question: 'What is CodeLens AI?',
      answer: 'CodeLens AI is an intelligent code review tool that uses AI to analyze pull requests and provide constructive feedback using the Socratic method. It helps developers learn better coding practices through guided questioning.'
    },
    {
      id: 2,
      question: 'How do I connect my GitHub account?',
      answer: 'Click the "Connect GitHub" button on the dashboard. You\'ll be redirected to GitHub to authorize the CodeLens application. Once authorized, you can access all your repositories and pull requests.'
    },
    {
      id: 3,
      question: 'Is my code private?',
      answer: 'Yes! Your code is completely private. CodeLens only analyzes pull requests within your own repositories that you authorize. We don\'t store your code or share it with anyone.'
    },
    {
      id: 4,
      question: 'What is the Socratic Method?',
      answer: 'The Socratic method is an educational technique where learning happens through guided questioning. Instead of giving direct answers, CodeLens asks thoughtful questions to help you discover solutions yourself.'
    },
    {
      id: 5,
      question: 'Can I use CodeLens for team code reviews?',
      answer: 'Yes! CodeLens is designed for both individual and team code reviews. You can review pull requests and share insights with your team members.'
    },
    {
      id: 6,
      question: 'What programming languages are supported?',
      answer: 'CodeLens supports all major programming languages including JavaScript, Python, Java, C++, Go, Rust, and more. The AI analysis works across different language contexts.'
    },
    {
      id: 7,
      question: 'How do I access my review history?',
      answer: 'Click on the "History" section from the sidebar to view all your past code reviews. You can filter by date, repository, or status.'
    },
    {
      id: 8,
      question: 'Can I customize my review preferences?',
      answer: 'Yes! Go to Settings to customize your preferences including review tone, focus areas, language, and notification settings.'
    },
    {
      id: 9,
      question: 'Is CodeLens free?',
      answer: 'CodeLens offers a free tier with basic features. For advanced features and unlimited reviews, check out our premium plans.'
    },
    {
      id: 10,
      question: 'How often does CodeLens update?',
      answer: 'We continuously improve CodeLens with new features and AI models. Updates are rolled out regularly to provide better analysis and user experience.'
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>❓ Frequently Asked Questions</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body faq-body">
          <div className="faq-list">
            {faqs.map((faq) => (
              <div key={faq.id} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                >
                  <span>{faq.question}</span>
                  <span className={`faq-icon ${expandedFAQ === faq.id ? 'open' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedFAQ === faq.id && (
                  <div className="faq-answer">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
