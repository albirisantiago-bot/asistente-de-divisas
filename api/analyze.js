const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `Eres un analista senior de mesa institucional de Forex especializado en swing y position trading. Analiza esta noticia y extrae un catalizador estructurado enfocado en cambios estructurales serios: conflictos geopolíticos, crisis económicas, shocks energéticos, divergencias monetarias extremas.

Conecta SIEMPRE la cadena causal completa: evento → commodity/flujo afectado → divisa → par → dirección.

DEBES responder ÚNICAMENTE con un JSON object válido con exactamente estos campos:
- "date": string (fase: "Inminente (Próximas 48h)", "Gestándose (Alerta Roja)", o "En Desarrollo")
- "title": string (título claro del catalizador)
- "type": string (tipo: "Conflicto Geopolítico", "Crisis Económica", "Shock Energético", "Intervención Cambiaria", "Colapso Commodities", "Divergencia Monetaria")
- "icon": string (un emoji representativo)
- "currencyAffected": string (divisa principal afectada, ej: "USD", "EUR", "GBP", "AUD", "JPY")
- "trendCode": string (SOLO uno de: "bullish", "bearish", "warning")
- "magnitudeText": string (ej: "Extrema (Nivel 5/5)", "Alta (Nivel 4/5)")
- "magnitudeVal": number (0-100)
- "primaryPair": string (par principal, ej: "EUR/USD")
- "primaryAction": string (SOLO "BUY" o "SHORT")
- "expectedCataclysm": string (análisis macro DETALLADO: cadena causal completa, por qué genera tendencia estructural)
- "tradeSetup": string (plan swing/position: temporalidades D1/H4, zonas de retroceso, estructura del precio, objetivos)
- "pairsToAnalyze": array de objetos con { "pair": string, "bias": string }`;

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
