import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center">
            <span className="text-white text-2xl font-bold">CF</span>
          </div>
        </div>
        
        {/* App Title */}
        <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Comply Flow Portal
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Complete business management platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg sm:px-10">
          {children}
        </div>
        
        {/* Footer Links */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-primary-50 px-2 text-gray-500">
                Need help?
              </span>
            </div>
          </div>
          
          <div className="mt-6 text-center text-sm">
            <Link
              to="/support"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              Contact Support
            </Link>
            <span className="mx-2 text-gray-300">•</span>
            <Link
              to="/privacy"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
          
          <div className="mt-4 text-center text-xs text-gray-400">
            © 2024 Comply Flow Portal. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;