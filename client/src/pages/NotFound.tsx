import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Link } from 'wouter';

const NotFound = () => {
  const [location] = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location
    );
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-6">
            {/* 404 Visual */}
            <div className="relative">
              <div className="text-8xl font-bold text-gray-200">404</div>
              <Search className="h-16 w-16 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
              <p className="text-gray-600">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/">
                <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>

            {/* Popular Links */}
            <div className="pt-6 border-t">
              <p className="text-sm font-medium text-gray-700 mb-3">Popular pages:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link href="/portal-v2">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Client Portal
                  </Button>
                </Link>
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Admin Panel
                  </Button>
                </Link>
                <Link href="/operations">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Operations
                  </Button>
                </Link>
                <Link href="/hub">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Portal Hub
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
