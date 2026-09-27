/**
 * Cell navigation where antd's own table structure is the risk.
 *
 * The shared contract — the grid role and dimensions, the roving tab stop,
 * absolute indices, arrow keys and the announcer — is asserted by the
 * conformance suite (`conformance.test.tsx`). What stays here is antd's own:
 * the sticky header's split tables, paste, and Enter reaching the editor.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Ada", team: "Core" },
  { id: "b", name: "Grace", team: "Web" },
];

const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "team", header: "Team", accessor: (r) => r.team },
];

const cellAt = (row: number, col: number) =>
  document.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`);

describe("antd cell navigation", () => {
  it("keeps sticky-header columnheaders inside the same grid", () => {
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={columns}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        cellNavigation
        stickyHeader
      />
    );
    // antd's sticky holder is the proof the header is still split — the
    // association has to hold WITHOUT turning sticky off.
    expect(container.querySelector(".ant-table-sticky-holder")).not.toBeNull();
    const grid = screen.getByRole("grid");
    expect(within(grid).getAllByRole("columnheader").length).toBeGreaterThan(0);
    expect(within(grid).getAllByRole("gridcell").length).toBeGreaterThan(0);
    for (const node of container.querySelectorAll("table")) {
      expect(node).toHaveAttribute("role", "rowgroup");
    }
    // The relationship is containment in one grid, not a `headers`/`id`
    // pair across the two tables (W3C ACT a25f45 forbids that).
    expect(
      [...container.querySelectorAll("[data-grid-cell]")].every(
        (cell) => !cell.hasAttribute("headers")
      )
    ).toBe(true);
  });
});

/**
 * antd builds its own chrome instead of using the shell, so its clipboard
 * wiring is a second place that has to be right — and the only way to know is
 * to paste into the real table.
 */
describe("antd — paste reaches the edit channel", () => {
  it("commits a pasted block through onCellEdit", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn().mockResolvedValue("P\tQ") },
    });
    const onCellEdit = vi.fn();
    render(
      <DataTable
        data={ROWS}
        columns={columns.map((c) => ({ ...c, editable: true }))}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        cellNavigation
        onCellEdit={onCellEdit}
      />
    );
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "v", ctrlKey: true });
    await waitFor(() => expect(onCellEdit).toHaveBeenCalledTimes(2));
    expect(onCellEdit).toHaveBeenNthCalledWith(1, ROWS[0], "name", "P");
    vi.unstubAllGlobals();
  });
});

/**
 * The keyboard has to reach the editor: Enter and F2 on a focused cell open
 * it, and a cell that is not editable stays as it is.
 */
describe("antd Enter opens the focused cell", () => {
  const editable: ColumnDef<Row>[] = [
    { key: "name", header: "Name", accessor: (r) => r.name, editable: true },
    { key: "team", header: "Team", accessor: (r) => r.team },
  ];

  const editableTable = () =>
    render(
      <DataTable
        data={ROWS}
        columns={editable}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        cellNavigation
        onCellEdit={() => undefined}
      />
    );

  const editor = () =>
    document.querySelector('[data-adapttable-part="edit-cell-editor"]');

  it("opens the editor on Enter, and on F2", () => {
    editableTable();
    const cell = cellAt(0, 0)!;
    act(() => cell.focus());
    fireEvent.keyDown(cell, { key: "Enter" });
    expect(editor()).not.toBeNull();

    fireEvent.keyDown(editor()!, { key: "Escape" });
    expect(editor()).toBeNull();
    fireEvent.keyDown(cellAt(0, 0)!, { key: "F2" });
    expect(editor()).not.toBeNull();
    fireEvent.keyDown(editor()!, { key: "Escape" });
  });

  it("opens the cell the keyboard moved to", () => {
    editableTable();
    const first = cellAt(0, 0)!;
    act(() => first.focus());
    fireEvent.keyDown(first, { key: "ArrowDown" });
    fireEvent.keyDown(cellAt(1, 0)!, { key: "Enter" });

    expect(editor()).toHaveValue("Grace");
  });

  it("leaves a cell that is not editable alone", () => {
    editableTable();
    const cell = cellAt(0, 1)!;
    act(() => cell.focus());
    fireEvent.keyDown(cell, { key: "Enter" });
    fireEvent.keyDown(cell, { key: "F2" });

    expect(editor()).toBeNull();
  });
});
