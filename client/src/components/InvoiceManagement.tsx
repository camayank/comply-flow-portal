import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Send,
  Eye,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName: string;
  businessEntityId: number;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  paymentStatus: string;
  lineItems: InvoiceLineItem[];
  notes?: string;
  terms?: string;
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  serviceId?: string;
}

const InvoiceManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    clientId: '',
    dueDate: '',
    lineItems: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    notes: '',
    terms: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    queryFn: () => fetch('/api/clients', {
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).then(r => r.ok ? r.json() : []),
  });

  // Fetch invoices
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/financial/invoices', { status: statusFilter, paymentStatus: paymentStatusFilter }],
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await fetch('/api/financial/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });
      if (!response.ok) throw new Error('Failed to create invoice');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/financial/invoices'] });
      toast({ title: 'Success', description: 'Invoice created successfully' });
      setCreateDialog(false);
      resetNewInvoice();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create invoice', variant: 'destructive' });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'overdue': return 'bg-red-500 text-white';
      case 'partially_paid': return 'bg-orange-500 text-white';
      case 'cancelled': return 'bg-gray-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const resetNewInvoice = () => {
    setNewInvoice({
      clientId: '',
      dueDate: '',
      lineItems: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
      notes: '',
      terms: ''
    });
  };

  const addLineItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, rate: 0, amount: 0 }]
    }));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setNewInvoice(prev => {
      const lineItems = [...prev.lineItems];
      lineItems[index] = { ...lineItems[index], [field]: value };
      
      // Calculate amount for quantity or rate changes
      if (field === 'quantity' || field === 'rate') {
        lineItems[index].amount = lineItems[index].quantity * lineItems[index].rate;
      }
      
      return { ...prev, lineItems };
    });
  };

  const removeLineItem = (index: number) => {
    if (newInvoice.lineItems.length > 1) {
      setNewInvoice(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateSubtotal = () => {
    return newInvoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || invoice.paymentStatus === paymentStatusFilter;
    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Management</h2>
          <p className="text-gray-500 dark:text-gray-400">Create, track, and manage invoices</p>
        </div>
        <Button 
          onClick={() => setCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-create-invoice"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-invoices"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-payment-filter">
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
            <Badge variant="secondary">{filteredInvoices.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      <p className="mt-2 text-gray-500">Loading invoices...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-gray-300" />
                      <p className="mt-4 text-gray-500">No invoices found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice: Invoice) => (
                    <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.invoiceNumber}`}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                          {new Date(invoice.dueDate) < new Date() && invoice.paymentStatus !== 'paid' && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell>
                        <span className={invoice.outstandingAmount > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                          {formatCurrency(invoice.outstandingAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.paymentStatus)}>
                          {invoice.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setViewDialog(true);
                            }}
                            data-testid={`button-view-${invoice.invoiceNumber}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-edit-${invoice.invoiceNumber}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-download-${invoice.invoiceNumber}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Client</label>
                <Select value={newInvoice.clientId} onValueChange={(value) => 
                  setNewInvoice(prev => ({ ...prev, clientId: value }))
                }>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name || client.companyName || `Client #${client.id}`}
                      </SelectItem>
                    ))}
                    {clients.length === 0 && (
                      <SelectItem value="" disabled>No clients found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                  data-testid="input-due-date"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Line Items</h3>
                <Button type="button" variant="outline" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              
              <div className="space-y-3">
                {newInvoice.lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        data-testid={`input-description-${index}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        data-testid={`input-quantity-${index}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        data-testid={`input-rate-${index}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={formatCurrency(item.amount)}
                        readOnly
                        className="bg-gray-50"
                        data-testid={`text-amount-${index}`}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        disabled={newInvoice.lineItems.length === 1}
                        data-testid={`button-remove-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-lg font-bold">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
              </div>
            </div>

            {/* Notes and Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Internal notes..."
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, notes: e.target.value }))}
                  data-testid="textarea-notes"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Terms & Conditions</label>
                <Textarea
                  placeholder="Payment terms..."
                  value={newInvoice.terms}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, terms: e.target.value }))}
                  data-testid="textarea-terms"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setCreateDialog(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createInvoiceMutation.mutate(newInvoice)}
                disabled={createInvoiceMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-create"
              >
                {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Invoice Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice #:</span>
                      <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Client Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">{selectedInvoice.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={getStatusColor(selectedInvoice.status)}>
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="font-semibold mb-3">Line Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.lineItems?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.rate)}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 font-medium">
                      <span>Outstanding:</span>
                      <span>{formatCurrency(selectedInvoice.outstandingAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Send to Client
                </Button>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceManagement;