import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, MapPin, Calendar, TrendingUp } from 'lucide-react';

interface ClientInfoCardProps {
  clientId: string;
  clientName: string;
  entityType?: string | null;
  gstin?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  // Lead attribution
  leadId?: string | null;
  leadSource?: string | null;
  leadCreatedAt?: string | null;
  leadConvertedAt?: string | null;
  agentName?: string | null;
}

export function ClientInfoCard({
  clientId,
  clientName,
  entityType,
  gstin,
  pan,
  email,
  phone,
  leadId,
  leadSource,
  leadCreatedAt,
  leadConvertedAt,
  agentName,
}: ClientInfoCardProps) {
  const formatDate = (date: string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatEntityType = (type: string | null | undefined) => {
    if (!type) return 'Unknown';
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Client Info
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {clientId}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Info */}
        <div>
          <h4 className="font-semibold text-gray-900">{clientName}</h4>
          <p className="text-sm text-gray-500">{formatEntityType(entityType)}</p>
        </div>

        {/* Tax IDs */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {gstin && (
            <div>
              <span className="text-gray-500">GSTIN:</span>
              <p className="font-mono text-xs">{gstin}</p>
            </div>
          )}
          {pan && (
            <div>
              <span className="text-gray-500">PAN:</span>
              <p className="font-mono text-xs">{pan}</p>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="space-y-1">
          {email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3 w-3 text-gray-400" />
              <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
                {email}
              </a>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3 w-3 text-gray-400" />
              <a href={`tel:${phone}`} className="text-blue-600 hover:underline">
                {phone}
              </a>
            </div>
          )}
        </div>

        {/* Lead Attribution */}
        {leadId && (
          <div className="pt-3 border-t space-y-2">
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Lead Attribution
            </h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Lead ID:</span>
                <p className="font-mono text-xs">{leadId}</p>
              </div>
              <div>
                <span className="text-gray-500">Source:</span>
                <p className="text-xs">
                  <Badge variant="secondary" className="text-xs">
                    {leadSource || 'Unknown'}
                  </Badge>
                </p>
              </div>
              {leadCreatedAt && (
                <div>
                  <span className="text-gray-500">Lead Date:</span>
                  <p className="text-xs">{formatDate(leadCreatedAt)}</p>
                </div>
              )}
              {leadConvertedAt && (
                <div>
                  <span className="text-gray-500">Converted:</span>
                  <p className="text-xs">{formatDate(leadConvertedAt)}</p>
                </div>
              )}
            </div>
            {agentName && (
              <div className="flex items-center gap-2 text-sm pt-1">
                <TrendingUp className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">Agent:</span>
                <span>{agentName}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
