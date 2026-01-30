import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  Plus,
  MoreVertical,
  Archive,
  Star,
  StarOff,
  CheckCircle,
  Clock,
  User,
  Users,
  Lock,
  RefreshCw,
  ChevronLeft,
  FileText,
  Image,
  File,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

interface Thread {
  id: string;
  subject: string;
  entityType: "service_request" | "general" | "support" | "billing";
  entityId?: string;
  entityNumber?: string;
  participants: Participant[];
  lastMessage: Message;
  unreadCount: number;
  starred: boolean;
  archived: boolean;
  status: "open" | "resolved" | "pending_client" | "pending_ops";
  createdAt: string;
  updatedAt: string;
}

interface Participant {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  isClient: boolean;
}

interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  content: string;
  isInternal: boolean;
  attachments: Attachment[];
  readBy: string[];
  createdAt: string;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export default function MessageCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [newMessage, setNewMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isNewThreadDialogOpen, setIsNewThreadDialogOpen] = useState(false);
  const [newThreadData, setNewThreadData] = useState({
    subject: "",
    entityType: "general",
    entityId: "",
    message: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isClient = user?.role === "client";
  const isOpsTeam = ["ops_manager", "ops_executive", "admin", "super_admin"].includes(user?.role || "");

  // Fetch threads
  const { data: threads = [], isLoading: isLoadingThreads } = useQuery<Thread[]>({
    queryKey: ["/api/messages/threads", filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);

      const response = await fetch(`/api/messages/threads?${params.toString()}`);
      if (!response.ok) {
        return getMockThreads(isClient);
      }
      return response.json();
    },
  });

  // Fetch messages for selected thread
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages/threads", selectedThread?.id, "messages"],
    enabled: !!selectedThread,
    queryFn: async () => {
      if (!selectedThread) return [];
      const response = await fetch(`/api/messages/threads/${selectedThread.id}/messages`);
      if (!response.ok) {
        return getMockMessages(selectedThread.id, isClient);
      }
      return response.json();
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { threadId: string; content: string; isInternal: boolean }) => {
      const response = await fetch(`/api/messages/threads/${data.threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/threads"] });
      setNewMessage("");
      setIsInternalNote(false);
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedThread) return;

    // Simulate success for demo
    toast({
      title: isInternalNote ? "Internal note added" : "Message sent",
      description: isInternalNote
        ? "Only your team members can see this note."
        : "Your message has been delivered.",
    });
    setNewMessage("");
    setIsInternalNote(false);
  };

  const handleCreateThread = () => {
    // Simulate thread creation
    toast({
      title: "Conversation started",
      description: "Your message has been sent to the support team.",
    });
    setIsNewThreadDialogOpen(false);
    setNewThreadData({ subject: "", entityType: "general", entityId: "", message: "" });
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    }
    return format(date, "MMM d, h:mm a");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-100 text-green-800">Open</Badge>;
      case "pending_client":
        return <Badge className="bg-yellow-100 text-yellow-800">Awaiting Client</Badge>;
      case "pending_ops":
        return <Badge className="bg-blue-100 text-blue-800">Awaiting Response</Badge>;
      case "resolved":
        return <Badge variant="outline">Resolved</Badge>;
      default:
        return null;
    }
  };

  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      thread.subject.toLowerCase().includes(query) ||
      thread.entityNumber?.toLowerCase().includes(query) ||
      thread.participants.some((p) => p.name.toLowerCase().includes(query))
    );
  });

  const unreadCount = threads.filter((t) => t.unreadCount > 0).length;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Messages
              {unreadCount > 0 && (
                <Badge className="ml-2">{unreadCount} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              {isClient ? "Communicate with your service team" : "Manage client communications"}
            </p>
          </div>
          <Dialog open={isNewThreadDialogOpen} onOpenChange={setIsNewThreadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Start New Conversation</DialogTitle>
                <DialogDescription>
                  Send a message to the support team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={newThreadData.subject}
                    onChange={(e) => setNewThreadData({ ...newThreadData, subject: e.target.value })}
                    placeholder="Brief description of your inquiry"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newThreadData.entityType}
                    onValueChange={(value) => setNewThreadData({ ...newThreadData, entityType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="service_request">Service Request</SelectItem>
                      <SelectItem value="support">Technical Support</SelectItem>
                      <SelectItem value="billing">Billing Question</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newThreadData.entityType === "service_request" && (
                  <div className="space-y-2">
                    <Label>Service Request Number (optional)</Label>
                    <Input
                      value={newThreadData.entityId}
                      onChange={(e) => setNewThreadData({ ...newThreadData, entityId: e.target.value })}
                      placeholder="e.g., SR2600001"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={newThreadData.message}
                    onChange={(e) => setNewThreadData({ ...newThreadData, message: e.target.value })}
                    placeholder="Type your message here..."
                    rows={5}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewThreadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateThread}
                  disabled={!newThreadData.subject.trim() || !newThreadData.message.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thread List */}
        <div className={`w-96 border-r flex flex-col bg-background ${selectedThread ? "hidden md:flex" : "flex"}`}>
          {/* Search & Filter */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={filterStatus} onValueChange={setFilterStatus}>
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="pending_ops">Pending</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Thread List */}
          <ScrollArea className="flex-1">
            {isLoadingThreads ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No conversations</p>
                <p className="text-sm">Start a new conversation to get help</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedThread?.id === thread.id ? "bg-muted" : ""
                    } ${thread.unreadCount > 0 ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                    onClick={() => setSelectedThread(thread)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {thread.participants[0]?.name.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium truncate ${thread.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                            {thread.subject}
                          </p>
                          {thread.starred && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                        {thread.entityNumber && (
                          <p className="text-xs font-mono text-muted-foreground">
                            {thread.entityNumber}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {thread.lastMessage.senderName}: {thread.lastMessage.content}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatMessageTime(thread.updatedAt)}
                          </span>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(thread.status)}
                            {thread.unreadCount > 0 && (
                              <Badge className="bg-primary text-primary-foreground text-xs">
                                {thread.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Message View */}
        <div className={`flex-1 flex flex-col ${!selectedThread ? "hidden md:flex" : "flex"}`}>
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="px-6 py-4 border-b bg-background">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setSelectedThread(null)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold">{selectedThread.subject}</h2>
                      {getStatusBadge(selectedThread.status)}
                    </div>
                    {selectedThread.entityNumber && (
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedThread.entityNumber}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      {selectedThread.starred ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Archive className="h-4 w-4" />
                    </Button>
                    {selectedThread.status !== "resolved" && (
                      <Button variant="outline" size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
                {/* Participants */}
                <div className="flex items-center gap-2 mt-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex -space-x-2">
                    {selectedThread.participants.slice(0, 5).map((participant) => (
                      <Avatar key={participant.id} className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs">
                          {participant.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedThread.participants.map((p) => p.name).join(", ")}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-6">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((message, index) => {
                      const isOwn = message.senderId === user?.id || message.senderRole === user?.role;
                      const showDateSeparator = index === 0 ||
                        new Date(message.createdAt).toDateString() !==
                        new Date(messages[index - 1].createdAt).toDateString();

                      return (
                        <div key={message.id}>
                          {showDateSeparator && (
                            <div className="flex items-center gap-4 my-6">
                              <Separator className="flex-1" />
                              <span className="text-xs text-muted-foreground">
                                {isToday(new Date(message.createdAt))
                                  ? "Today"
                                  : isYesterday(new Date(message.createdAt))
                                  ? "Yesterday"
                                  : format(new Date(message.createdAt), "MMMM d, yyyy")}
                              </span>
                              <Separator className="flex-1" />
                            </div>
                          )}

                          <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback>
                                {message.senderName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                              <div className={`flex items-center gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                                <span className="text-sm font-medium">{message.senderName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(message.createdAt), "h:mm a")}
                                </span>
                                {message.isInternal && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Lock className="h-3 w-3" />
                                    Internal
                                  </Badge>
                                )}
                              </div>
                              <div
                                className={`p-3 rounded-lg ${
                                  message.isInternal
                                    ? "bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800"
                                    : isOwn
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>
                              {message.attachments.length > 0 && (
                                <div className={`flex flex-wrap gap-2 mt-2 ${isOwn ? "justify-end" : ""}`}>
                                  {message.attachments.map((attachment) => (
                                    <Button
                                      key={attachment.id}
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                    >
                                      <File className="h-4 w-4" />
                                      <span className="truncate max-w-[150px]">{attachment.name}</span>
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-background">
                {isOpsTeam && (
                  <div className="flex items-center gap-2 mb-3">
                    <Switch
                      id="internal-note"
                      checked={isInternalNote}
                      onCheckedChange={setIsInternalNote}
                    />
                    <Label htmlFor="internal-note" className="flex items-center gap-2 text-sm">
                      {isInternalNote ? (
                        <>
                          <Lock className="h-4 w-4 text-yellow-600" />
                          <span className="text-yellow-600">Internal note (only visible to team)</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          <span>Visible to client</span>
                        </>
                      )}
                    </Label>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isInternalNote ? "Add an internal note..." : "Type your message..."}
                    className={`min-h-[80px] flex-1 ${isInternalNote ? "border-yellow-300 focus:border-yellow-500" : ""}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className={isInternalNote ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm">Choose from your existing conversations or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mock data
function getMockThreads(isClient: boolean): Thread[] {
  return [
    {
      id: "thread_1",
      subject: "Question about GST Filing",
      entityType: "service_request",
      entityId: "sr_1",
      entityNumber: "SR2600001",
      participants: [
        { id: "1", name: isClient ? "DigiComply Support" : "Acme Technologies", role: isClient ? "Support" : "Client", isClient: !isClient },
        { id: "2", name: isClient ? "Priya Sharma" : "You", role: isClient ? "Operations Executive" : "Operations", isClient: false },
      ],
      lastMessage: {
        id: "msg_1",
        threadId: "thread_1",
        senderId: "1",
        senderName: isClient ? "Priya Sharma" : "Amit Patel",
        senderRole: isClient ? "Operations Executive" : "Client",
        content: "I have uploaded the documents. Please review and let me know if anything else is needed.",
        isInternal: false,
        attachments: [],
        readBy: [],
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      unreadCount: 2,
      starred: true,
      archived: false,
      status: "open",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: "thread_2",
      subject: "Trademark Application Status",
      entityType: "service_request",
      entityId: "sr_2",
      entityNumber: "SR2600015",
      participants: [
        { id: "3", name: isClient ? "DigiComply Support" : "Global Exports Ltd", role: isClient ? "Support" : "Client", isClient: !isClient },
      ],
      lastMessage: {
        id: "msg_2",
        threadId: "thread_2",
        senderId: "3",
        senderName: isClient ? "Support Team" : "Rahul Mehta",
        senderRole: isClient ? "Support" : "Client",
        content: "When can I expect the application to be filed?",
        isInternal: false,
        attachments: [],
        readBy: [],
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
      unreadCount: 1,
      starred: false,
      archived: false,
      status: "pending_ops",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "thread_3",
      subject: "Invoice Clarification",
      entityType: "billing",
      participants: [
        { id: "4", name: isClient ? "Billing Team" : "StartupHub Innovations", role: isClient ? "Billing" : "Client", isClient: !isClient },
      ],
      lastMessage: {
        id: "msg_3",
        threadId: "thread_3",
        senderId: "4",
        senderName: "You",
        senderRole: "User",
        content: "Thank you for the clarification. The invoice has been approved for payment.",
        isInternal: false,
        attachments: [],
        readBy: ["1", "4"],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      unreadCount: 0,
      starred: false,
      archived: false,
      status: "resolved",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function getMockMessages(threadId: string, isClient: boolean): Message[] {
  if (threadId === "thread_1") {
    return [
      {
        id: "msg_1_1",
        threadId: "thread_1",
        senderId: isClient ? "client_1" : "ops_1",
        senderName: isClient ? "You" : "Acme Technologies",
        senderRole: isClient ? "Client" : "Client",
        content: "Hi, I have a question about my GST filing. The deadline is approaching and I wanted to confirm the status.",
        isInternal: false,
        attachments: [],
        readBy: ["ops_1", "client_1"],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "msg_1_2",
        threadId: "thread_1",
        senderId: "ops_1",
        senderName: "Priya Sharma",
        senderRole: "Operations Executive",
        content: "Hello! Thank you for reaching out. I can see your GST filing is currently in progress. We need a few additional documents:\n\n1. Bank statement for January 2026\n2. Purchase invoices summary\n\nCould you please upload these at your earliest convenience?",
        isInternal: false,
        attachments: [],
        readBy: ["client_1"],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      },
      ...(!isClient ? [{
        id: "msg_1_3",
        threadId: "thread_1",
        senderId: "ops_2",
        senderName: "Rajesh Kumar",
        senderRole: "Operations Manager",
        content: "Priya, please ensure we complete this before the 5th. Client is on premium plan.",
        isInternal: true,
        attachments: [],
        readBy: ["ops_1"],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }] : []),
      {
        id: "msg_1_4",
        threadId: "thread_1",
        senderId: isClient ? "client_1" : "ops_1",
        senderName: isClient ? "You" : "Acme Technologies",
        senderRole: isClient ? "Client" : "Client",
        content: "I have uploaded the documents. Please review and let me know if anything else is needed.",
        isInternal: false,
        attachments: [
          { id: "att_1", name: "Bank_Statement_Jan2026.pdf", type: "application/pdf", size: 245000, url: "#" },
          { id: "att_2", name: "Purchase_Summary.xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 52000, url: "#" },
        ],
        readBy: [],
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ];
  }

  return [
    {
      id: "msg_default",
      threadId,
      senderId: "user_1",
      senderName: "Support Team",
      senderRole: "Support",
      content: "How can we help you today?",
      isInternal: false,
      attachments: [],
      readBy: [],
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
  ];
}
