# 🚨 Vercel Deployment Fix Guide

## ❌ **Current Error: DEPLOYMENT_NOT_FOUND**

This means your Vercel project isn't properly connected or configured. Let's fix it step by step.

---

## ✅ **Step 1: Check Your Vercel Project**

### 1.1 Go to Vercel Dashboard
- Visit: https://vercel.com/dashboard
- Find your DataLens-AI project
- Click on it

### 1.2 Check Current Settings
In your project dashboard, go to **Settings** and verify:

| Setting | Current Value | Should Be |
|---------|---------------|-----------|
| **Framework Preset** | ? | **Vite** |
| **Root Directory** | ? | **frontend** |
| **Build Command** | ? | `npm run build` |
| **Output Directory** | ? | `dist` |

### 1.3 If Settings Are Wrong, Update Them

**In Vercel Dashboard:**
1. Go to **Settings** → **Build & Development**
2. Set:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build --legacy-peer-deps`
   - **Output Directory**: `dist`

---

## ✅ **Step 2: Reconnect GitHub Repository**

### 2.1 Disconnect and Reconnect
1. Go to **Settings** → **Git**
2. Click **Disconnect** (if connected)
3. Click **Connect Git Repository**
4. Search for: `Wittywizaard/DataLens-AI`
5. Select it
6. **Important**: Set **Production Branch** to `main`

### 2.2 Configure Build Settings Again
After reconnecting:
1. Go to **Settings** → **Build & Development**
2. Set **Root Directory** to `frontend`
3. Set **Framework Preset** to **Vite**

---

## ✅ **Step 3: Add Environment Variables**

### 3.1 Add Production Variables
Go to **Settings** → **Environment Variables**

Add these:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_API_URL` | `https://datalens-ai-backend.onrender.com` | Production |
| `VITE_API_URL` | `http://localhost:3001` | Development |

**Note**: Replace with your actual Render backend URL once it's deployed.

---

## ✅ **Step 4: Trigger a New Deployment**

### 4.1 Manual Deploy
1. Go to **Deployments** tab
2. Click **Deploy** button (top right)
3. Wait for build to complete

### 4.2 Or Push a Small Change
```bash
# Make a small change to trigger deployment
cd frontend
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: trigger vercel deployment"
git push origin main
```

---

## ✅ **Step 5: Verify Deployment**

### 5.1 Check Build Logs
- Go to **Deployments** tab
- Click on the latest deployment
- Check **Build Logs** for errors

### 5.2 Common Issues & Fixes

**If you see "Build failed":**
- Check if `npm install` succeeded
- Try adding `--legacy-peer-deps` to build command

**If you see "No build script found":**
- Make sure root directory is set to `frontend`
- Verify `package.json` has `"build": "vite build"`

**If you see "Output directory not found":**
- Make sure output directory is set to `dist`
- Check if Vite is configured correctly

---

## ✅ **Step 6: Test Your Frontend**

Once deployed successfully:

1. **Get your Vercel URL** from the deployment page
2. **Visit the URL** - you should see the login page
3. **Test signup/login** - should work
4. **Test file upload** - should work (once backend is connected)

---

## 🔧 **Alternative: Delete and Recreate Project**

If nothing works, try this nuclear option:

### 6.1 Delete Current Project
1. Go to Vercel Dashboard
2. Click **Settings** → **Advanced**
3. Click **Delete Project**
4. Confirm deletion

### 6.2 Create New Project
1. Click **Add New...** → **Project**
2. Click **Import Git Repository**
3. Search for `Wittywizaard/DataLens-AI`
4. Select it
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build --legacy-peer-deps`
   - **Output Directory**: `dist`

### 6.3 Add Environment Variables
Same as Step 3 above.

---

## 📋 **Quick Checklist**

- [ ] Vercel project connected to GitHub repo
- [ ] Root directory set to `frontend`
- [ ] Framework preset set to **Vite**
- [ ] Build command: `npm run build --legacy-peer-deps`
- [ ] Output directory: `dist`
- [ ] Environment variables added
- [ ] Deployment shows "Ready" status
- [ ] Frontend loads at Vercel URL

---

## 🚀 **Expected Result**

After fixing, you should see:
- ✅ Deployment status: **Ready**
- ✅ Frontend URL: `https://your-project.vercel.app`
- ✅ Login page loads
- ✅ No more DEPLOYMENT_NOT_FOUND errors

---

## 💡 **Pro Tips**

1. **Always check build logs** - they show exactly what's wrong
2. **Use the correct root directory** - `frontend` not the repo root
3. **Framework preset matters** - Vite handles the build correctly
4. **Environment variables** - critical for API calls to work

**Need help with any step?** Let me know what error you're seeing in the build logs!