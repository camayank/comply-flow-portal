/**
 * LEAD PIPELINE - ADVANCED CRM
 *
 * Enterprise-grade lead management with:
 * - Kanban pipeline view
 * - List view with advanced filtering
 * - Bulk operations (import, export, assign, delete)
 * - Lead scoring & analytics
 * - Activity timeline
 * - External conversion handling
 *
 * Better than Salesforce/Zoho with compliance-focused features
 */

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Kanban,
  List,
  ArrowUpDown,
  Trash2,
  Edit,
  Eye,
  UserPlus,
  FileText,
  MessageSquare,
  Star,
  Target,
  Zap,
  Activity,
  ArrowRight,
  ExternalLink,
  LayoutGrid
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Lead {
  id: number;
  leadId: string;
  clientName: string;
  contactPhone: string;
  contactEmail?: string;
  state?: string;
  entityType?: string;
  serviceInterested: string;
  requiredServices?: string[];
  leadSource: string;
  leadStage?: string;
  stage: string;
  priority: string;
  estimatedValue?: number;
  preSalesExecutive?: string;
  nextFollowupDate?: string;
  lastContactDate?: string;
  remarks?: string;
  interactionHistory?: any[];
  createdAt: string;
  score?: {
    total: number;
    grade: string;
    recommendation: string;
  };
}

interface PipelineStage {
  key: string;
  label: string;
  order: number;
  color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STAGES: PipelineStage[] = [
  { key: 'new', label: 'New', order: 1, color: '#3B82F6' },
  { key: 'hot_lead', label: 'Hot', order: 2, color: '#EF4444' },
  { key: 'warm_lead', label: 'Warm', order: 3, color: '#F59E0B' },
  { key: 'cold_lead', label: 'Cold', order: 4, color: '#6B7280' },
  { key: 'qualified', label: 'Qualified', order: 5, color: '#06B6D4' },
  { key: 'proposal', label: 'Proposal', order: 6, color: '#8B5CF6' },
  { key: 'negotiation', label: 'Negotiation', order: 7, color: '#EC4899' },
  { key: 'converted', label: 'Won', order: 8, color: '#10B981' },
  { key: 'lost', label: 'Lost', order: 9, color: '#DC2626' },
];

const LEAD_SOURCES = [
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'event', label: 'Event' },
  { value: 'partner', label: 'Partner' },
];

const ENTITY_TYPES = [
  { value: 'pvt_ltd', label: 'Private Limited' },
  { value: 'llp', label: 'LLP' },
  { value: 'opc', label: 'OPC' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'individual', label: 'Individual' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

// ============================================================================
// STATS CARD
// ============================================================================

function StatsCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: any;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {change && (
              <p className={`text-xs ${
                changeType === 'positive' ? 'text-green-600' :
                changeType === 'negative' ? 'text-red-600' :
                'text-muted-foreground'
              }`}>
                {change}
              </p>
            )}
          </div>
          <Icon className={`h-8 w-8 ${color} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// LEAD CARD (Kanban)
// ============================================================================

function LeadCard({
  lead,
  onView,
  onEdit,
  onStageChange,
  selected,
  onSelect
}: {
  lead: Lead;
  onView: () => void;
  onEdit: () => void;
  onStageChange: (stage: string) => void;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  const getPriorityColor = (priority: string) => {
    return PRIORITIES.find(p => p.value === priority)?.color || 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  const isOverdue = lead.nextFollowupDate && new Date(lead.nextFollowupDate) < new Date();

  return (
    <Card className={`mb-2 cursor-pointer hover:shadow-md transition-shadow ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1 min-w-0" onClick={onView}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{lead.leadId}</span>
              {lead.score && (
                <div className={`w-5 h-5 rounded-full ${getScoreColor(lead.score.grade)} flex items-center justify-center`}>
                  <span className="text-xs font-bold text-white">{lead.score.grade}</span>
                </div>
              )}
            </div>
            <p className="font-medium text-sm truncate">{lead.clientName}</p>
            <p className="text-xs text-muted-foreground truncate">{lead.serviceInterested}</p>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                {lead.priority}
              </Badge>
              {lead.estimatedValue && (
                <span className="text-xs font-medium text-green-600">
                  ₹{(lead.estimatedValue / 1000).toFixed(0)}K
                </span>
              )}
            </div>

            {isOverdue && (
              <div className="flex items-center gap-1 mt-2 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">Overdue followup</span>
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[80px]">{lead.preSalesExecutive || 'Unassigned'}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="h-4 w-4 mr-2" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {STAGES.filter(s => s.key !== lead.stage && s.key !== 'converted' && s.key !== 'lost').map(stage => (
                    <DropdownMenuItem key={stage.key} onClick={() => onStageChange(stage.key)}>
                      Move to {stage.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onStageChange('converted')} className="text-green-600">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Won
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStageChange('lost')} className="text-red-600">
                    <XCircle className="h-4 w-4 mr-2" /> Mark Lost
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// KANBAN COLUMN
// ============================================================================

function KanbanColumn({
  stage,
  leads,
  onViewLead,
  onEditLead,
  onStageChange,
  selectedLeads,
  onSelectLead
}: {
  stage: PipelineStage;
  leads: Lead[];
  onViewLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onStageChange: (leadId: number, stage: string) => void;
  selectedLeads: number[];
  onSelectLead: (leadId: number, checked: boolean) => void;
}) {
  const totalValue = leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

  return (
    <div className="flex-shrink-0 w-72 bg-gray-50 rounded-lg p-2">
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="font-medium text-sm">{stage.label}</span>
          <Badge variant="secondary" className="text-xs">{leads.length}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          ₹{(totalValue / 100000).toFixed(1)}L
        </span>
      </div>
      <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onView={() => onViewLead(lead)}
            onEdit={() => onEditLead(lead)}
            onStageChange={(newStage) => onStageChange(lead.id, newStage)}
            selected={selectedLeads.includes(lead.id)}
            onSelect={(checked) => onSelectLead(lead.id, checked)}
          />
        ))}
        {leads.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No leads in this stage
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LEAD FORM DIALOG
// ============================================================================

function LeadFormDialog({
  open,
  onClose,
  lead,
  onSave
}: {
  open: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    clientName: lead?.clientName || '',
    contactPhone: lead?.contactPhone || '',
    contactEmail: lead?.contactEmail || '',
    state: lead?.state || '',
    entityType: lead?.entityType || 'pvt_ltd',
    serviceInterested: lead?.serviceInterested || '',
    leadSource: lead?.leadSource || 'website',
    stage: lead?.stage || 'new',
    priority: lead?.priority || 'medium',
    estimatedValue: lead?.estimatedValue?.toString() || '',
    preSalesExecutive: lead?.preSalesExecutive || '',
    nextFollowupDate: lead?.nextFollowupDate?.split('T')[0] || '',
    remarks: lead?.remarks || ''
  });

  const handleSubmit = () => {
    onSave({
      ...formData,
      estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : null,
      nextFollowupDate: formData.nextFollowupDate || null
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead?.id ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
          <DialogDescription>
            {lead?.id ? `Editing ${lead.leadId}` : 'Enter lead details to add to pipeline'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Client/Company Name *</Label>
            <Input
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="e.g., ABC Pvt Ltd"
            />
          </div>

          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              placeholder="9876543210"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>State</Label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="Maharashtra"
            />
          </div>

          <div className="space-y-2">
            <Label>Entity Type</Label>
            <Select
              value={formData.entityType}
              onValueChange={(v) => setFormData({ ...formData, entityType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map(et => (
                  <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Service Interested *</Label>
            <Input
              value={formData.serviceInterested}
              onChange={(e) => setFormData({ ...formData, serviceInterested: e.target.value })}
              placeholder="GST Registration, Company Incorporation..."
            />
          </div>

          <div className="space-y-2">
            <Label>Lead Source *</Label>
            <Select
              value={formData.leadSource}
              onValueChange={(v) => setFormData({ ...formData, leadSource: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map(ls => (
                  <SelectItem key={ls.value} value={ls.value}>{ls.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Select
              value={formData.stage}
              onValueChange={(v) => setFormData({ ...formData, stage: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map(s => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(v) => setFormData({ ...formData, priority: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estimated Value (₹)</Label>
            <Input
              type="number"
              value={formData.estimatedValue}
              onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
              placeholder="50000"
            />
          </div>

          <div className="space-y-2">
            <Label>Assigned Executive</Label>
            <Input
              value={formData.preSalesExecutive}
              onChange={(e) => setFormData({ ...formData, preSalesExecutive: e.target.value })}
              placeholder="Executive name"
            />
          </div>

          <div className="space-y-2">
            <Label>Next Follow-up Date</Label>
            <Input
              type="date"
              value={formData.nextFollowupDate}
              onChange={(e) => setFormData({ ...formData, nextFollowupDate: e.target.value })}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {lead?.id ? 'Update Lead' : 'Add Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// BULK IMPORT DIALOG
// ============================================================================

function BulkImportDialog({
  open,
  onClose,
  onImport
}: {
  open: boolean;
  onClose: () => void;
  onImport: (csvContent: string, updateExisting: boolean) => void;
}) {
  const [csvContent, setCsvContent] = useState('');
  const [updateExisting, setUpdateExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Leads</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV content to import leads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
            <a href="/api/crm/leads/export-template" download className="text-sm text-primary hover:underline">
              Download Template
            </a>
          </div>

          <Textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="Or paste CSV content here..."
            rows={10}
            className="font-mono text-sm"
          />

          <div className="flex items-center gap-2">
            <Checkbox
              id="updateExisting"
              checked={updateExisting}
              onCheckedChange={(c) => setUpdateExisting(c as boolean)}
            />
            <Label htmlFor="updateExisting">Update existing leads (by phone/email match)</Label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Required columns:</strong> clientName, contactPhone<br />
              <strong>Optional:</strong> contactEmail, state, entityType, serviceInterested, leadSource, leadStage, priority, estimatedValue, remarks
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onImport(csvContent, updateExisting)}
            disabled={!csvContent.trim()}
          >
            Import Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// LEAD DETAIL SHEET
// ============================================================================

function LeadDetailSheet({
  lead,
  open,
  onClose,
  onEdit,
  onAddActivity
}: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddActivity: (activity: any) => void;
}) {
  const [activityType, setActivityType] = useState('call');
  const [activityNote, setActivityNote] = useState('');

  if (!lead) return null;

  const handleAddActivity = () => {
    if (activityNote.trim()) {
      onAddActivity({
        type: activityType,
        description: activityNote
      });
      setActivityNote('');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {lead.clientName}
            {lead.score && (
              <Badge className={`
                ${lead.score.grade === 'A' ? 'bg-green-500' :
                  lead.score.grade === 'B' ? 'bg-blue-500' :
                  lead.score.grade === 'C' ? 'bg-yellow-500' :
                  'bg-red-500'} text-white
              `}>
                Score: {lead.score.total} ({lead.score.grade})
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>{lead.leadId}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${lead.contactPhone}`} className="text-primary hover:underline">
                  {lead.contactPhone}
                </a>
              </div>
              {lead.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.contactEmail}`} className="text-primary hover:underline">
                    {lead.contactEmail}
                  </a>
                </div>
              )}
              {lead.state && (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.state}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lead Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Service</p>
                  <p className="font-medium">{lead.serviceInterested}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entity Type</p>
                  <p className="font-medium">{lead.entityType || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-medium">{lead.leadSource}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <Badge className={PRIORITIES.find(p => p.value === lead.priority)?.color}>
                    {lead.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimated Value</p>
                  <p className="font-medium text-green-600">
                    {lead.estimatedValue ? `₹${lead.estimatedValue.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Assigned To</p>
                  <p className="font-medium">{lead.preSalesExecutive || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Next Follow-up</p>
                  <p className={`font-medium ${lead.nextFollowupDate && new Date(lead.nextFollowupDate) < new Date() ? 'text-red-600' : ''}`}>
                    {lead.nextFollowupDate ? new Date(lead.nextFollowupDate).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(lead.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {lead.remarks && (
                <div className="mt-4">
                  <p className="text-muted-foreground text-sm">Remarks</p>
                  <p className="text-sm mt-1">{lead.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score & Recommendation */}
          {lead.score && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  AI Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{lead.score.recommendation}</p>
              </CardContent>
            </Card>
          )}

          {/* Add Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Log Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={activityNote}
                onChange={(e) => setActivityNote(e.target.value)}
                placeholder="Activity notes..."
                rows={3}
              />
              <Button onClick={handleAddActivity} className="w-full" disabled={!activityNote.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(lead.interactionHistory || []).slice().reverse().map((activity: any, idx: number) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="font-medium">{activity.type}</p>
                      <p className="text-muted-foreground">{activity.notes}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.date).toLocaleString()} - {activity.executive}
                      </p>
                    </div>
                  </div>
                ))}
                {(!lead.interactionHistory || lead.interactionHistory.length === 0) && (
                  <p className="text-sm text-muted-foreground">No activities recorded</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Lead
            </Button>
            <Button className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Create Proposal
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LeadPipeline() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);

  // Fetch pipeline data
  const { data: pipelineData, isLoading: pipelineLoading, refetch: refetchPipeline } = useQuery<{
    success: boolean;
    pipeline: Record<string, Lead[]>;
    stageMetrics: Record<string, { count: number; value: number }>;
    stages: PipelineStage[];
    summary: {
      totalLeads: number;
      converted: number;
      conversionRate: number;
      totalPipelineValue: number;
      avgDealSize: number;
    };
  }>({
    queryKey: ['/api/crm/pipeline']
  });

  // Fetch analytics
  const { data: analyticsData } = useQuery<{
    success: boolean;
    analytics: any;
  }>({
    queryKey: ['/api/crm/analytics']
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create lead');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Lead created successfully' });
      refetchPipeline();
      setShowLeadForm(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/crm/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to update lead');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Lead updated successfully' });
      refetchPipeline();
      setEditingLead(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update lead', variant: 'destructive' });
    }
  });

  // Stage change mutation
  const stageChangeMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      const res = await fetch(`/api/crm/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to update stage');
      return res.json();
    },
    onSuccess: () => {
      refetchPipeline();
    }
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async ({ csvContent, updateExisting }: { csvContent: string; updateExisting: boolean }) => {
      const res = await fetch('/api/crm/leads/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent, updateExisting }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Import failed');
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Import Complete',
        description: data.message
      });
      refetchPipeline();
      setShowImportDialog(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Import failed', variant: 'destructive' });
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (leadIds: number[]) => {
      const res = await fetch('/api/crm/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Deleted', description: data.message });
      refetchPipeline();
      setSelectedLeads([]);
    }
  });

  // Add activity mutation
  const addActivityMutation = useMutation({
    mutationFn: async ({ leadId, activity }: { leadId: number; activity: any }) => {
      const res = await fetch(`/api/crm/leads/${leadId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to add activity');
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Activity logged' });
      setViewingLead(data.lead);
      refetchPipeline();
    }
  });

  // Handlers
  const handleSelectLead = (leadId: number, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, leadId]);
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = Object.values(pipelineData?.pipeline || {}).flat().map(l => l.id);
      setSelectedLeads(allIds);
    } else {
      setSelectedLeads([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedLeads.length > 0 && confirm(`Delete ${selectedLeads.length} leads?`)) {
      bulkDeleteMutation.mutate(selectedLeads);
    }
  };

  const summary = pipelineData?.summary;
  const analytics = analyticsData?.analytics;

  if (pipelineLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Pipeline</h1>
          <p className="text-muted-foreground">
            Manage and track all leads through the sales funnel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetchPipeline()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <a href="/api/crm/leads/export" download>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </a>
          <Button onClick={() => setShowLeadForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          title="Total Leads"
          value={summary?.totalLeads || 0}
          icon={Users}
          color="text-blue-600"
        />
        <StatsCard
          title="Converted"
          value={summary?.converted || 0}
          change={`${(summary?.conversionRate || 0).toFixed(1)}% rate`}
          changeType="positive"
          icon={CheckCircle2}
          color="text-green-600"
        />
        <StatsCard
          title="Pipeline Value"
          value={`₹${((summary?.totalPipelineValue || 0) / 100000).toFixed(1)}L`}
          icon={DollarSign}
          color="text-purple-600"
        />
        <StatsCard
          title="Avg Deal Size"
          value={`₹${((summary?.avgDealSize || 0) / 1000).toFixed(0)}K`}
          icon={TrendingUp}
          color="text-teal-600"
        />
        <StatsCard
          title="This Month"
          value={analytics?.thisMonth?.newLeads || 0}
          change={analytics?.thisMonth?.growth ? `${analytics.thisMonth.growth > 0 ? '+' : ''}${analytics.thisMonth.growth.toFixed(0)}%` : undefined}
          changeType={analytics?.thisMonth?.growth > 0 ? 'positive' : 'negative'}
          icon={BarChart3}
          color="text-orange-600"
        />
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {LEAD_SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {selectedLeads.length > 0 && (
                <>
                  <Badge variant="secondary">{selectedLeads.length} selected</Badge>
                  <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}
              <div className="flex border rounded-lg">
                <Button
                  variant={view === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setView('kanban')}
                >
                  <Kanban className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setView('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline View */}
      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.filter(s => s.key !== 'converted' && s.key !== 'lost').map(stage => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              leads={pipelineData?.pipeline?.[stage.key] || []}
              onViewLead={setViewingLead}
              onEditLead={setEditingLead}
              onStageChange={(leadId, newStage) => stageChangeMutation.mutate({ id: leadId, stage: newStage })}
              selectedLeads={selectedLeads}
              onSelectLead={handleSelectLead}
            />
          ))}
          {/* Won & Lost columns */}
          <KanbanColumn
            stage={STAGES.find(s => s.key === 'converted')!}
            leads={pipelineData?.pipeline?.['converted'] || []}
            onViewLead={setViewingLead}
            onEditLead={setEditingLead}
            onStageChange={(leadId, newStage) => stageChangeMutation.mutate({ id: leadId, stage: newStage })}
            selectedLeads={selectedLeads}
            onSelectLead={handleSelectLead}
          />
          <KanbanColumn
            stage={STAGES.find(s => s.key === 'lost')!}
            leads={pipelineData?.pipeline?.['lost'] || []}
            onViewLead={setViewingLead}
            onEditLead={setEditingLead}
            onStageChange={(leadId, newStage) => stageChangeMutation.mutate({ id: leadId, stage: newStage })}
            selectedLeads={selectedLeads}
            onSelectLead={handleSelectLead}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedLeads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(pipelineData?.pipeline || {}).flat().map((lead: Lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(c) => handleSelectLead(lead.id, c as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{lead.clientName}</p>
                        <p className="text-xs text-muted-foreground">{lead.leadId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{lead.serviceInterested}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: STAGES.find(s => s.key === lead.stage)?.color + '20', color: STAGES.find(s => s.key === lead.stage)?.color }}>
                        {STAGES.find(s => s.key === lead.stage)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={PRIORITIES.find(p => p.value === lead.priority)?.color}>
                        {lead.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.estimatedValue ? `₹${lead.estimatedValue.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>{lead.leadSource}</TableCell>
                    <TableCell>{lead.preSalesExecutive || '-'}</TableCell>
                    <TableCell>
                      {lead.score && (
                        <Badge className={`
                          ${lead.score.grade === 'A' ? 'bg-green-500' :
                            lead.score.grade === 'B' ? 'bg-blue-500' :
                            lead.score.grade === 'C' ? 'bg-yellow-500' :
                            'bg-red-500'} text-white
                        `}>
                          {lead.score.grade}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingLead(lead)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingLead(lead)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <LeadFormDialog
        open={showLeadForm || !!editingLead}
        onClose={() => { setShowLeadForm(false); setEditingLead(null); }}
        lead={editingLead}
        onSave={(data) => {
          if (editingLead) {
            updateLeadMutation.mutate({ id: editingLead.id, data });
          } else {
            createLeadMutation.mutate(data);
          }
        }}
      />

      <BulkImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={(csvContent, updateExisting) => bulkImportMutation.mutate({ csvContent, updateExisting })}
      />

      <LeadDetailSheet
        lead={viewingLead}
        open={!!viewingLead}
        onClose={() => setViewingLead(null)}
        onEdit={() => { setEditingLead(viewingLead); setViewingLead(null); }}
        onAddActivity={(activity) => {
          if (viewingLead) {
            addActivityMutation.mutate({ leadId: viewingLead.id, activity });
          }
        }}
      />
    </div>
  );
}
