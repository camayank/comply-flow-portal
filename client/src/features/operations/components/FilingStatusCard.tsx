import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Check, AlertCircle, Clock, Send, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

const FILING_STAGES = [
  { value: 'not_filed', label: 'Not Filed', icon: FileText, color: 'text-gray-500' },
  { value: 'filed', label: 'Filed', icon: Send, color: 'text-blue-500' },
  { value: 'acknowledged', label: 'Acknowledged', icon: Check, color: 'text-blue-600' },
  { value: 'query_raised', label: 'Query Raised', icon: AlertCircle, color: 'text-orange-500' },
  { value: 'response_submitted', label: 'Response Submitted', icon: Send, color: 'text-purple-500' },
  { value: 'under_processing', label: 'Under Processing', icon: RefreshCw, color: 'text-indigo-500' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-green-500' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-500' },
];

interface FilingStatusCardProps {
  filingStage: string;
  filingDate?: string | null;
  filingPortal?: string | null;
  arnNumber?: string | null;
  queryDetails?: string | null;
  queryRaisedAt?: string | null;
  responseSubmittedAt?: string | null;
  finalStatus?: string | null;
  finalStatusDate?: string | null;
  onUpdate: (data: Record<string, any>) => void;
  isUpdating?: boolean;
}

export function FilingStatusCard({
  filingStage,
  filingDate,
  filingPortal,
  arnNumber,
  queryDetails,
  queryRaisedAt,
  responseSubmittedAt,
  finalStatus,
  finalStatusDate,
  onUpdate,
  isUpdating,
}: FilingStatusCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    filingStage,
    filingPortal: filingPortal || '',
    arnNumber: arnNumber || '',
    queryDetails: queryDetails || '',
  });

  const currentStageIndex = FILING_STAGES.findIndex(s => s.value === filingStage);

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Filing Status
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Filing Stage</Label>
              <Select
                value={editData.filingStage}
                onValueChange={(v) => setEditData({ ...editData, filingStage: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILING_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filing Portal</Label>
              <Input
                value={editData.filingPortal}
                onChange={(e) => setEditData({ ...editData, filingPortal: e.target.value })}
                placeholder="GST Portal, MCA, FSSAI..."
              />
            </div>
            <div className="space-y-2">
              <Label>ARN / Reference Number</Label>
              <Input
                value={editData.arnNumber}
                onChange={(e) => setEditData({ ...editData, arnNumber: e.target.value })}
                placeholder="Enter ARN or reference number"
              />
            </div>
            {editData.filingStage === 'query_raised' && (
              <div className="space-y-2">
                <Label>Query Details</Label>
                <Textarea
                  value={editData.queryDetails}
                  onChange={(e) => setEditData({ ...editData, queryDetails: e.target.value })}
                  placeholder="Describe the query raised..."
                  rows={3}
                />
              </div>
            )}
            <Button onClick={handleSave} disabled={isUpdating} className="w-full">
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {FILING_STAGES.map((stage, index) => {
              const Icon = stage.icon;
              const isComplete = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isPending = index > currentStageIndex;

              let dateInfo = null;
              if (stage.value === 'filed' && filingDate) dateInfo = formatDate(filingDate);
              if (stage.value === 'acknowledged' && arnNumber) dateInfo = `ARN: ${arnNumber}`;
              if (stage.value === 'query_raised' && queryRaisedAt) dateInfo = formatDate(queryRaisedAt);
              if (stage.value === 'response_submitted' && responseSubmittedAt) dateInfo = formatDate(responseSubmittedAt);
              if ((stage.value === 'approved' || stage.value === 'rejected') && finalStatusDate) {
                dateInfo = formatDate(finalStatusDate);
              }

              return (
                <div
                  key={stage.value}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isCurrent ? 'bg-blue-50 border border-blue-200' : ''
                  } ${isPending ? 'opacity-50' : ''}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isComplete ? 'bg-green-100' : isCurrent ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Icon className={`h-3 w-3 ${isCurrent ? stage.color : 'text-gray-400'}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isPending ? 'text-gray-400' : 'text-gray-900'}`}>
                      {stage.label}
                    </p>
                    {dateInfo && (
                      <p className="text-xs text-gray-500">{dateInfo}</p>
                    )}
                  </div>
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              );
            })}
            {filingPortal && (
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">Portal: {filingPortal}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
