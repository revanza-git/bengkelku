import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { TaxCodeForm } from "@/components/TaxCodeForm";
import { useTaxCodes, useDeleteTaxCode, type TaxCode } from "@/hooks/useTaxCodes";

export default function TaxCodes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTaxCode, setEditingTaxCode] = useState<TaxCode | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taxCodeToDelete, setTaxCodeToDelete] = useState<string | null>(null);

  const { data: taxCodes, isLoading } = useTaxCodes();
  const deleteTaxCode = useDeleteTaxCode();

  const filteredTaxCodes = taxCodes?.filter((tc) =>
    tc.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (taxCode: TaxCode) => {
    setEditingTaxCode(taxCode);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setTaxCodeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (taxCodeToDelete) {
      await deleteTaxCode.mutateAsync(taxCodeToDelete);
      setDeleteDialogOpen(false);
      setTaxCodeToDelete(null);
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingTaxCode(undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tax Codes</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tax Code
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tax Code Management</CardTitle>
              <CardDescription>
                Configure tax rates for items and invoices
              </CardDescription>
            </div>
            <Input
              placeholder="Search tax codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading tax codes...</div>
          ) : filteredTaxCodes?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tax codes found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTaxCodes?.map((taxCode) => (
                  <TableRow key={taxCode.id}>
                    <TableCell className="font-medium">{taxCode.code}</TableCell>
                    <TableCell>{taxCode.rate}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(taxCode)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(taxCode.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TaxCodeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        taxCode={editingTaxCode}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tax code. This action cannot be undone.
              Tax codes assigned to items cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
