import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  FileText,
  DollarSign,
  TrendingUp,
  Target,
  Menu,
  X,
  Home,
  Calendar,
  Filter,
  Search,
  Plus,
  Eye,
  MapPin,
  Star,
  Award,
  Phone,
  Mail,
  Briefcase,
  Play
} from 'lucide-react';

const MobileAgentPortal = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-orange-600" />
              <div>
                <h1 className="font-bold text-lg">Partner Portal</h1>
                <p className="text-xs text-gray-500">Agent network management</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs px-3">
              <Phone className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Call</span>
            </Button>
            <Button size="sm" variant="outline" className="text-xs px-3">
              <Mail className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Email</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t px-4 py-3">
            <nav className="space-y-2">
              <button
                onClick={() => {setActiveTab('dashboard'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-orange-50 text-orange-600' : 'text-gray-600'}`}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => {setActiveTab('leads'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'leads' ? 'bg-orange-50 text-orange-600' : 'text-gray-600'}`}
              >
                <Users className="h-4 w-4" />
                Lead Management
              </button>
              <button
                onClick={() => {setActiveTab('commissions'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'commissions' ? 'bg-orange-50 text-orange-600' : 'text-gray-600'}`}
              >
                <DollarSign className="h-4 w-4" />
                Commissions
              </button>
              <button
                onClick={() => {setActiveTab('territory'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'territory' ? 'bg-orange-50 text-orange-600' : 'text-gray-600'}`}
              >
                <MapPin className="h-4 w-4" />
                Territory
              </button>
              <button
                onClick={() => {setActiveTab('resources'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'resources' ? 'bg-orange-50 text-orange-600' : 'text-gray-600'}`}
              >
                <Briefcase className="h-4 w-4" />
                Resources
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'leads' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Users className="h-4 w-4" />
                Lead Management
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'commissions' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <DollarSign className="h-4 w-4" />
                Commissions
              </button>
              <button
                onClick={() => setActiveTab('territory')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'territory' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <MapPin className="h-4 w-4" />
                Territory
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'resources' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Briefcase className="h-4 w-4" />
                Resources
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Partner Dashboard</h2>
                <p className="text-sm lg:text-base text-gray-600">Your performance overview and earnings summary</p>
              </div>

              {/* Performance Cards - Mobile Responsive */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <Users className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mb-2" />
                      <p className="text-xs lg:text-sm text-gray-600">Total Leads</p>
                      <p className="text-xl lg:text-2xl font-bold">47</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <Target className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 mb-2" />
                      <p className="text-xs lg:text-sm text-gray-600">Conversions</p>
                      <p className="text-xl lg:text-2xl font-bold">23</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <DollarSign className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 mb-2" />
                      <p className="text-xs lg:text-sm text-gray-600">This Month</p>
                      <p className="text-xl lg:text-2xl font-bold">₹45K</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600 mb-2" />
                      <p className="text-xs lg:text-sm text-gray-600">Growth Rate</p>
                      <p className="text-xl lg:text-2xl font-bold">+23%</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Performance</CardTitle>
                    <CardDescription>Your progress this month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Lead Target</span>
                          <span>47/50</span>
                        </div>
                        <Progress value={94} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Conversion Rate</span>
                          <span>48.9%</span>
                        </div>
                        <Progress value={49} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Revenue Target</span>
                          <span>₹45K/₹50K</span>
                        </div>
                        <Progress value={90} className="w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activities</CardTitle>
                    <CardDescription>Latest lead interactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="text-sm">
                          <p className="font-medium">New lead: TechCorp Startup</p>
                          <p className="text-xs text-gray-600">Incorporation service</p>
                        </div>
                        <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="text-sm">
                          <p className="font-medium">Conversion: StartupCo</p>
                          <p className="text-xs text-gray-600">₹15,000 commission</p>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Converted</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="text-sm">
                          <p className="font-medium">Follow-up: RetailCorp</p>
                          <p className="text-xs text-gray-600">GST registration</p>
                        </div>
                        <Badge className="bg-yellow-500 text-white text-xs">Follow-up</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Lead Management</h2>
                  <p className="text-sm lg:text-base text-gray-600">Track and manage your client leads</p>
                </div>
                <Button size="sm" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-4 py-2">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Add Lead</span>
                </Button>
              </div>

              {/* Lead Pipeline */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      New Leads (12)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-sm">TechStart Pvt Ltd</h4>
                        <p className="text-xs text-gray-600 mt-1">Service: Company Incorporation</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline" className="text-xs">High Value</Badge>
                          <span className="text-xs text-gray-500">2 days ago</span>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-sm">Digital Agency Co</h4>
                        <p className="text-xs text-gray-600 mt-1">Service: GST Registration</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline" className="text-xs">Medium</Badge>
                          <span className="text-xs text-gray-500">1 week ago</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      In Progress (8)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <h4 className="font-medium text-sm">StartupCo</h4>
                        <p className="text-xs text-gray-600 mt-1">Service: Annual Compliance</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline" className="text-xs">Hot Lead</Badge>
                          <span className="text-xs text-gray-500">In discussion</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      Converted (23)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-sm">InnovateCorp</h4>
                        <p className="text-xs text-gray-600 mt-1">Commission: ₹15,000</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline" className="text-xs">Converted</Badge>
                          <Target className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'commissions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Commission Tracking</h2>
                <p className="text-sm lg:text-base text-gray-600">Track your earnings and payment history</p>
              </div>

              {/* Commission Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-xs lg:text-sm text-gray-600">This Month</p>
                      <p className="text-xl lg:text-2xl font-bold text-green-600">₹45,000</p>
                      <p className="text-xs text-green-600">+15% vs last month</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-xs lg:text-sm text-gray-600">Pending</p>
                      <p className="text-xl lg:text-2xl font-bold text-orange-600">₹12,500</p>
                      <p className="text-xs text-orange-600">2 transactions</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-xs lg:text-sm text-gray-600">Total Earned</p>
                      <p className="text-xl lg:text-2xl font-bold text-blue-600">₹2,34,000</p>
                      <p className="text-xs text-blue-600">Lifetime earnings</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-xs lg:text-sm text-gray-600">Avg/Conversion</p>
                      <p className="text-xl lg:text-2xl font-bold text-purple-600">₹8,200</p>
                      <p className="text-xs text-purple-600">Per successful lead</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Commissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Commission Payments</CardTitle>
                  <CardDescription>Your latest earnings and transaction history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">TechCorp Incorporation</p>
                        <p className="text-xs text-gray-600">Service: Company registration</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">₹15,000</p>
                        <Badge className="bg-green-500 text-white text-xs">Paid</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">StartupCo GST Registration</p>
                        <p className="text-xs text-gray-600">Service: GST setup</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">₹5,000</p>
                        <Badge className="bg-orange-500 text-white text-xs">Pending</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Digital Agency Annual Filing</p>
                        <p className="text-xs text-gray-600">Service: ROC compliance</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">₹7,500</p>
                        <Badge className="bg-green-500 text-white text-xs">Paid</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'territory' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Territory Management</h2>
                <p className="text-sm lg:text-base text-gray-600">Manage your assigned regions and market coverage</p>
              </div>

              {/* Territory Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assigned Territory</CardTitle>
                    <CardDescription>Your designated coverage area</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-sm">Mumbai Central</span>
                        </div>
                        <Badge className="bg-blue-500 text-white text-xs">Primary</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-gray-600" />
                          <span className="font-medium text-sm">Mumbai Suburban</span>
                        </div>
                        <Badge variant="outline" className="text-xs">Secondary</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Market Penetration</CardTitle>
                    <CardDescription>Your coverage performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Market Coverage</span>
                          <span>67%</span>
                        </div>
                        <Progress value={67} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Customer Density</span>
                          <span>45 clients/km²</span>
                        </div>
                        <Progress value={78} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Competition Index</span>
                          <span>Medium</span>
                        </div>
                        <Progress value={60} className="w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Marketing Resources</h2>
                <p className="text-sm lg:text-base text-gray-600">Sales collateral and marketing materials</p>
              </div>

              {/* Resource Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sales Presentations</CardTitle>
                    <CardDescription>Ready-to-use presentation materials</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Incorporation Services Deck</span>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">GST Benefits Presentation</span>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Brochures & Flyers</CardTitle>
                    <CardDescription>Print and digital marketing materials</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Service Portfolio Brochure</span>
                        <Button size="sm" variant="outline" className="text-xs">
                          Download
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Pricing Guide Flyer</span>
                        <Button size="sm" variant="outline" className="text-xs">
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Training Materials</CardTitle>
                    <CardDescription>Product knowledge and sales training</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Product Training Videos</span>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Play className="h-3 w-3 mr-1" />
                          Watch
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Sales Scripts Guide</span>
                        <Button size="sm" variant="outline" className="text-xs">
                          Read
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-5 gap-1 py-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'dashboard' ? 'text-orange-600' : 'text-gray-600'}`}
          >
            <Home className="h-4 w-4 mb-1" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'leads' ? 'text-orange-600' : 'text-gray-600'}`}
          >
            <Users className="h-4 w-4 mb-1" />
            Leads
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'commissions' ? 'text-orange-600' : 'text-gray-600'}`}
          >
            <DollarSign className="h-4 w-4 mb-1" />
            Commissions
          </button>
          <button
            onClick={() => setActiveTab('territory')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'territory' ? 'text-orange-600' : 'text-gray-600'}`}
          >
            <MapPin className="h-4 w-4 mb-1" />
            Territory
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'resources' ? 'text-orange-600' : 'text-gray-600'}`}
          >
            <Briefcase className="h-4 w-4 mb-1" />
            Resources
          </button>
        </div>
      </div>

      {/* Spacer for bottom navigation on mobile */}
      <div className="lg:hidden h-16"></div>
    </div>
  );
};

export default MobileAgentPortal;