import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkItem {
  id: number;
  requestId: string;
  serviceId: string;
  status: string;
  priority: string;
  filingStage?: string;
  totalAmount?: number;
  slaDeadline?: string;
  createdAt: string;
}

interface WorkItemsTableProps {
  items: WorkItem[];
  showClientColumn?: boolean;
}

export function WorkItemsTable({ items, showClientColumn = false }: WorkItemsTableProps) {
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      initiated: 'bg-blue-100 text-blue-700',
      docs_uploaded: 'bg-purple-100 text-purple-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      qc_review: 'bg-orange-100 text-orange-700',
      completed: 'bg-green-100 text-green-700',
      on_hold: 'bg-gray-100 text-gray-700',
      failed: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-blue-500 text-white',
      low: 'bg-gray-500 text-white',
    };
    return colors[priority] || 'bg-gray-500 text-white';
  };

  const getSlaIndicator = (deadline?: string) => {
    if (!deadline) return null;
    const hours = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hours < 0) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (hours < 24) return <Clock className="h-4 w-4 text-orange-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const formatService = (serviceId: string) => {
    return serviceId
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Case ID</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Filing</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>SLA</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Created</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
              No work items found
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm">
                {item.requestId || `#${item.id}`}
              </TableCell>
              <TableCell>{formatService(item.serviceId)}</TableCell>
              <TableCell>
                <Badge className={getStatusBadge(item.status)}>
                  {item.status.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {(item.filingStage || 'not_filed').replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getPriorityBadge(item.priority)}>
                  {item.priority}
                </Badge>
              </TableCell>
              <TableCell>{getSlaIndicator(item.slaDeadline)}</TableCell>
              <TableCell>
                {item.totalAmount ? `₹${item.totalAmount.toLocaleString()}` : '-'}
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <Link href={`/ops/case/${item.id}`}>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
