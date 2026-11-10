/**
 * Deterministic spreadsheet helpers used by upload + analyze routes.
 * Keeps numeric/date parsing and aggregations off the LLM so answers stay accurate.
 */

function parseLooseNumber(v) {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "boolean") return NaN;
  if (v === null || v === undefined) return NaN;
  if (v instanceof Date) return NaN;

  let s = String(v).trim();
  if (!s) return NaN;

  // Accounting negatives: (1,234.50)
  const accounting = /^\((.*)\)$/.test(s);
  if (accounting) s = s.slice(1, -1).trim();

  const isPercent = /%\s*$/.test(s);
  s = s
    .replace(/[$£€¥₹₽₩]/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, "")
    .replace(/%$/g, "");

  if (!s || /[a-zA-Z]/.test(s)) return NaN;

  const n = parseFloat(s);
  if (!isFinite(n)) return NaN;

  let out = isPercent ? n / 100 : n;
  if (accounting) out = -Math.abs(out);
  return out;
}

function isDateLike(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return true;
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  // Prefer explicit date-like patterns to avoid treating zip codes / IDs as dates
  if (
    !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s) &&
    !/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(s) &&
    !/^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}/.test(s)
  ) {
    return false;
  }
  const t = Date.parse(s);
  return !isNaN(t);
}

function formatDateValue(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "string" && isDateLike(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return v;
}

function isEmptyCell(v) {
  return v === null || v === undefined || v === "";
}

/**
 * Canonical display value for categorical grouping (trim + unify casing).
 * Keeps the most common original spelling via a side map when aggregating.
 */
function normalizeCategoryKey(v) {
  if (isEmptyCell(v)) return null;
  return String(formatDateValue(v)).trim().replace(/\s+/g, " ").toLowerCase();
}

function titleCaseWords(s) {
  return String(s)
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function isBlankRow(row) {
  if (!row || typeof row !== "object") return true;
  return Object.values(row).every(isEmptyCell);
}

function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date && !isNaN(v.getTime())) {
      out[k] = v.toISOString().slice(0, 10);
    } else if (typeof v === "string") {
      const trimmed = v.trim();
      // Parse loose number if format matches currency or number
      if (
        /^[$€£¥₹₽₩]?\s*-?[\d,]+(\.\d+)?%?$/.test(trimmed) &&
        !/^0\d{3,}$/.test(trimmed)
      ) {
        const n = parseLooseNumber(trimmed);
        out[k] = !isNaN(n) ? n : trimmed;
      } else {
        out[k] = trimmed;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Ensure the sheet's !ref range covers all populated cells so sheet_to_json doesn't cut off data.
 */
function ensureFullSheetRef(sheet) {
  if (!sheet || typeof sheet !== "object") return;
  const XLSX = require("xlsx");
  let minR = Infinity,
    maxR = -Infinity,
    minC = Infinity,
    maxC = -Infinity;
  let hasCells = false;

  for (const key of Object.keys(sheet)) {
    if (key.startsWith("!")) continue;
    try {
      const cell = XLSX.utils.decode_cell(key);
      if (cell.r < minR) minR = cell.r;
      if (cell.r > maxR) maxR = cell.r;
      if (cell.c < minC) minC = cell.c;
      if (cell.c > maxC) maxC = cell.c;
      hasCells = true;
    } catch (_) {}
  }

  if (hasCells) {
    sheet["!ref"] = XLSX.utils.encode_range({
      s: { r: minR, c: minC },
      e: { r: maxR, c: maxC },
    });
  }
}

/**
 * Pick the densest worksheet (most populated cells) when a single sheet is requested as fallback.
 */
function pickBestSheetName(workbook) {
  if (!workbook?.SheetNames?.length) return null;
  let best = workbook.SheetNames[0];
  let bestScore = -1;
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const score = Object.keys(sheet).filter((k) => !k.startsWith("!")).length;
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return best;
}

/**
 * Detect which AOA row is the real header (skips title / blank rows above the table).
 * Returns -1 if no text header row exists (i.e. pure data sheet).
 */
function detectHeaderRowIndex(aoa, maxScan = 15) {
  if (!aoa || !aoa.length) return 0;
  const limit = Math.min(aoa.length, maxScan);

  let maxNonEmptyInScan = 0;
  for (let i = 0; i < limit; i++) {
    const row = aoa[i] || [];
    const count = row.filter((c) => !isEmptyCell(c)).length;
    if (count > maxNonEmptyInScan) maxNonEmptyInScan = count;
  }

  // Check row 0
  const row0 = aoa[0] || [];
  const r0NonEmpty = row0.filter((c) => !isEmptyCell(c));
  const r0Strings = r0NonEmpty.filter(
    (c) => typeof c === "string" && isNaN(parseLooseNumber(c))
  );

  // If row 0 has at least 2 non-empty cells and has string labels (or represents table width)
  if (
    r0NonEmpty.length >= 2 &&
    (r0Strings.length / r0NonEmpty.length >= 0.5 ||
      r0NonEmpty.length >= maxNonEmptyInScan * 0.7)
  ) {
    const allNums = r0NonEmpty.every((c) => !isNaN(parseLooseNumber(c)));
    if (!allNums) {
      return 0; // Row 0 is the real header
    }
  } else if (
    r0NonEmpty.length === 1 &&
    maxNonEmptyInScan === 1 &&
    r0Strings.length === 1
  ) {
    return 0;
  }

  // Scan for the best header row (e.g. if row 0 was a title banner)
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < limit; i++) {
    const row = aoa[i] || [];
    const nonEmpty = row.filter((c) => !isEmptyCell(c));
    if (!nonEmpty.length) continue;

    const strings = nonEmpty.filter(
      (c) => typeof c === "string" && isNaN(parseLooseNumber(c))
    );
    const unique = new Set(nonEmpty.map((c) => String(c).trim().toLowerCase()));
    const next = aoa[i + 1] || [];
    const nextNonEmpty = next.filter((c) => !isEmptyCell(c)).length;

    let score =
      nonEmpty.length * 2 +
      (unique.size === nonEmpty.length ? 4 : 0) +
      (strings.length / nonEmpty.length) * 6 +
      (nextNonEmpty >= nonEmpty.length * 0.5 ? 4 : 0);

    // Penalize single-cell title banners if table has multiple columns
    if (nonEmpty.length === 1 && maxNonEmptyInScan > 1) {
      score -= 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  // If the best row is all numbers, this sheet likely has NO header row
  const bestRow = aoa[bestIdx] || [];
  const bestNonEmpty = bestRow.filter((c) => !isEmptyCell(c));
  if (
    bestNonEmpty.length &&
    bestNonEmpty.every((c) => !isNaN(parseLooseNumber(c)))
  ) {
    return -1; // Flag that there is no header row
  }

  return bestIdx;
}

/**
 * Robust conversion of a SheetJS worksheet to clean JSON:
 * - Scans all rows to find max column width (prevents column truncation)
 * - Detects header row or creates synthetic headers (prevents row dropping)
 * - Formats numbers and dates cleanly
 */
function sheetToCleanJson(sheet, sheetName = "") {
  if (!sheet) return { headers: [], rows: [] };
  const XLSX = require("xlsx");
  ensureFullSheetRef(sheet);

  const aoa = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  });

  if (!aoa || !aoa.length) return { headers: [], rows: [] };

  // Calculate maximum column count across ALL rows
  let maxCols = 0;
  for (const r of aoa) {
    if (Array.isArray(r) && r.length > maxCols) {
      maxCols = r.length;
    }
  }
  if (maxCols === 0) return { headers: [], rows: [] };

  const headerIdx = detectHeaderRowIndex(aoa);
  let startDataRow = 0;
  let rawHeaderRow = [];

  if (headerIdx >= 0) {
    rawHeaderRow = aoa[headerIdx] || [];
    startDataRow = headerIdx + 1;
  }

  // Generate complete header list for all 0..maxCols-1 columns
  const seen = {};
  const headers = [];
  for (let c = 0; c < maxCols; c++) {
    let rawVal = rawHeaderRow[c];
    let label = isEmptyCell(rawVal) ? "" : String(rawVal).trim().replace(/\s+/g, " ");
    if (!label) label = `Column_${c + 1}`;

    if (!seen[label]) {
      seen[label] = 1;
      headers.push(label);
    } else {
      seen[label] += 1;
      headers.push(`${label}_${seen[label]}`);
    }
  }

  const rows = [];
  for (let r = startDataRow; r < aoa.length; r++) {
    const cells = aoa[r] || [];
    if (cells.every(isEmptyCell)) continue;

    const obj = {};
    let any = false;
    for (let c = 0; c < headers.length; c++) {
      let val = cells[c];
      if (isEmptyCell(val)) {
        obj[headers[c]] = null;
      } else {
        if (val instanceof Date && !isNaN(val.getTime())) {
          val = val.toISOString().slice(0, 10);
        } else if (typeof val === "string") {
          const trimmed = val.trim();
          // Loose number parse for currencies / formatted numbers
          if (
            /^[$€£¥₹₽₩]?\s*-?[\d,]+(\.\d+)?%?$/.test(trimmed) &&
            !/^0\d{3,}$/.test(trimmed)
          ) {
            const parsedNum = parseLooseNumber(trimmed);
            val = !isNaN(parsedNum) ? parsedNum : trimmed;
          } else {
            val = trimmed;
          }
        }
        obj[headers[c]] = val;
        any = true;
      }
    }
    if (any) rows.push(obj);
  }

  return { headers, rows };
}

function XLSX_utils_sheet_to_json_safe(sheet) {
  const XLSX = require("xlsx");
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  });
}

function detectColumnTypes(headers, rows) {
  const columnTypes = {};
  headers.forEach((h) => {
    const values = rows.map((r) => r[h]).filter((v) => !isEmptyCell(v));
    if (!values.length) {
      columnTypes[h] = "categorical";
      return;
    }

    const dateCount = values.filter(isDateLike).length;
    const numericCount = values.filter((v) => !isNaN(parseLooseNumber(v))).length;

    const nums = values.map(parseLooseNumber).filter((n) => !isNaN(n));
    const uniqueNums = new Set(nums.map((n) => String(n)));
    const maxAbs = nums.length ? Math.max(...nums.map(Math.abs)) : 0;
    const nameLooksLikeId = /^(id|emp|employee|sku|code|zip|postal|pin|ssn|uuid)\b/i.test(
      String(h).trim()
    );
    const mostlyUniqueSmallInts =
      nums.length > 10 &&
      uniqueNums.size / nums.length > 0.9 &&
      nums.every((n) => Number.isInteger(n)) &&
      maxAbs > 0 &&
      maxAbs < 100000 &&
      (nameLooksLikeId || maxAbs <= Math.max(nums.length * 20, 9999));

    if (dateCount / values.length > 0.6) columnTypes[h] = "date";
    else if (!mostlyUniqueSmallInts && numericCount / values.length > 0.8) columnTypes[h] = "numeric";
    else columnTypes[h] = "categorical";
  });
  return columnTypes;
}

function computeStats(headers, rows, columnTypes) {
  const stats = {};
  headers.forEach((h) => {
    if (columnTypes[h] === "numeric") {
      const vals = rows.map((r) => parseLooseNumber(r[h])).filter((v) => !isNaN(v));
      if (vals.length) {
        const sum = vals.reduce((a, b) => a + b, 0);
        const sorted = [...vals].sort((a, b) => a - b);
        stats[h] = {
          min: sorted[0],
          max: sorted[sorted.length - 1],
          mean: sum / vals.length,
          count: vals.length,
          sum,
        };
      }
    } else {
      const buckets = new Map();
      rows.forEach((r) => {
        const raw = r[h];
        if (isEmptyCell(raw)) return;
        const display = String(formatDateValue(raw)).trim().replace(/\s+/g, " ");
        const key = display.toLowerCase();
        const b = buckets.get(key) || { count: 0, displays: new Map() };
        b.count += 1;
        b.displays.set(display, (b.displays.get(display) || 0) + 1);
        buckets.set(key, b);
      });
      const sorted = [...buckets.entries()]
        .map(([, b]) => {
          const preferred = [...b.displays.entries()].sort((a, c) => c[1] - a[1])[0][0];
          return [preferred, b.count];
        })
        .sort((a, b) => b[1] - a[1]);
      stats[h] = {
        unique: sorted.length,
        topValues: sorted.slice(0, 15).map(([val, count]) => ({ val, count })),
      };
    }
  });
  return stats;
}

function roundNice(n) {
  if (!isFinite(n)) return n;
  return Math.round(n * 1000) / 1000;
}

function aggregateGroupMetric(rows, cat, num, columnTypes, maxGroups) {
  const buckets = new Map();
  for (const row of rows) {
    if (isEmptyCell(row[cat])) continue;
    const display = String(formatDateValue(row[cat])).trim().replace(/\s+/g, " ");
    const key = display.toLowerCase();
    const val = num === "__count__" ? 1 : parseLooseNumber(row[num]);
    if (num !== "__count__" && isNaN(val)) continue;
    const b = buckets.get(key) || {
      sum: 0,
      count: 0,
      min: Infinity,
      max: -Infinity,
      displays: new Map(),
    };
    b.sum += val;
    b.count += 1;
    if (val < b.min) b.min = val;
    if (val > b.max) b.max = val;
    b.displays.set(display, (b.displays.get(display) || 0) + 1);
    buckets.set(key, b);
  }

  if (buckets.size < 2) return null;

  let groups = [...buckets.entries()].map(([, b]) => {
    const preferred = [...b.displays.entries()].sort((a, c) => c[1] - a[1])[0][0];
    return {
      key: preferred || titleCaseWords([...b.displays.keys()][0]),
      sum: roundNice(b.sum),
      avg: roundNice(b.sum / b.count),
      count: b.count,
      min: roundNice(b.min),
      max: roundNice(b.max),
    };
  });

  const allDates =
    columnTypes[cat] === "date" ||
    groups.every((g) => isDateLike(g.key) || /^\d{4}-\d{2}-\d{2}/.test(g.key));
  if (allDates) {
    groups.sort((a, b) => Date.parse(a.key) - Date.parse(b.key));
  } else if (num === "__count__") {
    groups.sort((a, b) => b.count - a.count);
  } else {
    groups.sort((a, b) => b.sum - a.sum);
  }

  if (groups.length > maxGroups) {
    const head = groups.slice(0, maxGroups - 1);
    const rest = groups.slice(maxGroups - 1);
    const other = rest.reduce(
      (acc, g) => {
        acc.sum += g.sum;
        acc.count += g.count;
        acc.min = Math.min(acc.min, g.min);
        acc.max = Math.max(acc.max, g.max);
        return acc;
      },
      { key: "Other", sum: 0, count: 0, min: Infinity, max: -Infinity }
    );
    other.avg = other.count ? roundNice(other.sum / other.count) : 0;
    other.sum = roundNice(other.sum);
    other.min = roundNice(other.min);
    other.max = roundNice(other.max);
    groups = [...head, other];
  }

  return { groupBy: cat, metric: num, groups };
}

function buildPrecomputedAggregations(rows, headers, columnTypes, options = {}) {
  const maxCats = options.maxCats ?? 12;
  const maxUnique = options.maxUnique ?? 50;
  const maxGroups = options.maxGroups ?? 25;
  const maxAggs = options.maxAggs ?? 30;

  const fileCount = new Set(rows.map((r) => r["Source File"]).filter(Boolean)).size;

  const catCols = headers.filter(
    (h) =>
      (columnTypes[h] === "categorical" || columnTypes[h] === "date") &&
      (h !== "Source File" || fileCount > 1) &&
      h !== "File Sheet"
  );
  const numCols = headers.filter((h) => columnTypes[h] === "numeric");

  const usableCats = catCols
    .map((h) => {
      const uniq = new Set(
        rows
          .map((r) => (isEmptyCell(r[h]) ? null : normalizeCategoryKey(r[h])))
          .filter(Boolean)
      );
      return { h, unique: uniq.size };
    })
    .filter((c) => c.unique >= 2 && c.unique <= maxUnique)
    .filter((c) => !/^(email|phone|address|ssn|uuid)$/i.test(c.h.trim()))
    .map((c) => {
      const n = c.h.toLowerCase();
      let score = 0;
      if (c.unique >= 2 && c.unique <= 15) score += 8;
      else score += 4;
      if (/(file|source file|sheet|tab|department|dept|location|region|city|status|gender|role|team|category|product)/i.test(n)) {
        score += 10;
      }
      if (columnTypes[c.h] === "date") score -= 2;
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score || a.unique - b.unique)
    .slice(0, maxCats);

  const usableNums = [...numCols]
    .map((h) => {
      const n = h.toLowerCase();
      let score = 0;
      if (/(ctc|salary|revenue|sales|amount|cost|profit|budget|income|wage|pay)/i.test(n)) score += 20;
      else if (/(rating|score|performance)/i.test(n)) score += 10;
      else if (/(hour|age|count|qty|quantity|floor)/i.test(n)) score += 5;
      return { h, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.h)
    .slice(0, 8);

  const aggregations = [];
  const primaryNum = usableNums[0];

  for (const { h: cat } of usableCats) {
    const agg = aggregateGroupMetric(rows, cat, "__count__", columnTypes, maxGroups);
    if (agg) aggregations.push(agg);
  }

  if (primaryNum) {
    for (const { h: cat } of usableCats) {
      const agg = aggregateGroupMetric(rows, cat, primaryNum, columnTypes, maxGroups);
      if (agg) aggregations.push(agg);
    }
  }

  const topCats = usableCats.slice(0, 6);
  for (const num of usableNums.slice(1)) {
    for (const { h: cat } of topCats) {
      const agg = aggregateGroupMetric(rows, cat, num, columnTypes, maxGroups);
      if (agg) aggregations.push(agg);
    }
  }

  return aggregations.slice(0, maxAggs);
}

function buildRepresentativeSample(rows, maxRows = 40) {
  if (!rows.length) return [];
  if (rows.length <= maxRows) return rows.map(normalizeRow);

  const sample = [];
  const step = rows.length / maxRows;
  for (let i = 0; i < maxRows; i++) {
    const idx = Math.min(rows.length - 1, Math.floor(i * step));
    sample.push(normalizeRow(rows[idx]));
  }
  const last = normalizeRow(rows[rows.length - 1]);
  if (JSON.stringify(sample[sample.length - 1]) !== JSON.stringify(last)) {
    sample[sample.length - 1] = last;
  }
  return sample;
}

function formatAggregationsForPrompt(aggregations) {
  if (!aggregations?.length) return "None available.";
  return aggregations
    .map((agg) => {
      const metricLabel = agg.metric === "__count__" ? "row_count" : agg.metric;
      const lines = agg.groups
        .map(
          (g) =>
            `    "${g.key}": sum=${g.sum}, avg=${g.avg}, count=${g.count}, min=${g.min}, max=${g.max}`
        )
        .join("\n");
      return `  Grouped by "${agg.groupBy}" → metric "${metricLabel}":\n${lines}`;
    })
    .join("\n");
}

/* =========================================================================
   FUZZY MATCHING & SPELLING / CASING NORMALIZATION UTILITIES
   ========================================================================= */

function normalizeString(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[_\-\\/]+/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function fuzzySimilarity(str1, str2) {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  if (!s1 && !s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1 === s2) return 1.0;

  // Substring match
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    if (minLen >= 3) {
      return Math.max(0.85, minLen / maxLen);
    }
  }

  // Token matching for multi-word phrases
  const tokens1 = s1.split(" ").filter(Boolean);
  const tokens2 = s2.split(" ").filter(Boolean);
  if (tokens1.length > 1 || tokens2.length > 1) {
    let matchedTokens = 0;
    for (const t1 of tokens1) {
      for (const t2 of tokens2) {
        if (
          t1 === t2 ||
          (t1.length >= 3 &&
            t2.length >= 3 &&
            (t1.includes(t2) ||
              t2.includes(t1) ||
              levenshteinDistance(t1, t2) <= 1))
        ) {
          matchedTokens++;
          break;
        }
      }
    }
    const tokenScore = (matchedTokens * 2) / (tokens1.length + tokens2.length);
    if (tokenScore > 0.7) return Math.min(0.95, tokenScore);
  }

  const dist = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return Math.max(0, 1 - dist / maxLen);
}

function findBestMatch(token, candidates, threshold = 0.65) {
  let best = null;
  let bestScore = -1;
  for (const c of candidates) {
    const score = fuzzySimilarity(token, c);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      best = c;
    }
  }
  return { match: best, score: bestScore };
}

/* =========================================================================
   DYNAMIC MULTI-TAB QUERY RESOLUTION & CALCULATION ENGINE
   ========================================================================= */

const STOP_WORDS = new Set([
  "the", "and", "for", "what", "is", "of", "show", "by", "in", "to", "at",
  "with", "from", "are", "were", "was", "how", "many", "all", "each", "per",
  "tab", "sheet", "tabs", "sheets", "file", "data", "row", "rows", "column",
  "columns", "tell", "me", "give", "can", "you", "does", "have", "an", "a"
]);

const METRIC_SYNONYMS = {
  sales: ["amount", "revenue", "sales", "turnover", "total", "val"],
  salery: ["salary", "amount", "ctc", "pay", "wage", "compensation"],
  salary: ["salary", "amount", "ctc", "pay", "wage", "compensation"],
  revenue: ["revenue", "amount", "sales", "income", "total"],
  budget: ["budget", "allocation", "cost", "expense", "spending"],
  budjet: ["budget", "allocation", "cost", "expense", "spending"],
  cost: ["cost", "expense", "budget", "spending", "price"],
  price: ["price", "cost", "amount", "rate", "fee"],
  quantity: ["quantity", "qty", "volume", "units", "count"],
  hours: ["hours", "time", "duration", "estimatedhours"],
};

function executeDataQuery({ query, rows, sheetsData, headers, columnTypes, stats, sheetInfo }) {
  const normQuery = normalizeString(query);
  const queryTokens = normQuery.split(" ").filter(Boolean);
  const fileNames = [...new Set(rows.map((r) => r["Source File"]).filter(Boolean))];

  // 1. Overview check (only if not asking for a calculation like total, avg, etc.)
  const hasCalc = /(total|totel|sum|avg|average|avrage|mean|min|minimum|max|maximum|highest|lowest|difference|compare|vs)/i.test(query);
  const isOverview =
    !hasCalc &&
    (/(how many|list|what|all|show)\s+(sheets?|tabs?|files?|workbooks?)/i.test(query) ||
      /^(sheets?|tabs?|files?|workbooks?)$/i.test(normQuery) ||
      /(names? of (the )?(sheets?|tabs?|files?))/i.test(query) ||
      /(summary (of|across) (all )?files?)/i.test(query));

  if (isOverview && sheetInfo && sheetInfo.length > 0) {
    if (fileNames.length > 1) {
      const fileSummary = fileNames.map((f) => {
        const fSheets = sheetInfo.filter((s) => s.file === f);
        const totalRows = fSheets.reduce((a, b) => a + b.rowCount, 0);
        return `"${f}" (${fSheets.length} tab(s), ${totalRows} rows: ${fSheets.map((s) => `"${s.sheetName}" [${s.rowCount} rows]`).join(", ")})`;
      });
      return {
        type: "file_overview",
        answer: `Workbook contains ${fileNames.length} file(s) with ${sheetInfo.length} total tab(s) and ${rows.length} total rows: ${fileSummary.join("; ")}.`,
        files: fileNames,
        sheets: sheetInfo.map((s) => ({
          file: s.file,
          sheet: s.sheetName,
          rowCount: s.rowCount,
          columns: s.headers,
        })),
      };
    } else {
      return {
        type: "sheet_overview",
        answer: `Workbook contains ${sheetInfo.length} sheet(s): ${sheetInfo
          .map(
            (s) =>
              `"${s.sheetName}" (${s.rowCount} rows, ${s.headers?.length || 0} columns)`
          )
          .join(", ")}.`,
        sheets: sheetInfo.map((s) => ({
          file: s.file,
          sheet: s.sheetName,
          rowCount: s.rowCount,
          columns: s.headers,
        })),
      };
    }
  }

  // 2. Multi-file comparison detection
  const isComparingFiles =
    fileNames.length > 1 &&
    /(compare files?|by file|per file|between files?|each file|across files?|difference between|vs)/i.test(query);

  // 3. Detect target file if specified (unless comparing files)
  let targetFile = null;
  if (fileNames.length > 1 && !isComparingFiles) {
    if (/(first file|file 1|1st file)/i.test(query)) targetFile = fileNames[0];
    else if (/(second file|file 2|2nd file)/i.test(query)) targetFile = fileNames[1];
    else if (/(third file|file 3|3rd file)/i.test(query)) targetFile = fileNames[2];

    if (!targetFile) {
      for (const fn of fileNames) {
        const fnNorm = normalizeString(fn);
        const baseName = fn.replace(/\.[^/.]+$/, "");
        const baseNorm = normalizeString(baseName);
        if (normQuery.includes(fnNorm) || (baseNorm.length >= 4 && normQuery.includes(baseNorm))) {
          targetFile = fn;
          break;
        }
        for (const t of queryTokens) {
          if (t.length >= 4 && (fuzzySimilarity(t, fnNorm) >= 0.85 || fuzzySimilarity(t, baseNorm) >= 0.85)) {
            targetFile = fn;
            break;
          }
        }
        if (targetFile) break;
      }
    }
  }

  // 4. Identify potential numeric columns from headers (prioritizing non-ID columns)
  const allNumCols = headers.filter(
    (h) =>
      columnTypes[h] === "numeric" &&
      h !== "Source File" &&
      h !== "Sheet" &&
      h !== "File Sheet"
  );
  const businessNumCols = allNumCols.filter(
    (c) => !/^(order|id|emp|code|sku|zip|pin|postal)\b/i.test(c.trim())
  );
  const candidateNumCols = businessNumCols.length > 0 ? businessNumCols : allNumCols;

  let targetNumCol = null;
  let bestNumScore = 0.65;
  for (const nc of candidateNumCols) {
    const ncNorm = normalizeString(nc);
    if (normQuery.includes(ncNorm)) {
      targetNumCol = nc;
      break;
    }
    for (let i = 0; i < queryTokens.length; i++) {
      const singleScore = fuzzySimilarity(queryTokens[i], nc);
      if (singleScore > bestNumScore) {
        bestNumScore = singleScore;
        targetNumCol = nc;
      }
      if (i < queryTokens.length - 1) {
        const doubleToken = `${queryTokens[i]} ${queryTokens[i + 1]}`;
        const doubleScore = fuzzySimilarity(doubleToken, nc);
        if (doubleScore > bestNumScore) {
          bestNumScore = doubleScore;
          targetNumCol = nc;
        }
      }
    }
  }

  // Synonym fallback for metrics
  if (!targetNumCol) {
    for (const [concept, syns] of Object.entries(METRIC_SYNONYMS)) {
      if (normQuery.includes(concept) || queryTokens.some((t) => fuzzySimilarity(t, concept) >= 0.8)) {
        for (const syn of syns) {
          const found = candidateNumCols.find(
            (c) => normalizeString(c) === syn || normalizeString(c).includes(syn)
          );
          if (found) {
            targetNumCol = found;
            break;
          }
        }
        if (targetNumCol) break;
      }
    }
  }

  // 5. Detect target sheet if specified or implied
  let targetSheet = null;
  const sheetNames = sheetInfo
    ? [...new Set(sheetInfo.map((s) => s.sheetName))]
    : Object.keys(sheetsData || {});

  const mentionsSheetOrTab = /(sheet|tab)/i.test(query);
  for (const sName of sheetNames) {
    const sNorm = normalizeString(sName);
    if (normQuery.includes(sNorm) && (mentionsSheetOrTab || !headers.includes(sName))) {
      targetSheet = sName;
      break;
    }
    for (const t of queryTokens) {
      if (
        t.length >= 4 &&
        fuzzySimilarity(t, sName) >= 0.8 &&
        (mentionsSheetOrTab || !headers.includes(sName))
      ) {
        targetSheet = sName;
        break;
      }
    }
    if (targetSheet) break;
  }

  // Scoped rows & headers
  let activeRows = rows;
  if (targetFile) {
    activeRows = activeRows.filter((r) => r["Source File"] === targetFile);
  }
  if (targetSheet) {
    activeRows = activeRows.filter((r) => r["Sheet"] === targetSheet);
  }

  // If targetSheet was not specified, but targetNumCol exists only in a specific sheet:
  if (!targetSheet && targetNumCol && sheetInfo) {
    const sheetsWithMetric = sheetInfo.filter((s) => s.headers && s.headers.includes(targetNumCol));
    if (sheetsWithMetric.length > 0 && sheetsWithMetric.every((s) => s.sheetName === sheetsWithMetric[0].sheetName)) {
      targetSheet = sheetsWithMetric[0].sheetName;
      activeRows = activeRows.filter((r) => r["Sheet"] === targetSheet);
    }
  }

  // 6. Detect operation
  let operation = "general";
  if (/(total|totel|sum|overall|aggregate)/i.test(query)) operation = "sum";
  else if (/(average|avg|avrage|mean)/i.test(query)) operation = "avg";
  else if (/(how many|count|number of|num of|rows)/i.test(query)) operation = "count";
  else if (/(min|minimum|lowest|least|bottom|cheapest)/i.test(query)) operation = "min";
  else if (/(max|maximum|highest|most|top|greatest|expensive|best)/i.test(query)) operation = "max";
  else if (/(who|which|show|list|find|details|detail)/i.test(query)) operation = "lookup";

  if (!targetNumCol && ["sum", "avg", "min", "max"].includes(operation)) {
    if (candidateNumCols.length > 0) targetNumCol = candidateNumCols[0];
  }

  // 7. Detect Group By (including comparison by file)
  let targetGroupByCol = null;
  if (isComparingFiles) {
    targetGroupByCol = "Source File";
  }

  if (!targetGroupByCol) {
    const catCols = headers.filter(
      (h) => columnTypes[h] !== "numeric" && h !== "File Sheet" && (h !== "Source File" || fileNames.length > 1)
    );
    const isGroupBy = /(by|per|each|breakdown|distribution|across)\s+([a-zA-Z_\s]+)/i.exec(query);
    if (isGroupBy) {
      const phrase = isGroupBy[2].trim().split(" ")[0];
      const match = findBestMatch(phrase, catCols, 0.65);
      if (match.match) targetGroupByCol = match.match;
    }
    if (!targetGroupByCol) {
      for (const cc of catCols) {
        if (normQuery.includes(normalizeString(cc))) {
          if (/(by|per|group|each)/i.test(query)) {
            targetGroupByCol = cc;
            break;
          }
        }
      }
    }
  }

  // 8. Detect filters (specific category values or entities mentioned in query)
  const matchedFilters = [];
  const filterCatCols = headers.filter(
    (h) => columnTypes[h] !== "numeric" && h !== "Source File" && h !== "File Sheet"
  );

  for (const cc of filterCatCols) {
    const uniqueVals = new Set();
    for (const r of activeRows) {
      if (r[cc] !== null && r[cc] !== undefined && r[cc] !== "") {
        uniqueVals.add(String(r[cc]));
      }
    }

    for (const val of uniqueVals) {
      const valNorm = normalizeString(val);
      if (valNorm.length < 2) continue;

      let isMatch = false;
      if (normQuery.includes(valNorm)) {
        isMatch = true;
      } else {
        const valWordCount = valNorm.split(" ").length;
        for (let i = 0; i <= queryTokens.length - valWordCount; i++) {
          const slice = queryTokens.slice(i, i + valWordCount).join(" ");
          if (fuzzySimilarity(slice, val) >= 0.75) {
            isMatch = true;
            break;
          }
        }

        if (!isMatch) {
          const valWords = valNorm.split(" ").filter((w) => w.length >= 3);
          for (const vw of valWords) {
            for (const qt of queryTokens) {
              if (
                qt.length >= 3 &&
                !STOP_WORDS.has(qt) &&
                (vw === qt || fuzzySimilarity(vw, qt) >= 0.8)
              ) {
                isMatch = true;
                break;
              }
            }
            if (isMatch) break;
          }
        }
      }

      if (isMatch) {
        matchedFilters.push({ column: cc, value: val });
        break;
      }
    }
  }

  // Apply filters
  let filteredRows = activeRows;
  for (const f of matchedFilters) {
    filteredRows = filteredRows.filter((r) => {
      const cellVal = String(r[f.column] ?? "");
      return fuzzySimilarity(cellVal, f.value) >= 0.75;
    });
  }

  // Group by
  if (targetGroupByCol) {
    const groups = {};
    for (const r of filteredRows) {
      const key = String(r[targetGroupByCol] ?? "Unknown").trim();
      if (!groups[key]) {
        groups[key] = { count: 0, sum: 0, min: Infinity, max: -Infinity };
      }
      groups[key].count++;
      if (targetNumCol) {
        const val = parseLooseNumber(r[targetNumCol]);
        if (!isNaN(val)) {
          groups[key].sum += val;
          if (val < groups[key].min) groups[key].min = val;
          if (val > groups[key].max) groups[key].max = val;
        }
      }
    }
    const breakdown = Object.entries(groups)
      .map(([k, v]) => ({
        key: k,
        count: v.count,
        sum: Math.round(v.sum * 100) / 100,
        avg: v.count ? Math.round((v.sum / v.count) * 100) / 100 : 0,
        min: v.min === Infinity ? 0 : v.min,
        max: v.max === -Infinity ? 0 : v.max,
      }))
      .sort((a, b) => b.sum - a.sum || b.count - a.count);

    return {
      type: "group_breakdown",
      targetFile,
      targetSheet,
      matchedFilters,
      groupBy: targetGroupByCol,
      metric: targetNumCol || "count",
      groups: breakdown,
    };
  }

  // Aggregation or min/max ranking
  if (targetNumCol) {
    let sortedRows = [...filteredRows];
    if (operation === "max" || /(highest|maximum|top|greatest|most)/i.test(query)) {
      sortedRows.sort(
        (a, b) => parseLooseNumber(b[targetNumCol]) - parseLooseNumber(a[targetNumCol])
      );
    } else if (operation === "min" || /(lowest|minimum|bottom|least)/i.test(query)) {
      sortedRows.sort(
        (a, b) => parseLooseNumber(a[targetNumCol]) - parseLooseNumber(b[targetNumCol])
      );
    }

    const vals = filteredRows
      .map((r) => parseLooseNumber(r[targetNumCol]))
      .filter((n) => !isNaN(n));
    const sum = vals.reduce((a, b) => a + b, 0);
    const count = vals.length;
    const avg = count ? sum / count : 0;
    const min = count ? Math.min(...vals) : 0;
    const max = count ? Math.max(...vals) : 0;

    return {
      type: "aggregation",
      targetFile,
      targetSheet,
      matchedFilters,
      metric: targetNumCol,
      operation,
      stats: {
        sum: Math.round(sum * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        count,
        min,
        max,
      },
      topRecord: sortedRows[0] || null,
      matchingRows: sortedRows.slice(0, 10),
    };
  }

  // Filter result / lookup / general count
  return {
    type: "filter_result",
    targetFile,
    targetSheet,
    matchedFilters,
    count: filteredRows.length,
    matchingRows: filteredRows.slice(0, 15),
  };
}

function formatQueryResultForPrompt(qr) {
  if (!qr) return "No specific query computation available.";
  let lines = [];
  lines.push(`==EXACT VERIFIED QUERY COMPUTATION (SOURCE OF TRUTH)==`);
  if (qr.targetFile) lines.push(`Target File: "${qr.targetFile}"`);
  if (qr.targetSheet) lines.push(`Target Sheet/Tab: "${qr.targetSheet}"`);
  if (qr.matchedFilters?.length) {
    lines.push(
      `Applied Filters: ${qr.matchedFilters.map((f) => `"${f.column}" = "${f.value}"`).join(", ")}`
    );
  }

  if (qr.type === "file_overview" || qr.type === "sheet_overview") {
    lines.push(`Overview: ${qr.answer}`);
    if (qr.sheets) {
      qr.sheets.forEach((s) => {
        lines.push(`  * ${s.file ? `[${s.file}] ` : ""}Tab "${s.sheet}": ${s.rowCount} rows. Columns: ${s.columns.join(", ")}`);
      });
    }
  } else if (qr.type === "group_breakdown") {
    lines.push(`Group Breakdown by "${qr.groupBy}" → Metric "${qr.metric}":`);
    qr.groups.slice(0, 15).forEach((g) => {
      lines.push(
        `  * "${g.key}": sum=${g.sum}, avg=${g.avg}, count=${g.count}, min=${g.min}, max=${g.max}`
      );
    });
  } else if (qr.type === "aggregation") {
    lines.push(`Operation: ${qr.operation} on column "${qr.metric}"`);
    lines.push(
      `Verified Stats: sum=${qr.stats.sum}, avg=${qr.stats.avg}, count=${qr.stats.count}, min=${qr.stats.min}, max=${qr.stats.max}`
    );
    if (qr.topRecord) {
      lines.push(`Top matching row: ${JSON.stringify(qr.topRecord)}`);
    }
    if (qr.matchingRows?.length) {
      lines.push(
        `Sample matching rows:\n${qr.matchingRows.map((r, i) => `  ${i + 1}. ${JSON.stringify(r)}`).join("\n")}`
      );
    }
  } else if (qr.type === "filter_result") {
    lines.push(`Matching Rows Count: ${qr.count}`);
    if (qr.matchingRows?.length) {
      lines.push(
        `Matching rows preview:\n${qr.matchingRows.map((r, i) => `  ${i + 1}. ${JSON.stringify(r)}`).join("\n")}`
      );
    }
  }

  return lines.join("\n");
}

function formatSheetsOverviewForPrompt(sheetInfo) {
  if (!sheetInfo || !sheetInfo.length) return "Single sheet file.";
  const files = [...new Set(sheetInfo.map((s) => s.file).filter(Boolean))];
  if (files.length > 1) {
    return files
      .map((f, i) => {
        const fileSheets = sheetInfo.filter((s) => s.file === f);
        const totalRows = fileSheets.reduce((a, b) => a + b.rowCount, 0);
        const sheetLines = fileSheets
          .map(
            (s) =>
              `    * Tab "${s.sheetName}" (${s.rowCount} rows, ${s.headers?.length || 0} cols: ${s.headers?.join(", ")})`
          )
          .join("\n");
        return `  File ${i + 1}: "${f}" (${fileSheets.length} tabs, ${totalRows} total rows):\n${sheetLines}`;
      })
      .join("\n");
  }
  return sheetInfo
    .map(
      (s, i) =>
        `  Tab ${i + 1}: "${s.sheetName}" (${s.rowCount} rows, ${s.headers?.length || 0} columns: ${s.headers?.join(", ")})`
    )
    .join("\n");
}

module.exports = {
  parseLooseNumber,
  isDateLike,
  formatDateValue,
  isEmptyCell,
  isBlankRow,
  normalizeRow,
  ensureFullSheetRef,
  pickBestSheetName,
  detectHeaderRowIndex,
  sheetToCleanJson,
  detectColumnTypes,
  computeStats,
  buildPrecomputedAggregations,
  buildRepresentativeSample,
  formatAggregationsForPrompt,
  // New fuzzy matching and query resolution exports
  normalizeString,
  levenshteinDistance,
  fuzzySimilarity,
  findBestMatch,
  executeDataQuery,
  formatQueryResultForPrompt,
  formatSheetsOverviewForPrompt,
};
