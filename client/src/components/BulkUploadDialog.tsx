import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, CheckCircle, XCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  templateHeaders: string[];
  entityName: string;
  onUpload: (data: any[]) => Promise<{ success: number; failed: number; errors?: string[] }>;
  sampleData?: Record<string, any>[];
  validationRules?: Record<string, (value: any) => boolean | string>;
}

export function BulkUploadDialog({
  open,
  onOpenChange,
  title,
  description,
  templateHeaders,
  entityName,
  onUpload,
  sampleData = [],
  validationRules = {},
}: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; failed: number; errors?: string[] } | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    const sampleRows = sampleData.length > 0 ? sampleData : [
      templateHeaders.reduce((obj, header) => ({ ...obj, [header]: '' }), {})
    ];
    
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    
    const wscols = templateHeaders.map(() => ({ wch: 20 }));
    ws['!cols'] = wscols;
    
    XLSX.utils.book_append_sheet(wb, ws, entityName);
    
    XLSX.writeFile(wb, `${entityName}_bulk_upload_template.xlsx`);
    
    toast({
      title: "Template Downloaded",
      description: `${entityName} template has been downloaded successfully`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
        toast({
          title: "Invalid File",
          description: "Please upload only .xlsx, .xls, or .csv files",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const parseFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const validateData = (data: any[]): { valid: any[]; errors: string[] } => {
    const valid: any[] = [];
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      const rowNumber = index + 2;
      let isValid = true;
      
      templateHeaders.forEach((header) => {
        if (validationRules[header]) {
          const result = validationRules[header](row[header]);
          if (result !== true) {
            isValid = false;
            errors.push(`Row ${rowNumber}: ${typeof result === 'string' ? result : `Invalid ${header}`}`);
          }
        }
      });
      
      if (isValid) {
        valid.push(row);
      }
    });
    
    return { valid, errors };
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const parsedData = await parseFile(file);
      
      if (parsedData.length === 0) {
        toast({
          title: "Empty File",
          description: "The uploaded file contains no data",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      setProgress(30);

      const { valid, errors } = validateData(parsedData);
      
      if (valid.length === 0) {
        toast({
          title: "Validation Failed",
          description: "No valid records found in the file",
          variant: "destructive",
        });
        setResult({ success: 0, failed: parsedData.length, errors });
        setUploading(false);
        return;
      }

      setProgress(50);

      const uploadResult = await onUpload(valid);
      
      setProgress(100);
      setResult(uploadResult);

      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${uploadResult.success} ${entityName.toLowerCase()}(s)`,
      });

    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Template */}
          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">Step 1: Download Template</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Download the Excel template with the correct format and headers
                </p>
                <Button 
                  onClick={downloadTemplate}
                  variant="outline"
                  size="sm"
                  data-testid="button-download-template"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>

          {/* Upload File */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Upload className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">Step 2: Upload Filled File</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Fill the template and upload it here (supports .xlsx, .xls, .csv)
                </p>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    data-testid="input-file-upload"
                  />
                  {file && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">Selected: {file.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {result && (
            <Alert className={result.failed === 0 ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"}>
              <div className="flex items-start gap-3">
                {result.failed === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">Upload Results</h4>
                  <AlertDescription>
                    <div className="space-y-1 text-sm">
                      <p className="text-green-600">✓ Successfully uploaded: {result.success}</p>
                      {result.failed > 0 && (
                        <p className="text-red-600">✗ Failed: {result.failed}</p>
                      )}
                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          <p className="font-medium mb-1">Errors:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-xs">
                            {result.errors.slice(0, 10).map((error, i) => (
                              <li key={i} className="text-red-600">{error}</li>
                            ))}
                            {result.errors.length > 10 && (
                              <li className="text-muted-foreground">...and {result.errors.length - 10} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={handleClose}
              data-testid="button-cancel"
            >
              {result ? 'Close' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!file || uploading}
              data-testid="button-upload"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
