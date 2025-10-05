import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  Users, 
  UserPlus, 
  Settings, 
  Database, 
  Activity,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Search,
  Filter,
  Crown,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  FileText,
  Clock,
  TrendingUp
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const USER_ROLES = {
  super_admin: { label: 'Super Admin', color: 'bg-purple-500', icon: Crown },
  admin: { label: 'Admin', color: 'bg-blue-500', icon: Shield },
  ops_executive: { label: 'Operations Executive', color: 'bg-green-500', icon: Users },
  customer_service: { label: 'Customer Service', color: 'bg-yellow-500', icon: Activity },
  agent: { label: 'Agent', color: 'bg-orange-500', icon: TrendingUp },
  client: { label: 'Client', color: 'bg-gray-500', icon: Users }
};

const PERMISSIONS = [
  { id: 'user_management', label: 'User Management', category: 'Admin' },
  { id: 'role_assignment', label: 'Role Assignment', category: 'Admin' },
  { id: 'service_config', label: 'Service Configuration', category: 'Admin' },
  { id: 'workflow_management', label: 'Workflow Management', category: 'Admin' },
  { id: 'financial_access', label: 'Financial Access', category: 'Finance' },
  { id: 'client_data_access', label: 'Client Data Access', category: 'Operations' },
  { id: 'document_approval', label: 'Document Approval', category: 'Operations' },
  { id: 'task_assignment', label: 'Task Assignment', category: 'Operations' },
  { id: 'report_generation', label: 'Report Generation', category: 'Analytics' },
  { id: 'system_settings', label: 'System Settings', category: 'Admin' },
];

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  department: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  clientUsers: number;
  agentUsers: number;
  recentActivity: number;
  systemHealth: string;
}

export default function SuperAdminPortal() {
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  // Fetch system stats
  const { data: systemStats } = useQuery<SystemStats>({
    queryKey: ['/api/super-admin/stats'],
  });

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/super-admin/users', { search: searchTerm, role: roleFilter }],
  });

  // Fetch activity logs
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['/api/super-admin/activity-logs'],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return await apiRequest('/api/super-admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/stats'] });
      setIsCreateUserDialogOpen(false);
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: any }) => {
      return await apiRequest(`/api/super-admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      setIsEditUserDialogOpen(false);
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
    },
  });

  // Toggle user status mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest(`/api/super-admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      toast({
        title: 'Success',
        description: 'User status updated',
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/super-admin/users/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/stats'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData = {
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password'),
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      role: formData.get('role'),
      department: formData.get('department'),
    };
    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    const formData = new FormData(e.currentTarget);
    const userData = {
      email: formData.get('email'),
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      role: formData.get('role'),
      department: formData.get('department'),
    };
    updateUserMutation.mutate({ id: selectedUser.id, userData });
  };

  const handleToggleStatus = (user: User) => {
    if (confirm(`Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.fullName}?`)) {
      toggleUserStatusMutation.mutate({ id: user.id, isActive: !user.isActive });
    }
  };

  const handleDeleteUser = (user: User) => {
    if (confirm(`Are you sure you want to delete ${user.fullName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold dark:text-white">Super Admin Control Panel</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">System-wide management and configuration</p>
              </div>
            </div>
            <Button onClick={() => setIsCreateUserDialogOpen(true)} data-testid="button-create-user">
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* System Stats */}
        {systemStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="stat-total-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats.activeUsers} active
                </p>
              </CardContent>
            </Card>

            <Card data-testid="stat-admin-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.adminUsers}</div>
              </CardContent>
            </Card>

            <Card data-testid="stat-client-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.clientUsers}</div>
              </CardContent>
            </Card>

            <Card data-testid="stat-system-health">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{systemStats.systemHealth}</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats.recentActivity} recent activities
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="roles" data-testid="tab-roles">
              <Shield className="h-4 w-4 mr-2" />
              Roles & Permissions
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Activity className="h-4 w-4 mr-2" />
              Activity Logs
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage all system users and their access</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                        data-testid="input-search-users"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-48" data-testid="select-role-filter">
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All roles</SelectItem>
                        {Object.entries(USER_ROLES).map(([key, role]) => (
                          <SelectItem key={key} value={key}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : (
                  <div className="space-y-4">
                    {filteredUsers.map((user) => {
                      const roleInfo = USER_ROLES[user.role as keyof typeof USER_ROLES];
                      const RoleIcon = roleInfo?.icon || Users;
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          data-testid={`user-item-${user.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${roleInfo?.color || 'bg-gray-500'} bg-opacity-10`}>
                              <RoleIcon className={`h-5 w-5 ${roleInfo?.color ? roleInfo.color.replace('bg-', 'text-') : 'text-gray-500'}`} />
                            </div>
                            <div>
                              <h3 className="font-medium dark:text-white">{user.fullName}</h3>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge className={roleInfo?.color}>{roleInfo?.label}</Badge>
                                {user.department && <Badge variant="outline">{user.department}</Badge>}
                                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditUserDialogOpen(true);
                              }}
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(user)}
                              data-testid={`button-toggle-status-${user.id}`}
                            >
                              {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles & Permissions Tab */}
          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Role-Based Access Control</CardTitle>
                <CardDescription>Configure permissions for each user role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(USER_ROLES).map(([roleKey, roleInfo]) => (
                    <div key={roleKey} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${roleInfo.color} bg-opacity-10`}>
                          <roleInfo.icon className={`h-5 w-5 ${roleInfo.color.replace('bg-', 'text-')}`} />
                        </div>
                        <div>
                          <h3 className="font-medium dark:text-white">{roleInfo.label}</h3>
                          <p className="text-sm text-gray-500">Configure permissions for this role</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {PERMISSIONS.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Switch id={`${roleKey}-${permission.id}`} />
                            <Label htmlFor={`${roleKey}-${permission.id}`} className="text-sm cursor-pointer">
                              {permission.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Activity Logs</CardTitle>
                <CardDescription>Monitor all system activities and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(activityLogs as any[]).length > 0 ? (
                    (activityLogs as any[]).map((log: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm dark:text-white">{log.action}</p>
                          <p className="text-xs text-gray-500">{log.user} • {log.timestamp}</p>
                        </div>
                        <Badge>{log.status}</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">No activity logs available</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>Manage global system settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    System settings are critical. Changes here affect all users. Proceed with caution.
                  </AlertDescription>
                </Alert>
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium dark:text-white">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-500">Require 2FA for all admin users</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium dark:text-white">Session Timeout</h4>
                      <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                    </div>
                    <Select defaultValue="3600">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1800">30 min</SelectItem>
                        <SelectItem value="3600">1 hour</SelectItem>
                        <SelectItem value="7200">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium dark:text-white">Email Notifications</h4>
                      <p className="text-sm text-gray-500">Send system notifications</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system with specific role and permissions</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input id="username" name="username" required data-testid="input-username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required data-testid="input-email" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" name="fullName" required data-testid="input-fullName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" data-testid="input-phone" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select name="role" required>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USER_ROLES).map(([key, role]) => (
                      <SelectItem key={key} value={key}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select name="department">
                  <SelectTrigger data-testid="select-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_sales">Pre-Sales</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="qc">Quality Control</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit-create-user">
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" name="email" type="email" defaultValue={selectedUser.email} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-fullName">Full Name</Label>
                  <Input id="edit-fullName" name="fullName" defaultValue={selectedUser.fullName} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" name="phone" defaultValue={selectedUser.phone || ''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select name="role" defaultValue={selectedUser.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(USER_ROLES).map(([key, role]) => (
                        <SelectItem key={key} value={key}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <Select name="department" defaultValue={selectedUser.department || ''}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre_sales">Pre-Sales</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="qc">Quality Control</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
