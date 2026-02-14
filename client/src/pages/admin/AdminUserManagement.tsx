/**
 * Admin User Management Page
 *
 * Admin interface for managing users:
 * - Create, edit, activate/deactivate users
 * - Filter by role and status
 * - Reset user passwords
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout, PageShell } from '@/components/v3';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Users,
  Plus,
  Edit,
  UserCheck,
  UserX,
  Key,
  Search,
  Filter,
  Settings,
  LayoutDashboard,
  Building2,
  Briefcase,
  FileBarChart,
  Workflow,
  Webhook,
  KeyRound,
  Shield,
} from 'lucide-react';

// Admin navigation for v3 layout
const adminNavigation = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Reports", href: "/admin/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Clients", href: "/admin/clients", icon: Building2 },
      { label: "Services", href: "/admin/services", icon: Briefcase },
      { label: "Blueprints", href: "/admin/blueprints", icon: Workflow },
    ],
  },
  {
    title: "Developer",
    items: [
      { label: "Webhooks", href: "/admin/webhooks", icon: Webhook },
      { label: "API Keys", href: "/admin/api-keys", icon: KeyRound },
      { label: "Access Reviews", href: "/admin/access-reviews", icon: Shield },
    ],
  },
];

// Allowed roles for user management (restricted set)
const ALLOWED_ROLES = [
  { value: 'ops_manager', label: 'Operations Manager' },
  { value: 'ops_executive', label: 'Operations Executive' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'qc_executive', label: 'QC Executive' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'agent', label: 'Agent' },
  { value: 'client', label: 'Client' },
];

// Role badge colors mapping
const ROLE_COLORS: Record<string, string> = {
  ops_manager: 'bg-purple-100 text-purple-800 border-purple-200',
  ops_executive: 'bg-blue-100 text-blue-800 border-blue-200',
  customer_service: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  qc_executive: 'bg-orange-100 text-orange-800 border-orange-200',
  accountant: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  agent: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  client: 'bg-slate-100 text-slate-800 border-slate-200',
};

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface CreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

interface EditUserForm {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function AdminUserManagement() {
  const { toast } = useToast();
  const queryClientInstance = useQueryClient();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: '',
  });

  const [editForm, setEditForm] = useState<EditUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
  });

  const [newPassword, setNewPassword] = useState('');

  // Fetch users query
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['/api/admin/manage/users'],
  });

  const users = (usersData as any)?.users || [];

  // Filter users based on search, role, and status
  const filteredUsers = users.filter((user: User) => {
    const matchesSearch =
      searchQuery === '' ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      return apiRequest<User>('/api/admin/manage/users', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['/api/admin/manage/users'] });
      setIsCreateDialogOpen(false);
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: '',
      });
      toast({
        title: 'User Created',
        description: 'The new user has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    },
  });

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EditUserForm }) => {
      return apiRequest<User>(`/api/admin/manage/users/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['/api/admin/manage/users'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: 'User Updated',
        description: 'The user has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    },
  });

  // Activate user mutation
  const activateUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/manage/users/${id}/activate`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['/api/admin/manage/users'] });
      toast({
        title: 'User Activated',
        description: 'The user has been activated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate user',
        variant: 'destructive',
      });
    },
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/manage/users/${id}/deactivate`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['/api/admin/manage/users'] });
      toast({
        title: 'User Deactivated',
        description: 'The user has been deactivated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to deactivate user',
        variant: 'destructive',
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      return apiRequest(`/api/admin/manage/users/${id}/reset-password`, {
        method: 'POST',
        body: { password },
      });
    },
    onSuccess: () => {
      setIsResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      toast({
        title: 'Password Reset',
        description: 'The user password has been reset successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    },
  });

  // Handle edit user click
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
    setIsEditDialogOpen(true);
  };

  // Handle reset password click
  const handleResetPasswordClick = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsResetPasswordDialogOpen(true);
  };

  // Get role label
  const getRoleLabel = (roleValue: string) => {
    const role = ALLOWED_ROLES.find((r) => r.value === roleValue);
    return role?.label || roleValue;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const adminUser = { name: "Admin", email: "admin@digicomply.com" };

  return (
    <DashboardLayout
      navigation={adminNavigation}
      user={adminUser}
      logo={
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <span className="text-lg font-bold text-slate-900">DigiComply</span>
        </div>
      }
    >
      <PageShell
        title="User Management"
        subtitle="Create and manage user accounts"
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Users" }]}
        actions={
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        }
      >
        <div className="space-y-6">

        {/* Filter Bar */}
        <Card className="border-blue-100">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                  Search
                </Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="w-[200px]">
                <Label htmlFor="roleFilter" className="text-sm font-medium text-gray-700">
                  Role
                </Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {ALLOWED_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-[150px]">
                <Label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-blue-100">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
            <CardTitle className="text-blue-900">Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: User) => (
                    <TableRow key={user.id} className="hover:bg-blue-50/50">
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-gray-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}
                        >
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(user.lastLoginAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Edit Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(user)}
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          {/* Activate/Deactivate Button */}
                          {user.isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deactivateUserMutation.mutate(user.id)}
                              disabled={deactivateUserMutation.isPending}
                              title="Deactivate User"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => activateUserMutation.mutate(user.id)}
                              disabled={activateUserMutation.isPending}
                              title="Activate User"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Reset Password Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetPasswordClick(user)}
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New User
              </DialogTitle>
              <DialogDescription>
                Create a new user account with the specified details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={createForm.firstName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, firstName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={createForm.lastName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter a secure password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createUserMutation.mutate(createForm)}
                disabled={
                  createUserMutation.isPending ||
                  !createForm.firstName ||
                  !createForm.lastName ||
                  !createForm.email ||
                  !createForm.password ||
                  !createForm.role
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Edit User
              </DialogTitle>
              <DialogDescription>
                Update user account details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input
                    id="editFirstName"
                    placeholder="John"
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, firstName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input
                    id="editLastName"
                    placeholder="Doe"
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedUser &&
                  editUserMutation.mutate({ id: selectedUser.id, data: editForm })
                }
                disabled={
                  editUserMutation.isPending ||
                  !editForm.firstName ||
                  !editForm.lastName ||
                  !editForm.email ||
                  !editForm.role
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog
          open={isResetPasswordDialogOpen}
          onOpenChange={setIsResetPasswordDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Reset Password
              </DialogTitle>
              <DialogDescription>
                Reset password for {selectedUser?.firstName} {selectedUser?.lastName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsResetPasswordDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedUser &&
                  resetPasswordMutation.mutate({
                    id: selectedUser.id,
                    password: newPassword,
                  })
                }
                disabled={resetPasswordMutation.isPending || !newPassword}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}
