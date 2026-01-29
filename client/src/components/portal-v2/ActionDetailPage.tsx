import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useStandardMutation } from '@/hooks/useStandardMutation';
import { Upload, FileText } from 'lucide-react';
import { useState } from 'react';

interface ActionDetailPageProps {
  action: {
    id: string;
    title: string;
    actionType: 'upload' | 'review' | 'confirm' | 'pay';
    instructions?: string[];
    documentType?: string;
    timeEstimate: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function ActionDetailPage({
  action,
  isOpen,
  onClose,
  onComplete,
}: ActionDetailPageProps) {
  const [files, setFiles] = useState<FileList | null>(null);

  const completeMutation = useStandardMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/v2/client/actions/complete', {
        method: 'POST',
        body: data,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete action');
      }
      return response.json();
    },
    onSuccess: () => {
      onComplete();
      onClose();
    },
    successMessage: 'Action completed successfully! Your status has been updated.',
  });

  const handleComplete = () => {
    const formData = new FormData();
    formData.append('actionId', action.id);

    if (action.actionType === 'upload' && files) {
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
    }

    completeMutation.mutate(formData);
  };

  const isValid =
    action.actionType === 'upload' ? files && files.length > 0 : true;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{action.title}</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Estimated time: {action.timeEstimate}
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Instructions */}
          {action.instructions && action.instructions.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                What to do:
              </p>
              <ol className="space-y-2">
                {action.instructions.map((instruction, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-3">
                    <span className="font-semibold text-blue-600 flex-shrink-0">
                      {i + 1}.
                    </span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Upload Area */}
          {action.actionType === 'upload' && (
            <div>
              <label
                htmlFor="file-upload"
                className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50 hover:bg-blue-50"
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag files here or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  PDF, Excel, or image files
                </p>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                />
              </label>
              {files && files.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Selected files ({files.length}):
                  </p>
                  {Array.from(files).map((file, i) => (
                    <div
                      key={i}
                      className="text-sm text-gray-600 flex items-center gap-2 bg-gray-50 px-3 py-2 rounded"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Review/Confirm Content */}
          {(action.actionType === 'review' || action.actionType === 'confirm') && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700">
                Please review the details and confirm when ready.
              </p>
            </div>
          )}

          {/* Payment Content */}
          {action.actionType === 'pay' && (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p className="text-sm text-gray-700">
                You will be redirected to the payment gateway.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleComplete}
              disabled={!isValid || completeMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {completeMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Processing...
                </span>
              ) : (
                'Complete'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={completeMutation.isPending}
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
