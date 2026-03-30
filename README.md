# TalentScan — Academic HR CV Screener

TalentScan is a full-stack application designed to automate the screening and ranking of academic CVs against specific job descriptions. It uses Natural Language Processing (NLP) and AI to provide objective, data-driven candidate rankings.

## Project Structure

```text
TalentScan/
│
├── src/                     ← React Frontend (UI/UX)
│   ├── components/          ← Reusable UI components
│   ├── services/            ← Core logic (Matching, NLP, AI)
│   └── firebase.ts          ← Firebase Auth & Firestore config
│
├── python_implementation/   ← Standalone Python Reference Implementation
│   ├── main.py              ← Entry point — runs the full pipeline
│   ├── file_handler.py      ← Module 1: Load & extract text from PDF/DOCX
│   ├── preprocessing.py     ← Module 2: NLP cleaning (lowercase, stopwords, lemmatize)
│   ├── feature_extraction.py ← Module 3: TF-IDF vectorization
│   ├── matcher.py           ← Module 4 & 5: Cosine similarity + ranking
│   └── ai_enhancement.py    ← Optional AI features (Gemini)
│
├── server.ts                ← Express Backend (API & File Processing)
├── firebase-blueprint.json  ← Database Structure (Firestore)
├── firestore.rules          ← Security Rules
├── package.json             ← Node.js dependencies
└── requirements.txt         ← Python dependencies
```

## Setup Instructions

### 1. Web Application (Full-Stack)
To run the full interactive web application:

1. **Install Node Dependencies**
   ```bash
   npm install
   ```
2. **Configure Environment**
   Ensure your `GEMINI_API_KEY` is set in your environment variables.
3. **Run the Development Server**
   ```bash
   npm run dev
   ```
4. **Access the App**
   Open `http://localhost:3000` in your browser.

### 2. Python Reference Implementation
To run the standalone Python script for batch processing:

1. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```
2. **Add Your CV Files**
   Create a folder named `cvs/` in the same directory and place all candidate CVs inside it.
3. **Configure and Run**
   Open `python_implementation/main.py` to adjust the job description, then run:
   ```bash
   python python_implementation/main.py
   ```

## System Architecture (Data Flow)

```text
[CV Files (.pdf/.docx/.zip)]    [Job Description (text)]
         │                           │
         ▼                           ▼
  file_handler.ts              server.ts (inline)
  (Text Extraction)
         │                           │
         └──────────┬────────────────┘
                    ▼
            preprocessing.ts
            ┌─────────────────────────────────────┐
            │ 1. Lowercase                        │
            │ 2. Remove punctuation               │
            │ 3. Tokenize                         │
            │ 4. Remove stopwords                 │
            │ 5. Lemmatize                        │
            └─────────────────────────────────────┘
                    │
                    ▼
          feature_extraction.ts
          ┌────────────────────────────────────────┐
          │ TF-IDF Vectorization                   │
          │  - Fit on full corpus (CVs + JD)       │
          │  - Transform each doc into a vector    │
          └────────────────────────────────────────┘
                    │
                    ▼
               matcher.ts
          ┌─────────────────────────────────────────┐
          │ Cosine Similarity(CV_vector, JD_vector)  │
          │ → Score per candidate (0.0 – 1.0)        │
          │ → Sort descending                        │
          │ → Return top N                           │
          └─────────────────────────────────────────┘
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
    Web Dashboard         Firestore History
```

## Sample Console Output (Python Implementation)
```text
============================================================
   TALENTSCAN CV SCREENER — Intelligent Candidate Ranking
============================================================

[STEP 1] Loading CVs from: 'cvs'
  -> Processing: alice_resume.pdf
  -> Processing: bob_cv.docx
  -> Processing: carol_cv.pdf
[INFO] Successfully loaded 3 CV(s).

[STEP 2] Preprocessing CV text...
         Preprocessed 3 CV(s).
[STEP 2] Preprocessing job description...
         Done.

[STEP 3] Building TF-IDF vectors...
[INFO] TF-IDF vectorization complete.

[STEP 4] Computing cosine similarity scores...
         Computed scores for 3 candidate(s).

[STEP 5] Ranking candidates...

=======================================================
  TOP CANDIDATES — CV SCREENING RESULTS
=======================================================
  Rank   Filename                       Match Score
-------------------------------------------------------
  #1     alice_resume.pdf               78.43%
  #2     carol_cv.pdf                   65.12%
  #3     bob_cv.docx                    38.20%
=======================================================

  Best Match : alice_resume.pdf (78.43%)
```

## Technology Choices Explained

| Decision | Choice | Why |
|----------|--------|-----|
| **Frontend** | React + Tailwind | Fast, responsive, and modern UI development. |
| **Backend** | Express (Node.js) | Efficient file handling and API management. |
| **Database** | Firebase Firestore | Real-time history persistence and easy authentication. |
| **Text Extraction** | pdf-parse / mammoth | Reliable extraction for PDF and DOCX formats. |
| **NLP Library** | natural (Node) / nltk (Python) | Industry-standard libraries for text preprocessing. |
| **Vectorization** | TF-IDF | Interpretable and effective for document matching. |
| **Similarity Metric** | Cosine Similarity | Length-invariant, ideal for comparing documents of different sizes. |
| **AI Enhancements** | Google Gemini | Provides deep semantic analysis and candidate summaries. |
