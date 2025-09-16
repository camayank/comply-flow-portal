import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Send, Download, Calendar, Eye, DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { type SalesProposal } from '@shared/schema';

interface ProposalsListProps {
  proposals: SalesProposal[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onEdit: (proposal: SalesProposal) => void;
  onDelete: (id: number) => void;
  onSend: (id: number) => void;
  onPageChange: (page: number) => void;
  getStatusInfo: (status: string) => { value: string; label: string; color: string };
  formatCurrency: (amount: string | number | null) => string;
}

export function ProposalsList({ 
  proposals, 
  pagination, 
  onEdit, 
  onDelete, 
  onSend,
  onPageChange, 
  getStatusInfo,
  formatCurrency
}: ProposalsListProps) {
  
  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return '-';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'full': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canSendProposal = (status: string) => {
    return ['draft', 'revised_sent'].includes(status);
  };

  const getServicesSummary = (services: any) => {
    if (!services || !Array.isArray(services)) return 'No services';
    if (services.length === 0) return 'No services';
    if (services.length === 1) return services[0].name || 'Service';
    return `${services[0].name || 'Service'} +${services.length - 1} more`;
  };

  if (!proposals || proposals.length === 0) {
    return (
      <div className="text-center py-8" data-testid="no-proposals-message">
        <p className="text-muted-foreground">No proposals found. Create your first proposal to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="proposals-list">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead ID</TableHead>
              <TableHead>Sales Executive</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals.map((proposal) => {
              const statusInfo = getStatusInfo(proposal.proposalStatus || 'draft');
              return (
                <TableRow key={proposal.id} data-testid={`proposal-row-${proposal.id}`}>
                  <TableCell className="font-medium" data-testid={`proposal-lead-id-${proposal.id}`}>
                    {proposal.leadId}
                  </TableCell>
                  
                  <TableCell data-testid={`proposal-executive-${proposal.id}`}>
                    {proposal.salesExecutive}
                  </TableCell>
                  
                  <TableCell data-testid={`proposal-services-${proposal.id}`}>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {getServicesSummary(proposal.requiredServices)}
                      </div>
                      {proposal.qualifiedLeadStatus && (
                        <div className="text-xs text-muted-foreground">
                          {proposal.qualifiedLeadStatus}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell data-testid={`proposal-amount-${proposal.id}`}>
                    <div className="space-y-1">
                      <div className="font-medium">{formatCurrency(proposal.proposalAmount)}</div>
                      {proposal.paymentPending && parseFloat(proposal.paymentPending.toString()) > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Pending: {formatCurrency(proposal.paymentPending)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      className={`${statusInfo.color} text-white`}
                      data-testid={`proposal-status-${proposal.id}`}
                    >
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getPaymentStatusColor(proposal.paymentReceived || 'pending')}
                      data-testid={`proposal-payment-${proposal.id}`}
                    >
                      {(proposal.paymentReceived || 'pending').toUpperCase()}
                    </Badge>
                  </TableCell>
                  
                  <TableCell data-testid={`proposal-followup-${proposal.id}`}>
                    {proposal.nextFollowupDate && (
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(proposal.nextFollowupDate)}
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {canSendProposal(proposal.proposalStatus || 'draft') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSend(proposal.id)}
                          className="text-blue-600 hover:text-blue-700"
                          data-testid={`button-send-${proposal.id}`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(proposal)}
                        data-testid={`button-edit-${proposal.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {proposal.documentsLink && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(proposal.documentsLink!, '_blank')}
                          className="text-green-600 hover:text-green-700"
                          data-testid={`button-download-${proposal.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(proposal.id)}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-${proposal.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {proposals.map((proposal) => {
          const statusInfo = getStatusInfo(proposal.proposalStatus || 'draft');
          return (
            <div 
              key={proposal.id} 
              className="border rounded-lg p-4 space-y-3"
              data-testid={`proposal-card-${proposal.id}`}
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-lg">Lead: {proposal.leadId}</div>
                  <div className="text-sm text-muted-foreground">{proposal.salesExecutive}</div>
                </div>
                <Badge className={`${statusInfo.color} text-white`}>
                  {statusInfo.label}
                </Badge>
              </div>

              {/* Services and Amount */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{getServicesSummary(proposal.requiredServices)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatCurrency(proposal.proposalAmount)}</span>
                </div>
              </div>

              {/* Payment Status */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-muted-foreground">Payment: </span>
                  <Badge 
                    variant="outline" 
                    className={getPaymentStatusColor(proposal.paymentReceived || 'pending')}
                  >
                    {(proposal.paymentReceived || 'pending').toUpperCase()}
                  </Badge>
                </div>
                {proposal.nextFollowupDate && (
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3" />
                    {formatDate(proposal.nextFollowupDate)}
                  </div>
                )}
              </div>

              {/* Qualified Status */}
              {proposal.qualifiedLeadStatus && (
                <div className="text-sm text-muted-foreground">
                  Status: {proposal.qualifiedLeadStatus}
                </div>
              )}

              {/* Pending Payment */}
              {proposal.paymentPending && parseFloat(proposal.paymentPending.toString()) > 0 && (
                <div className="text-sm text-orange-600">
                  Pending Payment: {formatCurrency(proposal.paymentPending)}
                </div>
              )}

              {/* Final Remark */}
              {proposal.finalRemark && (
                <div className="text-sm text-muted-foreground">
                  <strong>Remark:</strong> {proposal.finalRemark}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                {canSendProposal(proposal.proposalStatus || 'draft') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSend(proposal.id)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(proposal)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                {proposal.documentsLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(proposal.documentsLink!, '_blank')}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    View
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(proposal.id)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between" data-testid="pagination-controls">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} proposals
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            
            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, pagination.page - 2) + i;
              if (pageNum > pagination.totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === pagination.page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  data-testid={`button-page-${pageNum}`}
                >
                  {pageNum}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}