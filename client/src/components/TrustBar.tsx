import { Shield, Lock, FileText, Award } from 'lucide-react';

interface TrustItemProps {
  icon: React.ReactNode;
  text: string;
  verified?: boolean;
}

const TrustItem = ({ icon, text, verified = true }: TrustItemProps) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
    <div className="text-green-600">{icon}</div>
    <span className="text-sm font-medium text-green-800">{text}</span>
    {verified && (
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
    )}
  </div>
);

const TrustBar = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Secure & Verified Platform</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TrustItem 
          icon={<Shield className="w-4 h-4" />} 
          text="ISO 27001 Certified" 
        />
        <TrustItem 
          icon={<Lock className="w-4 h-4" />} 
          text="Data Stored in India" 
        />
        <TrustItem 
          icon={<FileText className="w-4 h-4" />} 
          text="GSTIN: 29AAJCD2314K1Z7" 
        />
        <TrustItem 
          icon={<Award className="w-4 h-4" />} 
          text="MCA Empaneled" 
        />
      </div>
      <div className="mt-3 text-center">
        <p className="text-xs text-gray-500">
          Trusted by 10,000+ Indian businesses for compliance management
        </p>
      </div>
    </div>
  );
};

export default TrustBar;