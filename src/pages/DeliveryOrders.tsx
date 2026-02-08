import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Eye, Loader2, Search, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeliveryOrders } from "@/hooks/useDeliveryOrders";

export default function DeliveryOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const { deliveryOrders, isLoading } = useDeliveryOrders();

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "-";
    return format(new Date(date), "dd-MM-yyyy", { locale: id });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "confirmed":
        return <Badge variant="secondary">Ready to Consume</Badge>;
      case "delivered":
        return <Badge className="bg-success text-success-foreground">Consumed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredOrders =
    deliveryOrders.filter((order) => {
      const keyword = searchQuery.toLowerCase();
      return (
        order.delivery_number?.toLowerCase().includes(keyword) ||
        order.purchase_orders?.po_number?.toLowerCase().includes(keyword) ||
        order.purchase_orders?.suppliers?.name?.toLowerCase().includes(keyword)
      );
    }) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Issues / Consumption</h1>
        <p className="text-muted-foreground">Stock-out requests and processed consumptions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Issue List
          </CardTitle>
          <CardDescription>Use PO detail page to create a new issue request</CardDescription>
          <div className="flex items-center gap-2 pt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issue number, PO, or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No issue/consumption records found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue No.</TableHead>
                  <TableHead>PO No.</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Actual Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.delivery_number}</TableCell>
                    <TableCell>
                      <Link to={`/purchase-orders/${order.purchase_order_id}`} className="text-primary hover:underline">
                        {order.purchase_orders?.po_number || order.purchase_order_id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>{order.purchase_orders?.suppliers?.name || "-"}</TableCell>
                    <TableCell>{formatDate(order.delivery_date)}</TableCell>
                    <TableCell>{formatDate(order.actual_delivery_date)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="icon">
                        <Link to={`/delivery-orders/${order.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
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
