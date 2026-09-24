import { describe, it, expect } from 'vitest';
import { quoteTotals, nextRecurrence, orderTransitions } from '../src/features/domain';
import { canWrite } from '../src/lib/permissions';
import { moduleSchema, modules } from '../src/features/modules';
describe('Regras de domínio', () => {
  it('calcula valores em centavos e rejeita desconto maior que o subtotal', () => {
    expect(
      quoteTotals(
        [
          { quantity: 3, unit_price: 0.1 },
          { quantity: 2.5, unit_price: 10 },
        ],
        0.3,
      ),
    ).toEqual({ subtotal: 25.3, total: 25 });
    expect(() => quoteTotals([{ quantity: 1, unit_price: 10 }], 11)).toThrow();
    expect(() => quoteTotals([{ quantity: -1, unit_price: 10 }], 0)).toThrow();
  });
  it('preserva calendário no final do mês', () => {
    expect(nextRecurrence('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(nextRecurrence('2024-02-29', 'annual')).toBe('2025-02-28');
    expect(nextRecurrence('2026-09-24', 'custom', 10)).toBe('2026-10-04');
  });
  it('não permite técnicos administrarem a operação', () => {
    expect(canWrite('technician', 'clients')).toBe(false);
    expect(canWrite('attendant', 'payments')).toBe(false);
    expect(canWrite('attendant', 'quotes')).toBe(true);
    expect(canWrite('admin', 'services')).toBe(true);
    expect(orderTransitions.completed).toEqual([]);
  });
  it('valida datas, telefone, e-mail e relacionamentos no servidor', () => {
    expect(
      moduleSchema(modules.clients).safeParse({
        name: 'Teste',
        phone: '123',
        type: 'residential',
        status: 'active',
      }).success,
    ).toBe(false);
    expect(
      moduleSchema(modules.recurring).safeParse({
        client_id: 'outro-tenant',
        next_date: '2026-02-31',
      }).success,
    ).toBe(false);
  });
});
