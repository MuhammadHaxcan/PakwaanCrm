# Searchable Select Viewport and Sales Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep searchable-select panels visible on long/scrolled pages and place Sales Voucher Date and Notes controls in one responsive row.

**Architecture:** Add an exported pure positioning function beside the shared standalone component, then have the component translate its result into inline fixed-position styles. Keep the Sales Voucher change template-only and rely on the existing global responsive `.form-row` rules.

**Tech Stack:** Angular 17 standalone components, TypeScript 5.4, Jasmine/Karma, Angular Material.

## Global Constraints

- Fix dropdown positioning in the shared `SearchableSelectComponent`, so every existing use benefits from correct viewport behavior.
- Change only the Sales Voucher header form layout; other voucher layouts remain unchanged.
- Preserve current filtering, selection, keyboard navigation, styling, form validation, submission behavior, and data shape.
- Do not replace the component with Angular CDK Overlay.

---

### Task 1: Viewport-aware searchable-select positioning

**Files:**
- Create: `pakwaan-crm-frontend/src/app/shared/components/searchable-select/searchable-select.component.spec.ts`
- Modify: `pakwaan-crm-frontend/src/app/shared/components/searchable-select/searchable-select.component.ts`

**Interfaces:**
- Consumes: `DOMRect` anchor geometry and viewport width/height.
- Produces: `calculateDropdownPosition(anchorRect: Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left' | 'width'>, viewportWidth: number, viewportHeight: number): DropdownPosition`.
- Produces: `DropdownPosition` with `top`, `left`, `width`, and `maxHeight` numeric pixel values.

- [ ] **Step 1: Write failing positioning tests**

Create the spec with focused pure-function cases:

```typescript
import { calculateDropdownPosition } from './searchable-select.component';

describe('calculateDropdownPosition', () => {
  const rect = (top: number, bottom: number, left = 100, width = 200) => ({
    top,
    bottom,
    left,
    right: left + width,
    width
  });

  it('uses viewport coordinates below the anchor without document scroll offsets', () => {
    expect(calculateDropdownPosition(rect(100, 146), 1200, 800)).toEqual({
      top: 151,
      left: 100,
      width: 200,
      maxHeight: 280
    });
  });

  it('opens above when the anchor is near the viewport bottom', () => {
    expect(calculateDropdownPosition(rect(700, 746), 1200, 768)).toEqual({
      top: 415,
      left: 100,
      width: 200,
      maxHeight: 280
    });
  });

  it('limits the panel height to the available viewport space', () => {
    expect(calculateDropdownPosition(rect(100, 146), 1200, 250)).toEqual({
      top: 151,
      left: 100,
      width: 200,
      maxHeight: 91
    });
  });
});
```

- [ ] **Step 2: Run the focused spec and verify RED**

Run:

```powershell
cd pakwaan-crm-frontend
npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/shared/components/searchable-select/searchable-select.component.spec.ts
```

Expected: compilation fails because `calculateDropdownPosition` is not exported.

- [ ] **Step 3: Implement the minimal pure positioning calculation**

Add constants, the return interface, and the exported function above the component:

```typescript
const DROPDOWN_GAP = 5;
const DROPDOWN_VIEWPORT_MARGIN = 8;
const DROPDOWN_MAX_HEIGHT = 280;

export interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export function calculateDropdownPosition(
  anchorRect: Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left' | 'width'>,
  viewportWidth: number,
  viewportHeight: number
): DropdownPosition {
  const spaceBelow = Math.max(0, viewportHeight - DROPDOWN_VIEWPORT_MARGIN - anchorRect.bottom - DROPDOWN_GAP);
  const spaceAbove = Math.max(0, anchorRect.top - DROPDOWN_VIEWPORT_MARGIN - DROPDOWN_GAP);
  const openAbove = spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow;
  const maxHeight = Math.min(DROPDOWN_MAX_HEIGHT, openAbove ? spaceAbove : spaceBelow);
  const width = Math.min(anchorRect.width, viewportWidth - (DROPDOWN_VIEWPORT_MARGIN * 2));
  const left = Math.min(
    Math.max(DROPDOWN_VIEWPORT_MARGIN, anchorRect.left),
    viewportWidth - DROPDOWN_VIEWPORT_MARGIN - width
  );

  return {
    top: openAbove ? anchorRect.top - DROPDOWN_GAP - maxHeight : anchorRect.bottom + DROPDOWN_GAP,
    left,
    width,
    maxHeight
  };
}
```

Update `updateDropdownPosition()` to use viewport coordinates directly:

```typescript
const position = calculateDropdownPosition(
  anchor.getBoundingClientRect(),
  window.innerWidth,
  window.innerHeight
);

this.dropdownStyle = {
  top: `${position.top}px`,
  left: `${position.left}px`,
  width: `${position.width}px`,
  'max-height': `${position.maxHeight}px`
};
```

Remove the obsolete `scrollX` and `scrollY` calculations. Keep the existing resize/scroll listeners and dropdown overflow styling.

- [ ] **Step 4: Run the focused spec and verify GREEN**

Run the Step 2 command again.

Expected: 3 tests pass with 0 failures.

- [ ] **Step 5: Commit the dropdown fix**

```powershell
git add pakwaan-crm-frontend/src/app/shared/components/searchable-select/searchable-select.component.ts pakwaan-crm-frontend/src/app/shared/components/searchable-select/searchable-select.component.spec.ts
git commit -m "fix: keep searchable select inside viewport"
```

---

### Task 2: Sales Voucher Date and Notes row

**Files:**
- Create: `pakwaan-crm-frontend/src/app/features/sales-voucher/sales-voucher.component.spec.ts`
- Modify: `pakwaan-crm-frontend/src/app/features/sales-voucher/sales-voucher.component.ts`

**Interfaces:**
- Consumes: existing global `.form-row` flex and mobile-wrap rules from `pakwaan-crm-frontend/src/styles.scss`.
- Produces: one Sales Voucher `.form-row` containing both the `date` and `notes` Material form fields.

- [ ] **Step 1: Write a failing template regression test**

Configure the standalone component with the same service/date dependencies used by neighboring voucher specs, then assert the two controls share a direct parent:

```typescript
it('places Date and Notes in the same form row', () => {
  const dateInput = fixture.nativeElement.querySelector('input[formControlName="date"]') as HTMLInputElement;
  const notesInput = fixture.nativeElement.querySelector('input[formControlName="notes"]') as HTMLInputElement;
  const dateRow = dateInput.closest('.form-row');

  expect(dateRow).toBeTruthy();
  expect(notesInput.closest('.form-row')).toBe(dateRow);
  expect(dateRow?.querySelectorAll('mat-form-field').length).toBe(2);
});
```

- [ ] **Step 2: Run the Sales Voucher spec and verify RED**

Run:

```powershell
cd pakwaan-crm-frontend
npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/sales-voucher/sales-voucher.component.spec.ts
```

Expected: the equality assertion fails because Date and Notes are in separate `.form-row` elements.

- [ ] **Step 3: Merge the existing fields into one row**

Keep the Date field unchanged and move Notes beside it:

```html
<div class="form-row">
  <mat-form-field appearance="outline">
    <mat-label>Date</mat-label>
    <input matInput [matDatepicker]="salesDatePicker" formControlName="date" placeholder="dd/mm/yyyy" />
    <mat-datepicker-toggle matIconSuffix [for]="salesDatePicker"></mat-datepicker-toggle>
    <mat-datepicker #salesDatePicker></mat-datepicker>
  </mat-form-field>
  <mat-form-field appearance="outline" style="flex:2">
    <mat-label>Notes</mat-label>
    <input matInput formControlName="notes" placeholder="Optional notes..." />
  </mat-form-field>
</div>
```

Delete the now-empty second `.form-row`. Do not change other voucher components.

- [ ] **Step 4: Run the Sales Voucher spec and verify GREEN**

Run the Step 2 command again.

Expected: the layout test passes with 0 failures.

- [ ] **Step 5: Commit the Sales Voucher layout fix**

```powershell
git add pakwaan-crm-frontend/src/app/features/sales-voucher/sales-voucher.component.ts pakwaan-crm-frontend/src/app/features/sales-voucher/sales-voucher.component.spec.ts
git commit -m "fix: align sales voucher date and notes"
```

---

### Task 3: Frontend regression verification

**Files:**
- Verify only; no production changes expected.

**Interfaces:**
- Consumes: completed Tasks 1 and 2.
- Produces: test and production-build evidence for the final handoff.

- [ ] **Step 1: Run the full frontend test suite once**

```powershell
cd pakwaan-crm-frontend
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: all discovered specs pass with 0 failures.

- [ ] **Step 2: Run the production build**

```powershell
cd pakwaan-crm-frontend
npm run build
```

Expected: build completes successfully; any pre-existing budget warnings are reported separately from errors.

- [ ] **Step 3: Inspect the final diff**

```powershell
git status --short
git diff HEAD~2 --check
git diff HEAD~2 -- pakwaan-crm-frontend/src/app/shared/components/searchable-select pakwaan-crm-frontend/src/app/features/sales-voucher
```

Expected: only the scoped shared select, Sales Voucher layout, and their tests changed; `git diff --check` is clean.
