export type UserRole =
  | "admin"
  | "storekeeper"
  | "technician"
  | "viewer"
  | "procurement"
  | "warehouse"
  | "finance";

export function normalizeRole(role?: string): "admin" | "storekeeper" | "technician" | "viewer" {
  if (role === "admin") return "admin";
  if (role === "storekeeper" || role === "procurement" || role === "warehouse") return "storekeeper";
  if (role === "technician") return "technician";
  return "viewer";
}

export function canManageParts(role?: string) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "storekeeper";
}

export function canImportExportParts(role?: string) {
  return normalizeRole(role) === "admin";
}

export function canManageSuppliers(role?: string) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "storekeeper";
}

export function canManageWarehouses(role?: string) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "storekeeper";
}

export function canManagePurchaseOrders(role?: string) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "storekeeper";
}

export function canCreateIssues(role?: string) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "storekeeper" || normalized === "technician";
}

export function canProcessIssues(role?: string) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "storekeeper";
}

export function isAdmin(role?: string) {
  return normalizeRole(role) === "admin";
}
