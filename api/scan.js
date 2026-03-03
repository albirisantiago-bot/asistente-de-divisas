const GEMINI_MODEL = "gemini-1.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured on server" });
  }

  try {
    const { newsTextBatch } = req.body;
    if (!newsTextBatch) {
      return res.status(400).json({ error: "Missing newsTextBatch" });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const systemInstruction =
      "Eres un analista experto en Forex institucional. Analiza estas noticias globales recientes. Filtra el ruido diario. Extrae SOLO eventos críticos o 'cataclismos' (magnitudeVal > 75) que puedan generar fuertes tendencias en divisas G8. Si no hay nada crítico que amerite un trade, devuelve un array vacío [].";

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `NOTICIAS RECIENTES DEL MERCADO:\n\n${newsTextBatch}`,
            },
          ],
        },
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              type: { type: "STRING" },
              icon: { type: "STRING" },
              currencyAffected: { type: "STRING" },
              trendCode: {
                type: "STRING",
                description: "'bullish', 'bearish', o 'warning'",
              },
              magnitudeText: {
                type: "STRING",
                description: "Ej: 'Alta (Nivel 4/5)'",
              },
              magnitudeVal: { type: "INTEGER" },
              primaryPair: { type: "STRING" },
              primaryAction: {
                type: "STRING",
                description: "'BUY' o 'SHORT'",
              },
              expectedCataclysm: {
                type: "STRING",
                description:
                  "Contexto macro y por qué moverá el mercado",
              },
              tradeSetup: {
                type: "STRING",
                description: "Plan técnico de entrada",
              },
            },
            required: [
              "title",
              "type",
              "icon",
              "currencyAffected",
              "trendCode",
              "magnitudeText",
              "magnitudeVal",
              "primaryPair",
              "primaryAction",
              "expectedCataclysm",
              "tradeSetup",
            ],
          },
        },
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
