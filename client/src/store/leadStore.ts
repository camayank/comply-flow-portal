import { create } from 'zustand';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  source: 'WEBSITE' | 'REFERRAL' | 'AGENT' | 'DIRECT' | 'MARKETING';
  stage: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedTo?: string;
  estimatedValue?: number;
  probability?: number;
  notes?: string;
  createdAt: string;
  lastContactedAt?: string;
  metadata?: Record<string, any>;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'STATUS_CHANGE';
  description: string;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface LeadState {
  leads: Lead[];
  leadActivities: LeadActivity[];
  selectedLead: Lead | null;
  filters: {
    stage?: string;
    source?: string;
    assignedTo?: string;
  };
  isLoading: boolean;

  // Actions
  setLeads: (leads: Lead[]) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  selectLead: (lead: Lead | null) => void;
  setLeadActivities: (activities: LeadActivity[]) => void;
  addLeadActivity: (activity: LeadActivity) => void;
  setFilters: (filters: Partial<LeadState['filters']>) => void;
  setLoading: (loading: boolean) => void;
}

export const useLeadStore = create<LeadState>((set) => ({
  leads: [],
  leadActivities: [],
  selectedLead: null,
  filters: {},
  isLoading: false,

  setLeads: (leads) => set({ leads }),

  addLead: (lead) =>
    set((state) => ({
      leads: [...state.leads, lead],
    })),

  updateLead: (id, updates) =>
    set((state) => ({
      leads: state.leads.map((lead) =>
        lead.id === id ? { ...lead, ...updates } : lead
      ),
      selectedLead:
        state.selectedLead?.id === id
          ? { ...state.selectedLead, ...updates }
          : state.selectedLead,
    })),

  selectLead: (lead) => set({ selectedLead: lead }),

  setLeadActivities: (activities) => set({ leadActivities: activities }),

  addLeadActivity: (activity) =>
    set((state) => ({
      leadActivities: [activity, ...state.leadActivities],
    })),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
