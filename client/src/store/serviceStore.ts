import { create } from 'zustand';

export interface Service {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  description: string;
  basePrice: number;
  timeline: string;
  requiredDocuments: string[];
  isActive: boolean;
  tags?: string[];
}

export interface ServiceInstance {
  id: string;
  serviceId: string;
  clientId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  progress: number;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

interface ServiceState {
  services: Service[];
  serviceInstances: ServiceInstance[];
  selectedService: Service | null;
  isLoading: boolean;

  // Actions
  setServices: (services: Service[]) => void;
  setServiceInstances: (instances: ServiceInstance[]) => void;
  selectService: (service: Service | null) => void;
  updateServiceInstance: (id: string, updates: Partial<ServiceInstance>) => void;
  addServiceInstance: (instance: ServiceInstance) => void;
  setLoading: (loading: boolean) => void;
}

export const useServiceStore = create<ServiceState>((set) => ({
  services: [],
  serviceInstances: [],
  selectedService: null,
  isLoading: false,

  setServices: (services) => set({ services }),

  setServiceInstances: (instances) => set({ serviceInstances: instances }),

  selectService: (service) => set({ selectedService: service }),

  updateServiceInstance: (id, updates) =>
    set((state) => ({
      serviceInstances: state.serviceInstances.map((instance) =>
        instance.id === id ? { ...instance, ...updates } : instance
      ),
    })),

  addServiceInstance: (instance) =>
    set((state) => ({
      serviceInstances: [...state.serviceInstances, instance],
    })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
