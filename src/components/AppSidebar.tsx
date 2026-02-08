import {
  AlertTriangle,
  Boxes,
  Building2,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  UserCog,
  Warehouse,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { canManagePurchaseOrders, normalizeRole } from "@/lib/rbac";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type SidebarItem = {
  title: string;
  url: string;
  icon: any;
  visibleFor: Array<"admin" | "storekeeper" | "technician" | "viewer">;
};

const menuItems: SidebarItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, visibleFor: ["admin", "storekeeper", "technician", "viewer"] },
  { title: "Parts", url: "/items", icon: Package, visibleFor: ["admin", "storekeeper", "technician", "viewer"] },
  { title: "Issues / Consumption", url: "/delivery-orders", icon: Truck, visibleFor: ["admin", "storekeeper", "technician", "viewer"] },
  { title: "Low Stock", url: "/reports/low-stock", icon: AlertTriangle, visibleFor: ["admin", "storekeeper", "technician", "viewer"] },
  { title: "Movement Log", url: "/reports/movements", icon: Boxes, visibleFor: ["admin", "storekeeper", "technician", "viewer"] },
];

const operationsItems: SidebarItem[] = [
  { title: "Purchase Orders", url: "/purchase-orders", icon: ShoppingCart, visibleFor: ["admin", "storekeeper"] },
  { title: "Receive Stock", url: "/receive-stock", icon: ShoppingCart, visibleFor: ["admin", "storekeeper"] },
  { title: "Warehouses", url: "/warehouses", icon: Warehouse, visibleFor: ["admin", "storekeeper"] },
  { title: "Suppliers", url: "/suppliers", icon: Building2, visibleFor: ["admin", "storekeeper"] },
  { title: "Users", url: "/users", icon: UserCog, visibleFor: ["admin"] },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const renderMenuItems = (items: SidebarItem[]) => {
    const visibleItems = items.filter((item) => item.visibleFor.includes(role));

    return (
      <SidebarMenu>
        {visibleItems.map((item) => (
          <SidebarMenuItem key={`${item.title}-${item.url}`}>
            <SidebarMenuButton asChild isActive={isActive(item.url)}>
              <NavLink to={item.url} end={item.url === "/"} className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                {open && <span>{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  };

  return (
    <Sidebar className={open ? "w-60" : "w-16"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-primary font-semibold text-lg px-3 py-4">
            {open ? "Bengkelku" : "BK"}
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderMenuItems(menuItems)}</SidebarGroupContent>
        </SidebarGroup>

        {canManagePurchaseOrders(user?.role) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs uppercase tracking-wider px-3 pt-4">
              {open ? "Operations" : ""}
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderMenuItems(operationsItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
