import { parseApiDate, parseDateInput } from './date-utils';

describe('date utilities', () => {
  it('parses valid API and UI dates', () => {
    expect(parseApiDate('2026-07-15')).toEqual(new Date(2026, 6, 15));
    expect(parseDateInput('15/07/2026')).toEqual(new Date(2026, 6, 15));
  });

  it('accepts a leap day in a leap year', () => {
    expect(parseDateInput('29/02/2024')).toEqual(new Date(2024, 1, 29));
  });

  it('rejects days that roll into another month', () => {
    expect(parseDateInput('31/02/2026')).toBeNull();
    expect(parseApiDate('2026-02-31')).toBeNull();
  });

  it('rejects invalid months and non-leap-year leap days', () => {
    expect(parseDateInput('15/13/2026')).toBeNull();
    expect(parseDateInput('29/02/2025')).toBeNull();
  });
});
