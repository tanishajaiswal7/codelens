# 🚀 Complete Production Fix: 401 Loading Spinner Issue

## Quick Summary

**Problem:** App stuck on "Loading CodeLens AI..." in Vercel because `/api/auth/me` returns 401  
**Root Cause:** Frontend axios interceptor auto-redirected on 401, breaking React state updates  
**Solution:** Remove auto-redirect, let 401 be handled gracefully in AuthContext

---

## What Was Fixed (Frontend)

### File: `frontend/src/utils/axiosInstance.js`

**Problem Code (❌ Old):**
```javascript
if (response?.status === 401) {
  window.location.href = '/login';  // Causes component unmount
}
return Promise.reject(error);
```

**Fixed Code (✅ New):**
```javascript
if (response?.status === 401) {
  console.warn('[axiosInstance] Unauthorized (401)');
  return Promise.reject(error);  // Just reject, don't redirect
}
```

**Result:** AuthContext can now properly handle 401 with try/catch/finally

---

## How It Works Now

### Before (Broken Flow):
```
App loads
  ↓
AuthContext calls /api/auth/me
  ↓
Server returns 401 (no valid token)
  ↓
Axios interceptor redirects to /login
  ↓
Component unmounts
  ↓
finally block tries to call setLoading(false)
  ↓
React warning: "state update on unmounted component"
  ↓
Loading spinner STUCK ❌
```

### After (Fixed Flow):
```
App loads
  ↓
AuthContext calls /api/auth/me
  ↓
Server returns 401 (no valid token)
  ↓
AuthContext catch block handles error
  ↓
setUser(null), setLoading(false) in finally
  ↓
RootRoute sees: isLoading=false, user=null
  ↓
Shows LandingPage ✅
```

---

## Environment Configuration Required

### Frontend (Vercel) - REQUIRED

1. **Vercel Dashboard → Project Settings → Environment Variables**

Add:
```
Name:  VITE_API_URL
Value: https://codelens-backend-xxx.onrender.com
```

2. **Redeploy after setting**

### Backend (Render) - REQUIRED

1. **Render Dashboard → Your Backend Service → Environment**

Add/Update:
```
FRONTEND_URL=https://codelens.vercel.app
JWT_SECRET=your-secret-key
NODE_ENV=production
```

2. **Restart service after updating**

---

## What Each Environment Variable Does

| Variable | Service | Purpose | Example |
|----------|---------|---------|---------|
| `VITE_API_URL` | Frontend (Vercel) | Tells frontend where to call the backend | `https://backend-xxx.onrender.com` |
| `FRONTEND_URL` | Backend (Render) | Adds frontend URL to CORS allowed origins | `https://codelens.vercel.app` |
| `JWT_SECRET` | Backend (Render) | Secret key for signing JWT tokens | `your-secret-key-here` |
| `NODE_ENV` | Backend (Render) | Sets production mode (affects cookie security) | `production` |

---

## Request Flow in Production

### Step 1: Frontend Makes Request
```javascript
// Frontend: frontend/src/context/AuthContext.jsx
const response = await authApi.getMe();

// This becomes:
// GET https://backend-xxx.onrender.com/api/auth/me
// WITH Cookie header (if token exists)
// WITH credentials: "include"
```

### Step 2: Backend Checks CORS
```javascript
// Backend: backend/serviceApp.js
cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin)) {  // Checks FRONTEND_URL
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
})
```

**Required:** `FRONTEND_URL` must include `https://codelens.vercel.app`

### Step 3: Backend Checks Authentication
```javascript
// Backend: backend/middleware/authMiddleware.js
const token = req.cookies.token;  // Get from cookie

if (!token) {
  return res.status(401).json({ message: 'No token' });  // 401 response
}

jwt.verify(token, process.env.JWT_SECRET);  // Verify token
```

### Step 4: Frontend Handles 401
```javascript
// Frontend: frontend/src/context/AuthContext.jsx
try {
  const response = await authApi.getMe();
  setUser(response.data.user);
} catch (error) {
  // 401 is caught here (not redirected!)
  setUser(null);  // User not authenticated
} finally {
  setIsLoading(false);  // Always called ✅
}
```

### Step 5: App Shows Landing Page
```javascript
// Frontend: frontend/src/App.jsx - RootRoute component
if (isLoading) return <AppLoadingScreen />;
if (user) return <Navigate to="/dashboard" />;
return <LandingPage />;  // ← Unauthenticated users see this
```

---

## Testing in Production

### Before Deploying

1. **Build locally:**
   ```bash
   cd frontend
   npm run build
   npm run preview  # http://localhost:4173
   ```

2. **Check:**
   - No stuck loading spinner
   - Landing page shows
   - DevTools Console: `[axiosInstance] Using API base URL: ...`

### After Deploying to Vercel

1. **Open Vercel deployment in browser**
2. **Open DevTools (F12) → Network tab**
3. **Look for `/api/auth/me` request**
   - [ ] Request URL: `https://backend-xxx.onrender.com/api/auth/me`
   - [ ] Request headers: Include `Cookie: token=...`
   - [ ] Response: `401 Unauthorized` (if not logged in) or `200 OK` (if logged in)
   - [ ] No CORS errors
4. **DevTools Console**
   - [ ] Should show: `[axiosInstance] Using API base URL: https://backend-xxx.onrender.com`
   - [ ] Should show: `[AuthContext] Initial user refresh complete: not authenticated`
   - [ ] No React warnings about state updates on unmounted components
5. **Page should show:**
   - [ ] Landing page (not loading spinner)
   - [ ] "Sign In" button works
   - [ ] After login, redirects to dashboard

---

## Checklist: Configuration Steps

### ✅ Frontend (Vercel)

- [ ] Code changes pushed to git
- [ ] `frontend/src/utils/axiosInstance.js` - 401 not redirected
- [ ] `VITE_API_URL` set in Vercel Environment Variables
- [ ] Vercel redeploys automatically (or manual redeploy)
- [ ] Build succeeds in deployment logs

### ✅ Backend (Render)

- [ ] `FRONTEND_URL` includes Vercel URL (with https://)
- [ ] `JWT_SECRET` is set and consistent
- [ ] `NODE_ENV=production`
- [ ] Service restarted after env changes
- [ ] Health check passes: `curl https://backend-xxx.onrender.com/api/health`

### ✅ Testing

- [ ] Frontend loads without stuck spinner
- [ ] Network tab shows requests to backend (not relative `/api`)
- [ ] 401 response received from backend (expected if not logged in)
- [ ] Landing page displays
- [ ] Can log in successfully
- [ ] After login, dashboard loads

---

## Troubleshooting

### Problem: Still stuck on loading spinner

**Solution 1: Check VITE_API_URL**
```
Vercel → Settings → Environment Variables
Confirm VITE_API_URL is set to your Render backend URL
Redeploy
```

**Solution 2: Check Network in DevTools**
- Open DevTools (F12) → Network tab
- Look at `/api/auth/me` request
- Is the URL correct? Should be `https://your-backend.onrender.com/api/auth/me`
- If URL is `/api/auth/me`, then VITE_API_URL is not set

**Solution 3: Check Backend CORS**
```
Render → Your Backend → Environment
Confirm FRONTEND_URL includes your Vercel URL
Restart the service
```

### Problem: CORS error in console

**Check:** `FRONTEND_URL` on Render backend
- Should be: `https://codelens.vercel.app`
- Should NOT be: `http://...` (must be HTTPS in production)
- Should NOT be: `localhost` or without domain

### Problem: Can log in but gets 401 on other requests

**Check:** JWT token in cookies
- Open DevTools → Application → Cookies
- Look for `token` cookie
- Should have value after login
- Should have `HttpOnly`, `Secure`, `SameSite=None` flags in production

**Check:** Backend JWT_SECRET
- Render backend JWT_SECRET must match when token was created
- If you don't see a token cookie, check login response in Network tab

### Problem: Login works but dashboard shows 401

**This is normal initially** - The dashboard might be loading data that requires authentication. Check:
1. DashboardPage.jsx is fetching data properly
2. API calls use axiosInstance (which has withCredentials: true)
3. Backend returns 401 instead of crashing

---

## Files Modified

```
frontend/
├── src/
│   ├── utils/
│   │   ├── axiosInstance.js ✅ (CRITICAL FIX - removed 401 redirect)
│   │   ├── apiBaseUrl.js ✅ (already supports VITE_API_URL)
│   │   └── jobPoller.js ✅ (now uses axiosInstance)
│   ├── context/
│   │   └── AuthContext.jsx ✅ (proper try/catch/finally for 401)
│   └── api/
│       └── settingsApi.js ✅ (error handling)
├── .env ✅ (documentation comments)
├── vercel.json ✅ (build config)
├── DEPLOYMENT_GUIDE.md (setup instructions)
└── FIX_401_LOADING_ISSUE.md (this file)
```

---

## Git Deployment

```bash
# All changes ready to commit
git add .
git commit -m "fix: Handle 401 Unauthorized without auto-redirect

- Remove axios interceptor auto-redirect on 401
- Let AuthContext handle 401 with proper try/catch/finally
- Fix stuck loading spinner in production
- Add better error logging"

git push
```

**Vercel will auto-deploy after push.**

---

## Next Steps

1. **Set VITE_API_URL on Vercel** (if not already done)
2. **Set FRONTEND_URL on Render** (if not already done)
3. **Push code to git** → Vercel auto-redeploys
4. **Restart Render backend** (to pick up env changes)
5. **Test in production**
6. **Monitor console** for any errors

---

## Production Monitoring

After deployment, keep monitoring:

1. **Sentry or similar** for error tracking
2. **Browser console** for `[axiosInstance]` logs (can be removed after testing)
3. **Network tab** for failed API requests
4. **Auth flow** - test login/logout regularly

---

## Key Takeaways

✅ 401 responses are **valid and expected** when user is not logged in  
✅ Never auto-redirect in global interceptors - let the component handle it  
✅ Always use try/catch/finally for async operations  
✅ Environment variables must be set for production to work  
✅ CORS and credentials must be properly configured on both frontend and backend  

---

## Emergency Rollback

If something breaks in production:

```bash
# Rollback to previous commit
git revert HEAD
git push

# Vercel redeploys automatically
# Your previous working version is restored
```

---

**Questions?** Check the browser DevTools Network and Console tabs first! 
Most issues show up there as clear error messages.
