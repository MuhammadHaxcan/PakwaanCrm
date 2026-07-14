# Journal Receipt Auto-Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically balance the first Cash/Bank Debit journal row from later entries and add an `Alt + N` add-and-focus shortcut.

**Architecture:** Keep orchestration in `GeneralVoucherComponent`, where the journal `FormArray` already lives. A guarded recalculation method writes the first debit without emitting recursive events; the existing sales-page keyboard pattern is reused for row creation and focus.

**Tech Stack:** Angular 17 standalone components, Angular Reactive Forms, Angular Material, RxJS 7, Jasmine, Karma

## Global Constraints

- Auto-balancing is active only when row zero is `EntryType.CashDebit`.
- The automatic debit equals later credits minus later debits, rounded to two decimals and clamped to zero.
- Keep the automatic control enabled for request serialization and make only its input read-only.
- In receipt mode, new rows default to `EntryType.CustomerCredit`; otherwise retain `EntryType.Expense`.
- Do not modify backend contracts or unrelated workspace files.

---

### Task 1: Journal Auto-Balance and Shortcut

**Files:**
- Create: `pakwaan-crm-frontend/src/app/features/journal-voucher/journal-voucher.component.spec.ts`
- Modify: `pakwaan-crm-frontend/src/app/features/journal-voucher/journal-voucher.component.ts`

**Interfaces:**
- Produces: `isReceiptAutoBalanceActive(): boolean`, `isAutoBalancingLine(index: number): boolean`, `recalculateAutoBalance(): void`, `addLineAndFocus(): void`, and `onShortcut(event: KeyboardEvent): void`.
- Consumes: existing `linesArray`, `EntryType`, `SearchableSelectComponent.focus()`, and amount-lock helpers.

- [ ] **Step 1: Create failing amount behavior tests**

Configure the standalone component with mocked `ActivatedRoute`, `MasterDataService`, `ApiService`, and `ToastService`; all master-data loads return `of([])`. Add tests that:

```typescript
component.linesArray.at(1).get('credit')?.setValue(10000);
expect(component.linesArray.at(0).get('debit')?.value).toBe(10000);

component.addLine();
component.linesArray.at(2).get('credit')?.setValue(5000);
expect(component.linesArray.at(0).get('debit')?.value).toBe(15000);
```

Also verify removal reduces the total, later debits greater than credits clamp the first debit to zero, changing row zero away from Cash Debit stops recalculation, and changing it back resumes calculation.

- [ ] **Step 2: Create failing keyboard workflow test**

Use `fakeAsync`, spy on `SearchableSelectComponent.prototype.focus`, invoke `onShortcut` with an Alt+N keyboard spy, run change detection and `tick()`, then assert default prevention, one added Customer Credit row, and focus.

- [ ] **Step 3: Run focused tests to verify RED**

```powershell
npm.cmd test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/journal-voucher/journal-voucher.component.spec.ts
```

Expected: compilation/test failures because the automatic and shortcut APIs do not exist.

- [ ] **Step 4: Implement imports, template state, and shortcut UI**

Import `HostListener`, `QueryList`, and `ViewChildren`. Add `#rowEntryTypeSelect` to each Entry Type selector, make the first debit input read-only with:

```html
[readonly]="isAutoBalancingLine(i)"
[class.auto-calculated]="isAutoBalancingLine(i)"
```

Change the action button to call `addLineAndFocus()` and label it `Add New Row (Alt + N)`. Add a subtle `.auto-calculated` background style.

- [ ] **Step 5: Implement guarded calculation**

Add:

```typescript
isReceiptAutoBalanceActive(): boolean {
  return this.linesArray.length > 0
    && this.getEntryTypeVal(0) === EntryType.CashDebit;
}

isAutoBalancingLine(index: number): boolean {
  return index === 0 && this.isReceiptAutoBalanceActive();
}

recalculateAutoBalance(): void {
  if (!this.form || !this.isReceiptAutoBalanceActive()) return;

  const laterTotals = this.linesArray.controls.slice(1).reduce(
    (totals, line) => ({
      debit: totals.debit + (+line.get('debit')?.value || 0),
      credit: totals.credit + (+line.get('credit')?.value || 0)
    }),
    { debit: 0, credit: 0 }
  );
  const amount = Math.max(
    0,
    Math.round((laterTotals.credit - laterTotals.debit) * 100) / 100
  );
  this.linesArray.at(0).get('debit')?.setValue(amount, { emitEvent: false });
}
```

Subscribe each created line's debit and credit controls to recalculate. Call it after entry-type changes, amount changes, additions, removals, voucher population, and post-save reset.

- [ ] **Step 6: Implement unified add-and-focus behavior**

Use `@ViewChildren(SearchableSelectComponent)` for closing dropdowns and `@ViewChildren('rowEntryTypeSelect')` for focus. Let `addLine()` choose Customer Credit in receipt mode or Expense otherwise. Add:

```typescript
addLineAndFocus(): void {
  this.closeOpenDropdowns();
  this.addLine();
  setTimeout(() => this.rowEntryTypeSelects.last?.focus());
}

@HostListener('document:keydown', ['$event'])
onShortcut(event: KeyboardEvent): void {
  if (!this.loading && !this.submitting
      && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    this.addLineAndFocus();
  }
}
```

- [ ] **Step 7: Run focused tests to verify GREEN**

Run the Step 3 command. Expected: all journal component tests pass.

- [ ] **Step 8: Commit the feature**

```powershell
git add -- pakwaan-crm-frontend/src/app/features/journal-voucher/journal-voucher.component.ts pakwaan-crm-frontend/src/app/features/journal-voucher/journal-voucher.component.spec.ts
git commit -m "feat: auto-balance customer receipt journals"
```

### Task 2: Regression Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: completed journal behavior.
- Produces: frontend verification evidence.

- [ ] **Step 1: Run all frontend tests**

```powershell
npm.cmd test -- --watch=false --browsers=ChromeHeadless
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run the production build**

```powershell
npm.cmd run build
```

Expected: compilation succeeds; report non-fatal budget warnings separately.

- [ ] **Step 3: Check the scoped diff**

```powershell
git diff --check -- pakwaan-crm-frontend/src/app/features/journal-voucher/journal-voucher.component.ts pakwaan-crm-frontend/src/app/features/journal-voucher/journal-voucher.component.spec.ts
git status --short
```

Expected: no whitespace errors and all unrelated user changes remain untouched.

