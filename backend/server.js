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

    let userContent = "";

    if (imageFile) {
      const imageBase64 = imageFile.buffer.toString("base64");
      const imageDataUri = `data:${imageFile.mimetype};base64,${imageBase64}`;
      userContent = `Analyze the aura in this image: ${imageDataUri}. You are a fun, casual aura reader who gives short, humorous, and witty remarks about a person's aura. 

Analyze the input (text or image) and respond ONLY in JSON with two keys:

- "score": a number from -10000 to 10000 (negative means aura minus, positive means aura plus)
- "reason": a short, jokey explanation of the aura that sounds like a playful aura plus/minus moment

Examples of "reason":
- "Aura plus! You’re radiating good vibes like a caffeinated puppy."
- "Aura minus. Looks like your aura forgot to set its alarm today."
- "Major aura plus — your energy just won the cosmic lottery."
- "Aura minus detected: did you spill coffee on your vibe?"

Keep the reason short (under 100 characters), funny, and casual.`;
    } else if (text) {
      userContent = `Analyze the following description: "${text}". You are a fun, casual aura reader who gives short, humorous, and witty remarks about a person's aura. 

Analyze the input (text or image) and respond ONLY in JSON with two keys:

- "score": a number from -10000 to 10000 (negative means aura minus, positive means aura plus)
- "reason": a short, jokey explanation of the aura that sounds like a playful aura plus/minus moment

Examples of "reason":
- "Aura plus! You’re radiating good vibes like a caffeinated puppy."
- "Aura minus. Looks like your aura forgot to set its alarm today."
- "Major aura plus — your energy just won the cosmic lottery."
- "Aura minus detected: did you spill coffee on your vibe?"

Keep the reason short (under 100 characters), funny, and casual.`;
    } else {
      return res.status(400).json({ error: "No text or image provided" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a witty, sarcastic aura reader. Your job is to analyze text or images and provide a score and a funny reason. Always respond in a valid JSON object format: { \"score\": number, \"reason\": string }.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const responseText = completion.choices[0].message.content;

    // Sometimes AI might not return perfectly parseable JSON, so catch errors:
    let parsedJson;
    try {
      parsedJson = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({ error: "Failed to parse AI response." });
    }

    res.json(parsedJson);
  } catch (err) {
    console.error("Error in OpenAI call:", err);
    res
      .status(500)
      .json({ error: "Failed to analyze aura due to an internal error." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
