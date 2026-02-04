// server/routes/maps.js
const express = require('express');
const axios = require("axios");
const router = express.Router();

async function callLocalLLM(prompt) {
  const extractPrompt = `
  You are a travel and food assistant.
  User said: "${prompt}"
  
  Return ONLY valid JSON (no explanation, no markdown, no text outside JSON).
  The JSON must contain:
  {
    "query": "<search phrase for Google Maps>",
    "type": "<category such as restaurant, hotel, cafe, park, etc.>",
    "location": "<city or area name if mentioned, else empty>"
  }
  
  Examples:
  Input: "Where can I eat cheap sushi in Bandung?"
  Output: {"query": "cheap sushi near Bandung", "type": "restaurant", "location": "Bandung"}
  
  Input: "Find me a coffee shop in Jakarta"
  Output: {"query": "coffee shop near Jakarta", "type": "cafe", "location": "Jakarta"}
  
  Now process this: "${prompt}"`;

  try {
    const extractRes = await axios.post(process.env.LLM_URL,
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You extract clean Google Maps search JSON (query, type, location). Always return pure JSON only.",
          },
          { role: "user", content: extractPrompt },
        ],
        temperature: 0.2,
        max_tokens: 200,
        stream: false,
      },
      {
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 20000,
        validateStatus: (status) => status < 500,
      }
    );

    let raw = extractRes.data?.choices?.[0]?.message?.content?.trim() || "";
    console.log("LLM raw response:", raw);

    // Only JSON (remove markdown, more text)
    let cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/^.*?(\{[\s\S]*\}).*$/s, "$1")
      .trim();

    let parsed;

    // Parse JSON
    try {
    parsed = JSON.parse(cleaned);
    } catch (err) {
      console.warn(
        "⚠️ LLM output invalid JSON, trying regex recovery:",
        err.message
      );
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = null;
        }
      }
    }

    // If fail, fallback total
    if (!parsed || typeof parsed !== "object") {
      console.warn("⚠️ Final fallback: returning default query");
      parsed = { query: prompt, type: "restaurant", location: "" };
    }

    // Make sure as formatted
    return {
      query: parsed.query?.trim() || prompt,
      type: parsed.type?.trim() || "restaurant",
      location: parsed.location?.trim() || "",
    };
  } catch (err) {
    console.error("Error calling local LLM:", err.message);
    return { query: prompt, type: "restaurant", location: "" };
  }
}

router.post("/search", async (req, res) => {
    try {
      const { prompt, lat, lng } = req.body;
      if (!prompt) return res.status(400).json({ error: "prompt required" });
  
      const llmResult = await callLocalLLM(prompt);
      const query = llmResult.query || prompt;
  
      let placeUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query
      )}&key=${process.env.GOOGLE_SERVER_KEY}`;
      if (lat && lng) placeUrl += `&location=${lat},${lng}&radius=5000`;
  
      const placesResp = await fetch(placeUrl);
      const placesJson = await placesResp.json();
  
      // Get first result
      const first = placesJson.results?.[0];
      let mapEmbedUrl = null;
      let mapLinkUrl = null;
  
      if (first && first.geometry) {
        const { lat, lng } = first.geometry.location;
        mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.GOOGLE_SERVER_KEY}&q=${encodeURIComponent(first.name)}&center=${lat},${lng}&zoom=15`;
        mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(first.name)}&query_place_id=${first.place_id}`;
      }
  
      return res.json({
        sourceQuery: query,
        rawLLM: llmResult,
        mapEmbedUrl,
        mapLinkUrl,
        topResult: first ? {
          name: first.name,
          address: first.formatted_address,
          rating: first.rating,
        } : null,
        allResults: placesJson.results || [],
        status: placesJson.status,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});
  
router.get('/place/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${process.env.GOOGLE_SERVER_KEY}`;
    const p = await fetch(url);
    const j = await p.json();
    return res.json(j);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
