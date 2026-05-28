import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for complete book translation and transliteration
  app.post("/api/gemini/enrich-book", async (req, res) => {
    try {
      const { book } = req.body;
      if (!book) {
        return res.status(400).json({ error: "Book data is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const prompt = `Given the following book information, fill in the missing texts. Translate the synopsis to Brazilian Portuguese, transliterate the title to Latin characters, and ensure both Arabic and Latin versions of the author and title are provided. Also provide up to 5 thematic categories or tags in Portuguese based on the synopsis or titles.
      Current Book Data:
      ${JSON.stringify(book, null, 2)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              arabicTitle: { type: Type.STRING, description: "The book title in Arabic script" },
              translatedTitle: { type: Type.STRING, description: "The book title translated to Portuguese" },
              transliteration: { type: Type.STRING, description: "The transliteration of the Arabic title into Latin characters" },
              authorArabic: { type: Type.STRING, description: "The author's name in Arabic script" },
              authorLatin: { type: Type.STRING, description: "The author's name in Latin characters (transliterated or anglicized)" },
              synopsis: { type: Type.STRING, description: "The book synopsis translated to Brazilian Portuguese" },
              categories: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Up to 5 thematic categories/tags in Portuguese" }
            },
            required: ["arabicTitle", "translatedTitle", "transliteration", "authorArabic", "authorLatin", "synopsis", "categories"]
          }
        }
      });

      let parsed = JSON.parse(response.text?.trim() || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to call Gemini API" });
    }
  });

  // API route for extracting catalog text
  app.post("/api/gemini/extract-catalog", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const prompt = `Extract individual book records from the following unstructured catalog text. 
      For each record, extract:
      - title (the main title of the book)
      - author (the author of the book)
      - category (the genre or category, if mentioned)
      - city (city of publication, if mentioned)
      - publisher (the publisher name)
      - year (the year of publication, as an integer)
      - pages (number of pages, as an integer)
      - size (physical size in cm, if mentioned)
      - series (any series information mentioned)
      - originalText (the exact raw text chunk for this record)
      
      Handle missing fields gracefully (leave them empty or null). Here is the text:
      \n\n${text}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                author: { type: Type.STRING },
                category: { type: Type.STRING },
                city: { type: Type.STRING },
                publisher: { type: Type.STRING },
                year: { type: Type.INTEGER },
                pages: { type: Type.INTEGER },
                size: { type: Type.STRING },
                series: { type: Type.STRING },
                originalText: { type: Type.STRING }
              },
              required: ["title", "author", "originalText"]
            }
          }
        }
      });

      let parsed = JSON.parse(response.text?.trim() || "[]");
      res.json({ records: parsed });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to extract catalog data" });
    }
  });

  // API route for correcting search spelling
  app.post("/api/gemini/fix-search-query", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const prompt = `Fix any spelling errors in the following book search query. It may be an author name or a book title, possibly in Arabic, Portuguese or English. Return ONLY a JSON object with one field "correctedQuery" containing the corrected search string. If it is an ISBN or seems perfectly fine, just return it as is. 
      Query: "${query}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              correctedQuery: { type: Type.STRING }
            },
            required: ["correctedQuery"]
          }
        }
      });

      let parsed = JSON.parse(response.text?.trim() || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("Gemini API Error for spelling:", error);
      res.status(500).json({ error: error.message || "Failed to fix spelling" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
