export interface SoaPrintQuery {
  accountType: string;
  accountId: number;
  startDate?: string;
  endDate?: string;
}

export interface MasterPrintQuery {
  startDate?: string;
  endDate?: string;
  customerId?: number | null;
  vendorId?: number | null;
  voucherType?: number | null;
}

export function buildSoaPrintUrl(query: SoaPrintQuery): string {
  const params = new URLSearchParams();
  params.set('accountType', query.accountType);
  params.set('accountId', String(query.accountId));
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  return `/print-soa?${params.toString()}`;
}

export function buildMasterReportPrintUrl(query: MasterPrintQuery): string {
  const params = new URLSearchParams();
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  if (query.customerId) params.set('customerId', String(query.customerId));
  if (query.vendorId) params.set('vendorId', String(query.vendorId));
  if (query.voucherType !== null && query.voucherType !== undefined) params.set('voucherType', String(query.voucherType));
  return `/print-master-report?${params.toString()}`;
}

export function buildReportPrintApiPath(path: 'soa' | 'master', queryString: string): string {
  const normalized = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  return `/api/reports/print/${path}${normalized ? `?${normalized}` : ''}`;
}

