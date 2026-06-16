import type { ReactNode } from "react";

type AdminDataTableColumn<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
};

type AdminDataTableProps<T extends object> = {
  columns: Array<AdminDataTableColumn<T>>;
  rows: T[];
  emptyMessage?: string;
  actionsSlot?: (row: T) => ReactNode;
};

function formatCellValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export function AdminDataTable<T extends object>({
  columns,
  rows,
  emptyMessage = "No records found.",
  actionsSlot,
}: AdminDataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-3 py-2 font-semibold">
                {column.label}
              </th>
            ))}
            {actionsSlot ? (
              <th className="px-3 py-2 font-semibold text-right">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-200">
              {columns.map((column) => (
                <td key={String(column.key)} className="px-3 py-2 text-slate-700">
                  {column.render ? column.render(row) : formatCellValue(row[column.key])}
                </td>
              ))}
              {actionsSlot ? (
                <td className="px-3 py-2 text-right">{actionsSlot(row)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { AdminDataTable as DataTable };
export type { AdminDataTableColumn, AdminDataTableProps };
