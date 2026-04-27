import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MasterReportEntry, SoaEntry, SoaResponse } from '../models/models';

type MasterColumnKey = 'date' | 'voucherNo' | 'voucherType' | 'account' | 'category' | 'item' | 'qty' | 'description' | 'debit' | 'credit' | 'balance';

@Injectable({ providedIn: 'root' })
export class ReportExportService {
  exportMasterReportPdf(options: {
    entries: MasterReportEntry[];
    visibleCols: Record<string, boolean>;
    totalRecords: number;
    totalDebit: number;
    totalCredit: number;
    hasOpeningBalance?: boolean;
    openingDebit?: number;
    openingCredit?: number;
    openingBalance?: number;
    filters: {
      startDate?: string;
      endDate?: string;
      customerName?: string;
      vendorName?: string;
      voucherTypeLabel?: string;
    };
  }) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const columns = this.getMasterColumns(options.visibleCols);

    const entryRows = options.entries.map(entry => columns.map(column => this.getMasterColumnValue(entry, column.key)));

    let openingRowIndex: number | null = null;
    let body: string[][];
    if (options.hasOpeningBalance) {
      openingRowIndex = 0;
      const openingRow = columns.map(col => {
        if (col.key === 'account') return 'Opening Balance';
        if (col.key === 'debit') return (options.openingDebit ?? 0) > 0 ? this.money(options.openingDebit!) : '';
        if (col.key === 'credit') return (options.openingCredit ?? 0) > 0 ? this.money(options.openingCredit!) : '';
        return '';
      });
      body = [openingRow, ...entryRows];
    } else {
      body = entryRows;
    }

    const closingBalance = options.entries.length
      ? options.entries[options.entries.length - 1].runningBalance
      : (options.openingBalance ?? 0);

    const foot = [columns.map(column =>
      this.getMasterFooterValue(column.key, options.totalDebit, options.totalCredit, closingBalance)
    )];

    this.drawReportShell(doc, 'Master Report', []);

    autoTable(doc, {
      startY: 46,
      head: [columns.map(column => column.label)],
      body,
      foot,
      theme: 'grid',
      margin: { top: 46, right: 10, bottom: 16, left: 10 },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [222, 226, 230],
        lineWidth: 0.1,
        textColor: [30, 41, 59]
      },
      headStyles: {
        fillColor: [48, 72, 156],
        textColor: 255,
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold'
      },
      columnStyles: this.getMasterColumnStyles(columns),
      didParseCell: data => {
        if (data.section === 'body' && openingRowIndex !== null && data.row.index === openingRowIndex) {
          data.cell.styles.fillColor = [255, 251, 235];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawPage: data => this.drawPageFrame(doc, 'Master Report', data.pageNumber)
    });

    doc.save(this.fileName('Master_Report'));
  }

  exportSoaPdf(options: {
    soa: SoaResponse;
    entries: SoaEntry[];
    filters: {
      startDate?: string;
      endDate?: string;
    };
  }) {
    const { soa, entries, filters } = options;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const summaryLines = [
      `Account: ${soa.accountName} (${soa.accountType})`,
      `Period: ${filters.startDate || 'Beginning'} to ${filters.endDate || 'Today'}`,
      `Opening: ${this.money(soa.openingBalance)} | Debit: ${this.money(soa.totalDebit)} | Credit: ${this.money(soa.totalCredit)} | Closing: ${this.money(soa.closingBalance)}`
    ];

    const body = [
      ['Opening Balance', '', '', '', '', '', this.money(soa.openingBalance)],
      ...entries.map(entry => [
        this.date(entry.date),
        entry.voucherNo,
        entry.voucherType,
        entry.description ?? '',
        entry.debit > 0 ? this.money(entry.debit) : '',
        entry.credit > 0 ? this.money(entry.credit) : '',
        this.money(entry.runningBalance)
      ]),
      ['', '', '', 'Closing Balance', this.money(soa.totalDebit), this.money(soa.totalCredit), this.money(soa.closingBalance)]
    ];

    const openingIndex = 0;
    const closingIndex = body.length - 1;

    this.drawReportShell(doc, 'Statement of Account', summaryLines);

    autoTable(doc, {
      startY: 38,
      head: [['Date', 'Voucher No', 'Type', 'Description', 'Debit', 'Credit', 'Balance']],
      body,
      theme: 'grid',
      margin: { top: 38, right: 10, bottom: 16, left: 10 },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.2,
        lineColor: [222, 226, 230],
        lineWidth: 0.1,
        textColor: [30, 41, 59]
      },
      headStyles: {
        fillColor: [48, 72, 156],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 28 },
        2: { cellWidth: 22 },
        3: { cellWidth: 55 },
        4: { halign: 'right', cellWidth: 20 },
        5: { halign: 'right', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 24 }
      },
      didParseCell: data => {
        if (data.section === 'body' && (data.row.index === openingIndex || data.row.index === closingIndex)) {
          data.cell.styles.fillColor = [248, 250, 252];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawPage: data => this.drawPageFrame(doc, 'Statement of Account', data.pageNumber)
    });

    doc.save(this.fileName(`SOA_${soa.accountName}`));
  }

  private drawReportShell(doc: jsPDF, title: string, summaryLines: string[]) {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(48, 72, 156);
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 10, 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Pakwaan CRM', 10, 17);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    let y = 32;
    for (const line of summaryLines) {
      doc.text(line, 10, y);
      y += 4.5;
    }
  }

  private drawPageFrame(doc: jsPDF, title: string, pageNumber: number) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.line(10, pageHeight - 10, pageWidth - 10, pageHeight - 10);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(title, 10, pageHeight - 5);
    doc.text(`Page ${pageNumber}`, pageWidth - 10, pageHeight - 5, { align: 'right' });
  }

  private getMasterColumns(visibleCols: Record<string, boolean>) {
    const allColumns: Array<{ key: MasterColumnKey; label: string }> = [
      { key: 'date', label: 'Date' },
      { key: 'voucherNo', label: 'Voucher No' },
      { key: 'voucherType', label: 'Type' },
      { key: 'account', label: 'Account' },
      { key: 'category', label: 'Category' },
      { key: 'item', label: 'Item' },
      { key: 'qty', label: 'Qty' },
      { key: 'description', label: 'Description' },
      { key: 'debit', label: 'Debit (PKR)' },
      { key: 'credit', label: 'Credit (PKR)' },
      { key: 'balance', label: 'Balance (PKR)' }
    ];

    return allColumns.filter(column => visibleCols[column.key]);
  }

  private getMasterColumnValue(entry: MasterReportEntry, key: MasterColumnKey) {
    switch (key) {
      case 'date':
        return this.date(entry.date);
      case 'voucherNo':
        return entry.voucherNo;
      case 'voucherType':
        return entry.voucherType;
      case 'account':
        return entry.accountName;
      case 'category':
        return entry.accountCategory;
      case 'item':
        return entry.itemName ?? '';
      case 'qty':
        return entry.quantity ? `${entry.quantity} ${entry.quantityTypeLabel ?? ''}` : '';
      case 'description':
        return entry.description ?? '';
      case 'debit':
        return entry.debit > 0 ? this.money(entry.debit) : '';
      case 'credit':
        return entry.credit > 0 ? this.money(entry.credit) : '';
      case 'balance':
        return this.money(entry.runningBalance);
    }
  }

  private getMasterFooterValue(key: MasterColumnKey, totalDebit: number, totalCredit: number, closingBalance: number) {
    if (key === 'debit') return this.money(totalDebit);
    if (key === 'credit') return this.money(totalCredit);
    if (key === 'balance') return this.money(closingBalance);
    if (key === 'description') return 'Totals';
    return '';
  }

  private getMasterColumnStyles(columns: Array<{ key: MasterColumnKey; label: string }>) {
    const styles: Record<number, { halign?: 'left' | 'right' | 'center'; cellWidth?: number | 'auto' }> = {};

    columns.forEach((column, index) => {
      if (column.key === 'debit' || column.key === 'credit' || column.key === 'balance') {
        styles[index] = { halign: 'right', cellWidth: 24 };
      } else if (column.key === 'date') {
        styles[index] = { cellWidth: 22 };
      } else if (column.key === 'voucherNo') {
        styles[index] = { cellWidth: 26 };
      } else if (column.key === 'voucherType') {
        styles[index] = { cellWidth: 18 };
      } else if (column.key === 'qty') {
        styles[index] = { halign: 'right', cellWidth: 22 };
      } else if (column.key === 'description') {
        styles[index] = { cellWidth: 42 };
      } else {
        styles[index] = { cellWidth: 'auto' };
      }
    });

    return styles;
  }

  private date(value: string) {
    return new Date(value).toLocaleDateString('en-GB');
  }

  private money(value: number) {
    return value.toFixed(2);
  }

  private fileName(base: string) {
    const safeBase = base.replace(/[^a-z0-9-_]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const today = new Date().toISOString().split('T')[0];
    return `${safeBase || 'Report'}_${today}.pdf`;
  }
}
