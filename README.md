# AcaDoc AI - Proof of Concept

Medical education assistant with near-zero hallucination tolerance through 3-agent LangGraph pipeline.

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Place a PDF textbook in data/sample_pharma.pdf
mkdir -p data

# 4. Set OpenAI API key
export OPENAI_API_KEY="your-key-here"

# 5. Run the app
cd src
streamlit run app.py
```

## Pipeline Flow

```
[User Question] → RETRIEVE (ChromaDB) → VALIDATE (JSON check) → GENERATE (grounded) → [Answer + Citations]
```

## Guardrails

- Temperature = 0.0 (deterministic)
- Fallback on insufficient context
- Page-level citations required