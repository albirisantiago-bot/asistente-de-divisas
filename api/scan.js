const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `Analista macro senior de hedge fund. Swing trading forex G8. Genera alertas basadas en DIVERGENCIA RELATIVA entre bancos centrales.

REGLAS:
1. CERO FABRICACIÓN: Solo cifras TEXTUALES de los datos proporcionados. Dato ausente = "no disponible". Cita fuente siempre.
2. PRECIOS REALES: Usa SOLO los precios de la sección "PRECIOS REALES". SL/TP/entrada cerca del precio real. Sin precio = "verificar en plataforma".
3. DIVERGENCIA OBLIGATORIA: Analiza AMBOS bancos centrales de cada par. Dirección = divergencia relativa. Hawkish vs dovish = divisa hawkish se aprecia.
4. PROBABILIDAD (50-95%): Nunca certeza absoluta. Incluye invalidadores. 50-60=leve, 60-75=moderado, 75-90=fuerte, 90-95=muy alta.
5. FUNDAMENTAL vs TÉCNICO separados: Fundamental=dirección (bancos centrales, macro). Técnico=entrada/SL/TP (precios reales).
6. HORIZONTE TEMPORAL ligado a evento concreto (ej: "Hasta reunión BCE 17 abril").
7. LÓGICA MACRO: USD/JPY/CHF=refugios. NFP fuerte=USD alcista. Inflación alta=hawkish=divisa alcista. AUD=China, CAD=petróleo.
8. COHERENCIA: Si "USD débil" entonces EUR/USD=ALCISTA, no BAJISTA. Conclusión consistente con premisa.
9. Deriva tasas y sesgo de bancos centrales de las NOTICIAS y CALENDARIO. No inventes tasas.

RESPUESTA: JSON array. Cada objeto:
{"date":"Inminente|Esta semana|Próximas 2-3 semanas","title":"string","type":"Divergencia Monetaria|Shock de Datos|Conflicto Geopolítico|Shock Energético|Intervención Cambiaria|Colapso Commodities","icon":"emoji","currencyAffected":"USD|EUR|GBP|JPY|AUD|NZD|CAD|CHF","primaryPair":"string","primaryAction":"BUY|SHORT","directionalBias":"ALCISTA|BAJISTA","probability":number,"timeHorizon":"string","trendCode":"bullish|bearish|warning","magnitudeText":"string","magnitudeVal":number,"fundamentalAnalysis":{"baseCurrencyBank":"banco, tasa, sesgo, razón","quoteCurrencyBank":"banco, tasa, sesgo, razón","divergenceSummary":"comparación y efecto en par","invalidators":["catalizadores que invertirían sesgo"]},"technicalSetup":{"currentPrice":"de PRECIOS REALES","entry":"zona cerca precio real","stopLoss":"nivel SL swing","takeProfit":"nivel TP","riskRewardRatio":"ej 1:2","timeframes":"D1/H4"},"pairsToAnalyze":[{"pair":"string","bias":"string"}]}

Genera 2-3 catalizadores. No array vacío.`;

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
          { role: "user", content: newsTextBatch },
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

    const result = Array.isArray(raw) ? raw : (raw.catalysts || raw.alerts || raw.events || raw.data || raw.results || Object.values(raw)[0]);

    return res.status(200).json(Array.isArray(result) ? result : []);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
