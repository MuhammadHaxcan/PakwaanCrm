using PakwaanCrm.API.Data;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;

namespace PakwaanCrm.API.Repositories.Implementations;

public class ItemRepository : Repository<Item>, IItemRepository
{
    public ItemRepository(AppDbContext context) : base(context) { }
}
