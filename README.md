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
| **Languages** | JavaScript, HTML, CSS | Full-stack application languages |
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

### Recommended Free Backend Hosts

- **Fly.io** — Best long-term free option for a Dockerized Node backend. It supports your existing `backend/Dockerfile` and can stay running without forced sleep.
- **Render** — Easy setup for Node apps, free for small services. Great if you want a simple web service deployment without refactoring.
- **Vercel** — Best for frontend hosting. You can also use Vercel serverless functions if you rewrite the backend API into Vercel routes, but that is more work.

> Note: Hosting can often be free, but Gemini API usage still incurs cost based on your Google account.

### Option A: Fly.io (Recommended Free Backend)

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. From the `backend/` folder:

```bash
cd backend
fly launch --name datalens-ai-backend --region iad --dockerfile Dockerfile
```

4. Set secrets:

```bash
fly secrets set GEMINI_API_KEY=your-gemini-api-key
fly secrets set FRONTEND_URL=https://your-frontend.vercel.app
```

5. Deploy:

```bash
fly deploy
```

### Option B: Render (Easy Free Backend)

1. Create a Render account and connect your GitHub repo.
2. Create a new **Web Service**.
3. Set the root directory to `backend`.
4. Use `Dockerfile` as the deploy method.
5. Set environment variables:
   - `GEMINI_API_KEY`
   - `FRONTEND_URL=https://your-frontend.vercel.app`
6. Deploy.

### Option C: Vercel (Frontend Hosting)

Your frontend can be deployed directly from the `frontend/` folder.

1. Create a Vercel account and connect your GitHub repo.
2. Create a new project and select the `frontend` folder as the root.
3. Set the build command:

```bash
npm run build
```

4. Set the output directory:

```text
dist
```

5. Add environment variable:
   - `VITE_API_URL=https://your-backend-domain.com`

6. Deploy.

You can use the included `frontend/vercel.json` file to help Vercel detect the static build.

### Option D: Local Docker Compose

If you just want local testing, use:

```bash
export GEMINI_API_KEY=your-api-key-here
docker-compose up -d
```

---

## 🚀 Deployment Files Included

- `frontend/vercel.json` — helps Vercel deploy the frontend from the `frontend/` folder.
- `backend/fly.toml` — configuration file for deploying the backend to Fly.io.

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
