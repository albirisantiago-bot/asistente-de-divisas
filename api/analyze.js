const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `Analista macro senior. Analiza la noticia y genera UNA alerta de swing trading forex basada en divergencia entre bancos centrales.

REGLAS:
1. CERO FABRICACIÓN: Solo datos de la noticia. Dato ausente = "no disponible".
2. DIVERGENCIA OBLIGATORIA: Analiza AMBOS bancos centrales del par. Dirección = divergencia relativa.
3. PROBABILIDAD (50-95%): Incluye invalidadores.
4. FUNDAMENTAL vs TÉCNICO separados. Sin precio disponible = "verificar en plataforma".
5. HORIZONTE TEMPORAL ligado a evento concreto.
6. COHERENCIA: Si "USD débil" → EUR/USD=ALCISTA, no BAJISTA.
7. MACRO: USD/JPY/CHF=refugios. NFP fuerte=USD alcista. Inflación alta=hawkish=divisa alcista.

RESPUESTA: JSON object (NO array):
{"date":"string","title":"string","type":"Divergencia Monetaria|Shock de Datos|Conflicto Geopolítico|Shock Energético|Intervención Cambiaria|Colapso Commodities","icon":"emoji","currencyAffected":"USD|EUR|GBP|JPY|AUD|NZD|CAD|CHF","primaryPair":"string","primaryAction":"BUY|SHORT","directionalBias":"ALCISTA|BAJISTA","probability":number,"timeHorizon":"string","trendCode":"bullish|bearish|warning","magnitudeText":"string","magnitudeVal":number,"fundamentalAnalysis":{"baseCurrencyBank":"banco, tasa, sesgo, razón","quoteCurrencyBank":"banco, tasa, sesgo, razón","divergenceSummary":"comparación y efecto","invalidators":["catalizadores inversión"]},"technicalSetup":{"currentPrice":"si disponible","entry":"zona entrada","stopLoss":"SL","takeProfit":"TP","riskRewardRatio":"ej 1:2","timeframes":"D1/H4"},"pairsToAnalyze":[{"pair":"string","bias":"string"}]}`;

export const config = { maxDuration: 60 };

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
        temperature: 0.2,
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
