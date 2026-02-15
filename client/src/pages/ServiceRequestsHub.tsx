import { useAuth } from '@/hooks/use-auth';
import { DashboardLayout } from '@/layouts';
import ServiceRequestUI from './ServiceRequestUI';
import OperationsServiceRequests from './OperationsServiceRequests';

export default function ServiceRequestsHub() {
  const { user } = useAuth();
  const role = user?.role || 'client';

  const opsRoles = new Set([
    'ops_manager',
    'ops_executive',
    'ops_exec',
    'ops_lead',
    'admin',
    'super_admin',
  ]);

  if (opsRoles.has(role)) {
    return (
      <DashboardLayout>
        <OperationsServiceRequests />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ServiceRequestUI />
    </DashboardLayout>
  );
}
