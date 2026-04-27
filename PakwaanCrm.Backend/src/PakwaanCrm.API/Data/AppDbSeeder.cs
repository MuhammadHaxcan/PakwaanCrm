using Microsoft.EntityFrameworkCore;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.Data;

public static class AppDbSeeder
{
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        await EnsureCustomersAsync(db, ct);
        await EnsureVendorsAsync(db, ct);
        await EnsureItemsAsync(db, ct);

        if (!await db.Vouchers.AnyAsync(ct))
        {
            await SeedVoucherSamplesAsync(db, ct);
        }
    }

    private static async Task EnsureCustomersAsync(AppDbContext db, CancellationToken ct)
    {
        var customers = new[]
        {
            new Customer
            {
                Name = "Royal Event Planners",
                Phone = "0300-1111111",
                Address = "Gulshan-e-Iqbal, Karachi",
                OpeningBalance = 25000m
            },
            new Customer
            {
                Name = "Noor Wedding Services",
                Phone = "0300-2222222",
                Address = "PECHS, Karachi",
                OpeningBalance = 0m
            },
            new Customer
            {
                Name = "Ayesha Corporate Catering",
                Phone = "0300-3333333",
                Address = "Shahrah-e-Faisal, Karachi",
                OpeningBalance = 18000m
            }
        };

        foreach (var customer in customers)
        {
            var exists = await db.Customers.AnyAsync(c => c.Name.ToLower() == customer.Name.ToLower(), ct);
            if (!exists)
                await db.Customers.AddAsync(customer, ct);
        }

        await db.SaveChangesAsync(ct);
    }

    private static async Task EnsureVendorsAsync(AppDbContext db, CancellationToken ct)
    {
        var vendors = new[]
        {
            new Vendor
            {
                Name = "Sadiq Gas Suppliers",
                Phone = "0301-1111111",
                Address = "SITE Area, Karachi",
                OpeningBalance = 12000m
            },
            new Vendor
            {
                Name = "Karachi Packaging House",
                Phone = "0301-2222222",
                Address = "Jodia Bazaar, Karachi",
                OpeningBalance = 8000m
            },
            new Vendor
            {
                Name = "Fresh Meat Traders",
                Phone = "0301-3333333",
                Address = "Super Highway, Karachi",
                OpeningBalance = 0m
            }
        };

        foreach (var vendor in vendors)
        {
            var exists = await db.Vendors.AnyAsync(v => v.Name.ToLower() == vendor.Name.ToLower(), ct);
            if (!exists)
                await db.Vendors.AddAsync(vendor, ct);
        }

        await db.SaveChangesAsync(ct);
    }

    private static async Task EnsureItemsAsync(AppDbContext db, CancellationToken ct)
    {
        var items = new[]
        {
            new Item
            {
                Name = "Chicken Biryani",
                Unit = ItemUnit.PerPerson,
                DefaultRate = 750m,
                IsActive = true
            },
            new Item
            {
                Name = "Beef Qorma",
                Unit = ItemUnit.PerPerson,
                DefaultRate = 980m,
                IsActive = true
            },
            new Item
            {
                Name = "Salad Platter",
                Unit = ItemUnit.PerPerson,
                DefaultRate = 120m,
                IsActive = true
            },
            new Item
            {
                Name = "Mutton Karahi",
                Unit = ItemUnit.PerKg,
                DefaultRate = 1850m,
                IsActive = true
            }
        };

        foreach (var item in items)
        {
            var exists = await db.Items.AnyAsync(i => i.Name.ToLower() == item.Name.ToLower(), ct);
            if (!exists)
                await db.Items.AddAsync(item, ct);
        }

        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedVoucherSamplesAsync(AppDbContext db, CancellationToken ct)
    {
        var customer1 = await db.Customers.FirstAsync(c => c.Name == "Royal Event Planners", ct);
        var customer2 = await db.Customers.FirstAsync(c => c.Name == "Noor Wedding Services", ct);
        var customer3 = await db.Customers.FirstAsync(c => c.Name == "Ayesha Corporate Catering", ct);

        var vendor1 = await db.Vendors.FirstAsync(v => v.Name == "Sadiq Gas Suppliers", ct);
        var vendor2 = await db.Vendors.FirstAsync(v => v.Name == "Karachi Packaging House", ct);

        var biryani = await db.Items.FirstAsync(i => i.Name == "Chicken Biryani", ct);
        var qorma = await db.Items.FirstAsync(i => i.Name == "Beef Qorma", ct);
        var salad = await db.Items.FirstAsync(i => i.Name == "Salad Platter", ct);
        var karahi = await db.Items.FirstAsync(i => i.Name == "Mutton Karahi", ct);

        var today = DateTime.UtcNow.Date;

        var vouchers = new List<Voucher>
        {
            new Voucher
            {
                VoucherNo = "SV-0001",
                Date = today.AddDays(-18),
                VoucherType = VoucherType.Sales,
                Description = "Wedding catering - Mehndi event",
                Notes = "Sample seeded sales voucher",
                Lines =
                {
                    new VoucherLine
                    {
                        EntryType = EntryType.CustomerDebit,
                        CustomerId = customer1.Id,
                        ItemId = biryani.Id,
                        QuantityType = QuantityType.PerPerson,
                        Quantity = 140,
                        Rate = 750,
                        Description = "Chicken Biryani",
                        Debit = 105000m
                    },
                    new VoucherLine
                    {
                        EntryType = EntryType.CustomerDebit,
                        CustomerId = customer1.Id,
                        ItemId = salad.Id,
                        QuantityType = QuantityType.PerPerson,
                        Quantity = 140,
                        Rate = 120,
                        Description = "Salad Platter",
                        Debit = 16800m
                    },
                    new VoucherLine
                    {
                        EntryType = EntryType.Revenue,
                        FreeText = "Sales Revenue",
                        Description = "Wedding catering - Mehndi event",
                        Credit = 121800m
                    }
                }
            },
            new Voucher
            {
                VoucherNo = "SV-0002",
                Date = today.AddDays(-12),
                VoucherType = VoucherType.Sales,
                Description = "Corporate lunch service",
                Notes = "Sample seeded sales voucher",
                Lines =
                {
                    new VoucherLine
                    {
                        EntryType = EntryType.CustomerDebit,
                        CustomerId = customer3.Id,
                        ItemId = qorma.Id,
                        QuantityType = QuantityType.PerPerson,
                        Quantity = 85,
                        Rate = 980,
                        Description = "Beef Qorma",
                        Debit = 83300m
                    },
                    new VoucherLine
                    {
                        EntryType = EntryType.CustomerDebit,
                        CustomerId = customer3.Id,
                        ItemId = karahi.Id,
                        QuantityType = QuantityType.PerKg,
                        Quantity = 18,
                        Rate = 1850,
                        Description = "Mutton Karahi",
                        Debit = 33300m
                    },
                    new VoucherLine
                    {
                        EntryType = EntryType.Revenue,
                        FreeText = "Sales Revenue",
                        Description = "Corporate lunch service",
                        Credit = 116600m
                    }
                }
            },
            new Voucher
            {
                VoucherNo = "PV-0001",
                Date = today.AddDays(-16),
                VoucherType = VoucherType.Purchase,
                Description = "Gas and utility supply bill",
                Notes = "Sample seeded purchase voucher",
                Lines =
                {
                    new VoucherLine
                    {
                        EntryType = EntryType.Expense,
                        FreeText = "Gas cylinder 5kg",
                        Quantity = 12,
                        Rate = 2500,
                        Description = "Kitchen fuel charge",
                        Debit = 30000m
                    },
                    new VoucherLine
                    {
                        EntryType = EntryType.Expense,
                        FreeText = "Burner maintenance",
                        Quantity = 2,
                        Rate = 4200,
                        Description = "Monthly maintenance",
                        Debit = 8400m
                    },
                    new VoucherLine
                    {
                        EntryType = EntryType.VendorCredit,
                        VendorId = vendor1.Id,
                        Description = "Gas and utility supply bill",
                        Credit = 38400m
                    }
                }
            },
            new Voucher
            {
                VoucherNo = "PV-0002",
                Date = today.AddDays(-10),
                VoucherType = VoucherType.Purchase,
                Description = "Packaging and serving supplies",
                Notes = "Sample seeded purchase voucher",
                Lines =
                {
                    new VoucherLine
                    {
                        EntryType = EntryType.Expense,
                        FreeText = "Disposable meal boxes",
                        Quantity = 220,
                        Rate = 38,
                        Description = "Takeaway serving boxes",
                        Debit = 8360m
                    },
                    new VoucherLine
                    {
                        EntryType = EntryType.Expense,
                        FreeText = "Printed food labels",
                        Quantity = 220,
                        Rate = 9,
                        Description = "Event branding labels",
                        Debit = 1980m
                    },
                    new VoucherLine
                    {
                        EntryType = EntryType.VendorCredit,
                        VendorId = vendor2.Id,
                        Description = "Packaging and serving supplies",
                        Credit = 10340m
                    }
                }
            },
            new Voucher
            {
                VoucherNo = "JV-0001",
                Date = today.AddDays(-8),
                VoucherType = VoucherType.General,
                Description = "Receipt from Royal Event Planners",
                Notes = "Sample seeded journal voucher",
                Lines =
                {
                    new VoucherLine
                    {
                        EntryType = EntryType.CashDebit,
                        FreeText = "Cash / Bank",
                        Description = "Customer receipt",
                        Debit = 60000m
                    },
                    new VoucherLine
                    {
                        EntryType = EntryType.CustomerCredit,
                        CustomerId = customer1.Id,
                        Description = "Receipt from Royal Event Planners",
                        Credit = 60000m
                    }
                }
            },
            new Voucher
            {
                VoucherNo = "JV-0002",
                Date = today.AddDays(-6),
                VoucherType = VoucherType.General,
                Description = "Payment to Sadiq Gas Suppliers",
                Notes = "Sample seeded journal voucher",
                Lines =
                {
                    new VoucherLine
                    {
                        EntryType = EntryType.VendorDebit,
                        VendorId = vendor1.Id,
                        Description = "Vendor payment",
                        Debit = 18000m
                    },
                    new VoucherLine
                    {
                        EntryType = EntryType.CashCredit,
                        FreeText = "Cash / Bank",
                        Description = "Payment to Sadiq Gas Suppliers",
                        Credit = 18000m
                    }
                }
            },
            new Voucher
            {
                VoucherNo = "JV-0003",
                Date = today.AddDays(-3),
                VoucherType = VoucherType.General,
                Description = "Advance received from Noor Wedding Services",
                Notes = "Sample seeded journal voucher",
                Lines =
                {
                    new VoucherLine
                    {
                        EntryType = EntryType.CashDebit,
                        FreeText = "Cash / Bank",
                        Description = "Advance receipt",
                        Debit = 35000m
                    },
                    new VoucherLine
                    {
                        EntryType = EntryType.CustomerCredit,
                        CustomerId = customer2.Id,
                        Description = "Advance received from Noor Wedding Services",
                        Credit = 35000m
                    }
                }
            }
        };

        await db.Vouchers.AddRangeAsync(vouchers, ct);
        await db.SaveChangesAsync(ct);
    }
}
