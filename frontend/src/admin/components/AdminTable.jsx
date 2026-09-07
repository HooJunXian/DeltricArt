import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

const normalizeSortValue = (value) => {
  if (value == null) return "";

  if (typeof value === "number") return value;

  const isIsoDate = typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value.trim());
  if (isIsoDate) {
    const date = Date.parse(value);
    if (!Number.isNaN(date)) return date;
  }

  return String(value).toLowerCase();
};

const compareValues = (left, right) => {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const SortIcon = ({ active, direction }) => {
  if (!active) {
    return <ArrowUpDown size={14} strokeWidth={2} />;
  }

  return direction === "asc" ? (
    <ArrowUp size={14} strokeWidth={2.2} />
  ) : (
    <ArrowDown size={14} strokeWidth={2.2} />
  );
};

const getNextDirection = (currentDirection) => (currentDirection === "asc" ? "desc" : "asc");

const AdminTable = ({
  columns,
  rows,
  loading,
  loadingText = "Loading records...",
  emptyText = "No records found.",
  minWidth = "760px",
  getRowKey,
  initialSorts,
  rowClassName = "transition hover:bg-stone-50/70",
}) => {
  const firstSortableColumn = columns.find((column) => column.sortable !== false);
  const [sorts, setSorts] = useState(() =>
    initialSorts || (firstSortableColumn ? [{ key: firstSortableColumn.key, direction: "asc" }] : []),
  );

  const sortedRows = useMemo(() => {
    if (!sorts.length) return rows;

    const sortableColumns = sorts
      .map((sort) => {
        const column = columns.find((item) => item.key === sort.key);
        if (!column || column.sortable === false) return null;
        return { column, direction: sort.direction };
      })
      .filter(Boolean);

    if (!sortableColumns.length) return rows;

    return [...rows].sort((leftRow, rightRow) => {
      for (const { column, direction } of sortableColumns) {
        const getValue = column.sortValue || ((row) => row[column.key]);
        const left = normalizeSortValue(getValue(leftRow));
        const right = normalizeSortValue(getValue(rightRow));
        const comparison = compareValues(left, right);

        if (comparison !== 0) {
          return comparison * (direction === "asc" ? 1 : -1);
        }
      }

      return 0;
    });
  }, [columns, rows, sorts]);

  const handleSort = (column, event) => {
    if (column.sortable === false) return;

    setSorts((current) => {
      const existing = current.find((item) => item.key === column.key);
      const nextSort = {
        key: column.key,
        direction: existing ? getNextDirection(existing.direction) : "asc",
      };

      if (event.shiftKey) {
        if (existing) {
          return current.map((item) => (item.key === column.key ? nextSort : item));
        }

        return [...current, nextSort];
      }

      return [nextSort];
    });
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="border-y border-stone-200 bg-stone-50 text-xs uppercase tracking-[0.16em] text-stone-500">
          <tr>
            {columns.map((column) => {
              const sortable = column.sortable !== false;
              const sortIndex = sorts.findIndex((item) => item.key === column.key);
              const activeSort = sortIndex >= 0 ? sorts[sortIndex] : null;

              return (
                <th
                  key={column.key}
                  aria-sort={
                    activeSort
                      ? activeSort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : sortable
                        ? "none"
                        : undefined
                  }
                  className={column.headerClassName || "px-3 py-3"}
                >
                  {sortable ? (
                    <button
                      className={[
                        "inline-flex items-center gap-1.5 text-left font-semibold uppercase tracking-[0.16em] transition hover:text-stone-950",
                        column.align === "right" ? "ml-auto" : "",
                      ].join(" ")}
                      type="button"
                      onClick={(event) => handleSort(column, event)}
                      title={`Sort ${column.label}. Shift-click to sort by multiple columns.`}
                    >
                      <span>{column.label}</span>
                      <span className="inline-flex items-center gap-1">
                        <SortIcon
                          active={Boolean(activeSort)}
                          direction={activeSort?.direction}
                        />
                        {sorts.length > 1 && activeSort ? (
                          <span className="text-[10px] leading-none text-stone-400">
                            {sortIndex + 1}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {loading ? (
            <tr>
              <td className="px-3 py-10 text-center text-stone-500" colSpan={columns.length}>
                {loadingText}
              </td>
            </tr>
          ) : null}

          {!loading && rows.length === 0 ? (
            <tr>
              <td className="px-3 py-10 text-center text-stone-500" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : null}

          {!loading
            ? sortedRows.map((row, rowIndex) => (
                <tr key={getRowKey(row, rowIndex)} className={rowClassName}>
                  {columns.map((column) => (
                    <td key={column.key} className={column.cellClassName || "px-3 py-3"}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            : null}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTable;
