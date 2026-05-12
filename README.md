# DataLens AI 📊✨

> **Transform Spreadsheets into Intelligence.**  
> Turn messy Excel and CSV data into stunning, business-ready visualizations and deep insights instantly—no Power BI or complex data science required.

DataLens AI is a premium, agentic AI platform designed for mid-scale businesses and startups. It bridges the gap between basic spreadsheets and expensive BI tools, giving everyone the power to "chat" with their data.

---

## 💎 Premium Design: Aurora Gold
The latest version features a luxury **Aurora Gold** aesthetic:
- **High-End Visuals**: Midnight black background with dynamic golden and orange gradients.
- **Glassmorphism UI**: Semi-transparent containers with backdrop blurs for a modern, state-of-the-art feel.
- **Micro-animations**: Smooth transitions and glow effects that make data interaction feel alive.

---

## ✨ Features

- 🧠 **Agentic AI Intelligence**: Powered by **Gemini 2.0 Flash** for multi-turn reasoning and precise analysis.
- 💬 **Natural Language Queries**: Simply ask "What are my top 5 products by margin?" and watch the magic happen.
- 📊 **Automatic Visualization**: The AI intelligently selects the best chart type (Bar, Line, Pie, etc.) for your specific query.
- 📉 **Insight Cards**: Instant summaries of KPIs, totals, averages, and emerging trends.
- 🔓 **Zero Friction**: No sign-up or complex configuration. Upload a file and start analyzing in 5 seconds.
- 💾 **Data Export**: Download your high-resolution charts as PNGs for presentations.
- 🛡️ **Secure & Private**: Temporary session-based storage. Your data never leaves your control.

---

## 🚀 Quick Start (Local)

### Prerequisites
- **Node.js** 18+
- **Google Gemini API Key**: Get one at [AI Studio](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Wittywizaard/DataLens-AI.git
   cd DataLens-AI
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure Environment**
   Create a `.env` file in the `backend/` directory:
   ```env
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-2.0-flash
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   ```

4. **Launch the Engine**
   ```bash
   npm run dev
   ```

Open [http://localhost:5173](http://localhost:5173) to see your data come to life.

---

## 🧩 Project Architecture

```
datalens-ai/
├── backend/                 # Node.js/Express Engine
│   ├── routes/             # Gemini Prompting & Analysis Logic
│   ├── utils/              # Spreadsheet Parsing & Storage
│   └── uploads/            # Temporary File Processing
├── frontend/               # React (Vite) Visual layer
│   ├── src/                # Aurora Gold Design System & Components
│   └── public/             # Static Assets
└── package.json            # Unified scripts for the entire stack
```

---

## 🔧 Deployment

### Frontend: Vercel
Optimized for Vercel deployment. Ensure `VITE_API_URL` environment variable points to your backend.

### Backend: Render / Railway
The backend is containerized and ready for any cloud provider. Use the provided `Dockerfile` or `docker-compose.yml` for orchestration.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Created with ❤️ by the DataLens AI Team.
