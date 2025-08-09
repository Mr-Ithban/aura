// backend/server.js
import express from "express";
import multer from "multer";
import cors from "cors";
import fetch from "node-fetch"; // Use node-fetch for backend requests

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// This is a placeholder for the Gemini API Key.
// In a production environment, this should be handled securely.
const apiKey = ""; // Per instructions, leave this empty.

app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    const text = req.body.text;
    const imageFile = req.file;

    const prompt = `You are a fun, casual aura reader who gives short, humorous, and witty remarks about a person's aura. Analyze the input and respond ONLY in JSON with two keys:
- "score": a number from -10000 to 10000 (negative means aura minus, positive means aura plus)
- "reason": a short, jokey explanation for the score that sounds like a playful 'aura plus' or 'aura minus' moment.

Examples of "reason":
- "Aura plus! You’re radiating good vibes like a caffeinated puppy."
- "Aura minus. Looks like your aura forgot to set its alarm today."
- "Major aura plus — your energy just won the cosmic lottery."
- "Aura minus detected: did you spill coffee on your vibe?"

Keep the reason short (under 100 characters), funny, and casual.`;

    let parts = [{ text: prompt }];

    if (imageFile) {
      const imageBase64 = imageFile.buffer.toString("base64");
      parts.push({
        inlineData: {
          mimeType: imageFile.mimetype,
          data: imageBase64,
        },
      });
    } else if (text) {
      // Prepend the text to be analyzed to the parts array
      parts.unshift({ text: `Analyze the following description: "${text}".` });
    } else {
      return res.status(400).json({ error: "No text or image provided" });
    }

    const payload = {
      contents: [{ parts: parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "NUMBER" },
            reason: { type: "STRING" },
          },
          required: ["score", "reason"],
        },
      },
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error("Gemini API Error:", errorBody);
        throw new Error(`API call failed with status: ${apiResponse.status}`);
    }

    const result = await apiResponse.json();
    
    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        
        const responseText = result.candidates[0].content.parts[0].text;
        const parsedJson = JSON.parse(responseText);
        res.json(parsedJson);

    } else {
        // Handle cases where the response structure is unexpected
        console.error("Unexpected Gemini API response structure:", result);
        throw new Error("Failed to get a valid response from the AI.");
    }

  } catch (err) {
    console.error("Error in /analyze endpoint:", err);
    res
      .status(500)
      .json({ error: "Failed to analyze aura due to an internal error." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
