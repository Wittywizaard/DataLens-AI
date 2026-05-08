# DataLens AI 📊

> Transform Excel and CSV data into visual insights using Google Gemini AI.

DataLens AI helps users upload spreadsheets, ask natural language questions, and receive charts and insights instantly.

---

## ✨ Features

- Natural language queries for spreadsheet analysis
- Automatic chart selection based on query and data
- Column intelligence for numeric, categorical, and date data
- Insight cards for totals, averages, counts, and trends
- Multi-turn conversation support for follow-up questions
- Data preview before analysis
- Download charts as PNG images
- Separate React frontend and Express backend

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- Google Gemini API key: https://aistudio.google.com/app/apikey

### Install and Run

```bash
git clone https://github.com/yourusername/datalens-ai.git
cd datalens-ai
npm run install:all
```

Configure backend environment:

```bash
cd backend
cp .env.example .env
```

Update `backend/.env` with your Gemini API key and frontend URL.

Start both services:

```bash
npm run dev
```

Open:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## 🔧 Environment Variables

Copy `backend/.env.example` to `backend/.env` and set values:

```env
GEMINI_API_KEY=your-gemini-api-key-here
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:5173
GEMINI_MODEL=gemini-flash-latest
```

---

## 🧩 Project Structure

```
datalens-ai/
├── backend/                 # Express API backend
│   ├── routes/             # API routes and analysis logic
│   ├── utils/              # helper and storage modules
│   ├── uploads/            # temporary file uploads
│   ├── .env.example        # backend environment sample
│   ├── package.json        # backend dependencies and scripts
│   └── server.js           # Express app entrypoint
├── frontend/               # React SPA
│   ├── src/                # frontend source code
│   ├── package.json        # frontend dependencies and scripts
│   ├── vite.config.js      # Vite configuration
│   └── vercel.json         # Vercel build settings
├── docker-compose.yml      # local Docker orchestration
├── Dockerfile              # backend containerization
├── package.json            # root scripts and dependency management
└── README.md               # project documentation
```

---

## 🔧 Local Commands

```bash
npm run install:all   # install root, backend, and frontend deps
npm run dev           # run frontend and backend concurrently
npm run build         # build the frontend
npm run start         # run the backend only
```

---

## 🚀 Deployment

### Frontend: Vercel

The frontend is configured for Vercel in `frontend/vercel.json`.

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://your-backend-domain.com`

### Backend: Render

The backend deployment workflow triggers a Render webhook after backend changes.

---

## ⚙️ GitHub Actions

Deployment workflows are included:

- `.github/workflows/frontend-deploy.yml`
  - Builds and deploys frontend to Vercel using `vercel/action@v3`
  - Runs Node.js 24 in the workflow
- `.github/workflows/backend-deploy.yml`
  - Triggers Render backend deployment via webhook

### Required GitHub Secrets
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `RENDER_DEPLOY_HOOK`

---

## 📄 License

MIT License.
