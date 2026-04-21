using AutoMapper;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Customer
        CreateMap<Customer, CustomerDto>();
        CreateMap<CreateCustomerRequest, Customer>();
        CreateMap<UpdateCustomerRequest, Customer>();

        // Vendor
        CreateMap<Vendor, VendorDto>();
        CreateMap<CreateVendorRequest, Vendor>();
        CreateMap<UpdateVendorRequest, Vendor>();

        // Item
        CreateMap<Item, ItemDto>();
        CreateMap<CreateItemRequest, Item>();
        CreateMap<UpdateItemRequest, Item>();

        // Voucher
        CreateMap<Voucher, VoucherListDto>()
            .ForMember(d => d.TotalDebit, o => o.MapFrom(s => s.Lines.Sum(l => l.Debit)))
            .ForMember(d => d.TotalCredit, o => o.MapFrom(s => s.Lines.Sum(l => l.Credit)));

        CreateMap<Voucher, VoucherDetailDto>();

        CreateMap<VoucherLine, VoucherLineDto>()
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Customer != null ? s.Customer.Name : null))
            .ForMember(d => d.VendorName, o => o.MapFrom(s => s.Vendor != null ? s.Vendor.Name : null))
            .ForMember(d => d.ItemName, o => o.MapFrom(s => s.Item != null ? s.Item.Name : null))
            .ForMember(d => d.EntryTypeLabel, o => o.MapFrom(s => GetEntryTypeLabel(s.EntryType)));
    }

    private static string GetEntryTypeLabel(EntryType entryType) => entryType switch
    {
        EntryType.CustomerDebit => "Customer Debit",
        EntryType.CustomerCredit => "Customer Credit",
        EntryType.VendorDebit => "Vendor Debit",
        EntryType.VendorCredit => "Vendor Credit",
        EntryType.Revenue => "Revenue",
        EntryType.Expense => "Expense",
        EntryType.CashDebit => "Cash / Bank Debit",
        EntryType.CashCredit => "Cash / Bank Credit",
        _ => entryType.ToString()
    };
}
