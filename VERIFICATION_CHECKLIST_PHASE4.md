# PHASE 4 VERIFICATION CHECKLIST

Complete all tests below before confirming Phase 4 is complete. Do NOT proceed to Phase 5 until all items are checked.

## Backend — History Service

- [ ] GET /api/history returns last 20 reviews for logged-in user only
- [ ] GET /api/history/:reviewId returns full review with code, suggestions, verdict
- [ ] DELETE /api/history/:reviewId soft deletes (sets deleted: true)
- [ ] History queries exclude deleted reviews (deleted: { $ne: true })
- [ ] Each history item has: reviewId, codeSnippet (60 chars), persona, mode, verdict, createdAt

## Backend — Rate Limiter

- [ ] GET /api/history returns 200 on first call
- [ ] POST /api/review #1-20 all succeed with 201 status
- [ ] POST /api/review #21 returns 429 status with error message
- [ ] 429 response includes: { error: "Daily limit reached", limit: 20, used: 21 }
- [ ] X-RateLimit-Remaining header present on successful review responses
- [ ] Header value decreases: 19, 18, 17... as reviews are submitted
- [ ] Rate limit resets next day at 00:00 (uses MongoDB createdAt)
- [ ] Middleware doesn't block on errors (graceful degradation)

## Frontend — Sidebar Component

- [ ] Sidebar renders on left side of dashboard (240px width)
- [ ] Sidebar has two nav buttons: "🆕 New Review", "📋 Settings"
- [ ] "New Review" button is active/highlighted
- [ ] "Review History" section shows last 5 reviews (max 5, not all 20)
- [ ] Empty state shows: "No reviews yet. Create your first review!"
- [ ] Loading state shows: "Loading..."
- [ ] Scrollbar visible and styled (matches design system)

## Frontend — HistoryItem Component

- [ ] Code snippet truncated to 60 characters with "..."
- [ ] Code snippet font: JetBrains Mono, monospace, font-size 11px
- [ ] Persona tag colored: FAANG blue (#4f46e5), Startup amber, Security red
- [ ] Time ago formatted correctly: "Just now", "2m ago", "1h ago", "Yesterday", "3d ago"
- [ ] Delete button (✕) removes item from list on click
- [ ] Clicking item (except delete button) loads full review
- [ ] Hover effect changes background color

## Frontend — RateLimitBar Component

- [ ] Shows text: "{used} / 20 reviews today"
- [ ] Progress bar width = (used/20 * 100)%
- [ ] Bar color: green (0-50%), amber (51-75%), red (76-100%)
- [ ] Shows caption: "{remaining} reviews remaining"
- [ ] Updates when new review is submitted

## Frontend — DashboardPage Integration

- [ ] Sidebar visible on left (fixed width 240px)
- [ ] PersonaPicker moved below Topbar (full width)
- [ ] Main content area takes remaining space
- [ ] Clicking history item loads review into ReviewPanel (not Socratic)
- [ ] Rate limit usage tracked and updated after each review
- [ ] ReviewPanel shows: summary, verdict, suggestions with confidence scores
- [ ] Socratic mode still works when enabled in CodeEditor

## User Flow Test

1. **Setup**: Login with test account
2. **Initial state**: 
   - [ ] Sidebar shows empty state or previous history
   - [ ] RateLimitBar shows "0 / 20 reviews today"
3. **First review**:
   - [ ] Submit code in Standard mode (5+ lines)
   - [ ] Review loads successfully
   - [ ] RateLimitBar updates to "1 / 20"
   - [ ] New item appears in sidebar history
4. **Load from history**:
   - [ ] Click history item
   - [ ] Full review loads (with all suggestions)
   - [ ] Code editor clears (ready for new code)
5. **Delete from history**:
   - [ ] Click ✕ button on history item
   - [ ] Item removed from list
   - [ ] API call succeeds
6. **Rate limit warning** (optional, submit 16+ more reviews):
   - [ ] At 16 reviews: RateLimitBar is amber, shows "4 remaining"
   - [ ] At 20 reviews: RateLimitBar is red, shows "0 remaining"
   - [ ] 21st review returns 429 error

## Database Verification

- [ ] Review model has `deleted` field (Boolean, default false)
- [ ] History queries use { deleted: { $ne: true } }
- [ ] Deleted reviews not returned by GET /api/history
- [ ] Deleted reviews not counted in daily limit
- [ ] Multiple reviews per user stored correctly

## Design System — Phase 4

- [ ] Sidebar width 240px, background #0f0f1a
- [ ] Border color: rgba(79, 70, 229, 0.1)
- [ ] Nav buttons: 1px border, 8px border-radius, 10px padding
- [ ] History items: 10px padding, 8px margin-bottom
- [ ] Persona tags: 2px padding, 4px border-radius, 9px font
- [ ] Code snippet color: #d4d2e8, JetBrains Mono 11px
- [ ] RateLimitBar background: rgba(79, 70, 229, 0.03)
- [ ] Progress bar: 6px height, 3px border-radius
- [ ] Scrollbar: 6px width, rgba(79, 70, 229, 0.3)

---

**Once ALL checkboxes are complete, respond with:**
```
✅ Phase 4 Complete — All verification checks passed
```

Then explicitly say **"proceed to phase 5"** when ready.
