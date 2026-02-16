/**
 * Team Assignment Dashboard
 *
 * Visual workload management for ops managers:
 * - Team member capacity and workload
 * - Drag-drop or bulk assignment
 * - Performance metrics per team member
 * - Overload alerts
 */

import { useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { useAuth } from '@/hooks/use-auth';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { get, post } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  activeItems: number;
  capacity: number;
  utilizationPercent: number;
  avgCompletionTime: number;
  slaCompliancePercent: number;
  qualityScore: number;
  status: 'available' | 'busy' | 'overloaded' | 'offline';
}

interface UnassignedItem {
  id: number;
  requestId: string;
  clientName: string;
  serviceType: string;
  priority: string;
  createdAt: string;
  slaDeadline: string;
  slaHoursRemaining: number;
}

interface TeamWorkload {
  teamMembers: TeamMember[];
  unassignedItems: UnassignedItem[];
  totalCapacity: number;
  totalAssigned: number;
  teamUtilization: number;
}

const navigation = [
  { label: 'Dashboard', href: '/operations' },
  { label: 'Work Queue', href: '/work-queue' },
  { label: 'Team Assignment', href: '/ops/team' },
  { label: 'Performance', href: '/ops/performance' },
];

export default function TeamAssignmentDashboard() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const workloadQuery = useStandardQuery<TeamWorkload>({
    queryKey: ['/api/ops/team-workload'],
    queryFn: () => get<TeamWorkload>('/api/ops/team-workload'),
  });

  const handleSelectItem = (itemId: number, checked: boolean) => {
    setSelectedItems(prev =>
      checked ? [...prev, itemId] : prev.filter(id => id !== itemId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (!workloadQuery.data?.unassignedItems) return;
    setSelectedItems(checked ? workloadQuery.data.unassignedItems.map(i => i.id) : []);
  };

  const handleBulkAssign = async () => {
    if (!selectedMember || selectedItems.length === 0) return;

    setIsAssigning(true);
    try {
      await post('/api/ops/bulk-assign', {
        itemIds: selectedItems,
        assigneeId: selectedMember,
      });

      toast({
        title: 'Items Assigned',
        description: `${selectedItems.length} items assigned successfully.`,
      });

      setSelectedItems([]);
      setAssignDialogOpen(false);
      workloadQuery.refetch();
    } catch (error) {
      toast({
        title: 'Assignment Failed',
        description: 'Could not assign items. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'overloaded': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 100) return 'text-red-600';
    if (percent >= 80) return 'text-orange-600';
    return 'text-green-600';
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800',
    };
    return colors[priority] || colors.medium;
  };

  return (
    <DashboardLayout
      title="Team Assignment"
      navigation={navigation}
      user={{ name: authUser?.fullName || 'Manager', email: authUser?.email || '' }}
    >
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Team Assignment Dashboard</h2>
            <p className="text-gray-600">Manage workload distribution across your team</p>
          </div>
          <Button variant="outline" onClick={() => workloadQuery.refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {workloadQuery.render((data) => (
          <>
            {/* Team Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Team Size</p>
                      <p className="text-2xl font-bold">{data?.teamMembers?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Team Utilization</p>
                      <p className={`text-2xl font-bold ${getUtilizationColor(data?.teamUtilization || 0)}`}>
                        {data?.teamUtilization || 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">Unassigned</p>
                      <p className="text-2xl font-bold">{data?.unassignedItems?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Available Capacity</p>
                      <p className="text-2xl font-bold">
                        {Math.max(0, (data?.totalCapacity || 0) - (data?.totalAssigned || 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Members Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Current workload and capacity per team member</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data?.teamMembers?.map((member) => (
                    <Card key={member.id} className={`border-l-4 ${
                      member.status === 'overloaded' ? 'border-l-red-500' :
                      member.status === 'busy' ? 'border-l-yellow-500' :
                      member.status === 'available' ? 'border-l-green-500' : 'border-l-gray-400'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar>
                                <AvatarFallback>
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                            </div>
                            <div>
                              <p className="font-semibold">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.role}</p>
                            </div>
                          </div>
                          {member.status === 'overloaded' && (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Workload</span>
                              <span className={getUtilizationColor(member.utilizationPercent)}>
                                {member.activeItems}/{member.capacity} ({member.utilizationPercent}%)
                              </span>
                            </div>
                            <Progress
                              value={Math.min(100, member.utilizationPercent)}
                              className={`h-2 ${member.utilizationPercent >= 100 ? '[&>div]:bg-red-500' : member.utilizationPercent >= 80 ? '[&>div]:bg-orange-500' : ''}`}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div>
                              <p className="text-gray-500">SLA %</p>
                              <p className={`font-semibold ${member.slaCompliancePercent >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                                {member.slaCompliancePercent}%
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Quality</p>
                              <p className="font-semibold">{member.qualityScore}/5</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Avg Time</p>
                              <p className="font-semibold">{member.avgCompletionTime}h</p>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled={member.status === 'overloaded' || member.status === 'offline'}
                            onClick={() => {
                              setSelectedMember(member.id);
                              setAssignDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Work
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Unassigned Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Unassigned Work Items</CardTitle>
                  <CardDescription>Items waiting for assignment</CardDescription>
                </div>
                {selectedItems.length > 0 && (
                  <Button onClick={() => setAssignDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign {selectedItems.length} Selected
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {(data?.unassignedItems?.length || 0) === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>All items are assigned!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedItems.length === data?.unassignedItems?.length}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>SLA</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.unassignedItems?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.requestId}</TableCell>
                          <TableCell>{item.clientName}</TableCell>
                          <TableCell>{item.serviceType}</TableCell>
                          <TableCell>
                            <Badge className={getPriorityBadge(item.priority)}>
                              {item.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={item.slaHoursRemaining <= 4 ? 'text-red-600 font-semibold' : ''}>
                              {item.slaHoursRemaining}h
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItems([item.id]);
                                setAssignDialogOpen(true);
                              }}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Assignment Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Work Items</DialogTitle>
                  <DialogDescription>
                    Assign {selectedItems.length} item(s) to a team member
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Select Team Member</label>
                    <Select
                      value={selectedMember?.toString() || ''}
                      onValueChange={(v) => setSelectedMember(parseInt(v))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose assignee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {data?.teamMembers?.filter(m => m.status !== 'offline').map((member) => (
                          <SelectItem
                            key={member.id}
                            value={member.id.toString()}
                            disabled={member.status === 'overloaded'}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${getStatusColor(member.status)}`} />
                              <span>{member.name}</span>
                              <span className="text-gray-400">
                                ({member.activeItems}/{member.capacity})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMember && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">
                        After assignment, workload will be:{' '}
                        <span className="font-semibold">
                          {(data?.teamMembers?.find(m => m.id === selectedMember)?.activeItems || 0) + selectedItems.length}
                          /{data?.teamMembers?.find(m => m.id === selectedMember)?.capacity || 0}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkAssign}
                    disabled={!selectedMember || isAssigning}
                  >
                    {isAssigning ? 'Assigning...' : 'Assign'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ))}
      </div>
    </DashboardLayout>
  );
}
