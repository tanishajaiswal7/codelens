# PHASE 1 VERIFICATION CHECKLIST

Complete all tests below before confirming Phase 1 is complete. Do NOT proceed to Phase 2 until all items are checked.

## Backend Setup
- [ ] `cd backend && npm install` completes without errors
- [ ] `node server.js` starts and logs "MongoDB connected: localhost"
- [ ] `node server.js` logs "Server running on http://localhost:5000"
- [ ] `curl http://localhost:5000/api/health` returns `{"status":"OK"}`

## Frontend Setup
- [ ] `cd frontend && npm install` completes without errors
- [ ] `npm run dev` starts on http://localhost:5173 without errors
- [ ] Page loads with dark theme background (#0f0f1a)
- [ ] Can navigate to /login and /register pages

## Authentication — Register Endpoint
- [ ] Can see RegisterPage with name, email, password, confirm password fields
- [ ] All inputs have correct styling (dark theme, proper borders, focus states)
- [ ] Submit button is disabled while loading
- [ ] POST `/api/auth/register` with valid data creates user in MongoDB
- [ ] Verify in MongoDB Compass: user document has name, email, hashed password, createdAt
- [ ] Password is hashed (not plaintext) — verify in Compass it's not readable
- [ ] Response includes `user.id`, `user.name`, `user.email`
- [ ] Response includes Set-Cookie header with authToken (httpOnly, Secure if production)
- [ ] Duplicate email returns 400 error with "Email already registered"
- [ ] Missing fields return validation error
- [ ] On success, redirects to /dashboard
- [ ] Error message displays below email field in red

## Authentication — Login Endpoint
- [ ] Can see LoginPage with email and password fields
- [ ] All inputs have correct styling (dark theme, proper borders, focus states)
- [ ] POST `/api/auth/login` with correct credentials returns user object
- [ ] Response includes Set-Cookie header with authToken
- [ ] POST `/api/auth/login` with wrong password returns 401 "Invalid email or password"
- [ ] POST `/api/auth/login` with nonexistent email returns 401
- [ ] On success, redirects to /dashboard
- [ ] Error message displays below email field in red

## Authentication — GET /me Endpoint
- [ ] GET `/api/auth/me` with valid cookie returns `{user: {id, name, email}}`
- [ ] User object does NOT include password field
- [ ] GET `/api/auth/me` without cookie returns 401
- [ ] GET `/api/auth/me` with invalid/expired cookie returns 401

## Authentication — Logout Endpoint
- [ ] POST `/api/auth/logout` clears authToken cookie
- [ ] After logout, GET `/api/auth/me` returns 401

## Frontend Routing & Protection
- [ ] Visiting `/` redirects to `/dashboard`
- [ ] Visiting `/dashboard` without auth redirects to `/login`
- [ ] Visiting `/dashboard` with valid cookie shows dashboard with Topbar
- [ ] Topbar displays "CodeLens AI" logo with "Lens" in accent color (#4f46e5)
- [ ] Topbar displays user avatar with initials (e.g., "JD" for John Doe)
- [ ] Topbar displays "Logout" button
- [ ] Clicking logout clears cookie and redirects to /login
- [ ] After logout, accessing /dashboard redirects to /login

## Component Structure
- [ ] Topbar.jsx exists with Topbar.css (no inline styles)
- [ ] ProtectedRoute.jsx exists with ProtectedRoute.css (no inline styles)
- [ ] LoginPage.jsx exists with LoginPage.css (no inline styles)
- [ ] RegisterPage.jsx exists with RegisterPage.css (no inline styles)
- [ ] axiosInstance.js sets withCredentials: true
- [ ] axiosInstance.js interceptor redirects to /login on 401
- [ ] authApi.js has login(), register(), logout(), getMe() functions

## Design System Compliance
- [ ] Background colors match dark theme (#0f0f1a, #161624, #1e1e30)
- [ ] Accent color is #4f46e5 (indigo)
- [ ] Text colors: primary #f0eff8, muted #9b99b5
- [ ] Form inputs have proper border: rgba(255,255,255,0.08)
- [ ] Focus state border is #4f46e5
- [ ] Error text color is #f87171 (red)
- [ ] Border radius is 8px for inputs, 16px for cards
- [ ] Fonts are Syne (UI) and JetBrains Mono (code)
- [ ] No gradients or box-shadows (except focus states)
- [ ] No inline styles in any component

## Database Verification
- [ ] MongoDB Compass shows `codelens-ai` database
- [ ] `users` collection has documents with correct schema
- [ ] User documents have: _id, name, email, password (hashed), createdAt, updatedAt
- [ ] Email field is unique (duplicate email insertion fails)

---

**Once ALL checkboxes are complete, respond with:**
```
✅ Phase 1 Complete — All verification checks passed
```

Then I will wait for your explicit instruction: **"proceed to phase 2"**
