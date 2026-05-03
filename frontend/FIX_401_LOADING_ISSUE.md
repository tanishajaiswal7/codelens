# 🔧 FIX: Production Loading Spinner (401 Unauthorized Issue)

## Problem Summary
- App gets stuck on "Loading CodeLens AI..." spinner in production
- Browser console shows: `GET /api/auth/me` returns **401 Unauthorized**
- Locally works because user is already authenticated
- In production, user is not logged in (session expired or not saved)

---

## Root Cause: Axios Interceptor Auto-Redirect Bug

The axios interceptor was **auto-redirecting to `/login` on 401**, which caused:
1. Component to unmount before state updates complete
2. React warning: "Can't perform state update on unmounted component"
3. Loading state never properly cleared
4. App stuck in infinite loading spinner

**Old (Broken) Code:**
```javascript
if (response?.status === 401) {
  window.location.href = '/login';  // ← Unmounts component before finally block
}
return Promise.reject(error);
```

---

## Solution: Let App Handle 401 Gracefully

### ✅ File Changed: `frontend/src/utils/axiosInstance.js`

**What Changed:**
- Removed auto-redirect on 401 from global interceptor
- Let AuthContext handle 401 properly with try/catch/finally
- App now shows login/landing page instead of stuck spinner

**New (Fixed) Code:**
```javascript
// Handle 401 Unauthorized: Let the caller handle it
if (response?.status === 401) {
  if (isDev) {
    console.warn('[axiosInstance] Unauthorized (401) - let the caller decide');
  }
  return Promise.reject(error);  // ← Just reject, DON'T redirect
}
```

---

## How It Works Now (Step by Step)

### When App Loads (User Not Logged In):

1. **App mounts → AuthContext effect runs**
   ```javascript
   useEffect(() => {
     refreshUser();  // Make /api/auth/me request
   }, []);
   ```

2. **Request fails with 401**
   - Server: "User not authenticated"
   - Response: `{ status: 401, data: { error: "Unauthorized" } }`

3. **AuthContext catches error in try/catch/finally**
   ```javascript
   try {
     const response = await authApi.getMe();
     setUser(response.data.user);
   } catch (error) {
     console.error('Failed to fetch user:', error.status); // Logs 401
     setUser(null);  // User is not logged in
   } finally {
     setIsLoading(false);  // ✅ ALWAYS called, even on 401
   }
   ```

4. **RootRoute sees isLoading=false, user=null**
   ```javascript
   if (isLoading) return <AppLoadingScreen />;
   if (user) return <Navigate to="/dashboard" />;
   return <LandingPage />;  // ✅ Shows landing page for unauthenticated users
   ```

5. **App displays landing page → User can login**

---

## Why This Fixes Production

| Before | After |
|--------|-------|
| 401 → Auto-redirect to `/login` → Component unmounts → State update fails → Loading stuck | 401 → Error caught → `setIsLoading(false)` in finally → Shows landing page ✅ |
| Works locally (user authenticated) | Works locally AND production (user not authenticated) ✅ |
| Network error → Loading stuck | Network error → `setIsLoading(false)` in finally ✅ |

---

## CRITICAL: Configure VITE_API_URL on Vercel

Your app still needs to know where the backend is. **This is separate from the 401 fix.**

### Action Required:

1. **Vercel Dashboard** → Your Project
2. **Settings → Environment Variables**
3. **Add:**
   ```
   Name:   VITE_API_URL
   Value:  https://codelens-render-xxxx.onrender.com
   (or whatever your Render backend URL is)
   ```
4. **Redeploy**

If VITE_API_URL is not set in production:
- App falls back to `/api` (relative path)
- Frontend tries to call `https://codelens.vercel.app/api/auth/me` (404)
- This manifests as network error → loading stuck

---

## Testing Checklist

### Local Testing:
```bash
cd frontend
npm run build
npm run preview  # http://localhost:4173
```

Then:
- [ ] Opens without loading spinner stuck
- [ ] Shows landing page (unauthenticated)
- [ ] Console shows no React warnings
- [ ] No network errors in DevTools

### Production Testing (After Redeploy):

1. **Open DevTools (F12)**
2. **Network tab** → Look for `/api/auth/me`
   - [ ] Request goes to your backend URL (from VITE_API_URL)
   - [ ] Response is 401 (expected if not logged in)
   - [ ] No network error
3. **Console tab**
   - [ ] Should see: `[axiosInstance] Using API base URL: https://...`
   - [ ] Should see: `[AuthContext] Initial user refresh complete: not authenticated`
   - [ ] No React warnings
4. **Page renders**
   - [ ] Landing page shows (not stuck on spinner)
   - [ ] Can click "Sign In" button
   - [ ] Can log in successfully

---

## Files Modified

1. **`frontend/src/utils/axiosInstance.js`** (Critical Fix)
   - Removed auto-redirect on 401
   - Better error logging
   - Respects 401 as valid response

2. **Other files** (Already Fixed in Previous Pass)
   - `frontend/src/context/AuthContext.jsx` - Proper try/catch/finally
   - `frontend/src/utils/apiBaseUrl.js` - Environment variable support
   - `frontend/.env` - Development default
   - `frontend/vercel.json` - Production build config

---

## Debug Commands

**Check if backend is reachable from production:**
```bash
# From browser console on Vercel deployment:
fetch('https://your-backend.onrender.com/api/auth/me', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.catch(e => console.error('Error:', e))
```

**Expected:**
- 401 response = backend is reachable, user not authenticated ✅
- Network error = backend not reachable ❌
- 200 response = user authenticated ✅

---

## Environment Variable Reference

| Variable | Local | Vercel Prod |
|----------|-------|------------|
| `VITE_API_URL` | `http://localhost:5000` | Set in Environment Variables |
| `NODE_ENV` | `development` | `production` (auto-set) |
| Credentials | Sent with `withCredentials: true` | Sent with `withCredentials: true` |

---

## What NOT to Do

❌ Don't remove `withCredentials: true` from axios config  
❌ Don't add auto-redirect in the interceptor  
❌ Don't ignore 401 errors (they're valid)  
❌ Don't forget to set VITE_API_URL on Vercel  

---

## Deployment Steps

1. Push changes:
   ```bash
   git add .
   git commit -m "fix: Handle 401 properly without auto-redirect"
   git push
   ```

2. Vercel auto-deploys (or manually redeploy)

3. Set VITE_API_URL in Vercel Environment Variables

4. Redeploy again

5. Test in production

---

## Still Stuck on Loading Spinner?

1. **Check Network Tab (DevTools F12 → Network)**
   - Is `/api/auth/me` request made?
   - What's the response status? (should be 401 or 200)
   - What's the response URL? (should match VITE_API_URL)

2. **Check Console**
   - Look for `[axiosInstance] Using API base URL: ...`
   - Should show your backend URL, NOT `/api`

3. **Verify Vercel Settings**
   - Dashboard → Settings → Environment Variables
   - `VITE_API_URL` is set
   - Redeploy after setting it

4. **Check Backend**
   - Is Render backend actually running?
   - Test manually: `curl https://your-backend.onrender.com/api/auth/me`
   - Is CORS configured to allow Vercel domain?

5. **Backend CORS Configuration**
   ```javascript
   // Must allow Vercel domain
   app.use(cors({
     origin: ['https://codelens.vercel.app'],
     credentials: true
   }));
   ```
