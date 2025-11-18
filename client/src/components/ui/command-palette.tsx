/**
 * Command Palette Component
 * Global search and navigation (Cmd+K / Ctrl+K)
 * Inspired by Linear, GitHub, Vercel
 */

import * as React from "react";
import { useNavigate } from "wouter";
import {
  Command,
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
  Users,
  FileText,
  Settings,
  Upload,
  Building2,
  BarChart3,
  Shield,
  Star,
  Calendar,
  DollarSign,
  Target,
  Search,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  /**
   * Additional className for styling
   */
  className?: string;
}

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  group: "navigation" | "actions" | "recent";
}

export function CommandPalette({ className }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [, navigate] = useNavigate();

  // Navigation actions
  const navigationActions: CommandAction[] = [
    {
      id: "home",
      label: "Home / Landing Page",
      description: "Go to the main landing page",
      icon: Home,
      action: () => navigate("/"),
      keywords: ["home", "start", "main"],
      group: "navigation",
    },
    {
      id: "client-portal",
      label: "Client Portal",
      description: "Access client dashboard",
      icon: Users,
      action: () => navigate("/portal"),
      keywords: ["client", "dashboard", "portal"],
      group: "navigation",
    },
    {
      id: "operations",
      label: "Operations Panel",
      description: "Team workflow and operations",
      icon: BarChart3,
      action: () => navigate("/operations"),
      keywords: ["operations", "workflow", "team"],
      group: "navigation",
    },
    {
      id: "admin",
      label: "Admin Panel",
      description: "Platform configuration and settings",
      icon: Shield,
      action: () => navigate("/admin"),
      keywords: ["admin", "settings", "config"],
      group: "navigation",
    },
    {
      id: "agent",
      label: "Agent Portal",
      description: "Partner and agent management",
      icon: Star,
      action: () => navigate("/agent"),
      keywords: ["agent", "partner", "referral"],
      group: "navigation",
    },
    {
      id: "compliance",
      label: "Compliance Dashboard",
      description: "Track compliance status and deadlines",
      icon: CheckCircle,
      action: () => navigate("/compliance-tracker"),
      keywords: ["compliance", "tracking", "deadlines"],
      group: "navigation",
    },
    {
      id: "documents",
      label: "Document Vault",
      description: "Manage and store documents",
      icon: FileText,
      action: () => navigate("/document-vault"),
      keywords: ["documents", "vault", "files"],
      group: "navigation",
    },
    {
      id: "services",
      label: "Service Catalog",
      description: "Browse available services",
      icon: Target,
      action: () => navigate("/service-selection"),
      keywords: ["services", "catalog", "offerings"],
      group: "navigation",
    },
  ];

  // Quick action commands
  const quickActions: CommandAction[] = [
    {
      id: "create-entity",
      label: "Create Business Entity",
      description: "Register a new business entity",
      icon: Plus,
      action: () => {
        navigate("/portal");
        // Trigger create entity modal
      },
      keywords: ["create", "new", "entity", "business"],
      group: "actions",
    },
    {
      id: "upload-document",
      label: "Upload Document",
      description: "Upload a new document",
      icon: Upload,
      action: () => {
        navigate("/document-vault");
      },
      keywords: ["upload", "document", "file"],
      group: "actions",
    },
    {
      id: "create-service-request",
      label: "Create Service Request",
      description: "Request a new compliance service",
      icon: FileText,
      action: () => {
        navigate("/portal");
      },
      keywords: ["service", "request", "create"],
      group: "actions",
    },
    {
      id: "view-calendar",
      label: "View Compliance Calendar",
      description: "Check upcoming deadlines",
      icon: Calendar,
      action: () => navigate("/compliance-calendar"),
      keywords: ["calendar", "deadlines", "due"],
      group: "actions",
    },
    {
      id: "financial-dashboard",
      label: "Financial Dashboard",
      description: "View revenue and invoices",
      icon: DollarSign,
      action: () => navigate("/financial-dashboard"),
      keywords: ["finance", "revenue", "invoices", "money"],
      group: "actions",
    },
  ];

  const allActions = [...navigationActions, ...quickActions];

  // Keyboard shortcut handler
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Filter actions based on search
  const filteredActions = React.useMemo(() => {
    if (!search) return allActions;

    const searchLower = search.toLowerCase();
    return allActions.filter((action) => {
      return (
        action.label.toLowerCase().includes(searchLower) ||
        action.description?.toLowerCase().includes(searchLower) ||
        action.keywords?.some((keyword) =>
          keyword.toLowerCase().includes(searchLower)
        )
      );
    });
  }, [search, allActions]);

  const handleSelect = (action: CommandAction) => {
    setOpen(false);
    setSearch("");
    action.action();
  };

  const navigationItems = filteredActions.filter((a) => a.group === "navigation");
  const actionItems = filteredActions.filter((a) => a.group === "actions");

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground",
          "border border-border rounded-md hover:bg-accent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search or jump to...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search for pages, actions, or features..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {navigationItems.length > 0 && (
            <>
              <CommandGroup heading="Navigation">
                {navigationItems.map((action) => {
                  const Icon = action.icon;
                  return (
                    <CommandItem
                      key={action.id}
                      value={action.label}
                      onSelect={() => handleSelect(action)}
                      className="cursor-pointer"
                    >
                      {Icon && <Icon className="mr-2 h-4 w-4" />}
                      <div className="flex flex-col">
                        <span>{action.label}</span>
                        {action.description && (
                          <span className="text-xs text-muted-foreground">
                            {action.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {actionItems.length > 0 && <CommandSeparator />}
            </>
          )}

          {actionItems.length > 0 && (
            <CommandGroup heading="Quick Actions">
              {actionItems.map((action) => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.id}
                    value={action.label}
                    onSelect={() => handleSelect(action)}
                    className="cursor-pointer"
                  >
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    <div className="flex flex-col">
                      <span>{action.label}</span>
                      {action.description && (
                        <span className="text-xs text-muted-foreground">
                          {action.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>

        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Press ESC to close</span>
            <div className="flex items-center gap-2">
              <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                ↑↓
              </kbd>
              <span>to navigate</span>
              <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                ↵
              </kbd>
              <span>to select</span>
            </div>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}

/**
 * Hook to programmatically trigger command palette
 */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  return {
    open,
    setOpen,
    trigger: () => setOpen(true),
  };
}
