import { TestBed } from '@angular/core/testing';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { AppDateAdapter } from './app-date-adapter';

describe('AppDateAdapter', () => {
  let adapter: AppDateAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppDateAdapter,
        { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
      ]
    });
    adapter = TestBed.inject(AppDateAdapter);
  });

  it('does not fall back to loose parsing for invalid supported date formats', () => {
    expect(adapter.parse('31/02/2026')).toBeNull();
    expect(adapter.parse('2026-02-31')).toBeNull();
    expect(adapter.deserialize('2025-02-29')).toBeNull();
  });
});
