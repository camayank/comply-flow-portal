/**
 * QuickCommand - Command Palette (Cmd+K)
 * Stripe/Linear inspired quick navigation
 */

import React, { useEffect, useState } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command';
import {
  Shield,
  Briefcase,
  FileText,
  TrendingUp,
  Clock,
  BarChart3,
  Settings,
  HelpCircle,
  Search,
  Upload,
  Plus,
  CheckSquare,
  Calendar,
  Bell,
  Users,
  CreditCard
} from 'lucide-react';
import { useLocation } from 'wouter';

interface QuickCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickCommand({ open, onOpenChange }: QuickCommandProps) {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const navigateTo = (path: string) => {
    setLocation(path);
    onOpenChange(false);
    setSearch('');
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search for pages, actions, or help..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigateTo('/lifecycle')}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
            <span className="ml-auto text-xs text-gray-500">Overview</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('/lifecycle/compliance')}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Compliance Tracker</span>
            <span className="ml-auto text-xs text-gray-500">Checkpoints</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('/lifecycle/services')}>
            <Briefcase className="mr-2 h-4 w-4" />
            <span>Services Catalog</span>
            <span className="ml-auto text-xs text-gray-500">96 services</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('/lifecycle/documents')}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Document Vault</span>
            <span className="ml-auto text-xs text-gray-500">Upload & manage</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('/lifecycle/funding')}>
            <TrendingUp className="mr-2 h-4 w-4" />
            <span>Funding Readiness</span>
            <span className="ml-auto text-xs text-gray-500">Due diligence</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('/lifecycle/timeline')}>
            <Clock className="mr-2 h-4 w-4" />
            <span>Business Timeline</span>
            <span className="ml-auto text-xs text-gray-500">8 stages</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => navigateTo('/lifecycle/documents')}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Upload Document</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('/lifecycle/services')}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Subscribe to Service</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('/lifecycle/compliance')}>
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>Complete Checkpoint</span>
          </CommandItem>
          <CommandItem onSelect={() => console.log('Schedule consultation')}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Schedule Consultation</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Other */}
        <CommandGroup heading="Other">
          <CommandItem onSelect={() => console.log('Notifications')}>
            <Bell className="mr-2 h-4 w-4" />
            <span>Notifications</span>
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">3</span>
          </CommandItem>
          <CommandItem onSelect={() => console.log('Team')}>
            <Users className="mr-2 h-4 w-4" />
            <span>Team Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => console.log('Billing')}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing & Payments</span>
          </CommandItem>
          <CommandItem onSelect={() => console.log('Settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => console.log('Help')}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Support</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/**
 * QuickCommandTrigger - Button to open command palette
 */
interface QuickCommandTriggerProps {
  onClick: () => void;
}

export function QuickCommandTrigger({ onClick }: QuickCommandTriggerProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
    >
      <Search className="h-4 w-4" />
      <span>Quick search...</span>
      <kbd className="ml-auto px-2 py-0.5 text-xs bg-white rounded border border-gray-300">
        ⌘K
      </kbd>
    </button>
  );
}
