import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, CheckCircle, Loader2, Truck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { canProcessIssues, isAdmin } from "@/lib/rbac";
import { deliveryOrdersApi } from "@/lib/api";
import { useDeliveryOrderDetails, useDeliveryOrderLines, useDeliveryOrders } from "@/hooks/useDeliveryOrders";

export default function DeliveryOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: deliveryOrder, isLoading: loadingOrder } = useDeliveryOrderDetails(id || "");
  const { data: lines = [], isLoading: loadingLines } = useDeliveryOrderLines(id || "");
  const { updateDeliveryOrderAsync, isUpdating } = useDeliveryOrders();

  const [actualDate, setActualDate] = useState<Date | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (deliveryOrder?.actual_delivery_date) {
      setActualDate(new Date(deliveryOrder.actual_delivery_date));
    }
  }, [deliveryOrder?.actual_delivery_date]);

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return format(new Date(value), "yyyy-MM-dd");
  };

  const getStatusBadge = (status?: string) => {
    if (status === "delivered") return <Badge className="bg-success text-success-foreground">Consumed</Badge>;
    if (status === "confirmed") return <Badge variant="secondary">Ready to Consume</Badge>;
    return <Badge variant="outline">Draft</Badge>;
  };

  const handleConfirm = async () => {
    if (!deliveryOrder || !actualDate) return;
    await updateDeliveryOrderAsync({
      id: deliveryOrder.id,
      status: "confirmed",
      actual_delivery_date: format(actualDate, "yyyy-MM-dd"),
    });
  };

  const handleConsume = async () => {
    if (!deliveryOrder || !actualDate) return;
    setIsProcessing(true);
    try {
      await deliveryOrdersApi.process(deliveryOrder.id, format(actualDate, "yyyy-MM-dd"));
      queryClient.invalidateQueries({ queryKey: ["delivery-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["reports", "stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["reports", "low-stock"] });
      toast({ title: "Consumption processed successfully" });
    } catch (error: any) {
      toast({
        title: "Failed to process consumption",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const allowProcess = canProcessIssues(user?.role);

  if (loadingOrder || loadingLines) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!deliveryOrder) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate("/delivery-orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Issue record not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/delivery-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" />
              {deliveryOrder.delivery_number}
            </h1>
            <p className="text-muted-foreground">Issue / Consumption Details</p>
          </div>
        </div>
        {getStatusBadge(deliveryOrder.status)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Header</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">PO Number</p>
            <p className="font-medium">{deliveryOrder.purchase_orders?.po_number || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Supplier</p>
            <p className="font-medium">{deliveryOrder.purchase_orders?.suppliers?.name || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Planned Date</p>
            <p className="font-medium">{formatDate(deliveryOrder.delivery_date)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Actual Date</p>
            <p className="font-medium">{formatDate(deliveryOrder.actual_delivery_date)}</p>
          </div>
          {deliveryOrder.notes && (
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p>{deliveryOrder.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
          <CardDescription>Parts to consume from stock</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Part</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Qty Ordered</TableHead>
                <TableHead className="text-right">Qty Consume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No lines.
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.items?.sku || "-"}</TableCell>
                    <TableCell>{line.items?.name || "-"}</TableCell>
                    <TableCell>{line.warehouses?.name || "-"}</TableCell>
                    <TableCell className="text-right">{Number(line.qty_ordered).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">{Number(line.qty_delivered).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {deliveryOrder.status !== "delivered" && (
        <Card>
          <CardHeader>
            <CardTitle>Consume Parts</CardTitle>
            <CardDescription>Set actual date and process stock-out for this issue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Actual Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-[260px] justify-start text-left font-normal", !actualDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {actualDate ? format(actualDate, "yyyy-MM-dd") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={actualDate}
                    onSelect={setActualDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-2">
              {deliveryOrder.status === "draft" && allowProcess && (
                <Button variant="outline" onClick={handleConfirm} disabled={!actualDate || isUpdating}>
                  Mark Ready to Consume
                </Button>
              )}
              {deliveryOrder.status === "confirmed" && allowProcess && (
                <Button onClick={handleConsume} disabled={!actualDate || isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Process Consumption
                </Button>
              )}
              {!allowProcess && (
                <p className="text-sm text-muted-foreground">
                  You can view this request, but only storekeeper/admin can process consumption.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin(user?.role) && deliveryOrder.status === "draft" && (
        <div className="text-sm text-muted-foreground">
          Draft issue can still be updated from the issue list workflow.
        </div>
      )}
    </div>
  );
}
