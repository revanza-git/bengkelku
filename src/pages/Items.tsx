import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package } from "lucide-react";

export default function Items() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const items = [
    { sku: "OIL-001", name: "Engine Oil 5W-30", type: "stock", qty: 24, uom: "liter", price: 85000, tax: 11 },
    { sku: "FILTER-OIL", name: "Oil Filter", type: "stock", qty: 15, uom: "unit", price: 45000, tax: 11 },
    { sku: "BRAKE-PAD", name: "Brake Pad Set", type: "stock", qty: 8, uom: "set", price: 250000, tax: 11 },
    { sku: "SPARK-PLUG", name: "Spark Plug", type: "stock", qty: 32, uom: "unit", price: 35000, tax: 11 },
    { sku: "SRV-TUNEUP", name: "Engine Tune-Up Service", type: "service", qty: 0, uom: "hour", price: 150000, tax: 11 },
    { sku: "SRV-BRAKE", name: "Brake Service", type: "service", qty: 0, uom: "hour", price: 200000, tax: 11 },
    { sku: "COOLANT", name: "Radiator Coolant", type: "stock", qty: 18, uom: "liter", price: 65000, tax: 11 },
    { sku: "AIR-FILTER", name: "Air Filter", type: "stock", qty: 12, uom: "unit", price: 55000, tax: 11 },
  ];

  const filteredItems = items.filter(item => 
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Items</h1>
          <p className="text-muted-foreground">Parts and services catalog</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>Manage parts and service offerings</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search items..." 
                className="pl-8 w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qty On Hand</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Sell Price</TableHead>
                <TableHead>Tax Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.sku} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {item.type === "stock" ? (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        <Package className="mr-1 h-3 w-3" />
                        Stock Item
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-accent/10 text-accent">
                        Service
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.type === "stock" ? (
                      <span className={item.qty < 10 ? "text-destructive font-medium" : ""}>
                        {item.qty}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{item.uom}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(item.price)}</TableCell>
                  <TableCell>{item.tax}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}