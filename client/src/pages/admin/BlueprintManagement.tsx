/**
 * Blueprint Management Page
 *
 * Enterprise admin interface for managing:
 * - Service Blueprints (compliance services configuration)
 * - Workflow Steps (service delivery workflows)
 * - Pricing Tiers (dynamic pricing configuration)
 * - Document Types (required documents per service)
 * - Compliance Rules (deadlines, penalties, exemptions)
 * - Compliance Calendar (deadline tracking and generation)
 *
 * @author DigiComply Enterprise Team
 * @version 2.0.0
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout, PageShell } from '@/components/v3';
import {
  LayoutDashboard,
  FileBarChart,
  Users,
  Building2 as Building2Nav,
  ClipboardCheck,
  Blocks as BlocksNav,
  Server,
  FileText as FileTextNav,
  Webhook,
  Key,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  Copy,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  DollarSign,
  Workflow,
  Settings,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Eye,
  Archive,
  Zap,
  Building2,
  Scale,
  FileCheck,
  Calculator,
  IndianRupee,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// Types
interface Blueprint {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  jurisdictionType: string;
  applicableJurisdictions?: string[];
  entityTypes?: string[];
  frequency: string;
  slaHours?: number;
  governmentPortal?: string;
  formNumber?: string;
  status: string;
  version: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStep {
  id: string;
  blueprintId: string;
  stepCode: string;
  stepName: string;
  stepType: string;
  sequence: number;
  description?: string;
  estimatedMinutes?: number;
  isClientFacing: boolean;
  assigneeRole?: string;
}

interface PricingTier {
  id: string;
  blueprintId: string;
  tierName: string;
  tierCode: string;
  basePrice: number;
  gstRate: number;
  entityTypeCondition?: string;
  turnoverMin?: number;
  turnoverMax?: number;
  stateCondition?: string;
  isActive: boolean;
}

interface DocumentType {
  id: string;
  blueprintId: string;
  documentCode: string;
  documentName: string;
  description?: string;
  category?: string;
  isRequired: boolean;
  acceptedFormats?: string[];
  maxSizeMb?: number;
}

interface ComplianceRule {
  id: string;
  blueprintId: string;
  ruleCode: string;
  ruleName: string;
  ruleType: string;
  description?: string;
  priority: number;
  isActive: boolean;
}

interface CalendarEntry {
  id: string;
  clientId: string;
  blueprintId: string;
  periodLabel: string;
  dueDate: string;
  status: string;
  penaltyAmount?: number;
}

interface DashboardStats {
  upcomingCount: number;
  overdueCount: number;
  filedCount: number;
  totalPenalties: number;
  complianceScore: number;
}

// Categories
const CATEGORIES = [
  { value: 'GST', label: 'GST Compliance' },
  { value: 'INCOME_TAX', label: 'Income Tax' },
  { value: 'ROC', label: 'ROC/MCA Filings' },
  { value: 'LABOR_LAW', label: 'Labor Laws' },
  { value: 'RERA', label: 'RERA' },
  { value: 'FEMA', label: 'FEMA' },
  { value: 'CUSTOMS', label: 'Customs' },
  { value: 'OTHER', label: 'Other' },
];

const JURISDICTION_TYPES = [
  { value: 'CENTRAL', label: 'Central Government' },
  { value: 'STATE', label: 'State Government' },
  { value: 'CITY', label: 'City/Municipal' },
  { value: 'MULTI_STATE', label: 'Multi-State' },
  { value: 'INTERNATIONAL', label: 'International' },
];

const FREQUENCIES = [
  { value: 'ONE_TIME', label: 'One-Time' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half-Yearly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'ON_OCCURRENCE', label: 'On Occurrence' },
  { value: 'EVENT_BASED', label: 'Event-Based' },
];

const STEP_TYPES = [
  { value: 'DATA_COLLECTION', label: 'Data Collection' },
  { value: 'DOCUMENT_UPLOAD', label: 'Document Upload' },
  { value: 'VERIFICATION', label: 'Verification' },
  { value: 'CALCULATION', label: 'Calculation' },
  { value: 'GOVERNMENT_FILING', label: 'Government Filing' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'ACKNOWLEDGMENT', label: 'Acknowledgment' },
  { value: 'QC_REVIEW', label: 'QC Review' },
  { value: 'CLIENT_APPROVAL', label: 'Client Approval' },
  { value: 'DELIVERY', label: 'Delivery' },
];

const RULE_TYPES = [
  { value: 'DEADLINE', label: 'Deadline' },
  { value: 'PENALTY', label: 'Penalty' },
  { value: 'EXEMPTION', label: 'Exemption' },
  { value: 'THRESHOLD', label: 'Threshold' },
  { value: 'RATE', label: 'Rate' },
  { value: 'VALIDATION', label: 'Validation' },
];

const adminNavigation = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Reports", href: "/admin/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Clients", href: "/admin/clients", icon: Building2Nav },
      { label: "Access Reviews", href: "/admin/access-reviews", icon: ClipboardCheck },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Blueprints", href: "/admin/blueprints", icon: BlocksNav },
      { label: "Services", href: "/admin/services", icon: Server },
      { label: "Documents", href: "/admin/documents", icon: FileTextNav },
    ],
  },
  {
    title: "Developer",
    items: [
      { label: "Webhooks", href: "/admin/webhooks", icon: Webhook },
      { label: "API Keys", href: "/admin/api-keys", icon: Key },
    ],
  },
];

const adminUser = {
  name: "Admin",
  email: "admin@digicomply.com",
};

export default function BlueprintManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState('blueprints');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

  // Tab-specific selected blueprints
  const [workflowBlueprintId, setWorkflowBlueprintId] = useState<string>('');
  const [pricingBlueprintId, setPricingBlueprintId] = useState<string>('');
  const [documentsBlueprintId, setDocumentsBlueprintId] = useState<string>('');
  const [rulesBlueprintId, setRulesBlueprintId] = useState<string>('');

  // Sub-entity dialog states
  const [isWorkflowStepDialogOpen, setIsWorkflowStepDialogOpen] = useState(false);
  const [isPricingTierDialogOpen, setIsPricingTierDialogOpen] = useState(false);
  const [isDocumentTypeDialogOpen, setIsDocumentTypeDialogOpen] = useState(false);
  const [isComplianceRuleDialogOpen, setIsComplianceRuleDialogOpen] = useState(false);

  // Edit states for sub-entities
  const [editingWorkflowStep, setEditingWorkflowStep] = useState<WorkflowStep | null>(null);
  const [editingPricingTier, setEditingPricingTier] = useState<PricingTier | null>(null);
  const [editingDocumentType, setEditingDocumentType] = useState<DocumentType | null>(null);
  const [editingComplianceRule, setEditingComplianceRule] = useState<ComplianceRule | null>(null);

  // Sub-entity form states
  const [workflowStepForm, setWorkflowStepForm] = useState({
    stepCode: '',
    stepName: '',
    stepType: 'DATA_COLLECTION',
    sequence: 1,
    description: '',
    estimatedMinutes: 30,
    isClientFacing: false,
    assigneeRole: '',
  });

  const [pricingTierForm, setPricingTierForm] = useState({
    tierName: '',
    tierCode: '',
    basePrice: 0,
    gstRate: 18,
    entityTypeCondition: '',
    turnoverMin: undefined as number | undefined,
    turnoverMax: undefined as number | undefined,
    stateCondition: '',
    isActive: true,
  });

  const [documentTypeForm, setDocumentTypeForm] = useState({
    documentCode: '',
    documentName: '',
    description: '',
    category: '',
    isRequired: true,
    acceptedFormats: ['pdf', 'jpg', 'png'] as string[],
    maxSizeMb: 10,
  });

  const [complianceRuleForm, setComplianceRuleForm] = useState({
    ruleCode: '',
    ruleName: '',
    ruleType: 'DEADLINE',
    description: '',
    priority: 1,
    isActive: true,
  });

  // Form state
  const [blueprintForm, setBlueprintForm] = useState({
    code: '',
    name: '',
    description: '',
    category: 'GST',
    subCategory: '',
    jurisdictionType: 'CENTRAL',
    frequency: 'MONTHLY',
    slaHours: 24,
    governmentPortal: '',
    formNumber: '',
    tags: [] as string[],
  });

  // Queries
  const { data: blueprintsData, isLoading: loadingBlueprints } = useQuery({
    queryKey: ['/api/enterprise/blueprints', { search: searchQuery, category: categoryFilter !== 'all' ? categoryFilter : undefined, status: statusFilter !== 'all' ? statusFilter : undefined }],
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['/api/enterprise/blueprints/meta/categories'],
  });

  const { data: calendarStats } = useQuery({
    queryKey: ['/api/enterprise/calendar/dashboard'],
  });

  const { data: upcomingDeadlines } = useQuery({
    queryKey: ['/api/enterprise/calendar/upcoming', { daysAhead: 30 }],
  });

  const { data: overdueDeadlines } = useQuery({
    queryKey: ['/api/enterprise/calendar/overdue'],
  });

  // Workflow Steps Query
  const { data: workflowStepsData, isLoading: loadingWorkflowSteps } = useQuery({
    queryKey: ['/api/enterprise/blueprints', workflowBlueprintId, 'workflow-steps'],
    enabled: !!workflowBlueprintId,
  });

  // Pricing Tiers Query
  const { data: pricingTiersData, isLoading: loadingPricingTiers } = useQuery({
    queryKey: ['/api/enterprise/blueprints', pricingBlueprintId, 'pricing-tiers'],
    enabled: !!pricingBlueprintId,
  });

  // Document Types Query
  const { data: documentTypesData, isLoading: loadingDocumentTypes } = useQuery({
    queryKey: ['/api/enterprise/blueprints', documentsBlueprintId, 'document-types'],
    enabled: !!documentsBlueprintId,
  });

  // Compliance Rules Query
  const { data: complianceRulesData, isLoading: loadingComplianceRules } = useQuery({
    queryKey: ['/api/enterprise/blueprints', rulesBlueprintId, 'compliance-rules'],
    enabled: !!rulesBlueprintId,
  });

  // Mutations
  const createBlueprintMutation = useMutation({
    mutationFn: async (data: typeof blueprintForm) => {
      const response = await fetch('/api/enterprise/blueprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create blueprint');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints'] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: 'Blueprint Created',
        description: 'Service blueprint has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateBlueprintMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof blueprintForm> }) => {
      const response = await fetch(`/api/enterprise/blueprints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update blueprint');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints'] });
      setIsEditOpen(false);
      setSelectedBlueprint(null);
      toast({
        title: 'Blueprint Updated',
        description: 'Service blueprint has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteBlueprintMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/enterprise/blueprints/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete blueprint');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints'] });
      toast({
        title: 'Blueprint Deleted',
        description: 'Service blueprint has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const cloneBlueprintMutation = useMutation({
    mutationFn: async ({ id, newCode, newName }: { id: string; newCode: string; newName: string }) => {
      const response = await fetch(`/api/enterprise/blueprints/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newCode, newName }),
      });
      if (!response.ok) throw new Error('Failed to clone blueprint');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints'] });
      toast({
        title: 'Blueprint Cloned',
        description: 'Service blueprint has been cloned successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const activateBlueprintMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/enterprise/blueprints/${id}/activate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to activate blueprint');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints'] });
      toast({
        title: 'Blueprint Activated',
        description: 'Service blueprint is now active.',
      });
    },
  });

  const deactivateBlueprintMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/enterprise/blueprints/${id}/deactivate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to deactivate blueprint');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints'] });
      toast({
        title: 'Blueprint Deactivated',
        description: 'Service blueprint has been deactivated.',
      });
    },
  });

  // Workflow Step Mutations
  const createWorkflowStepMutation = useMutation({
    mutationFn: async ({ blueprintId, data }: { blueprintId: string; data: typeof workflowStepForm }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/workflow-steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create workflow step');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', workflowBlueprintId, 'workflow-steps'] });
      setIsWorkflowStepDialogOpen(false);
      resetWorkflowStepForm();
      toast({ title: 'Workflow Step Created', description: 'Step added successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateWorkflowStepMutation = useMutation({
    mutationFn: async ({ blueprintId, stepId, data }: { blueprintId: string; stepId: string; data: Partial<typeof workflowStepForm> }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/workflow-steps/${stepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update workflow step');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', workflowBlueprintId, 'workflow-steps'] });
      setIsWorkflowStepDialogOpen(false);
      setEditingWorkflowStep(null);
      toast({ title: 'Workflow Step Updated', description: 'Step updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteWorkflowStepMutation = useMutation({
    mutationFn: async ({ blueprintId, stepId }: { blueprintId: string; stepId: string }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/workflow-steps/${stepId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete workflow step');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', workflowBlueprintId, 'workflow-steps'] });
      toast({ title: 'Workflow Step Deleted', description: 'Step removed successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Pricing Tier Mutations
  const createPricingTierMutation = useMutation({
    mutationFn: async ({ blueprintId, data }: { blueprintId: string; data: typeof pricingTierForm }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/pricing-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create pricing tier');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', pricingBlueprintId, 'pricing-tiers'] });
      setIsPricingTierDialogOpen(false);
      resetPricingTierForm();
      toast({ title: 'Pricing Tier Created', description: 'Tier added successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updatePricingTierMutation = useMutation({
    mutationFn: async ({ blueprintId, tierId, data }: { blueprintId: string; tierId: string; data: Partial<typeof pricingTierForm> }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/pricing-tiers/${tierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update pricing tier');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', pricingBlueprintId, 'pricing-tiers'] });
      setIsPricingTierDialogOpen(false);
      setEditingPricingTier(null);
      toast({ title: 'Pricing Tier Updated', description: 'Tier updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deletePricingTierMutation = useMutation({
    mutationFn: async ({ blueprintId, tierId }: { blueprintId: string; tierId: string }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/pricing-tiers/${tierId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete pricing tier');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', pricingBlueprintId, 'pricing-tiers'] });
      toast({ title: 'Pricing Tier Deleted', description: 'Tier removed successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Document Type Mutations
  const createDocumentTypeMutation = useMutation({
    mutationFn: async ({ blueprintId, data }: { blueprintId: string; data: typeof documentTypeForm }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/document-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create document type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', documentsBlueprintId, 'document-types'] });
      setIsDocumentTypeDialogOpen(false);
      resetDocumentTypeForm();
      toast({ title: 'Document Type Created', description: 'Document type added successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateDocumentTypeMutation = useMutation({
    mutationFn: async ({ blueprintId, docId, data }: { blueprintId: string; docId: string; data: Partial<typeof documentTypeForm> }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/document-types/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update document type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', documentsBlueprintId, 'document-types'] });
      setIsDocumentTypeDialogOpen(false);
      setEditingDocumentType(null);
      toast({ title: 'Document Type Updated', description: 'Document type updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDocumentTypeMutation = useMutation({
    mutationFn: async ({ blueprintId, docId }: { blueprintId: string; docId: string }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/document-types/${docId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete document type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', documentsBlueprintId, 'document-types'] });
      toast({ title: 'Document Type Deleted', description: 'Document type removed successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Compliance Rule Mutations
  const createComplianceRuleMutation = useMutation({
    mutationFn: async ({ blueprintId, data }: { blueprintId: string; data: typeof complianceRuleForm }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/compliance-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create compliance rule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', rulesBlueprintId, 'compliance-rules'] });
      setIsComplianceRuleDialogOpen(false);
      resetComplianceRuleForm();
      toast({ title: 'Compliance Rule Created', description: 'Rule added successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateComplianceRuleMutation = useMutation({
    mutationFn: async ({ blueprintId, ruleId, data }: { blueprintId: string; ruleId: string; data: Partial<typeof complianceRuleForm> }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/compliance-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update compliance rule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', rulesBlueprintId, 'compliance-rules'] });
      setIsComplianceRuleDialogOpen(false);
      setEditingComplianceRule(null);
      toast({ title: 'Compliance Rule Updated', description: 'Rule updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteComplianceRuleMutation = useMutation({
    mutationFn: async ({ blueprintId, ruleId }: { blueprintId: string; ruleId: string }) => {
      const response = await fetch(`/api/enterprise/blueprints/${blueprintId}/compliance-rules/${ruleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete compliance rule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/blueprints', rulesBlueprintId, 'compliance-rules'] });
      toast({ title: 'Compliance Rule Deleted', description: 'Rule removed successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Handlers
  const resetForm = () => {
    setBlueprintForm({
      code: '',
      name: '',
      description: '',
      category: 'GST',
      subCategory: '',
      jurisdictionType: 'CENTRAL',
      frequency: 'MONTHLY',
      slaHours: 24,
      governmentPortal: '',
      formNumber: '',
      tags: [],
    });
  };

  const resetWorkflowStepForm = () => {
    setWorkflowStepForm({
      stepCode: '',
      stepName: '',
      stepType: 'DATA_COLLECTION',
      sequence: 1,
      description: '',
      estimatedMinutes: 30,
      isClientFacing: false,
      assigneeRole: '',
    });
  };

  const resetPricingTierForm = () => {
    setPricingTierForm({
      tierName: '',
      tierCode: '',
      basePrice: 0,
      gstRate: 18,
      entityTypeCondition: '',
      turnoverMin: undefined,
      turnoverMax: undefined,
      stateCondition: '',
      isActive: true,
    });
  };

  const resetDocumentTypeForm = () => {
    setDocumentTypeForm({
      documentCode: '',
      documentName: '',
      description: '',
      category: '',
      isRequired: true,
      acceptedFormats: ['pdf', 'jpg', 'png'],
      maxSizeMb: 10,
    });
  };

  const resetComplianceRuleForm = () => {
    setComplianceRuleForm({
      ruleCode: '',
      ruleName: '',
      ruleType: 'DEADLINE',
      description: '',
      priority: 1,
      isActive: true,
    });
  };

  // Sub-entity edit handlers
  const handleEditWorkflowStep = (step: WorkflowStep) => {
    setEditingWorkflowStep(step);
    setWorkflowStepForm({
      stepCode: step.stepCode,
      stepName: step.stepName,
      stepType: step.stepType,
      sequence: step.sequence,
      description: step.description || '',
      estimatedMinutes: step.estimatedMinutes || 30,
      isClientFacing: step.isClientFacing,
      assigneeRole: step.assigneeRole || '',
    });
    setIsWorkflowStepDialogOpen(true);
  };

  const handleEditPricingTier = (tier: PricingTier) => {
    setEditingPricingTier(tier);
    setPricingTierForm({
      tierName: tier.tierName,
      tierCode: tier.tierCode,
      basePrice: tier.basePrice,
      gstRate: tier.gstRate,
      entityTypeCondition: tier.entityTypeCondition || '',
      turnoverMin: tier.turnoverMin,
      turnoverMax: tier.turnoverMax,
      stateCondition: tier.stateCondition || '',
      isActive: tier.isActive,
    });
    setIsPricingTierDialogOpen(true);
  };

  const handleEditDocumentType = (doc: DocumentType) => {
    setEditingDocumentType(doc);
    setDocumentTypeForm({
      documentCode: doc.documentCode,
      documentName: doc.documentName,
      description: doc.description || '',
      category: doc.category || '',
      isRequired: doc.isRequired,
      acceptedFormats: doc.acceptedFormats || ['pdf', 'jpg', 'png'],
      maxSizeMb: doc.maxSizeMb || 10,
    });
    setIsDocumentTypeDialogOpen(true);
  };

  const handleEditComplianceRule = (rule: ComplianceRule) => {
    setEditingComplianceRule(rule);
    setComplianceRuleForm({
      ruleCode: rule.ruleCode,
      ruleName: rule.ruleName,
      ruleType: rule.ruleType,
      description: rule.description || '',
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setIsComplianceRuleDialogOpen(true);
  };

  // Submit handlers for sub-entities
  const handleSubmitWorkflowStep = () => {
    if (editingWorkflowStep) {
      updateWorkflowStepMutation.mutate({
        blueprintId: workflowBlueprintId,
        stepId: editingWorkflowStep.id,
        data: workflowStepForm,
      });
    } else {
      createWorkflowStepMutation.mutate({
        blueprintId: workflowBlueprintId,
        data: workflowStepForm,
      });
    }
  };

  const handleSubmitPricingTier = () => {
    if (editingPricingTier) {
      updatePricingTierMutation.mutate({
        blueprintId: pricingBlueprintId,
        tierId: editingPricingTier.id,
        data: pricingTierForm,
      });
    } else {
      createPricingTierMutation.mutate({
        blueprintId: pricingBlueprintId,
        data: pricingTierForm,
      });
    }
  };

  const handleSubmitDocumentType = () => {
    if (editingDocumentType) {
      updateDocumentTypeMutation.mutate({
        blueprintId: documentsBlueprintId,
        docId: editingDocumentType.id,
        data: documentTypeForm,
      });
    } else {
      createDocumentTypeMutation.mutate({
        blueprintId: documentsBlueprintId,
        data: documentTypeForm,
      });
    }
  };

  const handleSubmitComplianceRule = () => {
    if (editingComplianceRule) {
      updateComplianceRuleMutation.mutate({
        blueprintId: rulesBlueprintId,
        ruleId: editingComplianceRule.id,
        data: complianceRuleForm,
      });
    } else {
      createComplianceRuleMutation.mutate({
        blueprintId: rulesBlueprintId,
        data: complianceRuleForm,
      });
    }
  };

  const handleCreateBlueprint = () => {
    createBlueprintMutation.mutate(blueprintForm);
  };

  const handleUpdateBlueprint = () => {
    if (selectedBlueprint) {
      updateBlueprintMutation.mutate({
        id: selectedBlueprint.id,
        data: blueprintForm,
      });
    }
  };

  const handleEditBlueprint = (blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint);
    setBlueprintForm({
      code: blueprint.code,
      name: blueprint.name,
      description: blueprint.description || '',
      category: blueprint.category,
      subCategory: blueprint.subCategory || '',
      jurisdictionType: blueprint.jurisdictionType,
      frequency: blueprint.frequency,
      slaHours: blueprint.slaHours || 24,
      governmentPortal: blueprint.governmentPortal || '',
      formNumber: blueprint.formNumber || '',
      tags: blueprint.tags || [],
    });
    setIsEditOpen(true);
  };

  const handleViewBlueprint = (blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint);
    setIsDetailOpen(true);
  };

  const handleCloneBlueprint = (blueprint: Blueprint) => {
    const newCode = `${blueprint.code}_COPY`;
    const newName = `${blueprint.name} (Copy)`;
    cloneBlueprintMutation.mutate({ id: blueprint.id, newCode, newName });
  };

  const blueprints = (blueprintsData as any)?.blueprints || [];
  const stats = calendarStats as DashboardStats | undefined;
  const upcoming = (upcomingDeadlines as CalendarEntry[]) || [];
  const overdue = (overdueDeadlines as CalendarEntry[]) || [];
  const workflowSteps = ((workflowStepsData as any)?.steps || workflowStepsData || []) as WorkflowStep[];
  const pricingTiers = ((pricingTiersData as any)?.tiers || pricingTiersData || []) as PricingTier[];
  const documentTypes = ((documentTypesData as any)?.documentTypes || documentTypesData || []) as DocumentType[];
  const complianceRules = ((complianceRulesData as any)?.rules || complianceRulesData || []) as ComplianceRule[];

  return (
    <DashboardLayout
      navigation={adminNavigation}
      user={adminUser}
      logo={<span className="text-xl font-bold text-primary">DigiComply</span>}
    >
      <PageShell
        title="Blueprint Management"
        subtitle="Configure service blueprints, workflows, pricing, and compliance rules"
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Blueprints" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Blueprint
            </Button>
          </div>
        }
      >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Blueprints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{blueprints.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{stats?.upcomingCount || upcoming.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{stats?.overdueCount || overdue.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Filed This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats?.filedCount || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{stats?.complianceScore || 0}%</span>
            </div>
            <Progress value={stats?.complianceScore || 0} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="blueprints" className="gap-2">
            <FileText className="h-4 w-4" />
            Blueprints
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-2">
            <Workflow className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Scale className="h-4 w-4" />
            Rules
          </TabsTrigger>
        </TabsList>

        {/* Blueprints Tab */}
        <TabsContent value="blueprints" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search blueprints..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Blueprints Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Blueprint</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBlueprints ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading blueprints...
                      </TableCell>
                    </TableRow>
                  ) : blueprints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No blueprints found</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setIsCreateOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create your first blueprint
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    blueprints.map((blueprint: Blueprint) => (
                      <TableRow key={blueprint.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{blueprint.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {blueprint.code}
                              {blueprint.formNumber && ` - ${blueprint.formNumber}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {CATEGORIES.find(c => c.value === blueprint.category)?.label || blueprint.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {JURISDICTION_TYPES.find(j => j.value === blueprint.jurisdictionType)?.label || blueprint.jurisdictionType}
                        </TableCell>
                        <TableCell>
                          {FREQUENCIES.find(f => f.value === blueprint.frequency)?.label || blueprint.frequency}
                        </TableCell>
                        <TableCell>
                          {blueprint.slaHours ? `${blueprint.slaHours}h` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              blueprint.status === 'ACTIVE'
                                ? 'default'
                                : blueprint.status === 'DRAFT'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {blueprint.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewBlueprint(blueprint)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditBlueprint(blueprint)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCloneBlueprint(blueprint)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Clone
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {blueprint.status === 'ACTIVE' ? (
                                <DropdownMenuItem
                                  onClick={() => deactivateBlueprintMutation.mutate(blueprint.id)}
                                >
                                  <Pause className="h-4 w-4 mr-2" />
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => activateBlueprintMutation.mutate(blueprint.id)}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this blueprint?')) {
                                    deleteBlueprintMutation.mutate(blueprint.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Upcoming Deadlines
                </CardTitle>
                <CardDescription>Next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {upcoming.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No upcoming deadlines
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcoming.map((entry: CalendarEntry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <div className="font-medium">{entry.periodLabel}</div>
                            <div className="text-sm text-muted-foreground">
                              Due: {new Date(entry.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge
                            variant={
                              entry.status === 'PENDING'
                                ? 'secondary'
                                : entry.status === 'IN_PROGRESS'
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {entry.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Overdue Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Overdue
                </CardTitle>
                <CardDescription>Requires immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {overdue.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-muted-foreground">All caught up!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {overdue.map((entry: CalendarEntry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{entry.periodLabel}</div>
                            <div className="text-sm text-red-600">
                              Was due: {new Date(entry.dueDate).toLocaleDateString()}
                            </div>
                            {entry.penaltyAmount && (
                              <div className="text-sm font-medium text-red-700">
                                Penalty: <IndianRupee className="inline h-3 w-3" />
                                {entry.penaltyAmount.toLocaleString()}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="destructive">
                            File Now
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Workflow Steps Configuration</CardTitle>
                  <CardDescription>
                    Define the step-by-step process for each service blueprint
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={workflowBlueprintId} onValueChange={setWorkflowBlueprintId}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select a blueprint" />
                    </SelectTrigger>
                    <SelectContent>
                      {blueprints.map((bp: Blueprint) => (
                        <SelectItem key={bp.id} value={bp.id}>
                          {bp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {workflowBlueprintId && (
                    <Button onClick={() => {
                      resetWorkflowStepForm();
                      setEditingWorkflowStep(null);
                      setIsWorkflowStepDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Step
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!workflowBlueprintId ? (
                <div className="text-center py-8">
                  <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Select a blueprint to view and manage its workflow steps
                  </p>
                </div>
              ) : loadingWorkflowSteps ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading workflow steps...
                </div>
              ) : workflowSteps.length === 0 ? (
                <div className="text-center py-8">
                  <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-4">No workflow steps defined</p>
                  <Button variant="outline" onClick={() => {
                    resetWorkflowStepForm();
                    setEditingWorkflowStep(null);
                    setIsWorkflowStepDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add first step
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Client Facing</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflowSteps.sort((a, b) => a.sequence - b.sequence).map((step) => (
                      <TableRow key={step.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span>{step.sequence}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{step.stepName}</div>
                            <div className="text-sm text-muted-foreground">{step.stepCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {STEP_TYPES.find(t => t.value === step.stepType)?.label || step.stepType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {step.estimatedMinutes ? `${step.estimatedMinutes} min` : '-'}
                        </TableCell>
                        <TableCell>{step.assigneeRole || '-'}</TableCell>
                        <TableCell>
                          {step.isClientFacing ? (
                            <Badge variant="default">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditWorkflowStep(step)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  if (confirm('Delete this workflow step?')) {
                                    deleteWorkflowStepMutation.mutate({
                                      blueprintId: workflowBlueprintId,
                                      stepId: step.id,
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pricing Tiers</CardTitle>
                  <CardDescription>
                    Configure dynamic pricing based on entity type, turnover, and location
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={pricingBlueprintId} onValueChange={setPricingBlueprintId}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select a blueprint" />
                    </SelectTrigger>
                    <SelectContent>
                      {blueprints.map((bp: Blueprint) => (
                        <SelectItem key={bp.id} value={bp.id}>
                          {bp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pricingBlueprintId && (
                    <Button onClick={() => {
                      resetPricingTierForm();
                      setEditingPricingTier(null);
                      setIsPricingTierDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tier
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!pricingBlueprintId ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Select a blueprint to view and manage its pricing tiers
                  </p>
                </div>
              ) : loadingPricingTiers ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading pricing tiers...
                </div>
              ) : pricingTiers.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-4">No pricing tiers defined</p>
                  <Button variant="outline" onClick={() => {
                    resetPricingTierForm();
                    setEditingPricingTier(null);
                    setIsPricingTierDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add first tier
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier</TableHead>
                      <TableHead>Base Price</TableHead>
                      <TableHead>GST Rate</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Turnover Range</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingTiers.map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{tier.tierName}</div>
                            <div className="text-sm text-muted-foreground">{tier.tierCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <IndianRupee className="h-3 w-3 mr-1" />
                            {tier.basePrice.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>{tier.gstRate}%</TableCell>
                        <TableCell>{tier.entityTypeCondition || 'All'}</TableCell>
                        <TableCell>
                          {tier.turnoverMin || tier.turnoverMax ? (
                            <span>
                              {tier.turnoverMin ? `${(tier.turnoverMin / 100000).toFixed(0)}L` : '0'} -
                              {tier.turnoverMax ? ` ${(tier.turnoverMax / 100000).toFixed(0)}L` : ' Any'}
                            </span>
                          ) : 'Any'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tier.isActive ? 'default' : 'secondary'}>
                            {tier.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditPricingTier(tier)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  if (confirm('Delete this pricing tier?')) {
                                    deletePricingTierMutation.mutate({
                                      blueprintId: pricingBlueprintId,
                                      tierId: tier.id,
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Types</CardTitle>
                  <CardDescription>
                    Configure required documents for each service blueprint
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={documentsBlueprintId} onValueChange={setDocumentsBlueprintId}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select a blueprint" />
                    </SelectTrigger>
                    <SelectContent>
                      {blueprints.map((bp: Blueprint) => (
                        <SelectItem key={bp.id} value={bp.id}>
                          {bp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {documentsBlueprintId && (
                    <Button onClick={() => {
                      resetDocumentTypeForm();
                      setEditingDocumentType(null);
                      setIsDocumentTypeDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!documentsBlueprintId ? (
                <div className="text-center py-8">
                  <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Select a blueprint to view and manage its document requirements
                  </p>
                </div>
              ) : loadingDocumentTypes ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading document types...
                </div>
              ) : documentTypes.length === 0 ? (
                <div className="text-center py-8">
                  <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-4">No document types defined</p>
                  <Button variant="outline" onClick={() => {
                    resetDocumentTypeForm();
                    setEditingDocumentType(null);
                    setIsDocumentTypeDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add first document type
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Formats</TableHead>
                      <TableHead>Max Size</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentTypes.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{doc.documentName}</div>
                            <div className="text-sm text-muted-foreground">{doc.documentCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.category || 'General'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {doc.acceptedFormats?.slice(0, 3).map((fmt) => (
                              <Badge key={fmt} variant="secondary" className="text-xs">
                                {fmt.toUpperCase()}
                              </Badge>
                            ))}
                            {(doc.acceptedFormats?.length || 0) > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(doc.acceptedFormats?.length || 0) - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{doc.maxSizeMb ? `${doc.maxSizeMb} MB` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={doc.isRequired ? 'destructive' : 'secondary'}>
                            {doc.isRequired ? 'Required' : 'Optional'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditDocumentType(doc)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  if (confirm('Delete this document type?')) {
                                    deleteDocumentTypeMutation.mutate({
                                      blueprintId: documentsBlueprintId,
                                      docId: doc.id,
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Compliance Rules</CardTitle>
                  <CardDescription>
                    Configure deadline formulas, penalty rules, and exemptions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={rulesBlueprintId} onValueChange={setRulesBlueprintId}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select a blueprint" />
                    </SelectTrigger>
                    <SelectContent>
                      {blueprints.map((bp: Blueprint) => (
                        <SelectItem key={bp.id} value={bp.id}>
                          {bp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rulesBlueprintId && (
                    <Button onClick={() => {
                      resetComplianceRuleForm();
                      setEditingComplianceRule(null);
                      setIsComplianceRuleDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rule
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!rulesBlueprintId ? (
                <div className="text-center py-8">
                  <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Select a blueprint to view and manage its compliance rules
                  </p>
                </div>
              ) : loadingComplianceRules ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading compliance rules...
                </div>
              ) : complianceRules.length === 0 ? (
                <div className="text-center py-8">
                  <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-4">No compliance rules defined</p>
                  <Button variant="outline" onClick={() => {
                    resetComplianceRuleForm();
                    setEditingComplianceRule(null);
                    setIsComplianceRuleDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add first rule
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceRules.sort((a, b) => a.priority - b.priority).map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rule.ruleName}</div>
                            <div className="text-sm text-muted-foreground">{rule.ruleCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            rule.ruleType === 'DEADLINE' ? 'default' :
                            rule.ruleType === 'PENALTY' ? 'destructive' :
                            rule.ruleType === 'EXEMPTION' ? 'secondary' : 'outline'
                          }>
                            {RULE_TYPES.find(t => t.value === rule.ruleType)?.label || rule.ruleType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {rule.priority <= 1 ? (
                              <ArrowUp className="h-4 w-4 text-red-500" />
                            ) : rule.priority <= 3 ? (
                              <ArrowUp className="h-4 w-4 text-amber-500" />
                            ) : (
                              <ArrowDown className="h-4 w-4 text-green-500" />
                            )}
                            {rule.priority}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {rule.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditComplianceRule(rule)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  if (confirm('Delete this compliance rule?')) {
                                    deleteComplianceRuleMutation.mutate({
                                      blueprintId: rulesBlueprintId,
                                      ruleId: rule.id,
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Blueprint Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Service Blueprint</DialogTitle>
            <DialogDescription>
              Define a new compliance service with its workflow, pricing, and rules
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Blueprint Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., GSTR3B_MONTHLY"
                  value={blueprintForm.code}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Blueprint Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., GSTR-3B Monthly Filing"
                  value={blueprintForm.name}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the service..."
                value={blueprintForm.description}
                onChange={(e) =>
                  setBlueprintForm({ ...blueprintForm, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={blueprintForm.category}
                  onValueChange={(value) =>
                    setBlueprintForm({ ...blueprintForm, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subCategory">Sub-Category</Label>
                <Input
                  id="subCategory"
                  placeholder="e.g., Regular Returns"
                  value={blueprintForm.subCategory}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, subCategory: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jurisdiction Type *</Label>
                <Select
                  value={blueprintForm.jurisdictionType}
                  onValueChange={(value) =>
                    setBlueprintForm({ ...blueprintForm, jurisdictionType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JURISDICTION_TYPES.map((jt) => (
                      <SelectItem key={jt.value} value={jt.value}>
                        {jt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency *</Label>
                <Select
                  value={blueprintForm.frequency}
                  onValueChange={(value) =>
                    setBlueprintForm({ ...blueprintForm, frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slaHours">SLA (Hours)</Label>
                <Input
                  id="slaHours"
                  type="number"
                  min="1"
                  value={blueprintForm.slaHours}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, slaHours: parseInt(e.target.value) || 24 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="governmentPortal">Government Portal</Label>
                <Input
                  id="governmentPortal"
                  placeholder="e.g., gst.gov.in"
                  value={blueprintForm.governmentPortal}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, governmentPortal: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formNumber">Form Number</Label>
                <Input
                  id="formNumber"
                  placeholder="e.g., GSTR-3B"
                  value={blueprintForm.formNumber}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, formNumber: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBlueprint}
              disabled={createBlueprintMutation.isPending || !blueprintForm.code || !blueprintForm.name}
            >
              {createBlueprintMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Blueprint
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Blueprint Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service Blueprint</DialogTitle>
            <DialogDescription>
              Update the configuration for {selectedBlueprint?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Blueprint Code *</Label>
                <Input
                  id="edit-code"
                  value={blueprintForm.code}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Blueprint Name *</Label>
                <Input
                  id="edit-name"
                  value={blueprintForm.name}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={blueprintForm.description}
                onChange={(e) =>
                  setBlueprintForm({ ...blueprintForm, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={blueprintForm.category}
                  onValueChange={(value) =>
                    setBlueprintForm({ ...blueprintForm, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency *</Label>
                <Select
                  value={blueprintForm.frequency}
                  onValueChange={(value) =>
                    setBlueprintForm({ ...blueprintForm, frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-slaHours">SLA (Hours)</Label>
                <Input
                  id="edit-slaHours"
                  type="number"
                  min="1"
                  value={blueprintForm.slaHours}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, slaHours: parseInt(e.target.value) || 24 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-governmentPortal">Government Portal</Label>
                <Input
                  id="edit-governmentPortal"
                  value={blueprintForm.governmentPortal}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, governmentPortal: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-formNumber">Form Number</Label>
                <Input
                  id="edit-formNumber"
                  value={blueprintForm.formNumber}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, formNumber: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateBlueprint}
              disabled={updateBlueprintMutation.isPending || !blueprintForm.code || !blueprintForm.name}
            >
              {updateBlueprintMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Blueprint Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBlueprint?.name}</DialogTitle>
            <DialogDescription>
              Blueprint Code: {selectedBlueprint?.code} | Version: {selectedBlueprint?.version}
            </DialogDescription>
          </DialogHeader>

          {selectedBlueprint && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-medium">
                    {CATEGORIES.find(c => c.value === selectedBlueprint.category)?.label}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Jurisdiction</Label>
                  <p className="font-medium">
                    {JURISDICTION_TYPES.find(j => j.value === selectedBlueprint.jurisdictionType)?.label}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Frequency</Label>
                  <p className="font-medium">
                    {FREQUENCIES.find(f => f.value === selectedBlueprint.frequency)?.label}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">SLA</Label>
                  <p className="font-medium">{selectedBlueprint.slaHours || 'N/A'} hours</p>
                </div>
              </div>

              <Separator />

              {/* Description */}
              {selectedBlueprint.description && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{selectedBlueprint.description}</p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Government Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedBlueprint.governmentPortal && (
                  <div>
                    <Label className="text-muted-foreground">Government Portal</Label>
                    <p className="font-medium">{selectedBlueprint.governmentPortal}</p>
                  </div>
                )}
                {selectedBlueprint.formNumber && (
                  <div>
                    <Label className="text-muted-foreground">Form Number</Label>
                    <p className="font-medium">{selectedBlueprint.formNumber}</p>
                  </div>
                )}
              </div>

              {/* Tags */}
              {selectedBlueprint.tags && selectedBlueprint.tags.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedBlueprint.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  Created: {new Date(selectedBlueprint.createdAt).toLocaleString()}
                </div>
                <div>
                  Updated: {new Date(selectedBlueprint.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsDetailOpen(false);
              if (selectedBlueprint) handleEditBlueprint(selectedBlueprint);
            }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Blueprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow Step Dialog */}
      <Dialog open={isWorkflowStepDialogOpen} onOpenChange={(open) => {
        setIsWorkflowStepDialogOpen(open);
        if (!open) {
          setEditingWorkflowStep(null);
          resetWorkflowStepForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingWorkflowStep ? 'Edit Workflow Step' : 'Add Workflow Step'}
            </DialogTitle>
            <DialogDescription>
              Define a step in the service delivery workflow
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stepCode">Step Code *</Label>
                <Input
                  id="stepCode"
                  placeholder="e.g., DATA_ENTRY"
                  value={workflowStepForm.stepCode}
                  onChange={(e) => setWorkflowStepForm({
                    ...workflowStepForm,
                    stepCode: e.target.value.toUpperCase()
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stepName">Step Name *</Label>
                <Input
                  id="stepName"
                  placeholder="e.g., Data Entry"
                  value={workflowStepForm.stepName}
                  onChange={(e) => setWorkflowStepForm({
                    ...workflowStepForm,
                    stepName: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Step Type *</Label>
                <Select
                  value={workflowStepForm.stepType}
                  onValueChange={(value) => setWorkflowStepForm({
                    ...workflowStepForm,
                    stepType: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STEP_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sequence">Sequence *</Label>
                <Input
                  id="sequence"
                  type="number"
                  min="1"
                  value={workflowStepForm.sequence}
                  onChange={(e) => setWorkflowStepForm({
                    ...workflowStepForm,
                    sequence: parseInt(e.target.value) || 1
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stepDescription">Description</Label>
              <Textarea
                id="stepDescription"
                placeholder="Describe what happens in this step..."
                value={workflowStepForm.description}
                onChange={(e) => setWorkflowStepForm({
                  ...workflowStepForm,
                  description: e.target.value
                })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedMinutes">Est. Duration (min)</Label>
                <Input
                  id="estimatedMinutes"
                  type="number"
                  min="1"
                  value={workflowStepForm.estimatedMinutes}
                  onChange={(e) => setWorkflowStepForm({
                    ...workflowStepForm,
                    estimatedMinutes: parseInt(e.target.value) || 30
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigneeRole">Assignee Role</Label>
                <Input
                  id="assigneeRole"
                  placeholder="e.g., Tax Associate"
                  value={workflowStepForm.assigneeRole}
                  onChange={(e) => setWorkflowStepForm({
                    ...workflowStepForm,
                    assigneeRole: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isClientFacing"
                checked={workflowStepForm.isClientFacing}
                onCheckedChange={(checked) => setWorkflowStepForm({
                  ...workflowStepForm,
                  isClientFacing: checked
                })}
              />
              <Label htmlFor="isClientFacing">Client-facing step</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWorkflowStepDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitWorkflowStep}
              disabled={
                createWorkflowStepMutation.isPending ||
                updateWorkflowStepMutation.isPending ||
                !workflowStepForm.stepCode ||
                !workflowStepForm.stepName
              }
            >
              {(createWorkflowStepMutation.isPending || updateWorkflowStepMutation.isPending) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingWorkflowStep ? 'Save Changes' : 'Add Step'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Tier Dialog */}
      <Dialog open={isPricingTierDialogOpen} onOpenChange={(open) => {
        setIsPricingTierDialogOpen(open);
        if (!open) {
          setEditingPricingTier(null);
          resetPricingTierForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPricingTier ? 'Edit Pricing Tier' : 'Add Pricing Tier'}
            </DialogTitle>
            <DialogDescription>
              Configure pricing based on entity type and turnover
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tierCode">Tier Code *</Label>
                <Input
                  id="tierCode"
                  placeholder="e.g., STANDARD"
                  value={pricingTierForm.tierCode}
                  onChange={(e) => setPricingTierForm({
                    ...pricingTierForm,
                    tierCode: e.target.value.toUpperCase()
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tierName">Tier Name *</Label>
                <Input
                  id="tierName"
                  placeholder="e.g., Standard"
                  value={pricingTierForm.tierName}
                  onChange={(e) => setPricingTierForm({
                    ...pricingTierForm,
                    tierName: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (₹) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="0"
                  value={pricingTierForm.basePrice}
                  onChange={(e) => setPricingTierForm({
                    ...pricingTierForm,
                    basePrice: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstRate">GST Rate (%)</Label>
                <Input
                  id="gstRate"
                  type="number"
                  min="0"
                  max="100"
                  value={pricingTierForm.gstRate}
                  onChange={(e) => setPricingTierForm({
                    ...pricingTierForm,
                    gstRate: parseFloat(e.target.value) || 18
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entityTypeCondition">Entity Type Condition</Label>
              <Select
                value={pricingTierForm.entityTypeCondition}
                onValueChange={(value) => setPricingTierForm({
                  ...pricingTierForm,
                  entityTypeCondition: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All entity types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="PRIVATE_LIMITED">Private Limited</SelectItem>
                  <SelectItem value="PUBLIC_LIMITED">Public Limited</SelectItem>
                  <SelectItem value="LLP">LLP</SelectItem>
                  <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                  <SelectItem value="PROPRIETORSHIP">Proprietorship</SelectItem>
                  <SelectItem value="HUF">HUF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="turnoverMin">Min Turnover (₹)</Label>
                <Input
                  id="turnoverMin"
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={pricingTierForm.turnoverMin ?? ''}
                  onChange={(e) => setPricingTierForm({
                    ...pricingTierForm,
                    turnoverMin: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="turnoverMax">Max Turnover (₹)</Label>
                <Input
                  id="turnoverMax"
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={pricingTierForm.turnoverMax ?? ''}
                  onChange={(e) => setPricingTierForm({
                    ...pricingTierForm,
                    turnoverMax: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stateCondition">State Condition</Label>
              <Input
                id="stateCondition"
                placeholder="e.g., Maharashtra, Delhi"
                value={pricingTierForm.stateCondition}
                onChange={(e) => setPricingTierForm({
                  ...pricingTierForm,
                  stateCondition: e.target.value
                })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="tierIsActive"
                checked={pricingTierForm.isActive}
                onCheckedChange={(checked) => setPricingTierForm({
                  ...pricingTierForm,
                  isActive: checked
                })}
              />
              <Label htmlFor="tierIsActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPricingTierDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPricingTier}
              disabled={
                createPricingTierMutation.isPending ||
                updatePricingTierMutation.isPending ||
                !pricingTierForm.tierCode ||
                !pricingTierForm.tierName
              }
            >
              {(createPricingTierMutation.isPending || updatePricingTierMutation.isPending) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingPricingTier ? 'Save Changes' : 'Add Tier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Type Dialog */}
      <Dialog open={isDocumentTypeDialogOpen} onOpenChange={(open) => {
        setIsDocumentTypeDialogOpen(open);
        if (!open) {
          setEditingDocumentType(null);
          resetDocumentTypeForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDocumentType ? 'Edit Document Type' : 'Add Document Type'}
            </DialogTitle>
            <DialogDescription>
              Define required documents for this service
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentCode">Document Code *</Label>
                <Input
                  id="documentCode"
                  placeholder="e.g., PAN_CARD"
                  value={documentTypeForm.documentCode}
                  onChange={(e) => setDocumentTypeForm({
                    ...documentTypeForm,
                    documentCode: e.target.value.toUpperCase()
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentName">Document Name *</Label>
                <Input
                  id="documentName"
                  placeholder="e.g., PAN Card"
                  value={documentTypeForm.documentName}
                  onChange={(e) => setDocumentTypeForm({
                    ...documentTypeForm,
                    documentName: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="docDescription">Description</Label>
              <Textarea
                id="docDescription"
                placeholder="Describe the document requirements..."
                value={documentTypeForm.description}
                onChange={(e) => setDocumentTypeForm({
                  ...documentTypeForm,
                  description: e.target.value
                })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="docCategory">Category</Label>
                <Select
                  value={documentTypeForm.category}
                  onValueChange={(value) => setDocumentTypeForm({
                    ...documentTypeForm,
                    category: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDENTITY">Identity</SelectItem>
                    <SelectItem value="ADDRESS">Address Proof</SelectItem>
                    <SelectItem value="FINANCIAL">Financial</SelectItem>
                    <SelectItem value="REGISTRATION">Registration</SelectItem>
                    <SelectItem value="AUTHORIZATION">Authorization</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSizeMb">Max Size (MB)</Label>
                <Input
                  id="maxSizeMb"
                  type="number"
                  min="1"
                  value={documentTypeForm.maxSizeMb}
                  onChange={(e) => setDocumentTypeForm({
                    ...documentTypeForm,
                    maxSizeMb: parseInt(e.target.value) || 10
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Accepted Formats</Label>
              <div className="flex flex-wrap gap-2">
                {['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xlsx'].map((fmt) => (
                  <div key={fmt} className="flex items-center space-x-2">
                    <Checkbox
                      id={`fmt-${fmt}`}
                      checked={documentTypeForm.acceptedFormats.includes(fmt)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDocumentTypeForm({
                            ...documentTypeForm,
                            acceptedFormats: [...documentTypeForm.acceptedFormats, fmt]
                          });
                        } else {
                          setDocumentTypeForm({
                            ...documentTypeForm,
                            acceptedFormats: documentTypeForm.acceptedFormats.filter(f => f !== fmt)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`fmt-${fmt}`} className="text-sm uppercase">{fmt}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="docIsRequired"
                checked={documentTypeForm.isRequired}
                onCheckedChange={(checked) => setDocumentTypeForm({
                  ...documentTypeForm,
                  isRequired: checked
                })}
              />
              <Label htmlFor="docIsRequired">Required document</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDocumentType}
              disabled={
                createDocumentTypeMutation.isPending ||
                updateDocumentTypeMutation.isPending ||
                !documentTypeForm.documentCode ||
                !documentTypeForm.documentName
              }
            >
              {(createDocumentTypeMutation.isPending || updateDocumentTypeMutation.isPending) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingDocumentType ? 'Save Changes' : 'Add Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compliance Rule Dialog */}
      <Dialog open={isComplianceRuleDialogOpen} onOpenChange={(open) => {
        setIsComplianceRuleDialogOpen(open);
        if (!open) {
          setEditingComplianceRule(null);
          resetComplianceRuleForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingComplianceRule ? 'Edit Compliance Rule' : 'Add Compliance Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure deadline formulas, penalty rules, or exemptions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ruleCode">Rule Code *</Label>
                <Input
                  id="ruleCode"
                  placeholder="e.g., DUE_DATE_20TH"
                  value={complianceRuleForm.ruleCode}
                  onChange={(e) => setComplianceRuleForm({
                    ...complianceRuleForm,
                    ruleCode: e.target.value.toUpperCase()
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruleName">Rule Name *</Label>
                <Input
                  id="ruleName"
                  placeholder="e.g., Due by 20th of month"
                  value={complianceRuleForm.ruleName}
                  onChange={(e) => setComplianceRuleForm({
                    ...complianceRuleForm,
                    ruleName: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rule Type *</Label>
                <Select
                  value={complianceRuleForm.ruleType}
                  onValueChange={(value) => setComplianceRuleForm({
                    ...complianceRuleForm,
                    ruleType: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rulePriority">Priority</Label>
                <Input
                  id="rulePriority"
                  type="number"
                  min="1"
                  max="10"
                  value={complianceRuleForm.priority}
                  onChange={(e) => setComplianceRuleForm({
                    ...complianceRuleForm,
                    priority: parseInt(e.target.value) || 1
                  })}
                />
                <p className="text-xs text-muted-foreground">1 = Highest priority</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleDescription">Description</Label>
              <Textarea
                id="ruleDescription"
                placeholder="Describe the rule logic and conditions..."
                value={complianceRuleForm.description}
                onChange={(e) => setComplianceRuleForm({
                  ...complianceRuleForm,
                  description: e.target.value
                })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ruleIsActive"
                checked={complianceRuleForm.isActive}
                onCheckedChange={(checked) => setComplianceRuleForm({
                  ...complianceRuleForm,
                  isActive: checked
                })}
              />
              <Label htmlFor="ruleIsActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComplianceRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitComplianceRule}
              disabled={
                createComplianceRuleMutation.isPending ||
                updateComplianceRuleMutation.isPending ||
                !complianceRuleForm.ruleCode ||
                !complianceRuleForm.ruleName
              }
            >
              {(createComplianceRuleMutation.isPending || updateComplianceRuleMutation.isPending) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingComplianceRule ? 'Save Changes' : 'Add Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageShell>
    </DashboardLayout>
  );
}
