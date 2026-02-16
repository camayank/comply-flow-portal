import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Phone, Mail, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { type LeadEnhanced } from '@shared/schema';

interface LeadsListProps {
  leads: LeadEnhanced[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onEdit: (lead: LeadEnhanced) => void;
  onDelete: (id: number) => void;
  onPageChange: (page: number) => void;
  getStageInfo: (stage: string) => { value: string; label: string; color: string };
}

export function LeadsList({
  leads,
  pagination,
  onEdit,
  onDelete,
  onPageChange,
  getStageInfo
}: LeadsListProps) {

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return '-';
    }
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!leads || leads.length === 0) {
    return (
      <div className="text-center py-8" data-testid="no-leads-message">
        <p className="text-muted-foreground">No leads found. Create your first lead to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="leads-list">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead ID</TableHead>
              <TableHead>Client Details</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Executive</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Est. Value</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const stageInfo = getStageInfo(lead.leadStage || 'new');
              return (
                <TableRow key={lead.id} data-testid={`lead-row-${lead.id}`}>
                  <TableCell className="font-medium" data-testid={`lead-id-${lead.id}`}>
                    {lead.leadId}
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium" data-testid={`lead-name-${lead.id}`}>
                        {lead.clientName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        {lead.contactPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.contactPhone}
                          </span>
                        )}
                        {lead.contactEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.contactEmail}
                          </span>
                        )}
                      </div>
                      {lead.state && (
                        <div className="text-xs text-muted-foreground">{lead.state}</div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell data-testid={`lead-service-${lead.id}`}>
                    {lead.serviceInterested}
                  </TableCell>

                  <TableCell data-testid={`lead-source-${lead.id}`}>
                    {lead.leadSource}
                  </TableCell>

                  <TableCell data-testid={`lead-executive-${lead.id}`}>
                    {lead.preSalesExecutive || '-'}
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={`${stageInfo.color} text-white`}
                      data-testid={`lead-stage-${lead.id}`}
                    >
                      {stageInfo.label}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getPriorityColor(lead.priority || 'medium')}
                      data-testid={`lead-priority-${lead.id}`}
                    >
                      {(lead.priority || 'medium').toUpperCase()}
                    </Badge>
                  </TableCell>

                  <TableCell data-testid={`lead-value-${lead.id}`}>
                    {formatCurrency(lead.estimatedValue)}
                  </TableCell>

                  <TableCell data-testid={`lead-followup-${lead.id}`}>
                    {lead.nextFollowupDate && (
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(lead.nextFollowupDate)}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(lead)}
                        data-testid={`button-edit-${lead.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(lead.id)}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-${lead.id}`}
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
        {leads.map((lead) => {
          const stageInfo = getStageInfo(lead.leadStage || 'new');
          return (
            <div
              key={lead.id}
              className="border rounded-lg p-4 space-y-3"
              data-testid={`lead-card-${lead.id}`}
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-lg">{lead.clientName}</div>
                  <div className="text-sm text-muted-foreground">{lead.leadId}</div>
                </div>
                <Badge className={`${stageInfo.color} text-white`}>
                  {stageInfo.label}
                </Badge>
              </div>

              {/* Contact Info */}
              <div className="space-y-1">
                {lead.contactPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" />
                    {lead.contactPhone}
                  </div>
                )}
                {lead.contactEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" />
                    {lead.contactEmail}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Service</div>
                  <div>{lead.serviceInterested}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Source</div>
                  <div>{lead.leadSource}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Executive</div>
                  <div>{lead.preSalesExecutive || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Priority</div>
                  <Badge
                    variant="outline"
                    className={getPriorityColor(lead.priority || 'medium')}
                  >
                    {(lead.priority || 'medium').toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Value and Follow-up */}
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-muted-foreground">Est. Value: </span>
                  <span className="font-medium">{formatCurrency(lead.estimatedValue)}</span>
                </div>
                {lead.nextFollowupDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(lead.nextFollowupDate)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(lead)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(lead.id)}
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
            {pagination.total} leads
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
