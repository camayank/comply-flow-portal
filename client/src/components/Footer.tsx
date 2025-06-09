
import React from 'react';
import { Shield, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-6">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold">DigiComply</span>
            </div>
            <p className="text-gray-400 text-sm">
              Streamlining compliance processes with intelligent automation and expert guidance.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-3">Services</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>INC-20A Filing</li>
              <li>ADT-1 Compliance</li>
              <li>GST Registration</li>
              <li>Document Management</li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-3">Support</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Help Center</li>
              <li>Documentation</li>
              <li>Contact Support</li>
              <li>System Status</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-3">Contact</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>support@digicomply.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>New York, NY</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center">
          <p className="text-gray-400 text-sm">
            © 2024 DigiComply Portal. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
