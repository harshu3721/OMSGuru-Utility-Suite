import { clear, element } from "./dom.js";

export function searchableTable({ columns, rows }) {
  const search = element("input", { className: "input", placeholder: "Search results…", attributes: { type: "search", "aria-label": "Search table" } });
  const table = element("table", { className: "data-table" });
  const draw = () => {
    const query = search.value.toLowerCase().trim();
    const visible = rows.filter((row) => !query || columns.some((column) => String(row[column.key] ?? "").toLowerCase().includes(query)));
    clear(table);
    table.append(element("thead", {}, [element("tr", {}, columns.map((column) => element("th", { text: column.label })))]));
    table.append(element("tbody", {}, visible.length ? visible.map((row) => element("tr", {}, columns.map((column) => element("td", { text: row[column.key] ?? "—" })))) : [element("tr", {}, [element("td", { text: "No matching results.", colSpan: columns.length })]) ]));
  };
  search.addEventListener("input", draw);
  draw();
  return element("div", { className: "table-wrapper" }, [search, table]);
}
