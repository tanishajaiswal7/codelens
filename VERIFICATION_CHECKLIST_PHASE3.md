# PHASE 3 VERIFICATION CHECKLIST

Complete all tests below before confirming Phase 3 is complete. Do NOT proceed to Phase 4 until all items are checked.

## Backend Setup
- [ ] `npm install` in backend (dependencies installed)
- [ ] `node server.js` starts without errors
- [ ] MongoDB connection successful

## Socratic Routes
- [ ] POST /api/socratic/start returns 3-5 guiding questions (NOT direct answers)
- [ ] Response includes: sessionId, questions[], turnNumber, maxTurns
- [ ] POST /api/socratic/reply accepts sessionId and userMessage
- [ ] POST /api/socratic/reply returns follow-up questions
- [ ] GET /api/socratic/session/:id returns full conversation history
- [ ] Session closes after 10 turns (status: completed)
- [ ] All routes require authentication (401 without token)

## Socratic Service Logic
- [ ] buildSocraticSystemPrompt(persona) returns persona-specific prompts
- [ ] FAANG: prompts focus on complexity, scalability, patterns
- [ ] Startup: prompts focus on MVP, delivery, pragmatism
- [ ] Security: prompts focus on vulnerabilities, OWASP, threats
- [ ] parseQuestionsResponse extracts questions from JSON or numbered list
- [ ] Session history correctly stored in MongoDB
- [ ] Messages array has role (user|ai) + content + timestamp

## Frontend — Socratic Integration
- [ ] CodeEditor has Socratic Mode toggle
- [ ] Toggle OFF: "Review my code" button, ReviewPanel shows on right
- [ ] Toggle ON: "Learn via Socratic" button, SocraticPanel shows on right
- [ ] Clicking toggle switches panels immediately

## Frontend — SocraticPanel Component
- [ ] Initial AI questions appear on mount
- [ ] Turn counter shows "Turn 1 of 10"
- [ ] Chat messages scroll to bottom automatically
- [ ] User messages right-aligned with indigo background
- [ ] AI messages left-aligned with surface color + indigo border
- [ ] Input field stays pinned at bottom
- [ ] Send button disabled when input empty or loading
- [ ] Enter key sends message (Shift+Enter for newline)
- [ ] Loading indicator shows "Thinking..." with animated dots
- [ ] After 10 turns: shows completion message + "Switch to Standard Mode" button
- [ ] Component has SocraticPanel.jsx + SocraticPanel.css (no inline styles)

## Frontend — ChatBubble Component
- [ ] Renders role: "ai" left-aligned, "user" right-aligned
- [ ] AI bubble: dark background (#1e1e30), indigo border
- [ ] User bubble: indigo tint background, dark border
- [ ] Timestamp displayed below each message
- [ ] Smooth fade-in animation on new messages
- [ ] Component has ChatBubble.jsx + ChatBubble.css (no inline styles)

## Integration Test — Full Socratic Flow
- [ ] Login/register user
- [ ] Navigate to /dashboard
- [ ] Paste code (5+ lines) into editor
- [ ] Toggle Socratic Mode ON
- [ ] Click "Learn via Socratic"
- [ ] Initial questions appear from AI
- [ ] Turn counter shows "Turn 1 of 10"
- [ ] Type user response in input
- [ ] Click Send or press Enter
- [ ] User message appears right-aligned
- [ ] Loading indicator shows briefly
- [ ] AI follow-up questions appear left-aligned
- [ ] Turn counter increments to "Turn 2 of 10"
- [ ] Repeat 8 more times to reach Turn 10
- [ ] After Turn 10: completion message appears
- [ ] "Switch to Standard Mode" button works
- [ ] Clicking button switches to ReviewPanel (toggle becomes OFF)
- [ ] No errors in browser console
- [ ] No errors in backend console

## Persona Verification
- [ ] FAANG persona asks about complexity, algorithms, design
- [ ] Startup persona asks about scope, delivery, pragmatism
- [ ] Security persona asks about vulnerabilities, threats, OWASP
- [ ] All personas ask guiding questions, never give direct answers

## Database Verification
- [ ] SocraticSession documents saved to MongoDB
- [ ] Documents have: userId, code, persona, messages[], status, timestamps
- [ ] Messages array correctly stores user + AI exchanges
- [ ] Status changes from "active" to "completed" at turn 10

## Design System — Phase 3
- [ ] Chat bubbles use design colors correctly
- [ ] AI bubble: #1e1e30 background, rgba(124,114,255,0.2) border
- [ ] User bubble: rgba(79,70,229,0.15) background
- [ ] Text colors: #f0eff8 primary, #9b99b5 muted, #5e5c78 dim
- [ ] Fonts: Syne for UI, JetBrains Mono for code/timestamps
- [ ] Loading animation uses CSS (no library)
- [ ] Turn counter styled with indigo border + background
- [ ] Completion message uses green (#22d3a0)

## Code Organization
- [ ] backend/services/socratic-service/ with MVC structure
- [ ] socraticService.js contains all business logic
- [ ] socraticPromptService.js builds persona prompts
- [ ] SocraticPanel.jsx + SocraticPanel.css (no inline styles)
- [ ] ChatBubble.jsx + ChatBubble.css (no inline styles)
- [ ] socraticApi.js has only API calls (startSession, sendReply, getSession)
- [ ] No business logic in frontend
- [ ] DashboardPage properly switches between ReviewPanel + SocraticPanel

## No Direct Answers Check
- [ ] Submit code in Socratic mode
- [ ] Verify AI does NOT provide direct solutions
- [ ] Verify AI asks guiding questions instead
- [ ] Verify AI builds on user responses
- [ ] Verify questions are relevant to persona

---

**Once ALL checkboxes are complete, respond with:**
```
✅ Phase 3 Complete — All verification checks passed
```

Then explicitly say **"proceed to phase 4"** when ready.
