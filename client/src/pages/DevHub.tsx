import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Users, Building2, UserCog, ShieldCheck, Briefcase,
  FileText, BarChart3, Settings, Headphones, DollarSign,
  UserCircle, Store, Rocket, Calendar, TrendingUp, Home,
  Database, Zap, CheckSquare, Eye, Activity, Shield,
  FolderOpen, CreditCard, Lock, ClipboardList, Receipt,
  Gift, FileCheck, Bot, PenTool, ListTodo, Target,
  LayoutDashboard, Smartphone, MessageCircle, Crown,
  Package, Gauge, Award, UserCheck, PieChart, Workflow,
  Import, Map, Calculator, Clock, Sparkles
} from "lucide-react";

interface RouteInfo {
  path: string;
  name: string;
  description: string;
  role: string;
  icon: any;
  color: string;
  status: 'active' | 'beta' | 'new';
  depth: 'full' | 'partial' | 'basic';
}

const routes: RouteInfo[] = [
  // ============ CLIENT PORTALS (Full Depth) ============
  {
    path: "/lifecycle",
    name: "Lifecycle Dashboard",
    description: "8-stage journey, compliance, funding readiness, timeline",
    role: "Client - Core",
    icon: TrendingUp,
    color: "bg-indigo-600",
    status: 'new',
    depth: 'full'
  },
  {
    path: "/lifecycle/compliance",
    name: "Compliance Detail",
    description: "Monthly/Quarterly/Annual checkpoints with action center",
    role: "Client - Core",
    icon: Shield,
    color: "bg-green-600",
    status: 'new',
    depth: 'full'
  },
  {
    path: "/lifecycle/services",
    name: "Services Catalog",
    description: "96-service catalog with gap analysis & recommendations",
    role: "Client - Core",
    icon: Briefcase,
    color: "bg-blue-600",
    status: 'new',
    depth: 'full'
  },
  {
    path: "/lifecycle/documents",
    name: "Document Vault",
    description: "7-category organization with verification workflow",
    role: "Client - Core",
    icon: FileText,
    color: "bg-purple-600",
    status: 'new',
    depth: 'full'
  },
  {
    path: "/lifecycle/funding",
    name: "Funding Readiness",
    description: "Due diligence checklist with investor-ready scoring",
    role: "Client - Core",
    icon: DollarSign,
    color: "bg-emerald-600",
    status: 'new',
    depth: 'full'
  },
  {
    path: "/lifecycle/timeline",
    name: "Business Timeline",
    description: "Visual journey through 8 lifecycle stages",
    role: "Client - Core",
    icon: Activity,
    color: "bg-orange-600",
    status: 'new',
    depth: 'full'
  },
  {
    path: "/portal-v2",
    name: "Client Portal V2",
    description: "Status-first design with single action CTA",
    role: "Client - Core",
    icon: Home,
    color: "bg-blue-500",
    status: 'active',
    depth: 'full'
  },
  // CONSOLIDATED: /portal merged into /portal-v2 (responsive)
  {
    path: "/portal-v2/account",
    name: "Account Settings",
    description: "Full profile management with API integration",
    role: "Client - Account",
    icon: UserCircle,
    color: "bg-slate-600",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/portal-v2/account/businesses",
    name: "Business Management",
    description: "Multi-entity management with CRUD operations",
    role: "Client - Account",
    icon: Building2,
    color: "bg-slate-600",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/portal-v2/account/billing",
    name: "Billing & Invoices",
    description: "Complete billing history with invoice details",
    role: "Client - Account",
    icon: CreditCard,
    color: "bg-slate-600",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/portal-v2/account/documents",
    name: "Account Documents",
    description: "Document vault with categorization & verification",
    role: "Client - Account",
    icon: FolderOpen,
    color: "bg-slate-600",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/portal-v2/account/security",
    name: "Security Settings",
    description: "Password, 2FA, device management & login history",
    role: "Client - Account",
    icon: Lock,
    color: "bg-slate-600",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/client-profile",
    name: "Client Profile",
    description: "View and edit client profile information",
    role: "Client - Core",
    icon: UserCircle,
    color: "bg-blue-500",
    status: 'active',
    depth: 'basic'
  },
  {
    path: "/compliance-calendar",
    name: "Compliance Calendar",
    description: "Calendar view with real-time compliance data",
    role: "Client - Core",
    icon: Calendar,
    color: "bg-green-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/service-requests",
    name: "My Service Requests",
    description: "Full service request tracking with status & documents",
    role: "Client - Core",
    icon: ClipboardList,
    color: "bg-blue-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/service-request/create",
    name: "Create Service Request",
    description: "Request a new service",
    role: "Client - Core",
    icon: Rocket,
    color: "bg-blue-500",
    status: 'active',
    depth: 'basic'
  },
  {
    path: "/referrals",
    name: "Referrals & Wallet",
    description: "Full referral tracking with wallet & credit history",
    role: "Client - Core",
    icon: Gift,
    color: "bg-pink-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/vault",
    name: "Document Vault",
    description: "Secure document storage with backend API",
    role: "Client - Core",
    icon: FolderOpen,
    color: "bg-purple-500",
    status: 'active',
    depth: 'full'
  },

  // ============ COMPLIANCE & TAX ============
  {
    path: "/compliance-dashboard",
    name: "Compliance Dashboard",
    description: "Full compliance tracking with state engine integration",
    role: "Compliance",
    icon: Shield,
    color: "bg-green-600",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/tracker",
    name: "Compliance Tracker",
    description: "Track compliance status with state engine",
    role: "Compliance",
    icon: Target,
    color: "bg-green-600",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/taxtracker",
    name: "Tax Tracker",
    description: "GST, TDS, Income Tax tracking with real-time API",
    role: "Compliance",
    icon: Calculator,
    color: "bg-amber-600",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/digiscore",
    name: "DigiScore",
    description: "Compliance health score with backend scoring engine",
    role: "Compliance",
    icon: Gauge,
    color: "bg-emerald-600",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/autocomply",
    name: "AutoComply",
    description: "Automated compliance workflows with backend triggers",
    role: "Compliance",
    icon: Workflow,
    color: "bg-violet-600",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/10k",
    name: "Compliance Scorecard",
    description: "10K compliance readiness scorecard",
    role: "Compliance",
    icon: Award,
    color: "bg-amber-500",
    status: 'active',
    depth: 'partial'
  },

  // ============ DOCUMENTS & TASKS ============
  {
    path: "/documents",
    name: "Document Upload",
    description: "Upload and manage documents",
    role: "Documents",
    icon: FileText,
    color: "bg-purple-500",
    status: 'active',
    depth: 'basic'
  },
  {
    path: "/ai-documents",
    name: "AI Document Prep",
    description: "AI-powered document preparation",
    role: "Documents",
    icon: Bot,
    color: "bg-violet-600",
    status: 'active',
    depth: 'partial'
  },
  {
    path: "/esign-agreements",
    name: "E-Sign Agreements",
    description: "Digital signature with backend verification",
    role: "Documents",
    icon: PenTool,
    color: "bg-purple-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/tasks",
    name: "Task Management",
    description: "Full task CRUD with assignment & workflow integration",
    role: "Tasks",
    icon: ListTodo,
    color: "bg-blue-600",
    status: 'active',
    depth: 'full'
  },

  // ============ OPERATIONS (Full Depth Needed) ============
  {
    path: "/operations",
    name: "Operations Dashboard",
    description: "Consolidated task queue, service delivery, workflow tracking",
    role: "Operations",
    icon: UserCog,
    color: "bg-green-500",
    status: 'active',
    depth: 'full'
  },
  // CONSOLIDATED: /universal-ops and /operations-manager merged into /operations
  {
    path: "/qc",
    name: "Quality Control",
    description: "Full QC dashboard with review queue & checklist system",
    role: "Operations",
    icon: CheckSquare,
    color: "bg-violet-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/quality-metrics",
    name: "Quality Metrics",
    description: "Complete QC analytics with trends & reviewer stats",
    role: "Operations",
    icon: PieChart,
    color: "bg-violet-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/client-master",
    name: "Client Master",
    description: "Full client database with stats & profile management",
    role: "Operations",
    icon: Users,
    color: "bg-green-500",
    status: 'active',
    depth: 'full'
  },

  // ============ ADMIN (Full Depth Needed) ============
  {
    path: "/admin",
    name: "Admin Panel",
    description: "Consolidated user management, system config, controls",
    role: "Admin",
    icon: ShieldCheck,
    color: "bg-purple-500",
    status: 'active',
    depth: 'full'
  },
  // CONSOLIDATED: /universal-admin merged into /admin
  {
    path: "/admin-config",
    name: "Admin Service Config",
    description: "Configure services and workflows",
    role: "Admin",
    icon: Settings,
    color: "bg-purple-600",
    status: 'active',
    depth: 'partial'
  },
  {
    path: "/blueprint",
    name: "Master Blueprint",
    description: "Platform architecture and system blueprint",
    role: "Admin",
    icon: Map,
    color: "bg-indigo-600",
    status: 'active',
    depth: 'partial'
  },
  {
    path: "/workflow-import",
    name: "Workflow Import",
    description: "Import and manage workflow templates",
    role: "Admin",
    icon: Import,
    color: "bg-purple-500",
    status: 'active',
    depth: 'basic'
  },
  {
    path: "/super-admin",
    name: "Super Admin Portal",
    description: "System-wide administration & database access",
    role: "Super Admin",
    icon: Database,
    color: "bg-red-500",
    status: 'active',
    depth: 'full'
  },

  // ============ SALES & PRE-SALES ============
  {
    path: "/sales-proposals",
    name: "Sales Proposals",
    description: "Full CRUD proposals with send, stats & conversion tracking",
    role: "Sales",
    icon: FileText,
    color: "bg-orange-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/pre-sales",
    name: "Pre-Sales Manager",
    description: "Complete lead management with stats & pipeline tracking",
    role: "Sales",
    icon: Rocket,
    color: "bg-orange-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/leads",
    name: "Lead Management",
    description: "Full CRUD leads with interactions & dashboard stats",
    role: "Sales",
    icon: TrendingUp,
    color: "bg-orange-500",
    status: 'active',
    depth: 'full'
  },

  // ============ AGENT PORTAL ============
  // CONSOLIDATED: /agent-portal merged into /agent
  {
    path: "/agent",
    name: "Agent Portal",
    description: "Consolidated agent dashboard with commissions & leads",
    role: "Agent",
    icon: Users,
    color: "bg-indigo-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/agent/dashboard",
    name: "Agent Dashboard",
    description: "Agent performance overview with real-time stats API",
    role: "Agent",
    icon: LayoutDashboard,
    color: "bg-indigo-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/agent/leads",
    name: "Agent Leads",
    description: "Full CRUD lead management with pipeline tracking",
    role: "Agent",
    icon: Target,
    color: "bg-indigo-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/agent/commissions",
    name: "Commission Tracker",
    description: "Real-time commission tracking with payout history",
    role: "Agent",
    icon: Receipt,
    color: "bg-indigo-500",
    status: 'active',
    depth: 'full'
  },
  {
    path: "/agent/performance",
    name: "Agent Performance",
    description: "Performance analytics with leaderboard & rankings",
    role: "Agent",
    icon: Award,
    color: "bg-indigo-500",
    status: 'active',
    depth: 'full'
  },

  // ============ EXECUTIVE & ANALYTICS ============
  {
    path: "/executive-dashboard",
    name: "Executive Dashboard",
    description: "High-level business metrics & KPIs",
    role: "Executive",
    icon: BarChart3,
    color: "bg-slate-700",
    status: 'active',
    depth: 'partial'
  },
  {
    path: "/business-intelligence",
    name: "Business Intelligence",
    description: "Analytics, reporting, forecasting",
    role: "Executive",
    icon: TrendingUp,
    color: "bg-slate-700",
    status: 'active',
    depth: 'partial'
  },

  // ============ SUPPORT & FINANCE ============
  {
    path: "/customer-service",
    name: "Customer Service",
    description: "Support ticket management & client communication",
    role: "Support",
    icon: Headphones,
    color: "bg-teal-500",
    status: 'active',
    depth: 'basic'
  },
  {
    path: "/financial-management",
    name: "Financial Management",
    description: "Full finance dashboard with revenue & payment tracking",
    role: "Finance",
    icon: DollarSign,
    color: "bg-yellow-600",
    status: 'active',
    depth: 'full'
  },

  // ============ HR ============
  {
    path: "/hr",
    name: "HR Dashboard",
    description: "Full HR management with employees, leave & training",
    role: "HR",
    icon: Users,
    color: "bg-pink-500",
    status: 'active',
    depth: 'full'
  },

  // ============ ONBOARDING & LANDING ============
  {
    path: "/dashboard",
    name: "Unified Dashboard",
    description: "Main unified dashboard view",
    role: "Landing",
    icon: LayoutDashboard,
    color: "bg-blue-600",
    status: 'active',
    depth: 'partial'
  },
  {
    path: "/landing",
    name: "Landing Page",
    description: "Main landing page",
    role: "Landing",
    icon: Home,
    color: "bg-blue-500",
    status: 'active',
    depth: 'basic'
  },
  {
    path: "/mobile-landing",
    name: "Mobile Landing",
    description: "Mobile-responsive landing page",
    role: "Landing",
    icon: Smartphone,
    color: "bg-blue-500",
    status: 'active',
    depth: 'basic'
  },
  // CONSOLIDATED: /onboarding merged into /smart-start
  {
    path: "/smart-start",
    name: "Smart Start",
    description: "Consolidated onboarding wizard for all channels",
    role: "Onboarding",
    icon: Zap,
    color: "bg-cyan-500",
    status: 'active',
    depth: 'full'
  },
  // CONSOLIDATED: /whatsapp-onboarding is a channel option in /smart-start
  {
    path: "/founder",
    name: "Founder Lite",
    description: "Simplified founder dashboard",
    role: "Client - Core",
    icon: Crown,
    color: "bg-amber-500",
    status: 'active',
    depth: 'partial'
  },
  // CONSOLIDATED: /mobile-dashboard merged into /portal-v2 (responsive)
  {
    path: "/retainership",
    name: "Retainership Plans",
    description: "View and manage retainer subscriptions",
    role: "Client - Core",
    icon: Package,
    color: "bg-emerald-500",
    status: 'active',
    depth: 'basic'
  },
  {
    path: "/suggestions",
    name: "Smart Suggestions",
    description: "AI-powered service recommendations",
    role: "Client - Core",
    icon: Sparkles,
    color: "bg-violet-500",
    status: 'active',
    depth: 'basic'
  },

  // ============ UTILITY PAGES ============
  {
    path: "/services",
    name: "Service Catalog (Public)",
    description: "Browse available services (public view)",
    role: "Utility",
    icon: Store,
    color: "bg-cyan-500",
    status: 'active',
    depth: 'basic'
  },
  {
    path: "/design-system",
    name: "Design System",
    description: "UI component showcase",
    role: "Utility",
    icon: Eye,
    color: "bg-gray-500",
    status: 'active',
    depth: 'basic'
  },
  {
    path: "/login",
    name: "Login",
    description: "User authentication",
    role: "Auth",
    icon: Lock,
    color: "bg-gray-600",
    status: 'active',
    depth: 'basic'
  },
  {
    path: "/register",
    name: "Register",
    description: "New user registration",
    role: "Auth",
    icon: UserCheck,
    color: "bg-gray-600",
    status: 'active',
    depth: 'basic'
  },
];

export default function DevHub() {
  const [, setLocation] = useLocation();

  const groupedRoutes = routes.reduce((acc, route) => {
    if (!acc[route.role]) acc[route.role] = [];
    acc[route.role].push(route);
    return acc;
  }, {} as Record<string, RouteInfo[]>);

  const getDepthBadge = (depth: string) => {
    if (depth === 'full') return <Badge className="bg-green-100 text-green-700 border-green-300">Full Depth</Badge>;
    if (depth === 'partial') return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Partial Depth</Badge>;
    return <Badge className="bg-gray-100 text-gray-700 border-gray-300">Basic</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'new') return <Badge className="bg-blue-100 text-blue-700 border-blue-300">NEW</Badge>;
    if (status === 'beta') return <Badge className="bg-purple-100 text-purple-700 border-purple-300">BETA</Badge>;
    return null;
  };

  const depthCounts = {
    full: routes.filter(r => r.depth === 'full').length,
    partial: routes.filter(r => r.depth === 'partial').length,
    basic: routes.filter(r => r.depth === 'basic').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                🚀 Development Hub
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Platform overview with depth indicators (Auth disabled for testing)
              </p>
            </div>
            <Badge className="text-lg px-4 py-2 bg-indigo-100 text-indigo-700 border-indigo-300">
              US-Level Standards
            </Badge>
          </div>
        </div>

        {/* Architecture Note */}
        <Card className="mb-6 border-l-4 border-l-indigo-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-indigo-600" />
              Architecture Principle: Core Database + Role-Based Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-3">
              Following <strong>Carta, Stripe, Gusto</strong> standards: Single source of truth with unlimited drill-down depth. 
              Different users see different views based on access rights, but all data flows from the same core.
            </p>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span><strong>{depthCounts.full}</strong> Full Depth (5+ drill levels)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <span><strong>{depthCounts.partial}</strong> Partial Depth (needs enhancement)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-500"></div>
                <span><strong>{depthCounts.basic}</strong> Basic (surface level)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Portals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{routes.length}</div>
              <p className="text-xs text-slate-500 mt-1">Active pages</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">User Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Object.keys(groupedRoutes).length}</div>
              <p className="text-xs text-slate-500 mt-1">Different personas</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-900">Full Depth Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">{depthCounts.full}</div>
              <p className="text-xs text-green-600 mt-1">Production-ready</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-900">Need Enhancement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-700">{depthCounts.partial + depthCounts.basic}</div>
              <p className="text-xs text-yellow-600 mt-1">Requires drill-down</p>
            </CardContent>
          </Card>
        </div>

        {/* Grouped Routes */}
        <div className="space-y-6">
          {Object.entries(groupedRoutes).map(([role, roleRoutes]) => (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {role}
                  </Badge>
                  <span className="text-slate-500 text-sm font-normal">
                    ({roleRoutes.length} portal{roleRoutes.length > 1 ? 's' : ''})
                  </span>
                </CardTitle>
                <CardDescription>
                  {role === 'Client - Core' && 'Primary client-facing portals with complete drill-down capabilities'}
                  {role === 'Client - Account' && 'Account management and settings portals'}
                  {role === 'Compliance' && 'Compliance tracking, tax management, and regulatory tools'}
                  {role === 'Documents' && 'Document management, upload, and e-signature tools'}
                  {role === 'Tasks' && 'Task management and workflow tracking'}
                  {role === 'Operations' && 'Internal operations team dashboards for service delivery'}
                  {role === 'Admin' && 'Administrative control panels for system management'}
                  {role === 'Super Admin' && 'System-wide administration with database access'}
                  {role === 'Sales' && 'Sales and pre-sales tools for proposal management'}
                  {role === 'Agent' && 'Partner/agent portals for commission tracking'}
                  {role === 'Executive' && 'High-level business intelligence and analytics'}
                  {role === 'Support' && 'Customer service and support ticket management'}
                  {role === 'Finance' && 'Financial management and revenue analytics'}
                  {role === 'HR' && 'Human resources management'}
                  {role === 'Landing' && 'Main landing and dashboard pages'}
                  {role === 'Onboarding' && 'User onboarding and registration flows'}
                  {role === 'Utility' && 'Public-facing utility pages'}
                  {role === 'Auth' && 'Authentication and registration pages'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roleRoutes.map((route) => {
                    const Icon = route.icon;
                    return (
                      <Card 
                        key={route.path} 
                        className="hover:shadow-md transition-all cursor-pointer hover:scale-105"
                        onClick={() => setLocation(route.path)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className={`p-2 rounded-lg ${route.color} text-white`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            {getStatusBadge(route.status)}
                          </div>
                          <CardTitle className="text-base mt-2">{route.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {route.description}
                          </p>
                          
                          {getDepthBadge(route.depth)}
                          
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(route.path);
                            }}
                          >
                            Open Portal →
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Notes */}
        <div className="mt-8 space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>📊 Full Depth Components:</strong> Client Core (Lifecycle suite) has 5+ drill-down levels - Dashboard → Category → Item → Actions → History/Audit
            </p>
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Development Mode:</strong> Authentication is disabled. All portals are accessible without login for testing purposes.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>✨ Architecture Reference:</strong> See <code>/PLATFORM_ARCHITECTURE.md</code> for complete drill-down specifications and database schema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
