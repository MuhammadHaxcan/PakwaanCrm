export function serializeCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, rows: readonly (readonly unknown[])[]): void {
  const blob = new Blob([serializeCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  try {
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function escapeCsvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
