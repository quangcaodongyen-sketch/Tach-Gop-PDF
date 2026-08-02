import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route for Gemini AI assistance (e.g., table structure analysis, text layout preservation, or OCR)
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const userApiKey = (req.headers["x-gemini-key"] as string) || process.env.GEMINI_API_KEY;
      
      if (!userApiKey) {
        return res.status(400).json({ error: "Chưa cấu hình API Key Gemini." });
      }

      const ai = new GoogleGenAI({
        apiKey: userApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const { prompt, imageBase64, mimeType } = req.body;

      const contentsParts: any[] = [];
      if (prompt) {
        contentsParts.push({ text: prompt });
      }
      if (imageBase64) {
        contentsParts.push({
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || "image/jpeg",
          },
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts: contentsParts },
      });

      return res.json({ text: response.text });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      return res.status(500).json({ error: err.message || "Lỗi xử lý AI" });
    }
  });

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "PDF Pro" });
  });

  // Vite middleware for development vs static build in production
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
