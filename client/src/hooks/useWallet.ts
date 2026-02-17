/**
 * Wallet & Referral Hooks
 *
 * React Query hooks for wallet and referral management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================
// TYPES
// ============================================
export interface WalletTransaction {
  id: number;
  type: 'credit' | 'debit' | 'refund' | 'referral_bonus' | 'cashback';
  amount: number;
  description: string | null;
  category: string | null;
  status: string;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  currency: string;
  isActive: boolean;
  isFrozen: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  transactions: WalletTransaction[];
}

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  isActive: boolean;
  stats: {
    totalReferrals: number;
    successfulReferrals: number;
    pendingReferrals: number;
    convertedReferrals: number;
    totalEarnings: number;
    rewardPerReferral: number;
  };
}

export interface ReferralHistoryItem {
  id: number;
  referredUser: {
    name: string;
    email: string | null;
    joinedAt: string;
  };
  status: string;
  rewardAmount: number | null;
  rewardPaidAt: string | null;
  createdAt: string;
  convertedAt: string | null;
}

// ============================================
// API FUNCTIONS
// ============================================
async function fetchWallet(): Promise<Wallet> {
  const response = await fetch('/api/wallet', {
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to fetch wallet');
  return response.json();
}

async function fetchTransactions(params: { limit?: number; offset?: number; type?: string }) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  if (params.type) searchParams.set('type', params.type);

  const response = await fetch(`/api/wallet/transactions?${searchParams}`, {
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}

async function fetchReferralStats(): Promise<ReferralStats> {
  const response = await fetch('/api/referrals/stats', {
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to fetch referral stats');
  return response.json();
}

async function fetchReferralHistory(params: { limit?: number; offset?: number }) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const response = await fetch(`/api/referrals/history?${searchParams}`, {
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to fetch referral history');
  return response.json();
}

async function applyReferralCode(data: { code: string; newUserId: number }) {
  const response = await fetch('/api/referrals/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to apply referral code');
  }
  return response.json();
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook for fetching wallet data
 */
export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook for fetching wallet transactions
 */
export function useWalletTransactions(params: { limit?: number; offset?: number; type?: string } = {}) {
  return useQuery({
    queryKey: ['wallet', 'transactions', params],
    queryFn: () => fetchTransactions(params),
    staleTime: 30000,
  });
}

/**
 * Hook for fetching referral stats
 */
export function useReferralStats() {
  return useQuery({
    queryKey: ['referrals', 'stats'],
    queryFn: fetchReferralStats,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for fetching referral history
 */
export function useReferralHistory(params: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ['referrals', 'history', params],
    queryFn: () => fetchReferralHistory(params),
    staleTime: 60000,
  });
}

/**
 * Hook for applying referral code
 */
export function useApplyReferralCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyReferralCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
}

/**
 * Helper: Format currency
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Helper: Copy referral link to clipboard
 */
export async function copyReferralLink(link: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}
