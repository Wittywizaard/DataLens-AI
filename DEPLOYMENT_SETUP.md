# Deployment Setup Guide

## 📋 Overview

The CI/CD pipelines are configured but need GitHub Secrets to function. Follow these steps to enable automatic deployment.

---

## 🔷 Step 1: Frontend Deployment (Vercel)

### Prerequisites
- Vercel account (free: https://vercel.com/signup)

### Steps

1. **Go to Vercel Project Settings**
   - Login to https://vercel.com/dashboard
   - Select your DataLens-AI project (or create new)
   - Go to **Settings**

2. **Get Your Project IDs**
   - Copy **Project ID** from Settings page
   - Copy **Team ID** (org) - shown in Settings or Account Settings

3. **Generate Access Token**
   - Go to https://vercel.com/account/tokens
   - Click **Create**
   - Give it a name like "GitHub CI/CD"
   - Copy the token (save securely)

4. **Add GitHub Secrets**
   - Go to your GitHub repo: https://github.com/Wittywizaard/DataLens-AI
   - Click **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret** and add:

   | Secret Name | Value |
   |------------|-------|
   | `VERCEL_TOKEN` | Your token from step 3 |
   | `VERCEL_ORG_ID` | Your Team ID from step 2 |
   | `VERCEL_PROJECT_ID` | Your Project ID from step 2 |

5. **Configure Vercel Project**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables:
     ```
     VITE_API_URL=https://your-render-backend-url.onrender.com
     ```

---

## 🔶 Step 2: Backend Deployment (Render)

### Prerequisites
- Render account (free: https://render.com/register)

### Steps

1. **Connect GitHub to Render**
   - Go to https://dashboard.render.com
   - Click **New +** → **Web Service**
   - Select **Connect a Git Repository**
   - Choose your DataLens-AI repo

2. **Configure Service**
   - **Name**: `datalens-ai-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node.js

3. **Set Environment Variables**
   - Click **Environment** section
   - Add these variables:
     ```
     NODE_ENV=production
     PORT=3001
     GEMINI_API_KEY=AIzaSyAVtbxoCNXsWodPQBOp9Qo4lpYMggRiJyI
     JWT_SECRET=your-secure-random-string-here
     FRONTEND_URL=https://your-vercel-frontend-url.vercel.app
     GEMINI_MODEL=gemini-flash-latest
     ```

4. **Get Deploy Hook**
   - Go to **Settings** → **Deploy Hooks**
   - Click **Create Deploy Hook**
   - Name: `GitHub CI/CD`
   - Copy the webhook URL

5. **Add GitHub Secret**
   - Go to GitHub repo Settings → Secrets
   - Click **New repository secret**
   - Name: `RENDER_DEPLOY_HOOK`
   - Value: The webhook URL from step 4

6. **Deploy**
   - Click **Deploy** button in Render dashboard
   - Wait for build to complete (~2-3 minutes)
   - Copy the production URL (e.g., `https://datalens-ai-backend.onrender.com`)

---

## 📝 Step 3: Update Frontend Configuration

After Render backend is deployed, update the frontend environment:

1. **In Vercel Dashboard**
   - Select your frontend project
   - Go to **Settings** → **Environment Variables**
   - Add/Update:
     ```
     VITE_API_URL=https://datalens-ai-backend.onrender.com
     ```

2. **Redeploy Frontend**
   - Go to **Deployments** → Click latest
   - Click **Redeploy**

---

## 🧪 Step 4: Test Deployment

### Test Frontend
```bash
# Visit your Vercel URL
https://your-project.vercel.app

# You should see the login page
# Test signup and login
```

### Test Backend
```bash
# Test API is reachable
curl https://datalens-ai-backend.onrender.com/api/auth/users

# Should return error about missing token (expected)
# This means the backend is running ✅
```

### Test Full Auth Flow
1. Open your frontend app
2. Click **Sign Up**
3. Create account with email/password
4. Login with credentials
5. Upload a CSV file
6. Ask questions about data
7. Click user icon → Users to see user management

---

## 🔄 How CI/CD Works

After setup, deployments happen automatically:

### Frontend Deployment
- **Trigger**: Push to `main` branch with changes in `frontend/`
- **Action**: Runs `npm run build`, deploys to Vercel
- **Time**: ~2-3 minutes
- **Check**: Go to **Actions** tab to see workflow status

### Backend Deployment  
- **Trigger**: Push to `main` branch with changes in `backend/`
- **Action**: Calls Render webhook to trigger deploy
- **Time**: ~3-5 minutes on Render (watches repo directly)
- **Check**: Go to Render dashboard → Deployments

### Lint & Test
- **Trigger**: Every push to `main`
- **Action**: Checks syntax on frontend & backend
- **Time**: ~1-2 minutes
- **Check**: Go to **Actions** tab

---

## ⚠️ Troubleshooting

### Workflow Still Failing?
1. Go to GitHub repo → **Actions** tab
2. Click the failed workflow
3. Click the failed job to see error logs
4. Common issues:
   - ❌ Missing secrets → Follow Step 1 & 2 above
   - ❌ Wrong directory → Ensure `root` is set in Vercel/Render
   - ❌ Env vars → Check `VITE_API_URL` matches backend URL

### Deployment Stuck on Render?
- Go to Render dashboard → Your service → **Logs**
- Check if build failed
- Common: Missing `GEMINI_API_KEY` in env vars

### Frontend Can't Call Backend?
- Check browser DevTools → Network tab
- Verify `VITE_API_URL` in Vercel env vars
- Verify CORS is enabled in `backend/server.js`

---

## 🚀 Next Steps

1. ✅ Add GitHub Secrets
2. ✅ Deploy backend to Render
3. ✅ Deploy frontend to Vercel
4. ✅ Test auth flow
5. 📊 Monitor deployments in GitHub Actions

**Questions?** Check the README.md for API documentation.

