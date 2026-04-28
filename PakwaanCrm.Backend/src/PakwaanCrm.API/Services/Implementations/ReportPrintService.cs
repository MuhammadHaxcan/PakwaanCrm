using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Services.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PakwaanCrm.API.Services.Implementations;

public class ReportPrintService : IReportPrintService
{
    private readonly IReportService _reportService;

    public ReportPrintService(IReportService reportService)
    {
        _reportService = reportService;
    }

    public async Task<Result<PrintableVoucherDocument>> GenerateSoaPdfAsync(
        string accountType,
        int accountId,
        DateTime? startDate,
        DateTime? endDate,
        CancellationToken ct = default)
    {
        var soa = await _reportService.GetSoaAsync(accountType, accountId, startDate, endDate, ct);
        if (soa == null)
            return Result<PrintableVoucherDocument>.Failure("Account not found.");

        var content = BuildSoaPdf(soa, startDate, endDate);
        return Result<PrintableVoucherDocument>.Success(new PrintableVoucherDocument
        {
            FileName = $"SOA_{Sanitize(soa.AccountName)}_{DateTime.UtcNow:yyyy-MM-dd}.pdf",
            ContentType = "application/pdf",
            Content = content
        });
    }

    public async Task<Result<PrintableVoucherDocument>> GenerateMasterReportPdfAsync(
        DateTime? startDate,
        DateTime? endDate,
        int? customerId,
        int? vendorId,
        int? voucherType,
        CancellationToken ct = default)
    {
        var result = await _reportService.GetMasterReportAsync(
            startDate,
            endDate,
            customerId,
            vendorId,
            voucherType,
            0,
            100000,
            ct);

        var content = BuildMasterPdf(result, startDate, endDate);
        return Result<PrintableVoucherDocument>.Success(new PrintableVoucherDocument
        {
            FileName = $"MasterReport_{DateTime.UtcNow:yyyy-MM-dd}.pdf",
            ContentType = "application/pdf",
            Content = content
        });
    }

    private static byte[] BuildSoaPdf(SoaResponseDto soa, DateTime? startDate, DateTime? endDate)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(24);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(c =>
                {
                    c.Item().Text("Statement of Account").SemiBold().FontSize(18).FontColor(Colors.Blue.Medium);
                    c.Item().Text($"{soa.AccountName} ({soa.AccountType})").SemiBold();
                    c.Item().Text($"Period: {Fmt(startDate)} to {Fmt(endDate)}");
                    c.Item().Text($"Opening: {soa.OpeningBalance:0.00}  Debit: {soa.TotalDebit:0.00}  Credit: {soa.TotalCredit:0.00}  Closing: {soa.ClosingBalance:0.00}");
                });

                page.Content().PaddingTop(10).Table(t =>
                {
                    t.ColumnsDefinition(cd =>
                    {
                        cd.RelativeColumn(1.2f);
                        cd.RelativeColumn(1.4f);
                        cd.RelativeColumn(1.1f);
                        cd.RelativeColumn(2.1f);
                        cd.RelativeColumn(1.1f);
                        cd.RelativeColumn(1.1f);
                        cd.RelativeColumn(1.2f);
                    });

                    t.Header(h =>
                    {
                        h.Cell().Element(HeaderCell).Text("Date");
                        h.Cell().Element(HeaderCell).Text("Voucher");
                        h.Cell().Element(HeaderCell).Text("Type");
                        h.Cell().Element(HeaderCell).Text("Description");
                        h.Cell().Element(HeaderCell).AlignRight().Text("Debit");
                        h.Cell().Element(HeaderCell).AlignRight().Text("Credit");
                        h.Cell().Element(HeaderCell).AlignRight().Text("Balance");
                    });

                    // opening
                    t.Cell().Element(RowCell).Text("");
                    t.Cell().Element(RowCell).Text("");
                    t.Cell().Element(RowCell).Text("");
                    t.Cell().Element(RowCell).Text("Opening Balance").SemiBold();
                    t.Cell().Element(RowCell).Text("");
                    t.Cell().Element(RowCell).Text("");
                    t.Cell().Element(RowCell).AlignRight().Text($"{soa.OpeningBalance:0.00}").SemiBold();

                    foreach (var e in soa.Entries)
                    {
                        t.Cell().Element(RowCell).Text(e.Date.ToString("dd/MM/yyyy"));
                        t.Cell().Element(RowCell).Text(e.VoucherNo);
                        t.Cell().Element(RowCell).Text(e.VoucherType);
                        t.Cell().Element(RowCell).Text(e.Description ?? string.Empty);
                        t.Cell().Element(RowCell).AlignRight().Text(e.Debit > 0 ? $"{e.Debit:0.00}" : "");
                        t.Cell().Element(RowCell).AlignRight().Text(e.Credit > 0 ? $"{e.Credit:0.00}" : "");
                        t.Cell().Element(RowCell).AlignRight().Text($"{e.RunningBalance:0.00}");
                    }
                });

                page.Footer().AlignRight().Text($"Generated: {DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC").FontSize(8).FontColor(Colors.Grey.Darken1);
            });
        }).GeneratePdf();
    }

    private static byte[] BuildMasterPdf(MasterReportResponseDto report, DateTime? startDate, DateTime? endDate)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(18);
                page.DefaultTextStyle(x => x.FontSize(9));

                page.Header().Column(c =>
                {
                    c.Item().Text("Master Report").SemiBold().FontSize(18).FontColor(Colors.Blue.Medium);
                    c.Item().Text($"Period: {Fmt(startDate)} to {Fmt(endDate)}");
                    c.Item().Text($"Records: {report.TotalRecords}  Debit: {report.TotalDebit:0.00}  Credit: {report.TotalCredit:0.00}");
                });

                page.Content().PaddingTop(8).Table(t =>
                {
                    t.ColumnsDefinition(cd =>
                    {
                        cd.RelativeColumn(1.1f);
                        cd.RelativeColumn(1.2f);
                        cd.RelativeColumn(0.9f);
                        cd.RelativeColumn(1.5f);
                        cd.RelativeColumn(1.2f);
                        cd.RelativeColumn(1.2f);
                        cd.RelativeColumn(1.0f);
                        cd.RelativeColumn(1.5f);
                        cd.RelativeColumn(1.0f);
                        cd.RelativeColumn(1.0f);
                        cd.RelativeColumn(1.0f);
                    });

                    t.Header(h =>
                    {
                        var cols = new[] { "Date", "Voucher", "Type", "Account", "Category", "Item", "Qty", "Description", "Debit", "Credit", "Balance" };
                        foreach (var col in cols) h.Cell().Element(HeaderCell).Text(col);
                    });

                    if (report.HasOpeningBalance)
                    {
                        t.Cell().Element(RowCell).Text("");
                        t.Cell().Element(RowCell).Text("");
                        t.Cell().Element(RowCell).Text("");
                        t.Cell().Element(RowCell).Text("Opening Balance").SemiBold();
                        t.Cell().Element(RowCell).Text("");
                        t.Cell().Element(RowCell).Text("");
                        t.Cell().Element(RowCell).Text("");
                        t.Cell().Element(RowCell).Text("");
                        t.Cell().Element(RowCell).AlignRight().Text(report.OpeningDebit > 0 ? $"{report.OpeningDebit:0.00}" : "");
                        t.Cell().Element(RowCell).AlignRight().Text(report.OpeningCredit > 0 ? $"{report.OpeningCredit:0.00}" : "");
                        t.Cell().Element(RowCell).AlignRight().Text($"{report.OpeningBalance:0.00}");
                    }

                    foreach (var e in report.Entries)
                    {
                        t.Cell().Element(RowCell).Text(e.Date.ToString("dd/MM/yyyy"));
                        t.Cell().Element(RowCell).Text(e.VoucherNo);
                        t.Cell().Element(RowCell).Text(e.VoucherType);
                        t.Cell().Element(RowCell).Text(e.AccountName);
                        t.Cell().Element(RowCell).Text(e.AccountCategory);
                        t.Cell().Element(RowCell).Text(e.ItemName ?? string.Empty);
                        t.Cell().Element(RowCell).AlignRight().Text(e.Quantity.HasValue ? $"{e.Quantity:0.##} {e.QuantityTypeLabel}".Trim() : "");
                        t.Cell().Element(RowCell).Text(e.Description ?? string.Empty);
                        t.Cell().Element(RowCell).AlignRight().Text(e.Debit > 0 ? $"{e.Debit:0.00}" : "");
                        t.Cell().Element(RowCell).AlignRight().Text(e.Credit > 0 ? $"{e.Credit:0.00}" : "");
                        t.Cell().Element(RowCell).AlignRight().Text($"{e.RunningBalance:0.00}");
                    }
                });

                page.Footer().AlignRight().Text($"Generated: {DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC").FontSize(8).FontColor(Colors.Grey.Darken1);
            });
        }).GeneratePdf();
    }

    private static IContainer HeaderCell(IContainer c)
        => c.Background(Colors.Blue.Lighten4).Border(1).BorderColor(Colors.Grey.Lighten1).Padding(4).DefaultTextStyle(s => s.SemiBold());

    private static IContainer RowCell(IContainer c)
        => c.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3);

    private static string Fmt(DateTime? date) => date.HasValue ? date.Value.ToString("dd/MM/yyyy") : "All";

    private static string Sanitize(string value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return new string(value.Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray());
    }
}

