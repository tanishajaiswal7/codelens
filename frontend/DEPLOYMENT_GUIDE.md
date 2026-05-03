# CodeLens Frontend - Vercel Deployment Guide

## CRITICAL FIX: Production Loading Screen Issue

Your app was stuck on the "Loading CodeLens AI..." screen because the frontend couldn't connect to the backend API in production.

### Root Causes (NOW FIXED):
1. ✅ **jobPoller using fetch() instead of axios** - Now uses axiosInstance
2. ✅ **Missing error logging** - Added comprehensive logging to axiosInstance
3. ✅ **Infinite loading state** - Added mount check in AuthContext
4. ✅ **30-second timeout** - Added to prevent hanging requests

### Required Action - Set VITE_API_URL on Vercel

**The main fix requires setting environment variables in Vercel Dashboard:**

#### Step 1: Go to Vercel Project Settings
1. Open your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings → Environment Variables**
3. Add a new environment variable:
   - **Name:** `VITE_API_URL`
   - **Value:** Your backend URL (see examples below)
   - **Environments:** Select "Production" (or "All" if backend is shared)

#### Step 2: Choose Your Backend URL

**Option A: Backend on Vercel**
```
VITE_API_URL=https://backend-production-xxxx.vercel.app
```

**Option B: Backend on separate domain**
```
VITE_API_URL=https://api.codelens.app
```

**Option C: Backend on a custom server/service**
```
VITE_API_URL=https://api.your-backend-provider.com
```

#### Step 3: Redeploy
After setting the environment variable:
```bash
# Option 1: Push to git and Vercel auto-redeploys
git add .
git commit -m "Fix: Add VITE_API_URL configuration"
git push

# Option 2: Or manually redeploy via Vercel Dashboard
# Click "Redeploy" button in Deployments tab
```

### What Was Fixed in Code

#### 1. **jobPoller.js** (CRITICAL)
- Changed from `fetch()` to `axiosInstance`
- Now respects VITE_API_URL environment variable
- Properly handles 404 responses

**Before:**
```javascript
const res = await fetch(`/api/jobs/${jobId}`, { credentials: 'include' })
```

**After:**
```javascript
const response = await axiosInstance.get(`/api/jobs/${jobId}`)
```

#### 2. **axiosInstance.js**
- Added 30-second timeout
- Enhanced error logging with baseURL and status info
- Better error messages for network failures

#### 3. **AuthContext.jsx**
- Added mount check to prevent race conditions
- Better error logging for debugging
- Proper error state handling

#### 4. **apiBaseUrl.js**
- Added warning message when VITE_API_URL is not set in production
- Clear documentation in code comments

#### 5. **vercel.json**
- Added build configuration
- Set output directory to "dist"

### Testing Before Production

**Local Test with Production Env:**
```bash
cd frontend
npm run build
npm run preview  # Test production build locally
```

Visit http://localhost:4173 and verify the app loads without the loading screen.

### Troubleshooting

If the app still shows the loading spinner after deployment:

1. **Check Network Tab (Browser DevTools)**
   - Open DevTools (F12) → Network tab
   - Check if `/api/auth/me` requests are being made
   - Look at the response status and error message

2. **Check Browser Console**
   - Look for errors in the Console tab
   - You should see logs like: `[axiosInstance] Using API base URL: https://...`

3. **Verify Environment Variable**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Confirm `VITE_API_URL` is set
   - Check it's pointing to the correct backend URL

4. **Backend Connectivity**
   - Verify your backend is actually running
   - Test the backend API directly: `curl https://api.your-backend.com/api/auth/me`
   - Verify CORS is enabled on backend (should allow requests from vercel.com domain)

5. **Check Build Logs**
   - Go to Vercel Dashboard → Deployments → Latest → View Build Logs
   - Look for any build-time errors
   - Verify the frontend built successfully

### CORS Configuration on Backend

Your backend must allow requests from Vercel:

```javascript
// Express example
const cors = require('cors');
app.use(cors({
  origin: ['https://codelens.vercel.app', 'https://codelens-staging.vercel.app'],
  credentials: true
}));
```

### Environment Variables Summary

| Variable | Dev Value | Prod Value | Where Set |
|----------|-----------|-----------|-----------|
| `VITE_API_URL` | `http://localhost:5000` | `https://api.codelens.app` | `.env` (dev), Vercel Dashboard (prod) |
| `NODE_ENV` | `development` | `production` | Auto-set by Vercel |

### Production Deployment Checklist

- [ ] Set `VITE_API_URL` in Vercel Environment Variables
- [ ] Backend is deployed and running
- [ ] CORS is configured on backend
- [ ] Redeployed frontend on Vercel
- [ ] Tested in incognito/private window
- [ ] Verified `/api/auth/me` request succeeds in DevTools Network tab
- [ ] App loads and shows dashboard (not stuck on loading screen)
