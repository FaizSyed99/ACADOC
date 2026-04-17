# 🏥 AcaDoc AI - Medical Education POC

A grounded, curriculum-aligned medical AI system designed for MBBS students, PG aspirants, and interns. Unlike general-purpose chatbots, **AcaDoc AI** prioritizes factual accuracy over generative fluency, enforcing a strict grounding pipeline where every output is derived from verified textbook sources.

## 🚀 The Vision: Near-Zero Hallucination
Medical education is not an exploratory domain where "approximate" answers are acceptable. AcaDoc AI uses a **specialized 3-agent LangGraph architecture** to ensure every response is:
1.  **Retrieved** from authoritative medical textbooks.
2.  **Validated** for context sufficiency before any generation begins.
3.  **Generated** using deterministic models (Temp=0.0) with mandatory page-level citations.

---

## 🏗️ Architecture (Hybrid POC)
This repository is configured as a **Hybrid Next.js + FastAPI** application, optimized for seamless deployment to **Vercel**.

-   **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide Icons.
-   **Backend**: FastAPI, LangGraph, ChromaDB.
-   **LLM**: Ollama (local/hosted) or MedGemma for clinical reasoning.

---

## 🛠️ Quick Start (Local Development)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com/) (running with `medgemma` or `llama3`)

### 2. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install Python dependencies
pip install -r requirements.txt

# Run the API
uvicorn api.index:app --reload
```

### 3. Frontend Setup
```bash
# Install Node dependencies
npm install

# Run the Next.js development server
npm run dev
```

### 4. Environment Configuration
Create a `.env` file in the root based on `.env.example`:
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=medgemma
OLLAMA_API_KEY=your_key_here (if applicable)
```

---

## 📦 Deployment to Vercel
The project is "push-to-deploy" ready for Vercel.

1.  Push your code to a GitHub repository.
2.  Import the project to **Vercel**.
3.  Add your `OLLAMA_API_KEY` (or OpenAI fallback) to the Vercel Environment Variables.
4.  Vercel will automatically handle the Next.js build and the Python API routing.

---

## 📚 Technical Pipeline
`[User Question]` → `RETRIEVE (Textbook Chunks)` → `VALIDATE (Sufficiency Agent)` → `GENERATE (Grounded Response)` → `[Answer + Citations]`

- **Validation Layer**: If the retrieved context is insufficient, the system halts and informs the student rather than providing a guess.
- **Traceability**: Every answer includes the specific textbook filename and page number.

---

## ⚖️ Disclaimer
AcaDoc AI is an educational tool. All answers should be verified against the source textbooks for clinical practice.