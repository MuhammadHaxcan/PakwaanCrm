namespace PakwaanCrm.API.DTOs.Responses;

public class SoaEntryDto
{
    public DateTime Date { get; set; }
    public string VoucherNo { get; set; } = string.Empty;
    public string VoucherType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal RunningBalance { get; set; }
}

public class SoaResponseDto
{
    public string AccountName { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public decimal OpeningBalance { get; set; }
    public List<SoaEntryDto> Entries { get; set; } = new();
    public decimal ClosingBalance { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
}

public class MasterReportEntryDto
{
    public DateTime Date { get; set; }
    public string VoucherNo { get; set; } = string.Empty;
    public string VoucherType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public string AccountCategory { get; set; } = string.Empty;
    public string? ItemName { get; set; }
    public decimal? Quantity { get; set; }
    public string? QuantityTypeLabel { get; set; }
    public decimal? Rate { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal RunningBalance { get; set; }
}

public class MasterReportResponseDto
{
    public List<MasterReportEntryDto> Entries { get; set; } = new();
    public int TotalRecords { get; set; }
    public bool HasMoreData { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public bool HasOpeningBalance { get; set; }
    public decimal OpeningDebit { get; set; }
    public decimal OpeningCredit { get; set; }
    public decimal OpeningBalance { get; set; }
}

public class AccountBalanceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public decimal OpeningBalance { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public decimal Balance { get; set; }
}
