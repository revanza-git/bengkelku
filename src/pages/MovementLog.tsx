import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Loader2, PackageSearch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useItems } from "@/hooks/useItems";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useStockMovementsReport } from "@/hooks/useReports";

const ALL = "__all__";

export default function MovementLog() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [itemId, setItemId] = useState(ALL);
  const [warehouseId, setWarehouseId] = useState(ALL);
  const [trxType, setTrxType] = useState(ALL);

  const { items = [] } = useItems();
  const { warehouses = [] } = useWarehouses();

  const filters = useMemo(
    () => ({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      item_id: itemId === ALL ? undefined : itemId,
      warehouse_id: warehouseId === ALL ? undefined : warehouseId,
      trx_type: trxType === ALL ? undefined : trxType,
    }),
    [dateFrom, dateTo, itemId, warehouseId, trxType],
  );

  const { data: rows = [], isLoading } = useStockMovementsReport(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Movement Log</h1>
        <p className="text-muted-foreground">Audit trail for stock movements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter by date, part, warehouse, and movement type</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="date-from">Date From</Label>
            <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-to">Date To</Label>
            <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Part</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="All parts" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value={ALL}>All parts</SelectItem>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.sku} - {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value={ALL}>All warehouses</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={trxType} onValueChange={setTrxType}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value={ALL}>All types</SelectItem>
                <SelectItem value="GRN">GRN (Receive)</SelectItem>
                <SelectItem value="SHIP_PO">Issue/Consumption</SelectItem>
                <SelectItem value="ADJ+">Adjustment +</SelectItem>
                <SelectItem value="ADJ-">Adjustment -</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5" />
            Stock Movements
          </CardTitle>
          <CardDescription>Showing up to 1000 records</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No movements found for the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{format(new Date(row.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant={Number(row.qty) < 0 ? "destructive" : "secondary"}>
                        {row.trx_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{row.items?.name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{row.items?.sku || "-"}</div>
                      </div>
                    </TableCell>
                    <TableCell>{row.warehouses?.name || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(row.qty).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">{Number(row.unit_cost || 0).toFixed(2)}</TableCell>
                    <TableCell>{row.ref_table && row.ref_id ? `${row.ref_table}:${row.ref_id}` : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
