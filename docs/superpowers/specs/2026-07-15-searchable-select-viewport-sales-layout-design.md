# Searchable Select Viewport and Sales Layout Design

## Goal

Keep searchable-select dropdowns fully usable on long or scrolled pages, and place the Sales Voucher Date and Notes fields on the same row.

## Scope

- Fix dropdown positioning in the shared `SearchableSelectComponent`, so every existing use benefits from correct viewport behavior.
- Change only the Sales Voucher header form layout. Other voucher layouts remain unchanged.
- Preserve current filtering, selection, keyboard navigation, styling, and form integration.

## Root Cause

The dropdown uses `position: fixed`, whose `top` and `left` values must use viewport coordinates. The current calculation adds document scroll offsets to `getBoundingClientRect()` coordinates, pushing the panel away from its anchor on scrolled pages. The component also always opens downward with a fixed maximum height, so a select close to the viewport bottom can still be cropped.

## Design

### Dropdown positioning

Extract a small positioning calculation that receives the anchor rectangle and viewport dimensions and returns the panel's `top`, `left`, `width`, and `max-height` styles.

- Use `getBoundingClientRect()` values directly because the dropdown remains fixed-positioned.
- Prefer opening below the field when enough space is available.
- Flip above the field when the space below is insufficient and the space above is greater.
- Keep a small gap between the field and panel.
- Limit panel height to the available viewport space, up to the existing 280px maximum.
- Keep a small viewport margin so the panel never touches or extends beyond the screen edge.
- Recalculate while the dropdown is open when the window scrolls or resizes.

The existing dropdown owns its scrollbar, so a constrained panel remains fully navigable without extending the page.

### Sales Voucher header layout

Place the existing Date and Notes `mat-form-field` elements in one `.form-row` on the Sales Voucher page. Date retains its natural field width; Notes uses the wider remaining space. Existing global responsive form-row behavior may wrap the controls on narrow screens to keep them usable.

No form controls, validation, submission behavior, or data shape changes.

## Testing

- Add focused unit coverage for positioning on a scrolled page, proving viewport coordinates are not offset by document scroll.
- Cover opening above an anchor near the viewport bottom.
- Cover maximum-height limiting to the available viewport space.
- Cover the Sales Voucher template layout so Date and Notes remain children of the same form row.
- Run the focused frontend tests, then the full frontend test/build checks supported by the project.

## Non-goals

- Replacing the custom component with Angular CDK Overlay.
- Redesigning searchable-select visuals or interaction behavior.
- Changing Date/Notes layout on Journal, Vendor Purchase, or other voucher pages.
