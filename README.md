# EngiMind — AI Engineering Companion 🧠⚙️

> “AI should not replace engineers — it should amplify engineering decisions.”

**EngiMind** is an intelligent assistant and diagnostic companion designed for industrial and mechanical engineers. It bridges the gap between fragmented plant data, telemetry, and actionable engineering intelligence.

---

## ✨ Features

- **Ask EngiMind**: Conversational AI assistant for industrial engineering queries, equipment troubleshooting, root-cause analysis, and multimodal document/image inspection with read-aloud support.
- **AI Fault Diagnosis**: Deep learning diagnostics for industrial plant machinery. Identifies machine faults, evaluates severity levels (Low, Medium, High), and provides corrective actions.
- **Maintenance Logs**: Automated report generation summarizing machine status, critical anomalies, and necessary maintenance actions.
- **Interactive Engineering Dashboard**: Real-time health metrics, insights overview, vibration/temperature alerts, and prioritized recommendations.
- **Zero-Backend Client-Side AI**: Connects on-demand directly to AI models via **OpenRouter** with multi-model automatic fallback across high-availability models (`openrouter/free`, `nvidia/nemotron-3.5-lightning:free`, `google/gemma-4-31b-it:free`).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 8, Lucide React, Recharts
- **AI Integration**: OpenRouter API (Multi-model auto-routing with fallback)
- **Styling**: Modern dark industrial UI with responsive grid and CSS variables
- **Backend (Optional / Standalone)**: FastAPI & Uvicorn in Python with Google GenAI SDK

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Bhuvan-esh/EngiMind.git
cd EngiMind
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

### 3. Configure API Key
Create a `.env` file inside `frontend/` (or click the **"Set API Key"** button directly in the UI):
```env
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
```
*(Get a free API key with zero credit card required at [openrouter.ai/keys](https://openrouter.ai/keys))*

### 4. Run the Application
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

---

## 📂 Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main application UI & views
│   │   ├── openRouterApi.js     # Universal OpenRouter AI client with auto-fallback
│   │   ├── geminiApi.js         # Direct Gemini client
│   │   ├── index.css            # Industrial theme styling
│   │   └── main.jsx             # React entry point
│   ├── public/                  # Static assets & icons
│   └── package.json
├── backend/                     # Optional FastAPI server
│   ├── main.py                  # Endpoints for diagnosis, logs, and multimodal analysis
│   └── .env.example
├── UI.png                       # Dashboard preview
├── DEMO.png                     # Demo screenshot
└── README.md
```

---

## 📄 License
MIT License
