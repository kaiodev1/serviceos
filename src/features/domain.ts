import { addDays, addMonths, formatISO } from 'date-fns';
export function quoteTotals(items: { quantity: number; unit_price: number }[], discount: number) {
  const subtotalCents = items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unit_price * 100),
    0,
  );
  const discountCents = Math.round(discount * 100);
  if (
    items.length === 0 ||
    items.some(
      (i) =>
        !Number.isFinite(i.quantity) ||
        i.quantity <= 0 ||
        !Number.isFinite(i.unit_price) ||
        i.unit_price < 0,
    ) ||
    !Number.isFinite(discount) ||
    discountCents < 0 ||
    discountCents > subtotalCents
  )
    throw Error('Itens ou desconto inválidos');
  return { subtotal: subtotalCents / 100, total: (subtotalCents - discountCents) / 100 };
}
export const orderTransitions: Record<string, string[]> = {
  open: ['on_the_way', 'in_progress', 'cancelled'],
  assigned: ['on_the_way', 'in_progress', 'cancelled'],
  on_the_way: ['in_progress', 'cancelled'],
  in_progress: ['paused', 'completed', 'cancelled'],
  paused: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
};
export function nextRecurrence(date: string, frequency: string, interval = 1) {
  const initial = new Date(`${date}T12:00:00`);
  const months: Record<string, number> = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };
  if (
    !['weekly', 'fortnightly', 'custom', ...Object.keys(months)].includes(frequency) ||
    !Number.isInteger(interval) ||
    interval < 1
  )
    throw Error('Recorrência inválida');
  return formatISO(
    months[frequency]
      ? addMonths(initial, months[frequency])
      : addDays(initial, frequency === 'weekly' ? 7 : frequency === 'fortnightly' ? 14 : interval),
    { representation: 'date' },
  );
}
