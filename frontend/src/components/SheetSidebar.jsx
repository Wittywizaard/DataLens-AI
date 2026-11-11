// SheetSidebar.jsx – Professional sidebar showing sheet tabs and columns
// ------------------------------------------------------------
// This component receives the parsed sheet information from the backend
// (`sheetInfo`), the currently active sheet key, and a callback to change
// the active sheet. It renders a compact, theme‑aware sidebar that lists
// the exact column headers for the selected sheet – no placeholder or
// irrelevant columns.
// ------------------------------------------------------------

import React from "react";

/**
 * Props definition
 * @typedef {Object} SheetInfo
 * @property {string[]} headers – list of column names for the sheet
 * @property {any[][]} rows – raw row data (not used here but kept for future features)
 *
 * @typedef {Object} Props
 * @property {Record<string, SheetInfo>} sheetInfo – mapping sheetId → sheet data
 * @property {string|null} activeSheetKey – currently selected sheet identifier
 * @property {(key: string) => void} onSelectSheet – callback when user selects a different sheet
 */

/**
 * Professional sidebar component.
 *
 * It displays a horizontal tab bar (if multiple sheets) and a vertical list
 * of column headers for the active sheet. The UI follows the same colour
 * palette as the rest of the app, using TailwindCSS utilities already present
 * in the project.
 */
export default function SheetSidebar({ sheetInfo = {}, activeSheetKey = null, onSelectSheet }) {
  // Filter out placeholder column names like "Column_1", "Column_2"
  const isPlaceholder = (h) => /^Column_\d+$/.test(h);
  const sheetKeys = Object.keys(sheetInfo).sort();
  const currentKey = activeSheetKey && sheetInfo[activeSheetKey] ? activeSheetKey : sheetKeys[0];
  const rawHeaders = sheetInfo[currentKey]?.headers || [];
  const headers = rawHeaders.filter(h => h && !isPlaceholder(h));
  // Derive list of sheet keys sorted alphabetically for deterministic order
  const sheetKeys = Object.keys(sheetInfo).sort();

  // If there is no data yet, render a placeholder
  if (sheetKeys.length === 0) {
    return (
      <aside className="w-64 bg-slate-900 text-slate-200 p-4 hidden md:block">
        <p className="text-sm">No sheet data loaded.</p>
      </aside>
    );
  }

  // Ensure a valid active key – default to first sheet if null/undefined
  const currentKey = activeSheetKey && sheetInfo[activeSheetKey] ? activeSheetKey : sheetKeys[0];
  const { headers = [] } = sheetInfo[currentKey] || {};

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 hidden md:block">
      {/* ---------- Sheet Tabs (only shown if >1 sheet) ---------- */}
      {sheetKeys.length > 1 && (
        <nav className="flex border-b border-slate-800">
          {sheetKeys.map((key) => (
            <button
              key={key}
              onClick={() => onSelectSheet(key)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${key === currentKey ? "bg-slate-800 text-white" : "hover:bg-slate-800"}`}
            >
              {sheetInfo[key].name || key}
            </button>
          ))}
        </nav>
      )}

      {/* ---------- Column list ---------- */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold uppercase mb-2 text-slate-400">
          Columns ({headers.length})
        </h3>
        {headers.length === 0 ? (
          <p className="text-xs text-slate-500">(no columns)</p>
        ) : (
          <ul className="space-y-1">
            {headers.map((h, i) => (
              <li
                key={i}
                className="text-xs truncate hover:text-white transition-colors"
                title={h}
              >
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

