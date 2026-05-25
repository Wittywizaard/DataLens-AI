# DataLens AI 📊✨

> **Spreadsheets, Meet Intelligence.**  
> Turn messy Excel and CSV data into stunning, business-ready visualizations and deep insights instantly—no Power BI or complex data science required.

DataLens AI is a premium, agentic AI platform designed for mid-scale businesses and startups. It bridges the gap between basic spreadsheets and expensive BI tools, giving everyone the power to "chat" with their data.

---

## 💎 Premium Design System
The latest version features an elevated luxury aesthetic:
- **Playfair Display Typography**: Classy, editorial-grade headers.
- **5 Dynamic Themes**: Seamlessly switch between *Midnight Gold*, *Ocean Blue*, *Emerald Green*, *Cyberpunk Neon*, and *Pastel Dream*. Every chart, bar, and stat card automatically recolors to match your chosen aesthetic.
- **Glassmorphism UI**: Semi-transparent containers with backdrop blurs for a modern, state-of-the-art feel.

---

## ✨ Key Features

- 🧠 **Agentic AI Intelligence**: Powered by **Groq (Llama 3 70B)** for blazing-fast, multi-turn reasoning and precise analysis.
- 📂 **Multi-File Merging**: Upload up to 10 Excel/CSV files simultaneously! The backend engine instantly merges them, adding a "Source File" tracker so the AI can run comparative analytics across different datasets.
- 💬 **Natural Language Queries**: Simply ask "Compare Q1 and Q2 sales" and watch the magic happen.
- 📊 **Automatic Visualization**: The AI intelligently selects the best chart type (Bar, Line, Pie, etc.) for your specific query.
- 🖨️ **Professional Exports**: Download your full analysis (including high-resolution `<canvas>` chart snapshots) as a perfectly formatted A4-sized **PDF**, **Microsoft Word (.doc)**, or plain text file. You can even set custom filenames!
- 🔐 **Optional Cloud Storage (MongoDB)**: A fully integrated, JWT-secured authentication system allows users to create accounts to persist their data. Don't want to log in? The app is 100% usable anonymously.
- 🔑 **Bring Your Own Key (BYOK)**: Built-in settings modal allowing power users to plug in their own free Groq API key, bypassing any shared server rate limits for massive data processing.
- 📈 **Vercel Analytics**: Built-in, out-of-the-box support for Vercel Web Analytics to track visitor metrics.

---

## 🚀 Quick Start (Local)

### Prerequisites
- **Node.js** 18+
- **Groq API Key**: Get one at [Groq Console](https://console.groq.com/keys)
- **MongoDB** (Optional, for persistent user accounts)

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
   GROQ_API_KEY=your_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   MONGODB_URI=mongodb://127.0.0.1:27017/datalens # Required for user accounts
   JWT_SECRET=super-secure-secret-key
   ```
   *Note: If you have a Vercel Analytics tracking ID, add `VITE_GA_MEASUREMENT_ID=...` to `frontend/.env`.*

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
│   ├── models/             # Mongoose DB Schemas (User)
│   ├── routes/             # Groq Prompting, File Uploads, & Auth
│   ├── utils/              # Multi-file Spreadsheet Parsing
│   └── uploads/            # Temporary File Processing
├── frontend/               # React (Vite) Visual layer
│   ├── src/components/     # Headers, Auth Modals, Charts
│   └── src/pages/          # Dashboard & Workspace logic
└── package.json            # Unified scripts for the entire stack
```

---

## 🔧 Deployment

### Frontend: Vercel
Optimized for Vercel deployment. Vercel Analytics is already imported. Ensure `VITE_API_URL` environment variable points to your backend.

### Backend: Render / Railway
The backend is containerized and ready for any cloud provider. Ensure you provide the production `MONGODB_URI` string in your cloud environment variables.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Created with ❤️ by the DataLens AI Team.
