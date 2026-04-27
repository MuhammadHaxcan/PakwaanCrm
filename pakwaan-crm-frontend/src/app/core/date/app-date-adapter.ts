import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class AppDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    const parsed = this.parseAppDate(value);
    if (parsed) return parsed;

    const fallback = super.parse(value);
    return fallback && !Number.isNaN(fallback.getTime()) ? fallback : null;
  }

  override deserialize(value: unknown): Date | null {
    const parsed = this.parseAppDate(value);
    if (parsed) return parsed;

    const fallback = super.deserialize(value);
    return fallback && this.isValid(fallback) ? fallback : null;
  }

  override format(date: Date, _displayFormat: object): string {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseAppDate(value: unknown): Date | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      const uiMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
      if (uiMatch) {
        const [, dd, mm, yyyy] = uiMatch;
        return new Date(+yyyy, +mm - 1, +dd);
      }

      const apiMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
      if (apiMatch) {
        const [, yyyy, mm, dd] = apiMatch;
        return new Date(+yyyy, +mm - 1, +dd);
      }
    }

    return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
  }
}

export const APP_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY'
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};
