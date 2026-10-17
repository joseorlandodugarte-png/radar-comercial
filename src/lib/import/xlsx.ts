import "server-only";

import ExcelJS from "exceljs";

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("hyperlink" in value && typeof value.hyperlink === "string") return value.hyperlink;
    if (value instanceof Date) return value.toISOString();
  }
  return String(value);
}

/** Reads the first worksheet of an .xlsx file into header-keyed records. */
export async function parseXlsx(buffer: ArrayBuffer): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, col) => {
    headers[col] = cellText(cell.value).trim();
  });
  const records: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, string> = {};
    let hasValue = false;
    row.eachCell((cell, col) => {
      const header = headers[col];
      if (!header) return;
      const text = cellText(cell.value).trim();
      if (text) hasValue = true;
      record[header] = text;
    });
    if (hasValue) records.push(record);
  });
  return records;
}

export async function toXlsx(
  rows: Record<string, unknown>[],
  sheetName = "Negocios",
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Radar Comercial Venezuela";
  const sheet = wb.addWorksheet(sheetName);
  const headers = Object.keys(rows[0] ?? {});
  sheet.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, h.length + 2) }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
