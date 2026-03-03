const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `Eres un analista experto en Forex institucional. Analiza estas noticias globales recientes. Filtra el ruido diario. Extrae SOLO eventos críticos o 'cataclismos' (magnitudeVal > 75) que puedan generar fuertes tendencias en divisas G8. Si no hay nada crítico que amerite un trade, devuelve un array vacío [].

DEBES responder ÚNICAMENTE con un JSON array válido. Cada objeto del array debe tener exactamente estos campos:
- "title": string (título del catalizador)
- "type": string (tipo de evento, ej: "Política Monetaria", "Geopolítica", "Dato Macro")
- "icon": string (un emoji representativo)
- "currencyAffected": string (divisa principal afectada, ej: "USD", "EUR", "GBP")
- "trendCode": string (SOLO uno de: "bullish", "bearish", "warning")
- "magnitudeText": string (ej: "Alta (Nivel 4/5)")
- "magnitudeVal": number (0-100, SOLO incluir si > 75)
- "primaryPair": string (par principal, ej: "EUR/USD")
- "primaryAction": string (SOLO "BUY" o "SHORT")
- "expectedCataclysm": string (contexto macro detallado y por qué moverá el mercado)
- "tradeSetup": string (plan técnico de entrada detallado)

Si no hay eventos críticos, responde exactamente: []`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured on server" });
  }

  try {
    const { newsTextBatch } = req.body;
    if (!newsTextBatch) {
      return res.status(400).json({ error: "Missing newsTextBatch" });
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
          { role: "user", content: `NOTICIAS RECIENTES DEL MERCADO:\n\n${newsTextBatch}` },
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
    const raw = JSON.parse(data.choices[0].message.content);

    // Groq con json_object a veces envuelve el array en una key, normalizamos
    const result = Array.isArray(raw) ? raw : (raw.catalysts || raw.events || raw.data || raw.results || Object.values(raw)[0]);

    return res.status(200).json(Array.isArray(result) ? result : []);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
