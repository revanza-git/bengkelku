import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { invoicesApi } from "@/lib/api";
import { Loader2, Mail, Download } from "lucide-react";

interface InvoiceExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  customerEmail?: string;
}

export function InvoiceExportDialog({
  open,
  onOpenChange,
  invoiceId,
  customerEmail,
}: InvoiceExportDialogProps) {
  const [email, setEmail] = useState(customerEmail || "");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const blob = await invoicesApi.exportDocument(invoiceId);
      const blobUrl = URL.createObjectURL(new Blob([blob]));
      window.open(blobUrl, "_blank");

      toast({
        title: "Success",
        description: "Invoice PDF opened for printing",
      });
    } catch (error: any) {
      console.error("Error exporting invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to export invoice",
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      await invoicesApi.sendEmail(invoiceId, email);

      toast({
        title: "Success",
        description: `Invoice sent to ${email}`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Invoice</DialogTitle>
          <DialogDescription>
            Download the invoice as PDF or send it via email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Button
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="w-full"
                variant="outline"
              >
                {isExportingPDF ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export as PDF
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or send via email
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendEmail} disabled={isSendingEmail || !email}>
            {isSendingEmail ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
