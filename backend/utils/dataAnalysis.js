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
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Pick the densest worksheet (most populated cells) when a workbook has many sheets.
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
 */
function detectHeaderRowIndex(aoa, maxScan = 15) {
  const limit = Math.min(aoa.length, maxScan);
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < limit; i++) {
    const row = aoa[i] || [];
    const nonEmpty = row.filter((c) => !isEmptyCell(c));
    if (nonEmpty.length < 2) continue;

    const strings = nonEmpty.filter((c) => typeof c === "string" || typeof c === "number");
    const unique = new Set(nonEmpty.map((c) => String(c).trim().toLowerCase()));
    const next = aoa[i + 1] || [];
    const nextNonEmpty = next.filter((c) => !isEmptyCell(c)).length;

    // Prefer rows that look like labels followed by a denser data row
    const score =
      nonEmpty.length * 2 +
      (unique.size === nonEmpty.length ? 3 : 0) +
      (strings.length / nonEmpty.length) * 2 +
      (nextNonEmpty >= nonEmpty.length * 0.5 ? 4 : 0) -
      (nonEmpty.every((c) => typeof c === "number") ? 5 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function sheetToCleanJson(sheet) {
  const aoa = XLSX_utils_sheet_to_json_safe(sheet);
  if (!aoa.length) return { headers: [], rows: [] };

  const headerIdx = detectHeaderRowIndex(aoa);
  const headerCells = (aoa[headerIdx] || []).map((c, i) => {
    const label = isEmptyCell(c) ? `Column_${i + 1}` : String(c).trim();
    return label || `Column_${i + 1}`;
  });

  // Deduplicate header names
  const seen = {};
  const headers = headerCells.map((h) => {
    if (!seen[h]) {
      seen[h] = 1;
      return h;
    }
    seen[h] += 1;
    return `${h}_${seen[h]}`;
  });

  const rows = [];
  for (let r = headerIdx + 1; r < aoa.length; r++) {
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
        }
        obj[headers[c]] = val;
        any = true;
      }
    }
    if (any) rows.push(obj);
  }

  return { headers, rows };
}

// Avoid requiring xlsx at module top of helpers used in tests; upload already has it.
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

    // IDs / zip-like: nearly-unique small integers → categorical.
    // Large magnitudes (salary, revenue, CTC) stay numeric even if mostly unique.
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
      // Case-insensitive frequency with preferred display spelling
      const buckets = new Map(); // key -> { count, displays: Map }
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
  const buckets = new Map(); // normalized key -> stats + display votes
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

/**
 * Precompute category × numeric aggregations from the FULL dataset.
 */
function buildPrecomputedAggregations(rows, headers, columnTypes, options = {}) {
  const maxCats = options.maxCats ?? 10;
  const maxUnique = options.maxUnique ?? 40;
  const maxGroups = options.maxGroups ?? 25;
  const maxAggs = options.maxAggs ?? 24;

  const catCols = headers.filter(
    (h) =>
      (columnTypes[h] === "categorical" || columnTypes[h] === "date") &&
      h !== "Source File"
  );
  const numCols = headers.filter((h) => columnTypes[h] === "numeric");

  // Prefer real business dimensions (dept/location/level) over names/IDs/binary flags
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
    .filter((c) => !/^(name|employee id|emp id|email|phone|address)$/i.test(c.h.trim()))
    .map((c) => {
      const n = c.h.toLowerCase();
      let score = 0;
      if (c.unique >= 3 && c.unique <= 15) score += 8;
      else if (c.unique === 2) score += 2;
      else score += 4;
      if (/(department|dept|location|region|city|level|band|status|gender|active|qualif|role|team|category)/i.test(n)) {
        score += 10;
      }
      if (columnTypes[c.h] === "date") score -= 3;
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score || a.unique - b.unique)
    .slice(0, maxCats);

  // Prefer money/rating metrics first
  const usableNums = [...numCols]
    .map((h) => {
      const n = h.toLowerCase();
      let score = 0;
      if (/(ctc|salary|revenue|sales|amount|cost|profit|income|wage|pay)/i.test(n)) score += 20;
      else if (/(rating|score|performance)/i.test(n)) score += 10;
      else if (/(hour|age|count|qty|quantity)/i.test(n)) score += 5;
      return { h, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.h)
    .slice(0, 5);

  const aggregations = [];
  const primaryNum = usableNums[0];

  // 1) Count breakdown for every usable category
  for (const { h: cat } of usableCats) {
    const agg = aggregateGroupMetric(rows, cat, "__count__", columnTypes, maxGroups);
    if (agg) aggregations.push(agg);
  }

  // 2) Primary metric (e.g. CTC) across all usable categories — highest value for accuracy
  if (primaryNum) {
    for (const { h: cat } of usableCats) {
      const agg = aggregateGroupMetric(rows, cat, primaryNum, columnTypes, maxGroups);
      if (agg) aggregations.push(agg);
    }
  }

  // 3) Remaining metrics for the top business categories only
  const topCats = usableCats.slice(0, 5);
  for (const num of usableNums.slice(1)) {
    for (const { h: cat } of topCats) {
      const agg = aggregateGroupMetric(rows, cat, num, columnTypes, maxGroups);
      if (agg) aggregations.push(agg);
    }
  }

  return aggregations.slice(0, maxAggs);
}

/**
 * Stratified / representative sample for schema context (NOT for computing answers).
 */
function buildRepresentativeSample(rows, maxRows = 40) {
  if (!rows.length) return [];
  if (rows.length <= maxRows) return rows.map(normalizeRow);

  const sample = [];
  const step = rows.length / maxRows;
  for (let i = 0; i < maxRows; i++) {
    const idx = Math.min(rows.length - 1, Math.floor(i * step));
    sample.push(normalizeRow(rows[idx]));
  }
  // Always include last row
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

module.exports = {
  parseLooseNumber,
  isDateLike,
  formatDateValue,
  isEmptyCell,
  isBlankRow,
  normalizeRow,
  pickBestSheetName,
  detectHeaderRowIndex,
  sheetToCleanJson,
  detectColumnTypes,
  computeStats,
  buildPrecomputedAggregations,
  buildRepresentativeSample,
  formatAggregationsForPrompt,
};
