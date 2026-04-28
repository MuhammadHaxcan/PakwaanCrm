using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Enums;
using PakwaanCrm.API.Services.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PakwaanCrm.API.Services.Implementations;

public class VoucherPrintService : IVoucherPrintService
{
    private readonly IVoucherService _voucherService;

    public VoucherPrintService(IVoucherService voucherService)
    {
        _voucherService = voucherService;
    }

    public async Task<Result<PrintableVoucherDocument>> GenerateVoucherPdfAsync(
        string voucherNo,
        VoucherType expectedType,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(voucherNo))
            return Result<PrintableVoucherDocument>.Failure("Voucher number is required.");

        var normalizedVoucherNo = voucherNo.Trim().ToUpperInvariant();
        var prefix = GetPrefix(expectedType);
        if (!normalizedVoucherNo.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return Result<PrintableVoucherDocument>.Failure("Voucher type mismatch.");

        var voucher = await _voucherService.GetByVoucherNoAsync(normalizedVoucherNo, ct);
        if (voucher == null)
            return Result<PrintableVoucherDocument>.Failure("Voucher not found.");

        if (voucher.VoucherType != expectedType)
            return Result<PrintableVoucherDocument>.Failure("Voucher type mismatch.");

        var pdfBytes = BuildVoucherPdf(voucher);
        var result = new PrintableVoucherDocument
        {
            FileName = $"{normalizedVoucherNo}.pdf",
            ContentType = "application/pdf",
            Content = pdfBytes
        };

        return Result<PrintableVoucherDocument>.Success(result);
    }

    private static byte[] BuildVoucherPdf(VoucherDetailDto voucher)
    {
        var generatedAt = DateTime.UtcNow;
        var totalDebit = voucher.Lines.Sum(line => line.Debit);
        var totalCredit = voucher.Lines.Sum(line => line.Credit);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(24);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(column =>
                {
                    column.Item().Text(GetVoucherTitle(voucher.VoucherType))
                        .SemiBold()
                        .FontSize(18)
                        .FontColor(Colors.Blue.Medium);
                    column.Item().Text($"Voucher No: {voucher.VoucherNo}").SemiBold();
                    column.Item().Text($"Date: {voucher.Date:dd/MM/yyyy}");
                    column.Item().Text($"Generated: {generatedAt:dd/MM/yyyy HH:mm} UTC")
                        .FontColor(Colors.Grey.Darken2)
                        .FontSize(9);
                });

                page.Content().PaddingVertical(12).Column(column =>
                {
                    if (!string.IsNullOrWhiteSpace(voucher.Description))
                    {
                        column.Item().Text($"Description: {voucher.Description}").SemiBold();
                    }

                    if (!string.IsNullOrWhiteSpace(voucher.Notes))
                    {
                        column.Item().Text($"Notes: {voucher.Notes}");
                    }

                    column.Item().PaddingTop(10).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(1.2f);
                            columns.RelativeColumn(1.8f);
                            columns.RelativeColumn(1.7f);
                            columns.RelativeColumn(1.1f);
                            columns.RelativeColumn(1.2f);
                            columns.RelativeColumn(1.2f);
                            columns.RelativeColumn(1.2f);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(CellStyle).Text("Entry");
                            header.Cell().Element(CellStyle).Text("Account");
                            header.Cell().Element(CellStyle).Text("Item / Text");
                            header.Cell().Element(CellStyle).AlignRight().Text("Qty");
                            header.Cell().Element(CellStyle).AlignRight().Text("Rate");
                            header.Cell().Element(CellStyle).AlignRight().Text("Debit");
                            header.Cell().Element(CellStyle).AlignRight().Text("Credit");
                        });

                        foreach (var line in voucher.Lines)
                        {
                            var accountName = line.CustomerName ?? line.VendorName ?? line.AccountName ?? "-";
                            var itemOrText = line.ItemName ?? line.FreeText ?? line.Description ?? "-";
                            var qtyText = line.Quantity.HasValue
                                ? $"{line.Quantity.Value:0.##} {(line.QuantityType?.ToString() ?? string.Empty)}".Trim()
                                : string.Empty;

                            table.Cell().Element(RowStyle).Text(line.EntryTypeLabel);
                            table.Cell().Element(RowStyle).Text(accountName);
                            table.Cell().Element(RowStyle).Text(itemOrText);
                            table.Cell().Element(RowStyle).AlignRight().Text(qtyText);
                            table.Cell().Element(RowStyle).AlignRight().Text(line.Rate > 0 ? line.Rate.Value.ToString("0.##") : string.Empty);
                            table.Cell().Element(RowStyle).AlignRight().Text(line.Debit > 0 ? line.Debit.ToString("0.00") : string.Empty);
                            table.Cell().Element(RowStyle).AlignRight().Text(line.Credit > 0 ? line.Credit.ToString("0.00") : string.Empty);
                        }
                    });

                    column.Item().PaddingTop(12).AlignRight().Column(totalColumn =>
                    {
                        totalColumn.Item().Text($"Total Debit: {totalDebit:0.00}").SemiBold();
                        totalColumn.Item().Text($"Total Credit: {totalCredit:0.00}").SemiBold();
                    });
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Pakwaan CRM");
                    text.Span(" | ");
                    text.CurrentPageNumber();
                    text.Span(" / ");
                    text.TotalPages();
                });
            });
        }).GeneratePdf();
    }

    private static string GetVoucherTitle(VoucherType voucherType) => voucherType switch
    {
        VoucherType.Sales => "Sales Voucher",
        VoucherType.Purchase => "Purchase Voucher",
        _ => "Journal Voucher"
    };

    private static string GetPrefix(VoucherType voucherType) => voucherType switch
    {
        VoucherType.Sales => "SV-",
        VoucherType.Purchase => "PV-",
        _ => "JV-"
    };

    private static IContainer CellStyle(IContainer container)
    {
        return container
            .Background(Colors.Grey.Lighten2)
            .Border(1)
            .BorderColor(Colors.Grey.Lighten1)
            .Padding(6)
            .DefaultTextStyle(style => style.SemiBold());
    }

    private static IContainer RowStyle(IContainer container)
    {
        return container
            .BorderBottom(1)
            .BorderColor(Colors.Grey.Lighten2)
            .PaddingVertical(5)
            .PaddingHorizontal(4);
    }
}

