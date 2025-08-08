// backend/server.js
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

app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    const text = req.body.text;
    const imageFile = req.file;

    let userMessages = [];

    // --- FIX 1: Correctly format the message for image uploads ---
    if (imageFile) {
      const imageBase64 = imageFile.buffer.toString("base64");
      userMessages.push({
        type: "image_url",
        image_url: {
          url: `data:${imageFile.mimetype};base64,${imageBase64}`,
        },
      });
      userMessages.push({
        type: "text",
        text: "Analyze the aura in this image. Give a score (-10000 to 10000) and a very funny, creative reason.",
      });
    } else if (text) {
      userMessages.push({
        type: "text",
        text: `Analyze the following description: "${text}". Give an aura score (-10000 to 10000) and a very funny, creative reason.`,
      });
    } else {
      return res.status(400).json({ error: "No text or image provided" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      // --- FIX 2: Enable guaranteed JSON output from the AI ---
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a witty, sarcastic aura reader. Your job is to analyze text or images and provide a score and a funny reason. Always respond in a valid JSON object format: { \"score\": number, \"reason\": string }.",
        },
        {
          role: "user",
          content: userMessages,
        },
      ],
    });

    const responseText = completion.choices[0].message.content;
    const parsedJson = JSON.parse(responseText);

    res.json(parsedJson);
  } catch (err) {
    console.error("Error in OpenAI call:", err);
    res.status(500).json({ error: "Failed to analyze aura due to an internal error." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});