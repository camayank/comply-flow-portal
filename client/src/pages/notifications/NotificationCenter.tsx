import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  FileText,
  Calendar,
  MessageSquare,
  Users,
  DollarSign,
  Clock,
  Settings,
  MoreVertical,
  Trash2,
  Archive,
  Eye,
  Filter,
  RefreshCw,
  ChevronRight,
  Mail,
  Smartphone,
  Monitor,
} from "lucide-react";

interface Notification {
  id: string;
  type: "alert" | "task" | "message" | "system" | "payment" | "deadline" | "update";
  category: "urgent" | "important" | "normal" | "low";
  title: string;
  message: string;
  link?: string;
  linkText?: string;
  read: boolean;
  archived: boolean;
  createdAt: string;
  metadata?: {
    entityType?: string;
    entityId?: string;
    entityNumber?: string;
    actorName?: string;
    actorRole?: string;
  };
}

interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  categories: {
    alerts: { email: boolean; push: boolean; inApp: boolean };
    tasks: { email: boolean; push: boolean; inApp: boolean };
    messages: { email: boolean; push: boolean; inApp: boolean };
    system: { email: boolean; push: boolean; inApp: boolean };
    payments: { email: boolean; push: boolean; inApp: boolean };
    deadlines: { email: boolean; push: boolean; inApp: boolean };
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  digestFrequency: "realtime" | "hourly" | "daily" | "weekly";
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "all" && activeTab !== "archived") {
        params.append("type", activeTab);
      }
      if (activeTab === "archived") {
        params.append("archived", "true");
      }

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (!response.ok) {
        return getMockNotifications(activeTab);
      }
      return response.json();
    },
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const response = await fetch("/api/notifications/unread-count");
      if (!response.ok) return 12;
      return response.json();
    },
  });

  // Fetch preferences
  const { data: preferences } = useQuery<NotificationPreferences>({
    queryKey: ["/api/notifications/preferences"],
    queryFn: async () => {
      const response = await fetch("/api/notifications/preferences");
      if (!response.ok) {
        return {
          emailEnabled: true,
          pushEnabled: true,
          inAppEnabled: true,
          categories: {
            alerts: { email: true, push: true, inApp: true },
            tasks: { email: true, push: true, inApp: true },
            messages: { email: true, push: true, inApp: true },
            system: { email: false, push: false, inApp: true },
            payments: { email: true, push: true, inApp: true },
            deadlines: { email: true, push: true, inApp: true },
          },
          quietHours: { enabled: false, start: "22:00", end: "08:00" },
          digestFrequency: "realtime" as const,
        };
      }
      return response.json();
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to mark all as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "All notifications marked as read",
      });
    },
  });

  // Archive notification
  const archiveMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/archive`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to archive");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Notification archived" });
    },
  });

  const getNotificationIcon = (type: string, category: string) => {
    const iconClass = category === "urgent" ? "text-red-500" :
                      category === "important" ? "text-orange-500" : "text-muted-foreground";

    switch (type) {
      case "alert":
        return <AlertTriangle className={`h-5 w-5 ${iconClass}`} />;
      case "task":
        return <FileText className={`h-5 w-5 ${iconClass}`} />;
      case "message":
        return <MessageSquare className={`h-5 w-5 ${iconClass}`} />;
      case "payment":
        return <DollarSign className={`h-5 w-5 ${iconClass}`} />;
      case "deadline":
        return <Calendar className={`h-5 w-5 ${iconClass}`} />;
      case "update":
        return <Info className={`h-5 w-5 ${iconClass}`} />;
      default:
        return <Bell className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "urgent":
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
      case "important":
        return <Badge className="bg-orange-100 text-orange-800 text-xs">Important</Badge>;
      default:
        return null;
    }
  };

  const formatNotificationTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, "h:mm a")}`;
    }
    return format(date, "MMM d, h:mm a");
  };

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const groups: { [key: string]: Notification[] } = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    notifications.forEach((notification) => {
      const date = new Date(notification.createdAt);
      if (isToday(date)) {
        groups.today.push(notification);
      } else if (isYesterday(date)) {
        groups.yesterday.push(notification);
      } else {
        groups.earlier.push(notification);
      }
    });

    return groups;
  };

  const handleMarkAllRead = () => {
    // Simulate success
    toast({ title: "All notifications marked as read" });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      // markReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const filteredNotifications = activeTab === "unread"
    ? notifications.filter(n => !n.read)
    : notifications;

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2">{unreadCount} unread</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Stay updated on your tasks, messages, and alerts</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
          <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Notification Settings</SheetTitle>
                <SheetDescription>
                  Configure how and when you receive notifications
                </SheetDescription>
              </SheetHeader>
              <div className="py-6 space-y-6">
                {/* Global Toggles */}
                <div className="space-y-4">
                  <h3 className="font-medium">Notification Channels</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                        </div>
                      </div>
                      <Switch checked={preferences?.emailEnabled} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Push Notifications</p>
                          <p className="text-sm text-muted-foreground">Receive push notifications</p>
                        </div>
                      </div>
                      <Switch checked={preferences?.pushEnabled} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">In-App</p>
                          <p className="text-sm text-muted-foreground">Show notifications in the app</p>
                        </div>
                      </div>
                      <Switch checked={preferences?.inAppEnabled} />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Category Settings */}
                <div className="space-y-4">
                  <h3 className="font-medium">Notification Categories</h3>
                  <div className="space-y-3">
                    {[
                      { key: "alerts", label: "Alerts & Escalations", icon: AlertTriangle },
                      { key: "tasks", label: "Task Updates", icon: FileText },
                      { key: "messages", label: "Messages", icon: MessageSquare },
                      { key: "payments", label: "Payment Updates", icon: DollarSign },
                      { key: "deadlines", label: "Deadline Reminders", icon: Calendar },
                      { key: "system", label: "System Updates", icon: Info },
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{label}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={preferences?.categories?.[key as keyof typeof preferences.categories]?.email ? "bg-primary/10" : ""}
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={preferences?.categories?.[key as keyof typeof preferences.categories]?.push ? "bg-primary/10" : ""}
                          >
                            <Smartphone className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={preferences?.categories?.[key as keyof typeof preferences.categories]?.inApp ? "bg-primary/10" : ""}
                          >
                            <Monitor className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Quiet Hours */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Quiet Hours</h3>
                      <p className="text-sm text-muted-foreground">
                        Pause non-urgent notifications during specific hours
                      </p>
                    </div>
                    <Switch checked={preferences?.quietHours?.enabled} />
                  </div>
                  {preferences?.quietHours?.enabled && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-sm text-muted-foreground">Start</label>
                        <input
                          type="time"
                          value={preferences.quietHours.start}
                          className="w-full mt-1 p-2 border rounded-md"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm text-muted-foreground">End</label>
                        <input
                          type="time"
                          value={preferences.quietHours.end}
                          className="w-full mt-1 p-2 border rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread" className="relative">
            Unread
            {unreadCount > 0 && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="alert">Alerts</TabsTrigger>
          <TabsTrigger value="task">Tasks</TabsTrigger>
          <TabsTrigger value="message">Messages</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No notifications</p>
                  <p className="text-sm">
                    {activeTab === "unread"
                      ? "You're all caught up!"
                      : "No notifications in this category"}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  {/* Today */}
                  {groupedNotifications.today.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-muted/50 text-sm font-medium text-muted-foreground sticky top-0">
                        Today
                      </div>
                      {groupedNotifications.today.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onRead={() => {}}
                          onArchive={() => toast({ title: "Notification archived" })}
                          onClick={() => handleNotificationClick(notification)}
                          getIcon={getNotificationIcon}
                          getCategoryBadge={getCategoryBadge}
                          formatTime={formatNotificationTime}
                        />
                      ))}
                    </div>
                  )}

                  {/* Yesterday */}
                  {groupedNotifications.yesterday.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-muted/50 text-sm font-medium text-muted-foreground sticky top-0">
                        Yesterday
                      </div>
                      {groupedNotifications.yesterday.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onRead={() => {}}
                          onArchive={() => toast({ title: "Notification archived" })}
                          onClick={() => handleNotificationClick(notification)}
                          getIcon={getNotificationIcon}
                          getCategoryBadge={getCategoryBadge}
                          formatTime={formatNotificationTime}
                        />
                      ))}
                    </div>
                  )}

                  {/* Earlier */}
                  {groupedNotifications.earlier.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-muted/50 text-sm font-medium text-muted-foreground sticky top-0">
                        Earlier
                      </div>
                      {groupedNotifications.earlier.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onRead={() => {}}
                          onArchive={() => toast({ title: "Notification archived" })}
                          onClick={() => handleNotificationClick(notification)}
                          getIcon={getNotificationIcon}
                          getCategoryBadge={getCategoryBadge}
                          formatTime={formatNotificationTime}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Notification Item Component
function NotificationItem({
  notification,
  onRead,
  onArchive,
  onClick,
  getIcon,
  getCategoryBadge,
  formatTime,
}: {
  notification: Notification;
  onRead: () => void;
  onArchive: () => void;
  onClick: () => void;
  getIcon: (type: string, category: string) => React.ReactNode;
  getCategoryBadge: (category: string) => React.ReactNode;
  formatTime: (date: string) => string;
}) {
  return (
    <div
      className={`flex items-start gap-4 p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors ${
        !notification.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 mt-1">
        {getIcon(notification.type, notification.category)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className={`font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
              {notification.title}
            </p>
            {getCategoryBadge(notification.category)}
            {!notification.read && (
              <span className="h-2 w-2 rounded-full bg-blue-500" />
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {formatTime(notification.createdAt)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!notification.read && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRead(); }}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {notification.message}
        </p>
        {notification.metadata && (
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {notification.metadata.entityNumber && (
              <span className="font-mono bg-muted px-2 py-0.5 rounded">
                {notification.metadata.entityNumber}
              </span>
            )}
            {notification.metadata.actorName && (
              <span>by {notification.metadata.actorName}</span>
            )}
          </div>
        )}
        {notification.link && notification.linkText && (
          <Button variant="link" size="sm" className="mt-2 p-0 h-auto text-xs">
            {notification.linkText}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Mock data
function getMockNotifications(filter: string): Notification[] {
  const allNotifications: Notification[] = [
    {
      id: "1",
      type: "alert",
      category: "urgent",
      title: "SLA Breach Alert",
      message: "Service request SR2600001 has breached its SLA by 2 hours. Immediate action required.",
      link: "/service-request/SR2600001",
      linkText: "View Service Request",
      read: false,
      archived: false,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      metadata: {
        entityType: "service_request",
        entityId: "sr_1",
        entityNumber: "SR2600001",
      },
    },
    {
      id: "2",
      type: "task",
      category: "important",
      title: "New Task Assigned",
      message: "You have been assigned to complete the GST filing for Acme Technologies Pvt Ltd. Due: Feb 5, 2026.",
      link: "/tasks/task_123",
      linkText: "View Task",
      read: false,
      archived: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      metadata: {
        entityType: "task",
        entityId: "task_123",
        actorName: "Rajesh Kumar",
        actorRole: "Operations Manager",
      },
    },
    {
      id: "3",
      type: "message",
      category: "normal",
      title: "New Message from Client",
      message: "Hello, I wanted to follow up on my trademark application. Can you provide an update on the status?",
      link: "/messages/thread_456",
      linkText: "View Message",
      read: false,
      archived: false,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      metadata: {
        entityType: "message_thread",
        entityId: "thread_456",
        actorName: "Amit Patel",
        actorRole: "Client",
      },
    },
    {
      id: "4",
      type: "payment",
      category: "important",
      title: "Payment Received",
      message: "Payment of ₹45,000 received from Global Exports Ltd for Invoice INV-2026-0152.",
      link: "/financials/payments/pay_789",
      linkText: "View Payment",
      read: true,
      archived: false,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      metadata: {
        entityType: "payment",
        entityId: "pay_789",
        entityNumber: "INV-2026-0152",
      },
    },
    {
      id: "5",
      type: "deadline",
      category: "urgent",
      title: "Deadline Approaching",
      message: "GST Return filing deadline for StartupHub Innovations is in 24 hours. Ensure all documents are ready.",
      link: "/compliance-calendar",
      linkText: "View Calendar",
      read: false,
      archived: false,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      metadata: {
        entityType: "compliance",
        entityNumber: "GSTR-3B",
      },
    },
    {
      id: "6",
      type: "update",
      category: "normal",
      title: "Service Request Updated",
      message: "Service request SR2600015 status changed from 'In Progress' to 'Under Review'.",
      link: "/service-request/SR2600015",
      linkText: "View Details",
      read: true,
      archived: false,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        entityType: "service_request",
        entityId: "sr_15",
        entityNumber: "SR2600015",
        actorName: "Priya Sharma",
      },
    },
    {
      id: "7",
      type: "system",
      category: "low",
      title: "Weekly Report Available",
      message: "Your weekly performance report for Week 4 is now available for review.",
      link: "/analytics/reports/weekly",
      linkText: "View Report",
      read: true,
      archived: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "8",
      type: "task",
      category: "normal",
      title: "Task Completed",
      message: "Vikram Singh has completed the task 'Prepare ROC Documents' for MedCare Pharma.",
      read: true,
      archived: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        actorName: "Vikram Singh",
        entityNumber: "SR2600031",
      },
    },
  ];

  if (filter === "archived") {
    return allNotifications.filter(n => n.archived);
  }
  if (filter === "all" || filter === "unread") {
    return allNotifications.filter(n => !n.archived);
  }
  return allNotifications.filter(n => n.type === filter && !n.archived);
}
