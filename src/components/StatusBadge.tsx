import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "destructive" | "secondary";
}

const statusLabels: Record<string, string> = {
  // PO statuses (Indonesian)
  draft: "Draft",
  submitted: "Diajukan",
  approved: "Disetujui",
  reserved: "Stock Reserved",
  pending: "Menunggu Stock",
  partial_received: "Sebagian Diterima",
  partial_delivery: "Sebagian Dikirim",
  received: "Diterima",
  delivered: "Terkirim",
  closed: "Selesai",
  cancelled: "Dibatalkan",
  sent: "Terkirim",
  // Invoice statuses
  open: "Belum Bayar",
  partial: "Sebagian",
  paid: "Lunas",
  overdue: "Jatuh Tempo",
  written_off: "Dihapus",
  // Delivery statuses
  confirmed: "Dikonfirmasi",
  // Cashflow statuses
  planned: "Direncanakan",
};

export function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  const statusColors: Record<string, string> = {
    // PO statuses
    draft: "bg-secondary text-secondary-foreground",
    submitted: "bg-warning/10 text-warning border border-warning/20",
    approved: "bg-primary/10 text-primary border border-primary/20",
    reserved: "bg-success/10 text-success border border-success/20",
    pending: "bg-orange-500/10 text-orange-600 border border-orange-500/20",
    partial_received: "bg-accent/10 text-accent border border-accent/20",
    partial_delivery: "bg-accent/10 text-accent border border-accent/20",
    received: "bg-success/10 text-success border border-success/20",
    delivered: "bg-success/10 text-success border border-success/20",
    closed: "bg-muted text-muted-foreground",
    cancelled: "bg-destructive/10 text-destructive border border-destructive/20",
    sent: "bg-accent/10 text-accent border border-accent/20",
    // Invoice statuses
    open: "bg-primary/10 text-primary border border-primary/20",
    partial: "bg-warning/10 text-warning border border-warning/20",
    paid: "bg-success/10 text-success border border-success/20",
    overdue: "bg-destructive/10 text-destructive border border-destructive/20",
    written_off: "bg-muted text-muted-foreground",
    // Delivery statuses
    confirmed: "bg-primary/10 text-primary border border-primary/20",
    // Cashflow statuses
    planned: "bg-warning/10 text-warning border border-warning/20",
  };

  const label = statusLabels[status] || status.replace(/_/g, " ");

  return (
    <Badge className={cn("capitalize", statusColors[status] || "bg-secondary text-secondary-foreground")}>
      {label}
    </Badge>
  );
}