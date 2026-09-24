export const roles = ['owner', 'admin', 'attendant', 'technician'] as const;
export type Role = (typeof roles)[number];
export function canManage(role: Role) {
  return role === 'owner' || role === 'admin';
}
export function canOperate(role: Role) {
  return role !== 'technician';
}
export function canWrite(role: Role, module: string) {
  if (canManage(role)) return true;
  return (
    role === 'attendant' &&
    [
      'clients',
      'client_addresses',
      'customer_assets',
      'leads',
      'quotes',
      'appointments',
      'work_orders',
      'follow_ups',
    ].includes(module)
  );
}
