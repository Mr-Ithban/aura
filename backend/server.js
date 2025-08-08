import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- NEW ROUTE: /analyze ----------
app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    const text = req.body.text;
    const imageBuffer = req.file?.buffer;

    let prompt;
    if (text) {
      prompt = `Analyze the following description and give an aura score (-10000 to 10000) and a funny reason: "${text}"`;
    } else if (imageBuffer) {
      prompt = `Analyze the aura in this uploaded image and give a score (-10000 to 10000) and a funny reason.`;
    } else {
      return res.status(400).json({ error: "No text or image provided" });
    }

    // Ask AI for JSON response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an aura meter. Reply in JSON: { score: number, reason: string }",
        },
        { role: "user", content: prompt },
      ],
    });

    const responseText = completion.choices[0].message.content;
    const parsed = JSON.parse(responseText);

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to analyze aura" });
  }
});
// -----------------------------------------

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});
