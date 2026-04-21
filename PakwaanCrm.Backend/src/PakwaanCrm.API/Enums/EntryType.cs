namespace PakwaanCrm.API.Enums;

public enum EntryType
{
    CustomerDebit = 0,  // Dr. Customer (sale on credit)
    CustomerCredit = 1, // Cr. Customer (payment received from customer)
    VendorDebit = 2,    // Dr. Vendor   (pay vendor / clear payable)
    VendorCredit = 3,   // Cr. Vendor   (purchase on credit)
    Revenue = 4,        // Cr. Revenue  (income earned)
    Expense = 5,        // Dr. Expense  (cost incurred)
    CashDebit = 6,      // Dr. Bank/Cash (money received into bank)
    CashCredit = 7      // Cr. Bank/Cash (money paid out of bank)
}
