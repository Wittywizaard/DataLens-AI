# 🚀 Complete Deployment Fix Guide

This guide will get your Vercel + Render + CI/CD setup working correctly.

---

## 🎯 What's Wrong Right Now?

✗ Vercel project exists but isn't connected to your GitHub repo  
✗ No root directory set (should be `frontend/`)  
✗ No environment variables configured  
✗ Render backend not deployed yet  
✗ GitHub Secrets not added (workflows fail)  

---

## ✅ PART 1: Fix Vercel Frontend (15 minutes)

### Step 1.1: Login to Vercel
1. Go to https://vercel.com/dashboard
2. Login with GitHub (easiest)
3. You'll see your empty project

### Step 1.2: Connect GitHub Repository

**In Vercel Dashboard:**
1. Click your **empty project**
2. Go to **Settings** → **Git**
3. Click **Connect Git Repository**
4. Search for: `Wittywizaard/DataLens-AI`
5. Select it and click **Import**

### Step 1.3: Configure Build Settings

**After importing, you'll see deployment settings:**

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install --legacy-peer-deps` |

✅ Click **Deploy** (should take ~3-5 minutes)

### Step 1.4: Set Environment Variables

**After first deployment:**
1. Go to **Settings** → **Environment Variables**
2. Add this variable:

   | Name | Value | Environments |
   |------|-------|--------------|
   | `VITE_API_URL` | `http://localhost:3001` | Development |
   | `VITE_API_URL` | `https://your-render-backend.onrender.com` | Production |

   *Note: Keep localhost for development, update to Render URL later*

3. Click **Save**

### Step 1.5: Get Secrets for GitHub Actions

You'll need these from Vercel:

1. **Go to Account Settings** (top left avatar → Settings)
2. **Tokens** → Click **Create** → Name it "GitHub CI/CD"
3. Copy the token (save it temporarily) → This is `VERCEL_TOKEN`

4. **Get Project IDs** (back in your project):
   - Go to **Settings** → **General**
   - Copy **Project ID** → This is `VERCEL_PROJECT_ID`
   - Copy **Team ID** (your team/personal) → This is `VERCEL_ORG_ID`

**Save these 3 values:**
```
VERCEL_TOKEN = _______________
VERCEL_ORG_ID = _______________
VERCEL_PROJECT_ID = _______________
```

---

## ✅ PART 2: Deploy Backend to Render (15 minutes)

### Step 2.1: Create Render Account

1. Go to https://render.com/register
2. Signup with GitHub (recommended)

### Step 2.2: Create Backend Service

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Click **Build and deploy from a Git repository**
4. Authorize GitHub
5. Search for: `Wittywizaard/DataLens-AI`
6. Select it

### Step 2.3: Configure Service

**Fill out the form:**

| Setting | Value |
|---------|-------|
| **Name** | `datalens-ai-backend` |
| **Region** | Choose closest (e.g., US/EU) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |

**Important:** Scroll down and toggle **Auto-Deploy** → ON

### Step 2.4: Add Environment Variables

**Still in the form, click "Advanced" → "Add Environment Variable"**

Add these (critical):

```
NODE_ENV=production
PORT=3001
GEMINI_API_KEY=AIzaSyAVtbxoCNXsWodPQBOp9Qo4lpYMggRiJyI
JWT_SECRET=render-prod-secret-key-change-this-asap
FRONTEND_URL=https://your-vercel-url.vercel.app
GEMINI_MODEL=gemini-flash-latest
```

**Wait!** Don't add `FRONTEND_URL` yet - you don't know your Vercel URL yet. Add it after Step 1.6.

### Step 2.5: Deploy

1. Click **Create Web Service**
2. Wait 3-5 minutes for build
3. ✅ When it says "Live", you're good!
4. Copy the URL shown (e.g., `https://datalens-ai-backend.onrender.com`)

### Step 2.6: Get Deploy Hook

1. Go to **Settings** → **Deploy Hooks**
2. Click **Create Deploy Hook**
3. Name: `GitHub CI/CD`
4. Copy the URL → This is `RENDER_DEPLOY_HOOK`

**Save this value:**
```
RENDER_DEPLOY_HOOK = _______________
```

---

## ✅ PART 3: Add GitHub Secrets (5 minutes)

Now you have all the values. Add them to GitHub:

1. Go to https://github.com/Wittywizaard/DataLens-AI
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each:

| Secret Name | Value |
|------------|-------|
| `VERCEL_TOKEN` | From Part 1 Step 1.5 |
| `VERCEL_ORG_ID` | From Part 1 Step 1.5 |
| `VERCEL_PROJECT_ID` | From Part 1 Step 1.5 |
| `RENDER_DEPLOY_HOOK` | From Part 2 Step 2.6 |

✅ All 4 secrets added!

---

## ✅ PART 4: Connect Everything (5 minutes)

### Step 4.1: Get Your Vercel Production URL

1. Go back to Vercel Dashboard → Your project
2. Click **Deployments**
3. Click the green "Ready" deployment
4. Copy the URL (e.g., `https://datalens-ai.vercel.app`)

### Step 4.2: Update Render Environment Variables

1. Go to Render Dashboard → Your backend service
2. Click **Environment** on the left
3. Find `FRONTEND_URL` variable
4. Edit it: paste your Vercel URL from Step 4.1
5. **Save** (triggers redeploy)

### Step 4.3: Update Vercel Environment Variables

1. Go to Vercel Dashboard → Your project
2. Go to **Settings** → **Environment Variables**
3. Find `VITE_API_URL` (Production)
4. Edit it: Set to your Render URL (`https://datalens-ai-backend.onrender.com`)
5. **Save**
6. Go to **Deployments** → **Redeploy** latest

### Step 4.4: Update Local .env Files (for testing locally)

**backend/.env:**
```
GEMINI_API_KEY=AIzaSyAVtbxoCNXsWodPQBOp9Qo4lpYMggRiJyI
JWT_SECRET=dev-secret-key-change-in-production
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
GEMINI_MODEL=gemini-flash-latest
```

**frontend/.env.local:**
```
VITE_API_URL=http://localhost:3001
```

---

## ✅ PART 5: Test Everything (5 minutes)

### Test 1: Backend is Running
```bash
curl https://datalens-ai-backend.onrender.com/api/auth/users
```
Expected: Error about missing token (that's OK - means backend works!)

### Test 2: Frontend Loads
1. Visit https://datalens-ai.vercel.app
2. Should see login page
3. ✅ If you see it, frontend works!

### Test 3: Auth Flow
1. Click **Sign Up**
2. Create account (any email/password)
3. Should redirect to dashboard
4. Upload a CSV file
5. Ask it a question
6. ✅ Should get response with chart

### Test 4: CI/CD Works

**Trigger frontend deployment:**
```bash
cd frontend
# Make any small change, e.g., edit a comment in App.jsx
git add -A
git commit -m "test: trigger deployment"
git push origin main
```

Go to GitHub → **Actions** → Watch it deploy to Vercel!

**Trigger backend deployment:**
```bash
cd backend
# Make any small change, e.g., edit a comment
git add -A
git commit -m "test: trigger deployment"
git push origin main
```

Go to Render → **Deployments** → Watch it redeploy!

---

## 🔧 Troubleshooting

### Frontend Build Fails on Vercel?
- Check **Build Logs** in Vercel deployment
- Common: Missing dependencies
- Fix: Run `npm install --legacy-peer-deps` locally and commit

### Backend Won't Start on Render?
- Check **Logs** in Render dashboard
- Common: Missing `GEMINI_API_KEY` or `JWT_SECRET`
- Fix: Verify all env vars are set

### Frontend Can't Call Backend?
- Open DevTools (F12) → Network tab
- Look for API calls
- Common: Wrong `VITE_API_URL`
- Fix: Check Vercel env vars

### Workflows Still Failing?
- Go to GitHub → **Actions**
- Click failed workflow
- Read the error message
- Common: Missing secrets
- Fix: Verify all 4 secrets are in GitHub Settings

---

## 📋 Quick Checklist

- [ ] Vercel project created and GitHub connected
- [ ] Vercel root directory set to `frontend/`
- [ ] Vercel env var `VITE_API_URL` set
- [ ] Render backend deployed
- [ ] Render env vars set (including `FRONTEND_URL`)
- [ ] 4 GitHub Secrets added
- [ ] Backend responds to API calls
- [ ] Frontend loads at Vercel URL
- [ ] Auth signup/login works
- [ ] File upload and analysis works
- [ ] CI/CD workflows passing (check Actions tab)

---

## 🚀 You're Done When...

✅ Frontend loads at Vercel URL  
✅ Can sign up / login  
✅ Can upload CSV and ask questions  
✅ GitHub Actions shows green checkmarks  
✅ Pushing to main auto-deploys both services  

---

## 💾 Save Your Values

Keep these safe - you'll need them:

```
VERCEL_TOKEN: ___________________________
VERCEL_ORG_ID: ___________________________
VERCEL_PROJECT_ID: ___________________________
RENDER_DEPLOY_HOOK: ___________________________
RENDER_BACKEND_URL: https://datalens-ai-backend.onrender.com
VERCEL_FRONTEND_URL: https://datalens-ai.vercel.app
```

