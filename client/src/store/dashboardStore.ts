import { create } from 'zustand';

export interface DashboardStats {
  totalClients?: number;
  activeServices?: number;
  pendingTasks?: number;
  revenue?: number;
  complianceScore?: number;
  upcomingDeadlines?: number;
  recentActivity?: number;
}

export interface ActivityItem {
  id: string;
  type: 'SERVICE' | 'PAYMENT' | 'DOCUMENT' | 'TASK' | 'COMPLIANCE';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  metadata?: Record<string, any>;
}

interface DashboardState {
  stats: DashboardStats;
  activities: ActivityItem[];
  isLoading: boolean;

  // Actions
  setStats: (stats: DashboardStats) => void;
  setActivities: (activities: ActivityItem[]) => void;
  addActivity: (activity: ActivityItem) => void;
  updateStat: (key: keyof DashboardStats, value: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: {},
  activities: [],
  isLoading: false,

  setStats: (stats) => set({ stats }),

  setActivities: (activities) => set({ activities }),

  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities].slice(0, 50), // Keep last 50
    })),

  updateStat: (key, value) =>
    set((state) => ({
      stats: {
        ...state.stats,
        [key]: value,
      },
    })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
