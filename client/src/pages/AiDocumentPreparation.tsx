import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { 
  FileText, Sparkles, Download, Upload, Edit, Eye, 
  Save, FileSignature, Stamp, PenTool, X, Plus,
  ChevronLeft, Check, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { SkeletonList } from '@/components/ui/skeleton-loader';
import { EmptyList } from '@/components/ui/empty-state';

// ============================================================================
// AI DOCUMENT PREPARATION & MANAGEMENT
// Generate, edit, preview, download, sign documents with AI assistance
// ============================================================================

const generateDocSchema = z.object({
  title: z.string().min(3, 'Title required'),
  prompt: z.string().min(10, 'Describe the document you want to generate'),
  documentType: z.string(),
  category: z.string(),
  templateId: z.string().optional(),
});

const signatureSchema = z.object({
  signatoryName: z.string().min(2, 'Name required'),
  signatoryEmail: z.string().email('Valid email required'),
  signatoryRole: z.string(),
  signatureType: z.enum(['dsc', 'esign', 'drawn', 'uploaded']),
});

type GenerateDocData = z.infer<typeof generateDocSchema>;
type SignatureData = z.infer<typeof signatureSchema>;

// Signature Canvas Component
function SignatureCanvas({ onSave, onCancel }: { onSave: (dataUrl: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="border border-gray-200 bg-white touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width: '100%', height: 'auto' }}
        />
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={clearCanvas} data-testid="button-clear-signature">
          Clear
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} data-testid="button-save-signature">
            <Check className="w-4 h-4 mr-2" />
            Save Signature
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AiDocumentPreparation() {
  const { toast } = useToast();
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signatureMethod, setSignatureMethod] = useState<'drawn' | 'dsc' | 'upload'>('drawn');
  const [drawnSignature, setDrawnSignature] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/ai-documents'],
  });

  // Fetch templates
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['/api/ai-document-templates'],
  });

  // Generate document mutation
  const generateMutation = useMutation({
    mutationFn: async (data: GenerateDocData) => {
      return apiRequest('POST', '/api/ai-documents/generate', data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-documents'] });
      setCreateDialogOpen(false);
      setSelectedDoc(response.document);
      toast({
        title: 'Success',
        description: 'Document generated successfully!',
      });
      generateForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate document',
        variant: 'destructive',
      });
    },
  });

  // Update document mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      return apiRequest('PATCH', `/api/ai-documents/${id}`, { content, changes: 'Content edited' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-documents'] });
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Document updated successfully',
      });
    },
  });

  // Sign document mutation
  const signMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/ai-documents/${selectedDoc.id}/sign`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-documents'] });
      setShowSignatureDialog(false);
      setDrawnSignature('');
      toast({
        title: 'Success',
        description: 'Document signed successfully!',
      });
      signatureForm.reset();
    },
  });

  const generateForm = useForm<GenerateDocData>({
    resolver: zodResolver(generateDocSchema),
    defaultValues: {
      documentType: 'agreement',
      category: 'legal',
    },
  });

  const signatureForm = useForm<SignatureData>({
    resolver: zodResolver(signatureSchema),
    defaultValues: {
      signatureType: 'drawn',
      signatoryRole: 'director',
    },
  });

  const onGenerateSubmit = (data: GenerateDocData) => {
    generateMutation.mutate(data);
  };

  const handleSaveEdit = () => {
    if (selectedDoc) {
      updateMutation.mutate({ id: selectedDoc.id, content: editContent });
    }
  };

  const handleDownload = () => {
    if (!selectedDoc) return;
    
    const element = document.createElement('a');
    const file = new Blob([selectedDoc.content], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `${selectedDoc.documentNumber}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: 'Downloaded',
      description: 'Document downloaded successfully',
    });
  };

  const handleSignatureSubmit = (data: SignatureData) => {
    const signaturePayload = {
      ...data,
      ...(signatureMethod === 'drawn' && { signatureData: drawnSignature }),
      pageNumber: 1,
      positionX: 100,
      positionY: 700,
    };
    
    signMutation.mutate(signaturePayload);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'signed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Document Preparation</h1>
          <p className="text-muted-foreground mt-1">Generate, edit, sign, and manage documents with AI</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-document">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate Document with AI</DialogTitle>
              <DialogDescription>
                Describe the document you need and let AI generate it for you
              </DialogDescription>
            </DialogHeader>
            
            <Form {...generateForm}>
              <form onSubmit={generateForm.handleSubmit(onGenerateSubmit)} className="space-y-4">
                <FormField
                  control={generateForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Board Resolution for New Director Appointment" {...field} data-testid="input-doc-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={generateForm.control}
                    name="documentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-doc-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="agreement">Agreement</SelectItem>
                            <SelectItem value="moa">Memorandum of Association</SelectItem>
                            <SelectItem value="aoa">Articles of Association</SelectItem>
                            <SelectItem value="board_resolution">Board Resolution</SelectItem>
                            <SelectItem value="notice">Notice</SelectItem>
                            <SelectItem value="letter">Letter</SelectItem>
                            <SelectItem value="declaration">Declaration</SelectItem>
                            <SelectItem value="affidavit">Affidavit</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={generateForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-doc-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="incorporation">Incorporation</SelectItem>
                            <SelectItem value="compliance">Compliance</SelectItem>
                            <SelectItem value="tax">Tax</SelectItem>
                            <SelectItem value="legal">Legal</SelectItem>
                            <SelectItem value="hr">HR</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={generateForm.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Generate a board resolution for appointing John Doe as a new director of ABC Private Limited, effective from January 1, 2025. Include standard clauses about authority and responsibilities."
                          rows={4}
                          {...field} 
                          data-testid="textarea-doc-prompt"
                        />
                      </FormControl>
                      <FormDescription>
                        Describe what the document should contain in detail
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={generateMutation.isPending}
                    data-testid="button-generate-submit"
                  >
                    {generateMutation.isPending ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Document
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>{documents.length} total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <SkeletonList items={5} />
              ) : documents.length === 0 ? (
                <EmptyList
                  title="No documents yet"
                  description="Get started by generating your first document with AI"
                  actionLabel="Generate with AI"
                  onAction={() => setCreateDialogOpen(true)}
                />
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDoc?.id === doc.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setEditContent(doc.content);
                      setIsEditing(false);
                    }}
                    data-testid={`doc-item-${doc.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">{doc.documentNumber}</p>
                      </div>
                      <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                      <span>{doc.documentType}</span>
                      <span>•</span>
                      <span>{format(new Date(doc.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document Preview/Edit */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedDoc ? selectedDoc.title : 'No Document Selected'}</CardTitle>
                {selectedDoc && (
                  <CardDescription>{selectedDoc.documentNumber}</CardDescription>
                )}
              </div>
              {selectedDoc && (
                <div className="flex gap-2">
                  {!isEditing ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setEditContent(selectedDoc.content); }} data-testid="button-edit-doc">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download-doc">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button size="sm" onClick={() => setShowSignatureDialog(true)} data-testid="button-sign-doc">
                        <FileSignature className="w-4 h-4 mr-2" />
                        Sign
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending} data-testid="button-save-doc">
                        <Save className="w-4 h-4 mr-2" />
                        {updateMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDoc ? (
              <EmptyList
                title="No Document Selected"
                description="Select a document from the list to preview, edit, or sign it"
                actionLabel="Generate New Document"
                onAction={() => setCreateDialogOpen(true)}
              />
            ) : isEditing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[500px] font-mono text-sm"
                data-testid="textarea-edit-content"
              />
            ) : (
              <div 
                className="prose max-w-none dark:prose-invert min-h-[500px] p-4 border rounded-lg bg-white dark:bg-gray-900"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(selectedDoc.content, {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'div', 'span', 'blockquote', 'pre', 'code'],
                    ALLOWED_ATTR: ['href', 'target', 'class', 'style'],
                  })
                }}
                data-testid="doc-preview"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Signature Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              Affix your signature to the document
            </DialogDescription>
          </DialogHeader>

          <Tabs value={signatureMethod} onValueChange={(v) => setSignatureMethod(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="drawn" data-testid="tab-drawn-signature">
                <PenTool className="w-4 h-4 mr-2" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="dsc" data-testid="tab-dsc-signature">
                <Stamp className="w-4 h-4 mr-2" />
                DSC
              </TabsTrigger>
              <TabsTrigger value="upload" data-testid="tab-upload-signature">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </TabsTrigger>
            </TabsList>

            <Form {...signatureForm}>
              <form onSubmit={signatureForm.handleSubmit(handleSignatureSubmit)} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={signatureForm.control}
                    name="signatoryName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} data-testid="input-signatory-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signatureForm.control}
                    name="signatoryEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} data-testid="input-signatory-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={signatureForm.control}
                  name="signatoryRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-signatory-role">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="director">Director</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                          <SelectItem value="authorized_signatory">Authorized Signatory</SelectItem>
                          <SelectItem value="witness">Witness</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <TabsContent value="drawn">
                  <div className="space-y-4">
                    <Label>Draw Your Signature</Label>
                    <SignatureCanvas 
                      onSave={(dataUrl) => {
                        setDrawnSignature(dataUrl);
                        signatureForm.setValue('signatureType', 'drawn');
                      }}
                      onCancel={() => setDrawnSignature('')}
                    />
                    {drawnSignature && (
                      <div className="mt-4">
                        <Label>Signature Preview</Label>
                        <img src={drawnSignature} alt="Signature" className="border p-2 rounded max-h-32" />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="dsc">
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="flex gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900 dark:text-blue-100">Digital Signature Certificate (DSC) Required</p>
                          <p className="text-blue-700 dark:text-blue-300 mt-1">
                            Connect your DSC token to sign documents digitally. DSC provides legal validity and authenticity.
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button type="button" variant="outline" className="w-full" disabled>
                      <Stamp className="w-4 h-4 mr-2" />
                      Connect DSC Token
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      DSC integration coming soon
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="upload">
                  <div className="space-y-4">
                    <Label>Upload Signature Image</Label>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Upload your signature image</p>
                      <Input type="file" accept="image/*" className="mt-4" />
                    </div>
                  </div>
                </TabsContent>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowSignatureDialog(false);
                      setDrawnSignature('');
                      signatureForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={signMutation.isPending || (signatureMethod === 'drawn' && !drawnSignature)}
                    data-testid="button-submit-signature"
                  >
                    {signMutation.isPending ? 'Signing...' : 'Sign Document'}
                  </Button>
                </div>
              </form>
            </Form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
