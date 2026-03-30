import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import AdmZip from "adm-zip";
import { createServer as createViteServer } from "vite";
import { extractTextFromFile } from "./src/services/fileHandler.ts";
import { preprocessText } from "./src/services/preprocessing.ts";
import { extractTfIdfFeatures, getTfIdfVector } from "./src/services/featureExtraction.ts";
import { cosineSimilarity, rankCandidates } from "./src/services/matcher.ts";
import { AiEnhancementService } from "./src/services/aiEnhancement.ts";

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });
const aiService = new AiEnhancementService();

app.use(cors());
app.use(express.json());

// API Routes
app.post("/api/screen", upload.array("cvs"), async (req, res) => {
  try {
    const jdText = req.body.jdText as string;
    const useAi = req.body.useAi === "true";
    const files = req.files as Express.Multer.File[];

    if (!jdText || !files || files.length === 0) {
      return res.status(400).json({ error: "Missing job description or CV files." });
    }

    // 1. Extract text from files (including ZIPs)
    const cvTexts: { fileName: string; text: string }[] = [];
    
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (ext === '.zip') {
        try {
          const zip = new AdmZip(file.buffer);
          const zipEntries = zip.getEntries();
          
          for (const entry of zipEntries) {
            if (entry.isDirectory) continue;
            const entryExt = path.extname(entry.entryName).toLowerCase();
            if (entryExt === '.pdf' || entryExt === '.docx') {
              const text = await extractTextFromFile(entry.getData(), entry.entryName);
              cvTexts.push({ fileName: `${file.originalname} > ${entry.entryName}`, text });
            }
          }
        } catch (err: any) {
          console.error(`Error processing ZIP ${file.originalname}:`, err);
          return res.status(400).json({ error: `Failed to process ZIP "${file.originalname}": ${err.message}` });
        }
      } else if (ext === '.pdf' || ext === '.docx') {
        try {
          const text = await extractTextFromFile(file.buffer, file.originalname);
          cvTexts.push({ fileName: file.originalname, text });
        } catch (err: any) {
          console.error(`Error processing ${file.originalname}:`, err);
          return res.status(400).json({ error: `Failed to process "${file.originalname}": ${err.message}` });
        }
      } else {
        return res.status(400).json({ 
          error: `Unsupported file type: "${file.originalname}". Only .pdf, .docx, and .zip files are accepted.` 
        });
      }
    }

    if (cvTexts.length === 0) {
      return res.status(400).json({ error: "Could not extract text from any provided CVs." });
    }

    // 2. Preprocessing
    const processedJd = preprocessText(jdText);
    const processedCvs = cvTexts.map(cv => preprocessText(cv.text));

    // 3. Feature Extraction (TF-IDF)
    const corpus = [processedJd, ...processedCvs];
    const tfidf = extractTfIdfFeatures(corpus);

    // 4. Matching (Cosine Similarity)
    const jdVector = getTfIdfVector(tfidf, 0);
    const results = [];

    for (let i = 0; i < cvTexts.length; i++) {
      const cvVector = getTfIdfVector(tfidf, i + 1);
      const score = cosineSimilarity(jdVector, cvVector);
      
      let aiData = null;
      if (useAi) {
        aiData = {
          summary: await aiService.summarizeCv(cvTexts[i].text),
          explanation: await aiService.explainMatch(cvTexts[i].text, jdText),
          skills: await aiService.extractSkills(cvTexts[i].text)
        };
      }

      results.push({
        fileName: cvTexts[i].fileName,
        score: score,
        aiData
      });
    }

    // 5. Ranking
    const rankedResults = rankCandidates(results);

    res.json({ results: rankedResults });
  } catch (error) {
    console.error("Screening Error:", error);
    res.status(500).json({ error: "Internal server error during screening." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
