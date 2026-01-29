import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useState } from 'react';

interface NextActionCardProps {
  action: {
    id: string;
    title: string;
    timeEstimate: string;
    whyMatters: {
      benefits: string[];
      socialProof: string;
    };
    actionType: 'upload' | 'review' | 'confirm' | 'pay';
    instructions?: string[];
    dueDate?: string;
  } | null;
  onActionClick: () => void;
}

export default function NextActionCard({ action, onActionClick }: NextActionCardProps) {
  const [showWhy, setShowWhy] = useState(false);

  if (!action) {
    return (
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="text-center py-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            ✓ All caught up
          </h3>
          <p className="text-green-700">
            No actions needed right now. We'll notify you when something comes up.
          </p>
        </div>
      </Card>
    );
  }

  const actionVerbs = {
    upload: 'Upload now',
    review: 'Review now',
    confirm: 'Confirm',
    pay: 'Pay now',
  };

  return (
    <Card className="p-6 border-2 border-blue-200 bg-blue-50">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 text-sm text-blue-600 mb-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{action.timeEstimate}</span>
            </div>
            {action.dueDate && (
              <span className="text-blue-500">
                Due: {new Date(action.dueDate).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
          <h3 className="text-xl font-semibold text-blue-900 mb-2">
            Next action
          </h3>
          <p className="text-lg text-blue-800">
            {action.title}
          </p>
        </div>

        {/* Primary CTA */}
        <Button
          size="lg"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          onClick={onActionClick}
        >
          {actionVerbs[action.actionType]}
        </Button>

        {/* Expandable Context */}
        <button
          onClick={() => setShowWhy(!showWhy)}
          className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 transition-colors"
        >
          <span className="font-medium">Why this matters</span>
          {showWhy ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showWhy && (
          <div className="bg-white p-4 rounded-lg border border-blue-200 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div>
              <p className="font-medium text-gray-900 mb-2">This helps you:</p>
              <ul className="space-y-2">
                {action.whyMatters.benefits.map((benefit, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            {action.whyMatters.socialProof && (
              <p className="text-sm text-gray-600 italic border-t pt-3">
                {action.whyMatters.socialProof}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
