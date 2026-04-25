import React, { useState, useCallback } from "react";
import type { ModuleClassification } from "../../../../shared/protocol";

const ALL_CLASSIFICATIONS: ModuleClassification[] = [
  "entry",
  "leaf",
  "barrel",
  "core",
  "utility",
  "test",
];

const CLASSIFICATION_COLORS: Record<string, string> = {
  entry: "#4fc3f7",
  leaf: "#81c784",
  barrel: "#ffb74d",
  core: "#e57373",
  utility: "#ba68c8",
  test: "#90a4ae",
};

export interface FilterState {
  searchQuery: string;
  enabledClassifications: Set<ModuleClassification>;
}

export const DEFAULT_FILTER: FilterState = {
  searchQuery: "",
  enabledClassifications: new Set(ALL_CLASSIFICATIONS),
};

interface FilterPanelProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

export function FilterPanel({ filter, onFilterChange }: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({ ...filter, searchQuery: e.target.value });
    },
    [filter, onFilterChange]
  );

  const toggleClassification = useCallback(
    (cls: ModuleClassification) => {
      const next = new Set(filter.enabledClassifications);
      if (next.has(cls)) {
        next.delete(cls);
      } else {
        next.add(cls);
      }
      onFilterChange({ ...filter, enabledClassifications: next });
    },
    [filter, onFilterChange]
  );

  const clearFilter = useCallback(() => {
    onFilterChange(DEFAULT_FILTER);
  }, [onFilterChange]);

  const hasActiveFilter =
    filter.searchQuery !== "" || filter.enabledClassifications.size < ALL_CLASSIFICATIONS.length;

  return (
    <div
      style={{
        position: "absolute",
        top: "8px",
        left: "8px",
        zIndex: 5,
        fontFamily: "var(--vscode-editor-font-family, monospace)",
      }}
    >
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search modules..."
          value={filter.searchQuery}
          onChange={handleSearch}
          style={{
            background: "var(--vscode-input-background, #3c3c3c)",
            border: "1px solid var(--vscode-input-border, #555)",
            color: "var(--vscode-input-foreground, #ccc)",
            padding: "4px 8px",
            borderRadius: "3px",
            fontSize: "12px",
            width: "200px",
            outline: "none",
          }}
        />
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: hasActiveFilter
              ? "var(--vscode-button-background, #0e639c)"
              : "var(--vscode-editor-background, #1e1e1e)",
            border: "1px solid var(--vscode-editorWidget-border, #444)",
            color: "var(--vscode-button-foreground, #fff)",
            padding: "4px 8px",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          Filter
        </button>
        {hasActiveFilter && (
          <button
            onClick={clearFilter}
            style={{
              background: "none",
              border: "none",
              color: "var(--vscode-descriptionForeground, #888)",
              cursor: "pointer",
              fontSize: "12px",
              padding: "4px",
            }}
          >
            x
          </button>
        )}
      </div>
      {expanded && (
        <div
          style={{
            marginTop: "4px",
            background: "var(--vscode-editor-background, #1e1e1e)",
            border: "1px solid var(--vscode-editorWidget-border, #444)",
            borderRadius: "3px",
            padding: "8px",
          }}
        >
          {ALL_CLASSIFICATIONS.map((cls) => (
            <label
              key={cls}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                marginBottom: "4px",
                fontSize: "12px",
                color: "var(--vscode-editor-foreground, #ccc)",
              }}
            >
              <input
                type="checkbox"
                checked={filter.enabledClassifications.has(cls)}
                onChange={() => toggleClassification(cls)}
              />
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: CLASSIFICATION_COLORS[cls],
                }}
              />
              {cls}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
