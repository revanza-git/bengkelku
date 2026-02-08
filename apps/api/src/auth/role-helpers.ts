const ROLE_ALIASES: Record<string, string[]> = {
  admin: ['admin'],
  storekeeper: ['storekeeper', 'procurement', 'warehouse'],
  technician: ['technician'],
  viewer: ['viewer', 'finance'],
  procurement: ['procurement', 'storekeeper'],
  warehouse: ['warehouse', 'storekeeper'],
  finance: ['finance', 'viewer'],
};

export function expandRole(role: string): string[] {
  return ROLE_ALIASES[role] ?? [role];
}

export function hasRequiredRole(userRole: string, requiredRoles: string[]): boolean {
  const userExpanded = new Set(expandRole(userRole));
  const requiredExpanded = requiredRoles.flatMap((role) => expandRole(role));

  return requiredExpanded.some((role) => userExpanded.has(role));
}
