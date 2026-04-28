using Microsoft.EntityFrameworkCore;
using PakwaanCrm.API.Entities;

namespace PakwaanCrm.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<VoucherLine> VoucherLines => Set<VoucherLine>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Account> Accounts => Set<Account>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Global soft-delete filters
        modelBuilder.Entity<Customer>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Vendor>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Item>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Voucher>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<VoucherLine>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<AppUser>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Account>().HasQueryFilter(e => !e.IsDeleted);

        // Decimal precision
        modelBuilder.Entity<Customer>().Property(e => e.OpeningBalance).HasPrecision(18, 2);
        modelBuilder.Entity<Vendor>().Property(e => e.OpeningBalance).HasPrecision(18, 2);
        modelBuilder.Entity<Item>().Property(e => e.DefaultRate).HasPrecision(18, 4);

        modelBuilder.Entity<VoucherLine>().Property(e => e.Debit).HasPrecision(18, 2);
        modelBuilder.Entity<VoucherLine>().Property(e => e.Credit).HasPrecision(18, 2);
        modelBuilder.Entity<VoucherLine>().Property(e => e.Quantity).HasPrecision(18, 3);
        modelBuilder.Entity<VoucherLine>().Property(e => e.Rate).HasPrecision(18, 4);

        // Unique index on VoucherNo
        modelBuilder.Entity<Voucher>().HasIndex(e => e.VoucherNo).IsUnique();
        modelBuilder.Entity<AppUser>().HasIndex(e => e.Username).IsUnique();
        modelBuilder.Entity<RefreshToken>().HasIndex(e => e.TokenHash).IsUnique();

        // Voucher → Lines
        modelBuilder.Entity<VoucherLine>()
            .HasOne(l => l.Voucher)
            .WithMany(v => v.Lines)
            .HasForeignKey(l => l.VoucherId)
            .OnDelete(DeleteBehavior.Cascade);

        // VoucherLine → Customer (nullable)
        modelBuilder.Entity<VoucherLine>()
            .HasOne(l => l.Customer)
            .WithMany(c => c.VoucherLines)
            .HasForeignKey(l => l.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        // VoucherLine → Vendor (nullable)
        modelBuilder.Entity<VoucherLine>()
            .HasOne(l => l.Vendor)
            .WithMany(v => v.VoucherLines)
            .HasForeignKey(l => l.VendorId)
            .OnDelete(DeleteBehavior.Restrict);

        // VoucherLine → Item (nullable)
        modelBuilder.Entity<VoucherLine>()
            .HasOne(l => l.Item)
            .WithMany(i => i.VoucherLines)
            .HasForeignKey(l => l.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        // VoucherLine → Account (nullable)
        modelBuilder.Entity<VoucherLine>()
            .HasOne(l => l.Account)
            .WithMany(a => a.VoucherLines)
            .HasForeignKey(l => l.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<RefreshToken>()
            .HasOne(rt => rt.AppUser)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.AppUserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
