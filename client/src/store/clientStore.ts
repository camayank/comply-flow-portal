import { create } from 'zustand';

export interface Client {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  pan?: string;
  gstin?: string;
  cin?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  businessType: 'INDIVIDUAL' | 'PARTNERSHIP' | 'LLP' | 'PRIVATE_LIMITED' | 'PUBLIC_LIMITED' | 'OPC';
  industry?: string;
  complianceHealth: number;
  walletBalance: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  onboardedAt: string;
  metadata?: Record<string, any>;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: string;
  category: 'IDENTITY' | 'ADDRESS' | 'BUSINESS' | 'TAX' | 'COMPLIANCE' | 'OTHER';
}

interface ClientState {
  clients: Client[];
  currentClient: Client | null;
  documents: ClientDocument[];
  isLoading: boolean;

  // Actions
  setClients: (clients: Client[]) => void;
  setCurrentClient: (client: Client | null) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  setDocuments: (documents: ClientDocument[]) => void;
  addDocument: (document: ClientDocument) => void;
  setLoading: (loading: boolean) => void;
}

export const useClientStore = create<ClientState>((set) => ({
  clients: [],
  currentClient: null,
  documents: [],
  isLoading: false,

  setClients: (clients) => set({ clients }),

  setCurrentClient: (client) => set({ currentClient: client }),

  updateClient: (id, updates) =>
    set((state) => ({
      clients: state.clients.map((client) =>
        client.id === id ? { ...client, ...updates } : client
      ),
      currentClient:
        state.currentClient?.id === id
          ? { ...state.currentClient, ...updates }
          : state.currentClient,
    })),

  setDocuments: (documents) => set({ documents }),

  addDocument: (document) =>
    set((state) => ({
      documents: [...state.documents, document],
    })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
