const express = require("express");
const Groq = require("groq-sdk");
const dataStore = require("../utils/dataStore");
const {
  buildPrecomputedAggregations,
  buildRepresentativeSample,
  formatAggregationsForPrompt,
} = require("../utils/dataAnalysis");

const router = express.Router();

const COLORS = [
  "#f59e0b", "#fbbf24", "#d97706", "#b45309", "#78350f",
  "#fcd34d", "#fb923c", "#ea580c", "#c2410c", "#9a3412"
];

function sanitizeSingleChartConfig(cfg) {
  if (!cfg || typeof cfg !== "object") return null;

  // Ensure type is valid
  const validTypes = ["bar","line","pie","doughnut","scatter","radar","polarArea","bubble"];
  if (!validTypes.includes(cfg.type)) cfg.type = "bar";

  // Ensure labels is an array
  if (!Array.isArray(cfg.labels)) cfg.labels = [];

  // Ensure datasets is an array
  if (!Array.isArray(cfg.datasets)) cfg.datasets = [];

  const isRadial = ["pie","doughnut","polarArea"].includes(cfg.type);

  cfg.datasets = cfg.datasets.map((ds, i) => {
    // Ensure data is array of numbers
    if (!Array.isArray(ds.data)) ds.data = [];
    ds.data = ds.data.map(v => {
      if (typeof v === "object" && v !== null && "x" in v) return v; // scatter / bubble
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    });

    // FIX: For pie/doughnut/polarArea, backgroundColor MUST be an array
    if (isRadial) {
      if (!Array.isArray(ds.backgroundColor)) {
        ds.backgroundColor = cfg.labels.map((_, j) => COLORS[j % COLORS.length]);
      } else {
        while (ds.backgroundColor.length < cfg.labels.length) {
          ds.backgroundColor.push(COLORS[ds.backgroundColor.length % COLORS.length]);
        }
      }
      ds.borderColor = "#05050f";
      ds.borderWidth = 2;
    } else {
      if (Array.isArray(ds.backgroundColor) && ds.backgroundColor.length === 0) {
        ds.backgroundColor = COLORS[i % COLORS.length];
      }
      if (!ds.backgroundColor) ds.backgroundColor = COLORS[i % COLORS.length];
      if (!ds.borderColor) ds.borderColor = COLORS[i % COLORS.length];
      
      if (cfg.type === "radar" && typeof ds.backgroundColor === "string") {
          ds.backgroundColor = ds.backgroundColor + "40"; // 25% opacity hex
          ds.borderWidth = 2;
      }
    }

    if (!ds.label) ds.label = "Value";
    return ds;
  });

  if (cfg.datasets.length === 0 || cfg.labels.length === 0) {
    return null;
  }
  return cfg;
}

// Sanitize and guarantee the parsed result always has valid chart data
function sanitizeResult(parsed, headers, columnTypes) {
  if (!parsed || typeof parsed !== "object") return null;

  // Fix single chartConfig
  if (parsed.chartConfig) {
    parsed.chartConfig = sanitizeSingleChartConfig(parsed.chartConfig);
  }

  // Fix multiple chartConfigs array
  if (Array.isArray(parsed.chartConfigs)) {
    parsed.chartConfigs = parsed.chartConfigs
      .map(cfg => sanitizeSingleChartConfig(cfg))
      .filter(cfg => cfg !== null);
  } else {
    parsed.chartConfigs = [];
  }

  // Ensure insights is array
  if (!Array.isArray(parsed.insights)) parsed.insights = [];

  // Ensure summary exists
  if (!parsed.summary) parsed.summary = "Here is the analysis of your data.";

  return parsed;
}

function buildPrompt({
  originalName,
  rowCount,
  colSummaries,
  sampleRows,
  precomputedBlock,
  sheetInfo,
  conversationHistory,
  query,
}) {
  const history = conversationHistory.length
    ? `\nPrior conversation:\n${conversationHistory.map(m => `${m.role==="user"?"User":"AI"}: ${m.content}`).join("\n")}\n`
    : "";

  const sheetNote = sheetInfo?.length
    ? `\nExcel sheets used: ${sheetInfo.map(s => `${s.file} → "${s.selectedSheet}" (available: ${s.availableSheets.join(", ")})`).join("; ")}`
    : "";

  return `You are DataLens AI. Answer the user's question using ONLY the verified aggregates below. Do not invent numbers.

==CRITICAL INSTRUCTION==
You MUST respond with ONLY a valid JSON object. No markdown code fences. No backticks. No explanation text before or after. Just raw JSON starting with { and ending with }.

The JSON MUST follow this EXACT structure — do not add or remove fields:

{
  "summary": "2-3 sentence plain English explanation of what you found",
  "chartConfig": {
    "type": "bar",
    "title": "Descriptive title for the chart (set to null if returning multiple charts in chartConfigs)",
    "labels": ["Category A", "Category B", "Category C"],
    "datasets": [
      {
        "label": "Value",
        "data": [100, 200, 150]
      }
    ]
  },
  "chartConfigs": [
    {
      "type": "line",
      "title": "Descriptive title for chart 1",
      "labels": ["Jan", "Feb", "Mar"],
      "datasets": [{ "label": "Sales", "data": [10, 20, 15] }]
    }
  ],
  "insights": [
    { "label": "Total Revenue", "value": "$1,234.50", "trend": "+12.4%" },
    { "label": "Average Sale", "value": "$411.50" },
    { "label": "Top Performance", "value": "Category B" }
  ],
  "tableData": null
}

==ACCURACY RULES (MOST IMPORTANT)==
- ALL chart data, insights, and tableData numbers MUST come from "Column details" or "PRECOMPUTED AGGREGATIONS" below.
- Sample rows are for schema/context ONLY. NEVER compute totals, averages, rankings, or chart values from the sample.
- Prefer the matching groupBy×metric aggregation when answering comparisons, breakdowns, trends, or top-N questions.
- For overall totals / averages / min / max, use the Column details numeric stats (sum, avg, min, max, count).
- If the question cannot be answered precisely from those aggregates, say so clearly in "summary", set chartConfig to null, leave chartConfigs empty, and keep insights honest (do not fabricate).
- Do NOT copy example numbers from this prompt (like 100, 200, 150 or $1,234.50). Those are format examples only.
- When using a precomputed group, chart labels MUST be the group keys and data MUST be the corresponding sum/avg/count values exactly as listed.
- Sort time-series labels chronologically.

==CHART TYPE RULES==
- Use "bar" for comparing categories (most common — default to this)
- Use "line" for data over time / trends
- Use "pie" or "doughnut" for showing percentages/proportions (max 8 slices)
- Use "scatter" for correlation between two numeric columns
- Use "radar" for comparing multiple quantitative variables across a single category
- Use "polarArea" similar to pie charts when radius should also encode magnitude
- Use "bubble" when you have 3 numeric dimensions (x, y, and r for bubble size)
- If the user asks for MULTIPLE charts or a dashboard: set chartConfig to null and put charts in chartConfigs. Otherwise leave chartConfigs as [].

==CRITICAL COLOR RULES==
- For "bar", "line", "radar" and "bubble": backgroundColor MUST be a single color string like "#f59e0b"
- For "pie", "doughnut", and "polarArea": backgroundColor MUST be an ARRAY of color strings from this palette: ["#f59e0b", "#fbbf24", "#d97706", "#b45309", "#78350f", "#fcd34d", "#fb923c", "#ea580c"]
- NEVER use a single string for pie/doughnut/polarArea backgroundColor.

==OTHER RULES==
- labels: max 12 items. If more categories exist in precomputed data, use the provided "Other" bucket or the top groups already computed.
- insights: 3-4 key stats taken from verified aggregates, formatted professionally.
- Each insight MUST have a "label" and "value". Optional "trend" only if supported by the aggregates.
- tableData: set to {"headers":["Col1","Col2"],"rows":[["val1","val2"]]} for top-N / breakdown tables using precomputed groups; else null
- chartConfig: only set to null if the question genuinely cannot be charted from verified data

==DATA==
File: "${originalName}"
Total rows in file: ${rowCount}${sheetNote}
Column details (computed from ALL rows):
${colSummaries.join("\n")}

PRECOMPUTED AGGREGATIONS (computed from ALL ${rowCount} rows — use these for charts/answers):
${precomputedBlock}

Sample rows (schema/context ONLY — do not aggregate from these):
${JSON.stringify(sampleRows, null, 0)}
${history}
User question: ${query}

Remember: respond with ONLY the JSON object. Nothing else.`;
}

class ApiKeyPool {
  constructor() {
    this.keys = [];
    this.initialized = false;
    this._scheduleMidnightReset();
  }

  _scheduleMidnightReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight - now;
    setTimeout(() => {
      console.log("[Key Pool] Midnight reset — reviving all keys.");
      this.keys.forEach(k => { k.isDead = false; k.deadUntil = 0; });
      this._scheduleMidnightReset(); // reschedule for next day
    }, msUntilMidnight);
  }

  init() {
    if (this.initialized) return;
    const rawKeys = Object.keys(process.env)
      .filter(k => k.startsWith('GROQ_API_KEY') || k.startsWith('GEMINI_API_KEY') || k.startsWith('OPENROUTER_API_KEY'))
      .map(k => process.env[k])
      .filter(Boolean);
      
    // Handle comma-separated keys in a single env var
    let allKeys = [];
    for (const val of rawKeys) {
      allKeys = allKeys.concat(val.split(',').map(s => s.trim()).filter(Boolean));
    }
      
    this.keys = allKeys.map(k => ({ value: k, isDead: false, deadUntil: 0 }));
    this.initialized = true;
  }

  reviveAll() {
    this.keys.forEach(k => { k.isDead = false; k.deadUntil = 0; });
    console.log("[Key Pool] All keys revived.");
  }

  getKey() {
    this.init();
    if (this.keys.length === 0) return null;
    
    const now = Date.now();
    for (let keyObj of this.keys) {
      if (keyObj.isDead && now > keyObj.deadUntil) keyObj.isDead = false;
    }

    const availableKeys = this.keys.filter(k => !k.isDead);
    if (availableKeys.length === 0) return null;
    
    // Prioritize Gemini first (blazing fast & high quota), then OpenRouter, then Groq
    let keyObj = availableKeys.find(k => k.value.startsWith("AIza") || k.value.startsWith("AQ."));
    if (!keyObj) {
      keyObj = availableKeys.find(k => k.value.startsWith("sk-or-"));
    }
    if (!keyObj) {
      keyObj = availableKeys[0];
    }
    
    const idx = this.keys.indexOf(keyObj);
    if (idx !== -1) {
      this.keys.splice(idx, 1);
      this.keys.push(keyObj);
    }
    
    return keyObj.value;
  }

  markDead(keyValue, minutes = 15) {
    const keyObj = this.keys.find(k => k.value === keyValue);
    if (keyObj) {
      keyObj.isDead = true;
      keyObj.deadUntil = Date.now() + (1000 * 60 * minutes);
      console.warn(`[Key Pool] Key ${keyValue.substring(0, 8)}... marked dead for ${minutes} min.`);
    }
  }
}

const keyPool = new ApiKeyPool();

router.post("/", async (req, res) => {
  try {
    const { fileId, query, conversationHistory = [], userApiKey } = req.body;

    if (!fileId || !query) {
      return res.status(400).json({ error: "fileId and query are required." });
    }

    const fileData = await dataStore.get(fileId);
    if (!fileData) {
      return res.status(404).json({ error: "Session expired — please re-upload your file." });
    }

    const { headers, rows, columnTypes, stats, rowCount, originalName, sheetInfo } = fileData;

    const colSummaries = headers.map(h => {
      const type = columnTypes[h];
      const s = stats[h];
      if (type === "numeric" && s) {
        return `  "${h}" [numeric]: min=${s.min?.toFixed(2)}, max=${s.max?.toFixed(2)}, avg=${s.mean?.toFixed(2)}, sum=${s.sum?.toFixed(2)}, count=${s.count}`;
      } else if (s) {
        return `  "${h}" [${type}]: ${s.unique} unique values. Top values: ${s.topValues?.slice(0,8).map(v=>`"${v.val}"=${v.count}`).join(", ")}`;
      }
      return `  "${h}" [${type}]`;
    });

    // Deterministic aggregations over the FULL dataset — source of truth for the LLM
    const aggregations = buildPrecomputedAggregations(rows, headers, columnTypes);
    const precomputedBlock = formatAggregationsForPrompt(aggregations);
    const sampleRows = buildRepresentativeSample(rows, 30);

    const prompt = buildPrompt({
      originalName,
      rowCount,
      colSummaries,
      sampleRows,
      precomputedBlock,
      sheetInfo,
      conversationHistory: conversationHistory.slice(-6),
      query,
    });

    const modelName = process.env.GROQ_MODEL || "qwen/qwen3.6-27b";
    let result;
    let rawText = "";

    if (userApiKey) {
      if (userApiKey.startsWith("sk-or-")) {
        // ── OpenRouter (user key) ─────────────────────────────────────
        const OpenAI = require("openai");
        const openRouter = new OpenAI({
          apiKey: userApiKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": process.env.FRONTEND_URL || "https://datalens-ai.vercel.app",
            "X-Title": "DataLens AI",
          },
        });
        result = await openRouter.chat.completions.create({
          model: "qwen/qwen-2.5-72b-instruct",
          messages: [
            { role: "system", content: "You MUST respond with only valid JSON. No text before or after." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: "json_object" },
        });
        rawText = result.choices?.[0]?.message?.content?.trim();
      } else if (userApiKey.startsWith("sk-")) {
        // ── OpenAI (user key) ─────────────────────────────────────────
        const OpenAI = require("openai");
        const openai = new OpenAI({ apiKey: userApiKey });
        result = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You MUST respond with only valid JSON. No text before or after." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        });
        rawText = result.choices?.[0]?.message?.content?.trim();
      } else if (userApiKey.startsWith("AIza") || userApiKey.startsWith("AQ.")) {
        // ── Gemini (user key) ─────────────────────────────────────────
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(userApiKey);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash",
          generationConfig: { responseMimeType: "application/json" }
        });
        const chatResponse = await model.generateContent(`You MUST respond with only valid JSON. No text before or after.\n\n${prompt}`);
        rawText = chatResponse.response.text().trim();
      } else {
        // ── Groq (user key) ───────────────────────────────────────────
        const groq = new Groq({ apiKey: userApiKey });
        result = await groq.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: "You MUST respond with only valid JSON. No text before or after." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: "json_object" },
        });
        rawText = result.choices?.[0]?.message?.content?.trim();
      }
    } else {
      keyPool.init();
      if (keyPool.keys.length === 0) {
        return res.status(400).json({ error: "No system API keys found. Please provide your own API key in Settings." });
      }

      let maxAttempts = keyPool.keys.length;
      let attempt = 0;
      let success = false;
      let lastError = null;

      while (attempt < maxAttempts && !success) {
        const apiKeyToUse = keyPool.getKey();
        if (!apiKeyToUse) {
           return res.status(429).json({ error: "All system API keys are exhausted for today. Please provide your own API key in Settings." });
        }


        try {
          if (apiKeyToUse.startsWith("AIza") || apiKeyToUse.startsWith("AQ.")) {
            // ── Gemini path ──────────────────────────────────────────────
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(apiKeyToUse);
            const model = genAI.getGenerativeModel({ 
              model: "gemini-2.0-flash",
              generationConfig: { responseMimeType: "application/json" }
            });
            const chatResponse = await model.generateContent(`You MUST respond with only valid JSON. No text before or after.\n\n${prompt}`);
            rawText = chatResponse.response.text().trim();
            success = true;
          } else if (apiKeyToUse.startsWith("sk-or-")) {
            // ── OpenRouter path ──────────────────────────────────────────
            const OpenAI = require("openai");
            const openRouter = new OpenAI({
              apiKey: apiKeyToUse,
              baseURL: "https://openrouter.ai/api/v1",
              defaultHeaders: {
                "HTTP-Referer": process.env.FRONTEND_URL || "https://datalens-ai.vercel.app",
                "X-Title": "DataLens AI",
              },
            });
            const orResult = await openRouter.chat.completions.create({
              model: "qwen/qwen-2.5-72b-instruct",
              messages: [
                { role: "system", content: "You MUST respond with only valid JSON. No text before or after." },
                { role: "user", content: prompt }
              ],
              temperature: 0.1,
              max_tokens: 3000,
              response_format: { type: "json_object" },
            });
            rawText = orResult.choices?.[0]?.message?.content?.trim();
            success = true;
          } else {
            // ── Groq path ────────────────────────────────────────────────
            const groq = new Groq({ apiKey: apiKeyToUse });
            result = await groq.chat.completions.create({
              model: modelName,
              messages: [
                { role: "system", content: "You MUST respond with only valid JSON. No text before or after." },
                { role: "user", content: prompt }
              ],
              temperature: 0.1,
              max_tokens: 3000,
              response_format: { type: "json_object" },
            });
            success = true;
            rawText = result.choices?.[0]?.message?.content?.trim();
          }
        } catch (error) {
          lastError = error;
          const isQuotaError = error.status === 429 || error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("quota") || error.message?.includes("rate limit");
          const isAuthError = error.status === 401 || error.message?.includes("API_KEY_INVALID") || error.message?.includes("API key not valid");
          const isModelError = error.status === 400 || error.status === 404 || error.message?.includes("model") || error.message?.includes("not found");
          
          if (isQuotaError) {
            keyPool.markDead(apiKeyToUse, 1); // quota exhausted: rest 1 min instead of 60
            attempt++;
          } else if (isAuthError) {
            keyPool.markDead(apiKeyToUse, 10); // bad key: disable for 10 min instead of a day
            attempt++;
          } else if (isModelError) {
            keyPool.markDead(apiKeyToUse, 5); // model error: retry after 5 min
            attempt++;
          } else {
            throw error;
          }
        }
      }
      
      if (!success) {
        throw new Error("EXHAUSTED_ALL_KEYS");
      }
    }

    if (!rawText) {
      return res.status(500).json({ error: "Empty response from AI." });
    }

    // Aggressively clean any markdown fences Gemini might add
    const cleaned = rawText
      .replace(/^```(?:json)?[\s\n]*/im, "")
      .replace(/[\s\n]*```\s*$/im, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse failed.\nRaw text:", rawText.slice(0, 600));
      // Try to extract JSON from response if wrapped in text
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); }
        catch (_) {}
      }
      if (!parsed) {
        return res.status(500).json({ error: "AI returned an unreadable format. Please try rephrasing your question." });
      }
    }

    // Sanitize and guarantee valid chart structure
    const sanitized = sanitizeResult(parsed, headers, columnTypes);

    res.json({ success: true, result: sanitized });

  } catch (err) {
    console.error("Analyze error:", err.message);

    if (err.status === 401 || err.message?.includes("API_KEY_INVALID") || err.message?.includes("API key not valid")) {
      return res.status(500).json({ error: "Invalid Groq API key. Double-check GROQ_API_KEY in backend/.env" });
    }
    if (err.message === "EXHAUSTED_ALL_KEYS") {
      return res.status(429).json({ error: "All system API keys are currently exhausted. Please provide your own API key in Settings." });
    }
    if (err.status === 429 || err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("quota")) {
      return res.status(429).json({ error: "Rate limit reached. Please try again later." });
    }
    if (err.message?.includes("SAFETY")) {
      return res.status(400).json({ error: "Request blocked by safety filters. Try rephrasing." });
    }

    res.status(500).json({ error: err.message || "Analysis failed." });
  }
});

module.exports = router;
module.exports.keyPool = keyPool;
