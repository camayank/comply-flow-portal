import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileSpreadsheet, Download, CheckCircle2, AlertCircle, Upload, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ============================================================================
// WORKFLOW IMPORT PAGE - Import Detailed Service Workflows from Google Sheets
// Allows admins to import 30+ step workflows for each service
// ============================================================================

const importFormSchema = z.object({
  sheetUrl: z.string().url("Must be a valid Google Sheets URL"),
  serviceKey: z.string().min(2, "Service key must be at least 2 characters"),
  serviceName: z.string().min(2, "Service name must be at least 2 characters"),
  serviceDescription: z.string().optional(),
});

type ImportFormData = z.infer<typeof importFormSchema>;

export default function WorkflowImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewData, setPreviewData] = useState<any>(null);
  const [importedWorkflow, setImportedWorkflow] = useState<any>(null);

  const form = useForm<ImportFormData>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      sheetUrl: "",
      serviceKey: "",
      serviceName: "",
      serviceDescription: "",
    },
  });

  // Preview workflow mutation
  const previewMutation = useMutation({
    mutationFn: async (data: { sheetUrl: string }) => {
      return apiRequest("/api/admin/import/google-sheets/preview", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setPreviewData(data);
      toast({
        title: "Preview Loaded",
        description: `Found ${data.stepsCount} workflow steps`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Preview Failed",
        description: error.message || "Failed to load preview",
      });
    },
  });

  // Import workflow mutation
  const importMutation = useMutation({
    mutationFn: async (data: ImportFormData) => {
      return apiRequest("/api/admin/import/google-sheets", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setImportedWorkflow(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/workflows"] });
      toast({
        title: "Workflow Imported Successfully",
        description: `Imported ${data.steps?.length || 0} steps for ${data.template?.name}`,
      });
      form.reset();
      setPreviewData(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "Failed to import workflow",
      });
    },
  });

  const handlePreview = () => {
    const sheetUrl = form.getValues("sheetUrl");
    if (sheetUrl) {
      previewMutation.mutate({ sheetUrl });
    }
  };

  const handleImport = (data: ImportFormData) => {
    importMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" data-testid="workflow-import-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import Service Workflows</h1>
        <p className="text-muted-foreground">
          Import detailed step-by-step workflows from Google Sheets. Each service should have 20-40 steps with SLAs, responsible roles, and deliverables.
        </p>
      </div>

      {/* Instructions Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets Format
          </CardTitle>
          <CardDescription>
            Your Google Sheet should have the following columns:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
            <div className="grid grid-cols-6 gap-2 font-bold">
              <div>Step No</div>
              <div>Task</div>
              <div>Form/Documents</div>
              <div>Responsible Role</div>
              <div>SLA</div>
              <div>Deliverable</div>
            </div>
            <div className="grid grid-cols-6 gap-2 text-muted-foreground">
              <div>1</div>
              <div>Collect KYC</div>
              <div>PAN, Aadhaar</div>
              <div>Client Manager</div>
              <div>2 days</div>
              <div>Docs folder</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Make sure your Google Sheet is set to "Anyone with the link can view"
          </p>
        </CardContent>
      </Card>

      {/* Import Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import Workflow</CardTitle>
          <CardDescription>
            Paste your Google Sheets URL and provide service details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleImport)} className="space-y-4">
              <FormField
                control={form.control}
                name="sheetUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Sheets URL</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          {...field}
                          data-testid="input-sheet-url"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePreview}
                        disabled={!field.value || previewMutation.isPending}
                        data-testid="button-preview"
                      >
                        {previewMutation.isPending ? (
                          "Loading..."
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </>
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Key (Unique Identifier)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="pvt_ltd_incorporation"
                        {...field}
                        data-testid="input-service-key"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Private Limited Company Incorporation"
                        {...field}
                        data-testid="input-service-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Complete end-to-end incorporation service..."
                        rows={3}
                        {...field}
                        data-testid="input-service-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={importMutation.isPending}
                data-testid="button-import"
              >
                {importMutation.isPending ? (
                  "Importing..."
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Workflow
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Preview Results */}
      {previewData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Workflow Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Found <strong>{previewData.stepsCount} steps</strong> with total SLA of{" "}
                <strong>{previewData.summary?.totalSLADays} days</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {previewData.steps?.slice(0, 10).map((step: any, index: number) => (
                <div
                  key={index}
                  className="border rounded-lg p-3 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="font-medium">{step.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {step.responsibleRole} • {step.slaDays} days SLA
                    </div>
                  </div>
                  {step.qaRequired && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      QA Required
                    </span>
                  )}
                </div>
              ))}
              {previewData.stepsCount > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  ... and {previewData.stepsCount - 10} more steps
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Success */}
      {importedWorkflow && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Successfully imported <strong>{importedWorkflow.template?.name}</strong> with{" "}
            <strong>{importedWorkflow.template?.stepsCount} steps</strong> (Version{" "}
            {importedWorkflow.template?.version})
          </AlertDescription>
        </Alert>
      )}

      {/* Example Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Example Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Use this example as a reference for your workflow imports:
          </p>
          <Button variant="outline" asChild data-testid="link-example">
            <a
              href="https://docs.google.com/spreadsheets/d/1cf85xGJ0g32aZtpY9a34mtWVEFiksz3JPFEgAyarwuM/edit"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              View Example: Pvt Ltd Incorporation (36 steps)
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
