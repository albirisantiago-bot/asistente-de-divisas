const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `Eres un analista experto en Forex institucional. Lee esta noticia y extrae un catalizador estructurado para position trading.

DEBES responder ÚNICAMENTE con un JSON object válido con exactamente estos campos:
- "title": string (título del catalizador)
- "type": string (tipo de evento, ej: "Política Monetaria", "Geopolítica", "Dato Macro")
- "icon": string (un emoji representativo)
- "currencyAffected": string (divisa principal afectada, ej: "USD", "EUR", "GBP")
- "trendCode": string (SOLO uno de: "bullish", "bearish", "warning")
- "magnitudeText": string (ej: "Alta (Nivel 4/5)")
- "magnitudeVal": number (0-100)
- "primaryPair": string (par principal, ej: "EUR/USD")
- "primaryAction": string (SOLO "BUY" o "SHORT")
- "expectedCataclysm": string (contexto macro detallado y por qué moverá el mercado)
- "tradeSetup": string (plan técnico de entrada detallado)`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured on server" });
  }

  try {
    const { promptText } = req.body;
    if (!promptText) {
      return res.status(400).json({ error: "Missing promptText" });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: promptText },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
