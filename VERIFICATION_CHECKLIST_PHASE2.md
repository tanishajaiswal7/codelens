# PHASE 2 VERIFICATION CHECKLIST

Complete all tests below before confirming Phase 2 is complete. Do NOT proceed to Phase 3 until all items are checked.

## Setup
- [ ] `cd frontend && npm install` (installs @monaco-editor/react)
- [ ] Backend still running with ANTHROPIC_API_KEY set in .env
- [ ] Frontend still running

## Backend Review Service
- [ ] POST /api/review with valid code + persona returns 201 status
- [ ] Response includes: reviewId, summary, verdict, suggestions array
- [ ] Each suggestion has: id, title, description, lineRef, severity, confidence, confidenceReason, confidenceLabel, confidenceBand, category
- [ ] confidence is a number 0-100
- [ ] confidenceLabel is one of: "High", "Moderate", "Low", "Speculative"
- [ ] confidenceBand is one of: "green", "amber", "orange", "red"
- [ ] verdictMapping works: 85-100 → "High", 60-84 → "Moderate", 35-59 → "Low", 0-34 → "Speculative"
- [ ] Review document saved to MongoDB with userId, code, persona, verdict, suggestions
- [ ] console.log shows systemPrompt being constructed (check backend logs)

## Persona-Specific Prompts
- [ ] FAANG persona: systemPrompt mentions scalability, Big-O, SOLID, design patterns
- [ ] Startup persona: systemPrompt mentions pragmatic, MVP, tech debt, shipping speed
- [ ] Security persona: systemPrompt mentions OWASP, vulnerabilities, CVE, severity levels
- [ ] Every prompt ends with instruction: "Return ONLY valid JSON. No markdown. No explanation outside the JSON."

## AI Response Parsing
- [ ] confidenceParser strips markdown fences from AI response
- [ ] confidenceParser returns valid JSON even if AI returns ```json...```
- [ ] If AI response is malformed, fallback response is returned (no crash)
- [ ] Fallback response has valid suggestion structure

## Frontend — PersonaPicker Component
- [ ] PersonaPicker renders 3 cards: FAANG SWE, Startup Founder, Security Auditor
- [ ] Clicking a card changes selectedPersona state
- [ ] Active card has colored border + tinted background
- [ ] FAANG: indigo border/background, Startup: amber, Security: red
- [ ] Component has its own CSS file — no inline styles

## Frontend — CodeEditor Component
- [ ] Monaco Editor renders with vs-dark theme
- [ ] Language dropdown works (JavaScript, Python, TypeScript, etc.)
- [ ] Line count displays correctly (updates as user types)
- [ ] Socratic mode toggle works (click to turn on/off)
- [ ] "Review my code" button is disabled if code < 5 lines
- [ ] "Review my code" button is disabled if code is empty
- [ ] "Review my code" button has loading state (disabled, shows "Reviewing...")
- [ ] Clicking button calls onSubmit(code, socraticMode)
- [ ] Component has its own CSS file — no inline styles

## Frontend — ReviewPanel Component
- [ ] Empty state shown when no review exists (says "No review yet")
- [ ] When isLoading=true, shows loading skeleton with shimmer animation
- [ ] Review summary card shows verdict + summary text
- [ ] Verdict colors: approved=green, needs_revision=red, minor_issues=amber
- [ ] Filter chips work: All | High Confidence | Critical
- [ ] Filter counts update based on suggestions
- [ ] Clicking filter updates displayed suggestions
- [ ] Suggestions mapped to SuggestionCard components
- [ ] Component has its own CSS file — no inline styles

## Frontend — SuggestionCard Component
- [ ] Title, description, lineRef displayed
- [ ] Severity badge colored per level (critical=red, high=orange, etc.)
- [ ] ConfidenceBadge displayed on right side
- [ ] "Why this score?" button shown
- [ ] Clicking "Why this score?" expands to show confidenceReason
- [ ] Action buttons: Apply, Dismiss, Discuss (no action needed for Phase 2)
- [ ] Component has its own CSS file — no inline styles

## Frontend — ConfidenceBadge Component
- [ ] Score displays in JetBrains Mono, large font (20px)
- [ ] Score color matches band: green (85+), amber (60-84), orange (35-59), red (0-34)
- [ ] Progress bar below score, width = score%
- [ ] Label displays: "High", "Moderate", "Low", or "Speculative"
- [ ] Label color matches band color
- [ ] Component has its own CSS file — no inline styles

## Frontend — DashboardPage Layout
- [ ] Topbar at top with user info + logout
- [ ] Sidebar (240px) on left with "Review History" placeholder
- [ ] Grid workspace: editor on left (1fr), review panel on right (1fr)
- [ ] 1px border/gap between panes
- [ ] PersonaPicker bar below topbar
- [ ] CodeEditor fills editor pane
- [ ] ReviewPanel fills review pane
- [ ] All components responsive to window resize
- [ ] Component has its own CSS file — no inline styles

## Integration Test — Full Flow
- [ ] Login/register user
- [ ] Navigate to /dashboard (should work via ProtectedRoute)
- [ ] Select persona (click a card)
- [ ] Paste valid code (>5 lines) into editor
- [ ] Click "Review my code"
- [ ] Loading state shows (button disabled, says "Reviewing...")
- [ ] API call hits POST /api/review
- [ ] Review appears in ReviewPanel within 10 seconds
- [ ] Summary card shows verdict + text
- [ ] Suggestions render with all fields populated
- [ ] Confidence badges show correct colors and scores
- [ ] Filter chips work and update counts
- [ ] Click "Why this score?" on a suggestion — expands to show reason
- [ ] No errors in browser console
- [ ] No errors in backend console

## API Verification
- [ ] POST /api/review response structure matches schema
- [ ] Each suggestion has valid confidence (0-100)
- [ ] No suggestion missing confidenceLabel or confidenceBand
- [ ] Review saved to MongoDB with all fields
- [ ] GET /api/review/:reviewId returns the saved review

## Design System — Phase 2
- [ ] Background: #0f0f1a, surfaces: #161624, #1e1e30 ✓
- [ ] Accent color: #4f46e5 (indigo) ✓
- [ ] Text: primary #f0eff8, muted #9b99b5 ✓
- [ ] Severity colors: critical=red (#f87171), high=orange, medium=amber, low=green ✓
- [ ] No gradients or box-shadows (focus states only) ✓
- [ ] Border: rgba(255,255,255,0.08) default ✓
- [ ] Border radius: 8px inputs, 16px cards ✓
- [ ] Fonts: Syne (UI), JetBrains Mono (code/numbers) ✓

## Code Organization
- [ ] backend/services/review-service/ exists with MVC structure
- [ ] frontend/src/pages/DashboardPage/ with .jsx + .css
- [ ] frontend/src/components/{PersonaPicker, CodeEditor, ReviewPanel, SuggestionCard, ConfidenceBadge}/ each with .jsx + .css
- [ ] No component has inline styles
- [ ] No business logic in frontend (only calls API and renders)
- [ ] reviewApi.js has only API calls (no logic)
- [ ] reviewService.js contains all business logic
- [ ] promptService.js builds persona prompts
- [ ] confidenceParser.js parses and validates AI response

---

**Once ALL checkboxes are complete, respond with:**
```
✅ Phase 2 Complete — All verification checks passed
```

Then explicitly say **"proceed to phase 3"** when ready.
