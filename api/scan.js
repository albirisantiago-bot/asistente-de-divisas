const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `Eres un analista senior de mesa institucional de Forex. Tu trabajo es detectar TODOS los eventos que mueven divisas G8 en las noticias recientes.

CATEGORÍAS QUE DEBES DETECTAR (de mayor a menor impacto):
1. CRISIS GEOPOLÍTICAS: guerras, tensiones militares, sanciones, conflictos (Irán, Rusia, China-Taiwán, Medio Oriente, etc.)
2. CRISIS ECONÓMICAS: colapsos inmobiliarios, crisis de deuda, quiebras bancarias, recesiones
3. POLÍTICA MONETARIA: decisiones de tasas, señales hawkish/dovish, QE/QT, forward guidance
4. DATOS MACRO SORPRESA: inflación, empleo, PIB que sorprenden vs expectativas
5. COMMODITIES & FLUJOS: petróleo, oro, mineral de hierro, flujos risk-on/risk-off
6. SENTIMIENTO & RIESGO: cambios en apetito de riesgo, carry trade, correlaciones entre mercados

REGLAS CRÍTICAS:
- NO filtres de más. Si hay tensiones geopolíticas activas (guerras, amenazas militares, escaladas), SIEMPRE repórtalas.
- Si hay crisis económicas en curso (China inmobiliaria, recesión europea, etc.), SIEMPRE repórtalas.
- Conecta eventos macro con pares específicos. Ejemplo: crisis inmobiliaria China → mineral de hierro cae → AUD/USD SHORT.
- Busca mínimo 2-5 catalizadores en cualquier sesión. El mercado SIEMPRE tiene algo que analizar.
- Solo devuelve [] si literalmente no hay NINGUNA noticia relevante (casi nunca pasa).

DEBES responder ÚNICAMENTE con un JSON array válido. Cada objeto del array debe tener exactamente estos campos:
- "title": string (título claro y directo del catalizador)
- "type": string (tipo: "Geopolítica", "Crisis Económica", "Política Monetaria", "Dato Macro", "Commodities", "Sentimiento")
- "icon": string (un emoji representativo)
- "currencyAffected": string (divisa principal afectada, ej: "USD", "EUR", "GBP", "AUD", "JPY")
- "trendCode": string (SOLO uno de: "bullish", "bearish", "warning")
- "magnitudeText": string (ej: "Crítica (Nivel 5/5)", "Alta (Nivel 4/5)", "Media-Alta (Nivel 3/5)")
- "magnitudeVal": number (0-100, asigna según impacto real: crisis geopolítica activa=80-95, dato macro sorpresa=60-80, tensión en desarrollo=50-70, sentimiento=40-60)
- "primaryPair": string (par principal, ej: "EUR/USD", "AUD/USD", "USD/JPY")
- "primaryAction": string (SOLO "BUY" o "SHORT")
- "expectedCataclysm": string (análisis macro detallado: qué está pasando, por qué mueve el mercado, cadena de causalidad completa)
- "tradeSetup": string (plan técnico: niveles clave, entrada, stop loss, take profit, timeframe sugerido)

Si realmente no hay nada relevante (muy raro), responde: []`;

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
        temperature: 0.6,
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
