import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  it('restocks and records usage without allowing stock below zero', () => {
    const inventory = new InventoryService();

    inventory.restock('black-truffle');
    expect(inventory.inventory()[0].quantity).toBe(3.4);

    const saffron = inventory.inventory().find((item) => item.id === 'kashmiri-saffron');
    expect(saffron?.quantity).toBe(0.08);
    expect(inventory.recordUsage('kashmiri-saffron')).toBe(true);
    expect(inventory.inventory().find((item) => item.id === 'kashmiri-saffron')?.quantity)
      .toBe(0.06);

    for (let count = 0; count < 4; count += 1) {
      inventory.recordUsage('kashmiri-saffron');
    }
    expect(inventory.recordUsage('kashmiri-saffron')).toBe(false);
    expect(inventory.inventory().find((item) => item.id === 'kashmiri-saffron')?.quantity)
      .toBe(0);
  });

  it('rejects unknown stock items explicitly', () => {
    const inventory = new InventoryService();

    expect(() => inventory.restock('unknown')).toThrow('Unknown inventory item');
  });
});
