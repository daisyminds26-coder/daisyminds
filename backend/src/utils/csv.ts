/**
 * Minimal RFC 4180 CSV writer — no external dependency for what's a small,
 * fixed set of columns (KISS). A field is quoted only when it contains a
 * comma, quote, or newline; embedded quotes are doubled per the spec.
 *
 * A leading `=`, `+`, `-`, `@`, tab, or CR is also neutralized with a
 * leading `'` before the quoting check above — several spreadsheet
 * applications (Excel, Google Sheets, LibreOffice) interpret a cell
 * starting with one of those characters as a formula, so any exported
 * free-text field a user controls (a student's name, notes, tags, …) is a
 * CSV/formula-injection vector otherwise. The users-module export never
 * included user-controlled free text, so this hardening was not yet needed
 * until the students module's export did.
 */
const FORMULA_TRIGGER_CHARS = /^[=+\-@\t\r]/

function escapeCsvField(value: string): string {
  const neutralized = FORMULA_TRIGGER_CHARS.test(value) ? `'${value}` : value

  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`
  }
  return neutralized
}

export function toCsv(columns: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [columns, ...rows].map((row) => row.map(escapeCsvField).join(','))
  return lines.join('\r\n')
}
