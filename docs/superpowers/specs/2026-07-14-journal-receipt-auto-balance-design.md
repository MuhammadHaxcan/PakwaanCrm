# Journal Voucher Receipt Auto-Balancing Design

## Goal

Speed up entry of payments received from multiple customers by automatically balancing the first Cash/Bank Debit line and by supporting `Alt + N` to add and focus a new journal row.

## Accounting Rule

A customer receipt is recorded as:

- Cash/Bank Debit for the money received.
- Customer Credit for each customer's payment.

When the first journal row is Cash/Bank Debit, it becomes the automatic balancing row. Its debit amount is:

```text
sum of credits on all later rows - sum of debits on all later rows
```

The result is rounded to two decimal places and never allowed below zero. In the expected receipt workflow, where all later rows are Customer Credit entries, the first debit is their exact total. For example, customer payments of PKR 10,000 and PKR 5,000 produce a first Cash/Bank Debit of PKR 15,000.

## Auto-Balancing Behavior

Auto-balancing is active only while row zero has entry type `CashDebit`. While active:

- Row zero's debit input is read-only and visually identified as automatic.
- Changes to later debit or credit values immediately recalculate row zero.
- Entry-type changes immediately recalculate row zero after applying the existing debit/credit locks.
- Adding or removing a row recalculates row zero.
- Loading an existing voucher recalculates after all lines are populated.
- Resetting after a successful save restores the Cash Debit plus Customer Credit receipt structure and recalculates to zero.
- If later debits exceed later credits, row zero becomes zero and the existing balance indicator remains unbalanced.

When row zero is changed to any entry type other than `CashDebit`, automatic balancing stops and its amount becomes manually editable subject to the existing entry-type locks. Changing it back to `CashDebit` resumes calculation.

Calculations update controls with `emitEvent: false` to avoid recursive value-change loops.

## New Row Workflow

The Add Line button label becomes `Add New Row (Alt + N)`.

Both the button and `Alt + N` use one `addLineAndFocus` path:

1. Close any open searchable-select dropdown.
2. Add a line.
3. If row zero is Cash Debit, default the new line to Customer Credit; otherwise retain the existing Expense default.
4. Apply existing amount locks and entity validation.
5. Recalculate the automatic balancing line.
6. Focus the new row's Entry Type selector after Angular renders it.

The document-level shortcut prevents the browser's default action. It is ignored while the component is loading or submitting so hidden or locked forms are not modified.

## Component Structure

All behavior remains in `GeneralVoucherComponent` because it coordinates the existing journal `FormArray` and template:

- `isReceiptAutoBalanceActive` identifies whether row zero is Cash Debit.
- `recalculateAutoBalance` computes and writes row zero's debit.
- `addLineAndFocus` unifies button and keyboard row creation.
- `onShortcut` handles `Alt + N`.
- `ViewChildren` references close dropdowns and focus the newest Entry Type selector.

No backend or request-contract changes are required. The existing submit mapping continues to include the calculated debit because the control remains enabled and is made read-only only in the template.

## Testing

A new focused component test will verify:

- PKR 10,000 on one Customer Credit line sets the first Cash Debit to PKR 10,000.
- Adding PKR 5,000 on another Customer Credit line updates the first debit to PKR 15,000.
- Decreasing or removing a later line updates the first debit.
- Later debits exceeding credits set the automatic amount to zero and keep the voucher unbalanced.
- Changing row zero away from Cash Debit disables automatic behavior.
- Returning row zero to Cash Debit resumes automatic behavior.
- `Alt + N` prevents the default action, adds a Customer Credit row in receipt mode, and focuses its Entry Type selector.
- The button uses the same add-and-focus behavior.

After focused tests pass, the full frontend tests and production build will be run.

## Scope

This change does not alter backend accounting validation, voucher APIs, other voucher pages, saved historical data, or general journal behavior when row zero is not Cash/Bank Debit.

