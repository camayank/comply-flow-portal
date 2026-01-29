import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Smartphone, Lock, Key, Home, Settings, CheckCircle, XCircle } from 'lucide-react';

export default function AccountSecurity() {
  const navigation = [
    { 
      label: 'Status', 
      href: '/portal-v2', 
      icon: Home,
      description: 'Your compliance status'
    },
    { 
      label: 'Account', 
      href: '/portal-v2/account', 
      icon: Settings,
      description: 'Businesses, billing, documents'
    },
  ];

  const securitySettings = {
    twoFactorEnabled: false,
    lastPasswordChange: '2024-03-15',
    activeSessions: 1,
    loginHistory: [
      {
        date: '2026-01-22',
        time: '09:30 AM',
        device: 'Chrome on MacBook Air',
        location: 'Bangalore, India',
        status: 'success'
      },
      {
        date: '2026-01-21',
        time: '02:15 PM',
        device: 'Safari on iPhone',
        location: 'Bangalore, India',
        status: 'success'
      }
    ]
  };

  return (
    <DashboardLayout
      title="Security"
      navigation={navigation}
    >
      <div className="max-w-5xl mx-auto space-y-6 px-4 py-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your account security and authentication</p>
        </div>

        {/* Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>
                    Last changed on {new Date(securitySettings.lastPasswordChange).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline">Change Password</Button>
            </div>
          </CardHeader>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="default" 
                  className={securitySettings.twoFactorEnabled ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-100'}
                >
                  {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Button variant="outline">
                  {securitySettings.twoFactorEnabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              When enabled, you'll be asked to enter a code from your phone in addition to your password when logging in.
            </p>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>
                  {securitySettings.activeSessions} active session{securitySettings.activeSessions !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Current Session</p>
                <p className="text-sm text-gray-600">Chrome on MacBook Air • Bangalore, India</p>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Login History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Key className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <CardTitle>Login History</CardTitle>
                <CardDescription>Recent login attempts on your account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securitySettings.loginHistory.map((login, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {login.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{login.device}</p>
                      <p className="text-sm text-gray-600">{login.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{login.date}</p>
                    <p className="text-xs text-gray-600">{login.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Recommendations */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Security Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-amber-800">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>Enable two-factor authentication for better account protection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>Use a strong, unique password with at least 12 characters</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>Review login history regularly for suspicious activity</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
