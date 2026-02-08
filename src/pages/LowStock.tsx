import { Link } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLowStockReport } from "@/hooks/useReports";

export default function LowStock() {
  const { data: rows = [], isLoading } = useLowStockReport();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Low Stock</h1>
          <p className="text-muted-foreground">Parts that are below minimum threshold</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/items">Open Parts</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Reorder Candidates
          </CardTitle>
          <CardDescription>Threshold is max(min stock, reorder point)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No low-stock parts right now.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead className="text-right">Threshold</TableHead>
                  <TableHead className="text-right">Shortage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.sku}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{Number(row.current_stock).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(row.min_stock).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(row.reorder_point).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(row.threshold).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      {Number(row.shortage).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={Number(row.current_stock) <= 0 ? "destructive" : "secondary"}>
                        {Number(row.current_stock) <= 0 ? "Out of Stock" : "Low"}
                      </Badge>
                    </TableCell>
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
