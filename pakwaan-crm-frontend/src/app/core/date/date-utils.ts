export function todayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function createStrictLocalDate(year: number, month: number, day: number): Date | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    ? date
    : null;
}

export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const apiMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (apiMatch) {
    const [, yyyy, mm, dd] = apiMatch;
    return createStrictLocalDate(+yyyy, +mm, +dd);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseDateInput(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  return parseLooseDate(value);
}

export function formatDateForApi(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = parseDateInput(value);
  if (!date) return '';

  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateForDisplay(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = parseDateInput(value);
  if (!date) return '';

  const dd = `${date.getDate()}`.padStart(2, '0');
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseLooseDate(value: string): Date | null {
  const uiMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (uiMatch) {
    const [, dd, mm, yyyy] = uiMatch;
    return createStrictLocalDate(+yyyy, +mm, +dd);
  }

  const apiMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (apiMatch) {
    const [, yyyy, mm, dd] = apiMatch;
    return createStrictLocalDate(+yyyy, +mm, +dd);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
