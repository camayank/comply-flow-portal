/**
 * Global Command Palette
 * Provides quick navigation and actions across the platform
 */

import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  Calendar,
  Settings,
  Search,
  Briefcase,
  CheckSquare,
  DollarSign,
  BarChart3,
  UserPlus,
  FileSpreadsheet,
  Shield,
  Clock,
  Zap,
  Globe,
  Package,
  Target,
  MessageSquare,
  Award,
  BookOpen,
  Building2,
  Wrench,
  UserCircle,
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: any;
  category: string;
  keywords?: string[];
}

const navigationItems: NavigationItem[] = [
  // Main Pages
  { id: "home", label: "Home", path: "/", icon: Home, category: "Main" },
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, category: "Main" },
  { id: "mobile-landing", label: "Mobile Landing", path: "/mobile-landing", icon: Globe, category: "Main" },

  // Client Portal
  { id: "client-portal", label: "Client Portal", path: "/client-portal", icon: UserCircle, category: "Client" },
  { id: "client-services", label: "Service Catalog", path: "/services", icon: Package, category: "Client", keywords: ["catalog"] },
  { id: "client-profile", label: "Profile", path: "/client-profile", icon: UserCircle, category: "Client" },
  { id: "compliance-calendar", label: "Compliance Calendar", path: "/compliance-calendar", icon: Calendar, category: "Client" },

  // Operations
  { id: "operations", label: "Operations Panel", path: "/operations", icon: Wrench, category: "Operations", keywords: ["ops"] },
  { id: "ops-manager", label: "Operations Manager", path: "/ops-manager", icon: Settings, category: "Operations" },
  { id: "qc", label: "Quality Control", path: "/qc", icon: CheckSquare, category: "Operations" },
  { id: "qc-metrics", label: "Quality Metrics", path: "/quality-metrics", icon: BarChart3, category: "Operations" },

  // Admin
  { id: "admin", label: "Admin Panel", path: "/admin", icon: Shield, category: "Admin" },
  { id: "super-admin", label: "Super Admin", path: "/super-admin", icon: Shield, category: "Admin" },
  { id: "admin-config", label: "Service Config", path: "/admin-config", icon: Settings, category: "Admin" },
  { id: "universal-admin", label: "Universal Admin", path: "/universal-admin", icon: Shield, category: "Admin" },

  // Sales & Leads
  { id: "leads", label: "Lead Management", path: "/leads", icon: UserPlus, category: "Sales" },
  { id: "proposals", label: "Proposals", path: "/proposals", icon: FileText, category: "Sales" },
  { id: "pre-sales", label: "Pre-Sales", path: "/pre-sales", icon: Target, category: "Sales" },
  { id: "referrals", label: "Referral Dashboard", path: "/referrals", icon: Award, category: "Sales", keywords: ["wallet"] },

  // Agent Portal
  { id: "agent-portal", label: "Agent Portal", path: "/agent", icon: Briefcase, category: "Agent", keywords: ["partner"] },
  { id: "agent-dashboard", label: "Agent Dashboard", path: "/agent/dashboard", icon: LayoutDashboard, category: "Agent" },
  { id: "agent-leads", label: "Agent Leads", path: "/agent/leads", icon: Users, category: "Agent" },
  { id: "agent-commissions", label: "Commissions", path: "/agent/commissions", icon: DollarSign, category: "Agent" },
  { id: "agent-performance", label: "Performance", path: "/agent/performance", icon: TrendingUp, category: "Agent" },

  // Service Requests
  { id: "service-requests", label: "Service Requests", path: "/service-requests", icon: FileText, category: "Services", keywords: ["requests", "my-requests"] },
  { id: "service-create", label: "Create Service Request", path: "/service-request/create", icon: FileText, category: "Services" },

  // Compliance & Automation
  { id: "autocomply", label: "AutoComply", path: "/autocomply", icon: Zap, category: "Compliance", keywords: ["workflows", "automation"] },
  { id: "taxtracker", label: "Tax Tracker", path: "/taxtracker", icon: DollarSign, category: "Compliance", keywords: ["tax"] },
  { id: "digiscore", label: "DigiScore", path: "/digiscore", icon: Award, category: "Compliance", keywords: ["compliance-score", "score"] },
  { id: "compliance-tracker", label: "Compliance Tracker", path: "/tracker", icon: CheckSquare, category: "Compliance" },
  { id: "compliance-scorecard", label: "Compliance Scorecard", path: "/compliance-scorecard", icon: Award, category: "Compliance", keywords: ["10k"] },

  // Tasks & Documents
  { id: "tasks", label: "Task Management", path: "/tasks", icon: CheckSquare, category: "Productivity", keywords: ["my-tasks"] },
  { id: "documents", label: "Document Preparation", path: "/documents", icon: FileText, category: "Productivity", keywords: ["ai-documents", "doc-generator"] },
  { id: "document-vault", label: "Document Vault", path: "/vault", icon: FileSpreadsheet, category: "Productivity" },

  // HR
  { id: "hr", label: "HR Dashboard", path: "/hr", icon: Users, category: "HR", keywords: ["human-resources"] },

  // Finance
  { id: "financials", label: "Financial Management", path: "/financial-management", icon: DollarSign, category: "Finance", keywords: ["revenue-analytics"] },

  // Analytics
  { id: "executive", label: "Executive Dashboard", path: "/executive-dashboard", icon: BarChart3, category: "Analytics" },
  { id: "business-intelligence", label: "Business Intelligence", path: "/business-intelligence", icon: TrendingUp, category: "Analytics", keywords: ["bi", "insights"] },

  // Onboarding
  { id: "onboarding", label: "Onboarding", path: "/onboarding", icon: UserPlus, category: "Onboarding" },
  { id: "smart-start", label: "Smart Start", path: "/smart-start", icon: Zap, category: "Onboarding" },
  { id: "whatsapp-onboarding", label: "WhatsApp Onboarding", path: "/whatsapp-onboarding", icon: MessageSquare, category: "Onboarding" },

  // Other
  { id: "customer-service", label: "Customer Service", path: "/customer-service", icon: MessageSquare, category: "Support" },
  { id: "retainership", label: "Retainership Plans", path: "/retainership", icon: Award, category: "Services" },
  { id: "master-blueprint", label: "Master Blueprint", path: "/blueprint", icon: Building2, category: "Admin", keywords: ["blueprint"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, NavigationItem[]> = {};
    navigationItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {Object.entries(groupedItems).map(([category, items], index) => (
          <div key={category}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={category}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.keywords?.join(" ") || ""}`}
                    onSelect={() => handleNavigate(item.path)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
