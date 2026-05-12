const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dataStore = require("../utils/dataStore");

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const COLORS = [
  "#7c3aed","#06b6d4","#10b981","#f59e0b","#ef4444",
  "#ec4899","#8b5cf6","#3b82f6","#14b8a6","#f97316",
  "#84cc16","#a855f7","#0ea5e9","#d946ef","#fb923c"
];

// Sanitize and guarantee the parsed result always has valid chart data
function sanitizeResult(parsed, headers, columnTypes) {
  if (!parsed || typeof parsed !== "object") return null;

  // Fix chartConfig
  if (parsed.chartConfig && parsed.chartConfig !== null) {
    const cfg = parsed.chartConfig;

    // Ensure type is valid
    const validTypes = ["bar","line","pie","doughnut","scatter"];
    if (!validTypes.includes(cfg.type)) cfg.type = "bar";

    // Ensure labels is an array
    if (!Array.isArray(cfg.labels)) cfg.labels = [];

    // Ensure datasets is an array
    if (!Array.isArray(cfg.datasets)) cfg.datasets = [];

    const isRadial = ["pie","doughnut"].includes(cfg.type);

    cfg.datasets = cfg.datasets.map((ds, i) => {
      // Ensure data is array of numbers
      if (!Array.isArray(ds.data)) ds.data = [];
      ds.data = ds.data.map(v => {
        if (typeof v === "object" && v !== null && "x" in v) return v; // scatter
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
      });

      // FIX: For pie/doughnut, backgroundColor MUST be an array
      if (isRadial) {
        if (!Array.isArray(ds.backgroundColor)) {
          // AI returned a string — generate array
          ds.backgroundColor = cfg.labels.map((_, j) => COLORS[j % COLORS.length]);
        } else {
          // Ensure enough colors
          while (ds.backgroundColor.length < cfg.labels.length) {
            ds.backgroundColor.push(COLORS[ds.backgroundColor.length % COLORS.length]);
          }
        }
        ds.borderColor = "#05050f";
        ds.borderWidth = 2;
      } else {
        // For bar/line: ensure backgroundColor is a string or valid array
        if (Array.isArray(ds.backgroundColor) && ds.backgroundColor.length === 0) {
          ds.backgroundColor = COLORS[i % COLORS.length];
        }
        if (!ds.backgroundColor) ds.backgroundColor = COLORS[i % COLORS.length];
        if (!ds.borderColor) ds.borderColor = COLORS[i % COLORS.length];
      }

      if (!ds.label) ds.label = "Value";
      return ds;
    });

    // If datasets is empty after processing, set chartConfig to null
    if (cfg.datasets.length === 0 || cfg.labels.length === 0) {
      parsed.chartConfig = null;
    }
  }

  // Ensure insights is array
  if (!Array.isArray(parsed.insights)) parsed.insights = [];

  // Ensure summary exists
  if (!parsed.summary) parsed.summary = "Here is the analysis of your data.";

  return parsed;
}

function buildPrompt({ originalName, rowCount, colSummaries, sampleRows, conversationHistory, query }) {
  const history = conversationHistory.length
    ? `\nPrior conversation:\n${conversationHistory.map(m => `${m.role==="user"?"User":"AI"}: ${m.content}`).join("\n")}\n`
    : "";

  return `You are DataLens AI. Analyze the spreadsheet data and respond to the user's question.

==CRITICAL INSTRUCTION==
You MUST respond with ONLY a valid JSON object. No markdown code fences. No backticks. No explanation text before or after. Just raw JSON starting with { and ending with }.

The JSON MUST follow this EXACT structure — do not add or remove fields:

{
  "summary": "2-3 sentence plain English explanation of what you found",
  "chartConfig": {
    "type": "bar",
    "title": "Descriptive title for the chart",
    "labels": ["Category A", "Category B", "Category C"],
    "datasets": [
      {
        "label": "Value",
        "data": [100, 200, 150],
        "backgroundColor": "#7c3aed",
        "borderColor": "#7c3aed"
      }
    ]
  },
  "insights": [
    { "label": "Total", "value": "1,234" },
    { "label": "Average", "value": "411" },
    { "label": "Top Category", "value": "Category B" }
  ],
  "tableData": null
}

==CHART TYPE RULES==
- Use "bar" for comparing categories (most common — default to this)
- Use "line" for data over time / trends
- Use "pie" or "doughnut" for showing percentages/proportions (max 8 slices)
- Use "scatter" for correlation between two numeric columns

==CRITICAL COLOR RULES==
- For "bar" and "line": backgroundColor MUST be a single color string like "#7c3aed"
- For "pie" and "doughnut": backgroundColor MUST be an ARRAY of color strings, one per label.
  Example for pie with 4 labels: "backgroundColor": ["#7c3aed", "#06b6d4", "#10b981", "#f59e0b"]
  NEVER use a single string for pie/doughnut backgroundColor.

==OTHER RULES==
- labels: max 12 items. If more, group the smallest values as "Other"
- data values: must be real numbers computed from the actual sample data
- insights: 2-4 key stats, nicely formatted ("1,234" not "1234", "42.3%" not "0.423")
- tableData: set to {"headers":["Col1","Col2"],"rows":[["val1","val2"]]} only for top-N lists, else null
- chartConfig: only set to null if the question genuinely cannot be charted
- Sort time-series data chronologically

==DATA==
File: "${originalName}"
Total rows in file: ${rowCount}
Column details:
${colSummaries.join("\n")}

Sample data (first rows):
${JSON.stringify(sampleRows, null, 0)}
${history}
User question: ${query}

Remember: respond with ONLY the JSON object. Nothing else.`;
}

router.post("/", async (req, res) => {
  try {
    const { fileId, query, conversationHistory = [] } = req.body;

    if (!fileId || !query) {
      return res.status(400).json({ error: "fileId and query are required." });
    }

    const fileData = dataStore.get(fileId);
    if (!fileData) {
      return res.status(404).json({ error: "Session expired — please re-upload your file." });
    }

    const { headers, rows, columnTypes, stats, rowCount, originalName } = fileData;

    const colSummaries = headers.map(h => {
      const type = columnTypes[h];
      const s = stats[h];
      if (type === "numeric" && s) {
        return `  "${h}" [numeric]: min=${s.min?.toFixed(2)}, max=${s.max?.toFixed(2)}, avg=${s.mean?.toFixed(2)}, sum=${s.sum?.toFixed(2)}, count=${s.count}`;
      } else if (s) {
        return `  "${h}" [${type}]: ${s.unique} unique values. Top values: ${s.topValues?.slice(0,6).map(v=>`"${v.val}"=${v.count}`).join(", ")}`;
      }
      return `  "${h}" [${type}]`;
    });

    const sampleRows = rows.slice(0, 80);

    const prompt = buildPrompt({
      originalName, rowCount, colSummaries, sampleRows,
      conversationHistory: conversationHistory.slice(-6),
      query,
    });

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.1,       // very low — maximises JSON consistency
        maxOutputTokens: 3000,
        responseMimeType: "application/json",  // force JSON output mode
      },
    });

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

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

    if (err.message?.includes("API_KEY_INVALID") || err.message?.includes("API key not valid")) {
      return res.status(500).json({ error: "Invalid Gemini API key. Double-check GEMINI_API_KEY in backend/.env" });
    }
    if (err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("quota") || err.status === 429) {
      return res.status(429).json({ error: "Free tier limit reached for today. Resets in 24 hours." });
    }
    if (err.message?.includes("SAFETY")) {
      return res.status(400).json({ error: "Request blocked by safety filters. Try rephrasing." });
    }

    res.status(500).json({ error: err.message || "Analysis failed." });
  }
});

module.exports = router;
