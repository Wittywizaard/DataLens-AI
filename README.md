# DataLens AI 📊

> Transform any Excel or CSV file into visual insights using plain English — powered by Google Gemini AI.

An open-source alternative to Power BI for mid-sized businesses and startups. Upload a spreadsheet, describe what you want to see, and get charts instantly — no formulas, no BI expertise required.

---

## ✨ Features

- **🗣️ Natural Language Queries** — Ask anything: "Show me a pie chart of expenses by category"
- **🤖 Auto Chart Selection** — AI automatically picks the right chart type (bar, line, pie, doughnut, scatter)
- **📊 Column Intelligence** — Auto-detects numeric, categorical, and date columns
- **💡 Key Insight Cards** — Auto-extracted KPIs (totals, averages, counts, trends)
- **🔄 Multi-turn Conversation** — Follow up: "Now filter to only Q1", "Show as a line chart instead"
- **👀 Data Preview + Column Stats** — See your data before asking questions
- **📥 Download Charts** — Export any chart as PNG image
- **🔒 Secure by Default** — Files deleted from memory after 1 hour; never sent to third parties
- **📱 Responsive Design** — Works on desktop and mobile devices

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/yourusername/datalens-ai.git
cd datalens-ai
npm run install:all
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env  # or create .env manually
```

Edit `backend/.env`:
```env
# Google Gemini API Key
# Get yours at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key-here

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Run the Application

```bash
# From the root directory — starts both frontend and backend
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, Vite | Modern UI framework with fast development server |
| **Backend** | Node.js, Express | REST API server with file handling |
| **AI Engine** | Google Gemini 1.5 Flash | Natural language processing and chart generation |
| **File Parsing** | PapaParse (CSV), SheetJS (Excel) | Robust spreadsheet parsing |
| **Charts** | Chart.js, react-chartjs-2 | Interactive data visualizations |
| **File Upload** | react-dropzone | Drag-and-drop file interface |
| **HTTP Client** | Axios | API communication |
| **Security** | Helmet, CORS, Rate Limiting | Production-ready security |
| **Development** | Nodemon, Concurrently | Hot reloading and parallel execution |

---

## 📁 Project Structure

```
datalens-ai/
├── backend/                 # Node.js Express API server
│   ├── routes/
│   │   ├── analyze.js      # AI analysis endpoint
│   │   ├── upload.js       # File upload handling
│   │   └── files.js        # File management
│   ├── utils/
│   │   └── dataStore.js    # In-memory data storage
│   ├── uploads/            # Temporary file storage
│   ├── .env               # Environment variables
│   ├── package.json       # Backend dependencies
│   └── server.js          # Main server file
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.jsx        # Main application component
│   │   ├── api.js         # API client functions
│   │   ├── useAnalysis.js # Analysis hook
│   │   └── index.css      # Global styles
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite configuration
├── docker-compose.yml     # Docker orchestration
├── Dockerfile            # Backend containerization
└── package.json          # Root scripts and dependencies
```

---

## 🔧 API Endpoints

### File Upload
```http
POST /api/upload
Content-Type: multipart/form-data

# Upload CSV or Excel file
# Returns: { fileId: "uuid", columns: [...], preview: [...] }
```

### Data Analysis
```http
POST /api/analyze
Content-Type: application/json

{
  "fileId": "uuid",
  "query": "Show sales by region as a bar chart",
  "conversationHistory": [...] // Optional: previous messages
}

# Returns: { insights: [...], chartConfig: {...}, message: "..." }
```

### File Management
```http
DELETE /api/files/:fileId
# Delete uploaded file and associated data
```

---

## 🐳 Deployment Options

### Option A: Docker Compose (Recommended)

```bash
# Set your API key
export GEMINI_API_KEY=your-api-key-here

# Run with Docker
docker-compose up -d
```

### Option B: Railway (Easy Cloud Deployment)

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variable: `GEMINI_API_KEY=your-key-here`
5. Railway auto-detects Node.js and deploys

For the frontend, create a second Railway service:
- **Root Directory**: `/frontend`
- **Build Command**: `npm run build`
- **Start Command**: `npx serve dist`
- **Environment Variable**: `VITE_API_URL=https://your-backend-railway-url`

### Option C: Manual Deployment

**Backend:**
```bash
cd backend
npm install --production
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm run build
# Serve the 'dist' folder with any static server
```

---

## 🔒 Security & Privacy

- **File Handling**: Files are stored temporarily (1 hour) and automatically deleted
- **API Keys**: Never exposed to frontend; all AI processing happens server-side
- **Rate Limiting**: 100 requests per 15 minutes, 20 analysis requests per minute
- **CORS**: Configured for specific frontend origins
- **Data Processing**: All analysis happens in-memory; no persistent storage of user data

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Setup

```bash
# Install all dependencies
npm run install:all

# Run in development mode
npm run dev

# Run tests (when available)
npm test

# Build for production
npm run build
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini AI** for powering the natural language processing
- **Chart.js** for beautiful, interactive charts
- **React** ecosystem for the modern frontend framework
- **Open source community** for the amazing tools and libraries

---

## 📞 Support

If you find this project helpful, please:
- ⭐ Star the repository
- 🐛 Report bugs via GitHub Issues
- 💡 Suggest features or improvements
- 🤝 Contribute code or documentation

Happy analyzing! 📊✨

**Backend:**
1. New Web Service → Connect GitHub repo
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add env vars: `ANTHROPIC_API_KEY`, `NODE_ENV=production`, `FRONTEND_URL=https://your-frontend.onrender.com`

**Frontend:**
1. New Static Site → Connect same repo
2. Root directory: `frontend`
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Add env var: `VITE_API_URL=https://your-backend.onrender.com`

---

### Option C: Vercel (Frontend) + Railway (Backend)

**Backend on Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
railway variables set ANTHROPIC_API_KEY=sk-ant-...
```

**Frontend on Vercel:**
```bash
cd frontend
npm install -g vercel
vercel
# Set VITE_API_URL to your Railway backend URL when prompted
```

---

### Option D: Docker

```bash
# Copy and fill in your key
cp backend/.env.example backend/.env
# Edit backend/.env with your ANTHROPIC_API_KEY

# Run with docker-compose
docker-compose up --build
```

Access at http://localhost:5173

---

### Option E: VPS / Self-hosted (Ubuntu)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and install
git clone https://github.com/yourname/datalens-ai.git
cd datalens-ai
npm run install:all

# Set up environment
cd backend && cp .env.example .env
nano .env   # Add your ANTHROPIC_API_KEY and set NODE_ENV=production

# Build frontend
cd ../frontend && npm run build

# Run backend (serves frontend in production)
cd ..
cp -r frontend/dist backend/public
NODE_ENV=production node backend/server.js

# Or use PM2 for process management
npm install -g pm2
pm2 start backend/server.js --name datalens-ai
pm2 save && pm2 startup
```

Set up Nginx as a reverse proxy:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 30M;
    }
}
```

---

## Production Checklist

- [ ] `ANTHROPIC_API_KEY` is set
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL` set to your actual frontend domain (for CORS)
- [ ] `VITE_API_URL` set to your backend URL (if frontend is on a different domain)
- [ ] HTTPS enabled (Render/Railway/Vercel do this automatically)
- [ ] File size limit reviewed (`multer` is set to 25MB — adjust in `backend/routes/upload.js`)

---

## Project Structure

```
datalens-ai/
├── backend/
│   ├── routes/
│   │   ├── upload.js       # File ingestion & parsing
│   │   ├── analyze.js      # Claude AI analysis
│   │   └── files.js        # File metadata & deletion
│   ├── utils/
│   │   └── dataStore.js    # In-memory session store
│   ├── server.js           # Express app entry
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── UploadZone.jsx
│   │   │   ├── FilePanel.jsx
│   │   │   ├── ChatPanel.jsx
│   │   │   └── MessageBubble.jsx
│   │   ├── hooks/
│   │   │   └── useAnalysis.js
│   │   ├── pages/
│   │   │   └── Home.jsx
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
│
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## Customization

### Change the AI model
In `backend/routes/analyze.js`, change:
```js
model: "claude-sonnet-4-20250514",
```
Options: `claude-opus-4-20250514` (smarter, slower), `claude-haiku-4-5-20251001` (faster, cheaper)

### Increase file size limit
In `backend/routes/upload.js`:
```js
limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
```

### Add Redis for production sessions
Replace `backend/utils/dataStore.js` with:
```js
const Redis = require('ioredis');
const client = new Redis(process.env.REDIS_URL);

module.exports = {
  async set(key, value) { await client.setex(key, 3600, JSON.stringify(value)); },
  async get(key) { const v = await client.get(key); return v ? JSON.parse(v) : null; },
  async delete(key) { await client.del(key); },
};
```
And update routes to `await dataStore.get(...)`.

### Adjust rate limits
In `backend/server.js`:
```js
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }); // increase from 100
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | — | Your Anthropic API key |
| `PORT` | | `3001` | Server port |
| `NODE_ENV` | | `development` | `development` or `production` |
| `FRONTEND_URL` | | `http://localhost:5173` | Frontend URL (for CORS) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Only if separate deployment | Backend URL, e.g. `https://api.yourdomain.com` |

---

## License

MIT — free to use, modify, and deploy.

---

## Credits

Built with [Claude AI](https://anthropic.com) · [Chart.js](https://chartjs.org) · [React](https://react.dev)
