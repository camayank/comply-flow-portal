/**
 * Timeline Page
 * 
 * Visual lifecycle journey with:
 * - 8-stage progress visualization
 * - Historical milestones
 * - Upcoming checkpoints
 * - Company age tracking
 * - Stage transition indicators
 * - Activity history
 */

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { lifecycleService, type Timeline } from '@/services/lifecycleService';
import { 
  TrendingUp, 
  CheckCircle2, 
  Circle,
  Clock,
  ArrowLeft,
  Calendar,
  Milestone,
  Activity,
  Star,
  Flag
} from 'lucide-react';
import { useLocation } from 'wouter';

const STAGE_INFO: Record<string, { name: string; color: string; icon: string; description: string }> = {
  idea: { name: 'Idea', color: 'gray', icon: '💡', description: 'Concept and initial planning' },
  formation: { name: 'Formation', color: 'blue', icon: '🏗️', description: 'Company incorporation and setup' },
  early_stage: { name: 'Early Stage', color: 'cyan', icon: '🌱', description: 'Initial operations and product development' },
  growth: { name: 'Growth', color: 'green', icon: '📈', description: 'Scaling operations and revenue' },
  funded: { name: 'Funded', color: 'purple', icon: '💰', description: 'Institutional funding received' },
  mature: { name: 'Mature', color: 'indigo', icon: '🏆', description: 'Established market presence' },
  pre_ipo: { name: 'Pre-IPO', color: 'pink', icon: '🎯', description: 'Preparing for public listing' },
  public: { name: 'Public', color: 'yellow', icon: '🏛️', description: 'Publicly traded company' },
  exit: { name: 'Exit', color: 'orange', icon: '🚪', description: 'Acquisition or exit event' },
  closed: { name: 'Closed', color: 'red', icon: '🔒', description: 'Operations ceased' }
};

export default function TimelinePage() {
  const [, setLocation] = useLocation();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lifecycleService.getTimeline();
      setTimeline(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load timeline');
      console.error('Timeline error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error || !timeline) {
    return (
      <div className="bg-gray-50 flex items-center justify-center min-h-[50vh]">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md">
          <Activity className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
            Unable to Load Timeline
          </h3>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={loadTimeline}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const completedStages = timeline.stages.filter(s => s.completed).length;
  const totalStages = timeline.stages.length;
  const progressPercent = Math.round((completedStages / totalStages) * 100);

  return (
    <DashboardLayout>
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => setLocation('/lifecycle')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-indigo-600" />
                Lifecycle Timeline
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Your company's journey from inception to present
              </p>
            </div>
            <div className="bg-indigo-50 px-6 py-3 rounded-lg text-center">
              <div className="text-sm font-medium text-indigo-900">Company Age</div>
              <div className="text-2xl font-bold text-indigo-600">{timeline.companyAge}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Progress Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Lifecycle Progress</h3>
              <p className="text-sm text-gray-600">
                {completedStages} of {totalStages} stages completed
              </p>
            </div>
            <div className="text-3xl font-bold text-indigo-600">{progressPercent}%</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-indigo-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-8">Stage Journey</h3>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            
            <div className="space-y-8">
              {timeline.stages.map((stage: any, idx: number) => {
                const stageInfo = STAGE_INFO[stage.stage] || { name: stage.stage, color: 'gray', icon: '📍', description: '' };
                const isCompleted = stage.completed;
                const isCurrent = stage.current;
                
                return (
                  <div key={idx} className="relative flex items-start gap-6">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex-shrink-0 w-16 h-16 rounded-full border-4 flex items-center justify-center ${
                      isCurrent 
                        ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-100' 
                        : isCompleted 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300 bg-white'
                    }`}>
                      <span className="text-2xl">{stageInfo.icon}</span>
                    </div>

                    {/* Stage content */}
                    <div className={`flex-1 pb-8 ${
                      isCurrent ? 'bg-indigo-50 border-l-4 border-indigo-600 pl-6 py-4 -ml-2 rounded-lg' : ''
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-bold text-gray-900">{stageInfo.name}</h4>
                        {isCurrent && (
                          <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            CURRENT STAGE
                          </span>
                        )}
                        {isCompleted && !isCurrent && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{stageInfo.description}</p>
                      
                      {stage.achievements && stage.achievements.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold text-gray-700 uppercase">Achievements:</p>
                          {stage.achievements.map((achievement: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>{achievement}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {stage.dateEntered && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>Entered: {new Date(stage.dateEntered).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Milestones */}
        {timeline.upcomingMilestones && timeline.upcomingMilestones.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Flag className="h-6 w-6 text-indigo-600" />
              <h3 className="text-xl font-semibold text-gray-900">Upcoming Milestones</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {timeline.upcomingMilestones.map((milestone: any, idx: number) => (
                <div key={idx} className="border border-indigo-200 bg-indigo-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Milestone className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{milestone.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                      {milestone.targetDate && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>Target: {new Date(milestone.targetDate).toLocaleDateString('en-IN')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {timeline.history && timeline.history.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="h-6 w-6 text-indigo-600" />
              <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
            </div>
            
            <div className="space-y-3">
              {timeline.history.slice(0, 10).map((event: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Circle className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900">{event.title || event.type}</h4>
                      {event.timestamp && (
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps CTA */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-8 text-white text-center">
          <Milestone className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-3">Keep Moving Forward</h3>
          <p className="mb-6 text-indigo-100 max-w-2xl mx-auto">
            Your lifecycle journey is unique. Let us help you navigate to the next stage with confidence.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => setLocation('/lifecycle/services')}
              className="bg-white text-indigo-600 px-8 py-3 rounded-lg hover:bg-indigo-50 transition font-semibold"
            >
              View Required Services
            </button>
            <button 
              onClick={() => setLocation('/lifecycle/compliance')}
              className="bg-indigo-500 text-white px-8 py-3 rounded-lg hover:bg-indigo-400 transition font-semibold"
            >
              Check Compliance
            </button>
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
