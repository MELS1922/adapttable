import { type ColumnInput } from "@adapttable/core";

interface DataTableProps {
  columns?: ColumnInput<Record<string, unknown>>[];
  data?: Record<string, unknown>[];
}

export function useDataTable(props: DataTableProps) {
  const rows = props.data ?? [];
  const filters: unknown[] = [];

  return {
    rows,
    filters,
  };
}
