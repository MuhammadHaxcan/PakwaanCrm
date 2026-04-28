export type VoucherPrintKind = 'sale' | 'purchase' | 'journal';

function normalizeVoucherType(voucherType: string | null | undefined): string {
  return (voucherType ?? '').trim().toLowerCase();
}

export function getVoucherPrintKind(voucherType: string | null | undefined): VoucherPrintKind {
  const normalized = normalizeVoucherType(voucherType);
  if (normalized === 'sales' || normalized === 'sale') return 'sale';
  if (normalized === 'purchase' || normalized === 'vendor purchase') return 'purchase';
  return 'journal';
}

export function buildVoucherPrintRoute(voucherType: string | null | undefined, voucherNo: string): string {
  const kind = getVoucherPrintKind(voucherType);
  const encodedVoucherNo = encodeURIComponent(voucherNo.trim());
  return `/print-${kind}-voucher/${encodedVoucherNo}`;
}

export function buildVoucherPrintApiPath(kind: VoucherPrintKind, voucherNo: string): string {
  const encodedVoucherNo = encodeURIComponent(voucherNo.trim());
  return `/api/vouchers/print/${kind}/${encodedVoucherNo}`;
}

