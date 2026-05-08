# GitHub Secrets Setup Guide

For CI/CD deployment to work, you need to add these secrets to your GitHub repository.

## 📋 How to Add Secrets

1. Go to: https://github.com/Wittywizaard/DataLens-AI/settings/secrets/actions
2. Click **New repository secret**
3. Add each secret below

---

## 🔑 Required Secrets

### 1. VERCEL_TOKEN (Frontend Deployment)

**How to get it:**
1. Go to https://vercel.com/account/tokens
2. Click **Create**
3. Name it: `GitHub CI/CD`
4. Copy the token

**Add as secret:**
- Name: `VERCEL_TOKEN`
- Value: (paste token from above)

---

### 2. VERCEL_ORG_ID (Optional but recommended)

**How to get it:**
1. Go to https://vercel.com/dashboard
2. Click your team/account name in top-left
3. Find your Team ID in the URL or settings

**Add as secret:**
- Name: `VERCEL_ORG_ID`
- Value: (your team/org ID)

---

### 3. VERCEL_PROJECT_ID (Optional but recommended)

**How to get it:**
1. Go to https://vercel.com/dashboard/projects
2. Click your DataLens-AI project
3. Go to **Settings** → **General**
4. Copy **Project ID**

**Add as secret:**
- Name: `VERCEL_PROJECT_ID`
- Value: (your project ID)

---

### 4. RENDER_DEPLOY_HOOK (Backend Deployment)

**How to get it:**
1. Go to https://dashboard.render.com
2. Select your DataLens-AI backend service
3. Go to **Settings** → **Deploy Hooks**
4. Copy the webhook URL

**Add as secret:**
- Name: `RENDER_DEPLOY_HOOK`
- Value: (webhook URL)

---

## ✅ Verification Checklist

After adding secrets, verify they're set:
```bash
# In GitHub repo Settings → Secrets and variables → Actions
# You should see:
- VERCEL_TOKEN ✓
- VERCEL_ORG_ID ✓ (optional)
- VERCEL_PROJECT_ID ✓ (optional)
- RENDER_DEPLOY_HOOK ✓
```

---

## 🚀 Testing Deployment

After adding secrets:

1. **Push to main** with a small change:
   ```bash
   echo "# test" >> README.md
   git add README.md
   git commit -m "test: trigger CI/CD"
   git push origin main
   ```

2. **Check GitHub Actions**
   - Go to repo → **Actions** tab
   - Watch for green ✓ checkmarks (success) or red ✗ (failure)

3. **If Frontend Deploy Fails**
   - Check build logs in GitHub Actions
   - Verify VERCEL_TOKEN is correct
   - Ensure VERCEL_ORG_ID and VERCEL_PROJECT_ID are added

4. **If Backend Deploy Fails**
   - Verify RENDER_DEPLOY_HOOK is correct
   - Check it's not expired

---

## 🔧 Troubleshooting

### Frontend fails: "Command not found: vercel"
- Solution: VERCEL_TOKEN or CLI install failed
- Try: Ensure VERCEL_TOKEN is set in GitHub Secrets

### Frontend fails: "Unauthorized"
- Solution: Invalid VERCEL_TOKEN
- Try: Generate new token from https://vercel.com/account/tokens

### Backend fails: "Webhook not found" (404)
- Solution: RENDER_DEPLOY_HOOK is invalid or expired
- Try: Get new webhook from Render dashboard

---

## 📝 Notes

- **VERCEL_TOKEN** is required for frontend deployment
- **VERCEL_ORG_ID** and **VERCEL_PROJECT_ID** are optional but help avoid ambiguity
- **RENDER_DEPLOY_HOOK** is required for backend deployment
- All secrets are encrypted and hidden from logs

---

## 🎯 Expected Workflow After Setup

1. **Push code to main**
   ↓
2. **GitHub Actions triggered**
   ↓
3. **Frontend deploy** (if frontend/ changes)
   - Installs dependencies
   - Builds with Vite
   - Deploys to Vercel
   ↓
4. **Backend deploy** (if backend/ changes)
   - Triggers Render webhook
   - Render pulls latest code
   - Rebuild and deploy
   ↓
5. **Both live** at:
   - Frontend: https://your-vercel-url.vercel.app
   - Backend: https://your-render-url.onrender.com

