import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, DollarSign, FileDown, Ban, Trash2, Calculator } from "lucide-react";
import { useInvoiceDetails, useInvoiceLines, useCancelInvoice, useDeleteInvoice } from "@/hooks/useInvoices";
import { useInvoicePayments } from "@/hooks/usePayments";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentForm } from "@/components/PaymentForm";
import { InvoiceExportDialog } from "@/components/InvoiceExportDialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { data: invoice, isLoading: isLoadingInvoice } = useInvoiceDetails(id);
  const { data: lines, isLoading: isLoadingLines } = useInvoiceLines(id);
  const { data: payments, isLoading: isLoadingPayments } = useInvoicePayments(id);
  const cancelInvoice = useCancelInvoice();
  const deleteInvoice = useDeleteInvoice();
  const isCancelling = false;
  const isDeleting = false;

  const hasPayments = payments && payments.length > 0;
  const canCancel = invoice?.status === "open" && !hasPayments;
  const canDelete = (invoice?.status === "open" || invoice?.status === "cancelled") && !hasPayments;

  const handleCancel = () => {
    if (id) {
      cancelInvoice.mutate({ id, status: "cancelled" });
    }
  };

  const handleRecalculateTax = async () => {
    if (!id) return;
    
    setIsRecalculating(true);
    try {
      const data = await invoicesApi.recalculateTax(id);

      toast({
        title: "Tax Recalculated",
        description: `Tax updated: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.tax_total ?? data.tax_amount ?? 0)}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to recalculate tax",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleDelete = () => {
    if (id) {
      deleteInvoice.mutate(id, {
        onSuccess: () => navigate("/invoices"),
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const totalPaid = payments?.reduce(
    (sum, alloc) => sum + Number(alloc.amount),
    0
  ) || 0;

  const balanceDue = Number(invoice?.grand_total || 0) - totalPaid;

  if (isLoadingInvoice || isLoadingLines || isLoadingPayments) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button onClick={() => navigate("/invoices")} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/invoices")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}</h1>
              <p className="text-muted-foreground">Detail invoice</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={invoice.status || "open"} />
            <Button 
              variant="outline" 
              onClick={handleRecalculateTax}
              disabled={isRecalculating}
            >
              {isRecalculating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              Recalculate Tax
            </Button>
            <Button variant="outline" onClick={() => setShowExportDialog(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isCancelling}>
                    <Ban className="mr-2 h-4 w-4" />
                    Batalkan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Batalkan Invoice?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Invoice akan dibatalkan dan tidak dapat menerima pembayaran lagi.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel}>Ya, Batalkan</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Invoice?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Invoice akan dihapus permanen beserta semua data terkait. Tindakan ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Ya, Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {invoice.status !== "paid" && invoice.status !== "cancelled" && balanceDue > 0 && (
              <Button onClick={() => setShowPaymentForm(true)}>
                <DollarSign className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{invoice.customer?.name}</p>
              </div>
              {invoice.customer?.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{invoice.customer.email}</p>
                </div>
              )}
              {invoice.customer?.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{invoice.customer.phone}</p>
                </div>
              )}
              {invoice.customer?.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{invoice.customer.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Issue Date</p>
                <p className="font-medium">{formatDate(invoice.issued_at)}</p>
              </div>
              {invoice.due_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDate(invoice.due_at)}</p>
                </div>
              )}
              {invoice.source_type && (
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-medium capitalize">{invoice.source_type}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines?.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{line.description}</p>
                        {line.item && (
                          <p className="text-sm text-muted-foreground">
                            SKU: {line.item.sku}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {line.is_service ? 'Service' : 'Part'}
                    </TableCell>
                    <TableCell className="text-right">{Number(line.qty)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(line.unit_price))}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.tax_code?.code || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(line.line_total))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Calculate breakdown from lines */}
        {(() => {
          const itemSubtotal = lines?.filter(l => !l.is_service)
            .reduce((sum, l) => sum + Number(l.line_total), 0) || 0;
          const expenseTotal = lines?.filter(l => l.is_service)
            .reduce((sum, l) => sum + Number(l.line_total), 0) || 0;
          
          return (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal Item</span>
                    <span className="font-medium">{formatCurrency(itemSubtotal)}</span>
                  </div>
                  {expenseTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Beban Pengiriman</span>
                      <span className="font-medium">{formatCurrency(expenseTotal)}</span>
                    </div>
                  )}
                  {Number(invoice.tax_total) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">{formatCurrency(Number(invoice.tax_total))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Grand Total</span>
                    <span>{formatCurrency(Number(invoice.grand_total))}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Total Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Balance Due</span>
                    <span className={balanceDue > 0 ? "text-orange-600" : "text-green-600"}>
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>
                </CardContent>
              </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="flex justify-between items-start p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {formatCurrency(Number(allocation.amount))}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {allocation.payment.method?.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(allocation.payment.paid_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No payments recorded yet</p>
              )}
            </CardContent>
          </Card>
            </div>
          );
        })()}

        <PaymentForm
          open={showPaymentForm}
          onOpenChange={setShowPaymentForm}
          invoiceId={invoice.id}
          customerId={invoice.customer_id}
          maxAmount={balanceDue}
        />

      <InvoiceExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        invoiceId={invoice.id}
        customerEmail={invoice.customer?.email}
      />
    </div>
  );
}
