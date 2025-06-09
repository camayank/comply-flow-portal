import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Search,
  Filter,
  Calendar,
  Shield,
  Eye,
  Share2,
  Archive,
  Trash2,
  Upload,
  FolderOpen,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  File,
  Image,
  FileSpreadsheet,
  FileImage,
  Lock,
  Unlock
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { DocumentVault } from '@shared/schema';

interface DocumentWithMetrics extends DocumentVault {
  categoryName?: string;
  serviceName?: string;
  isExpiringSoon?: boolean;
  downloadHistory?: any[];
}

interface DocumentCategory {
  id: string;
  name: string;
  icon: any;
  color: string;
  count: number;
  totalSize: number;
}

const DocumentVault = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type' | 'size'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<DocumentWithMetrics[]>({
    queryKey: ['/api/document-vault'],
  });

  // Download document mutation
  const downloadDocumentMutation = useMutation({
    mutationFn: (documentId: number) => 
      apiRequest('POST', `/api/document-vault/${documentId}/download`, {}),
    onSuccess: (data: any) => {
      // Handle download link
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      queryClient.invalidateQueries({ queryKey: ['/api/document-vault'] });
      toast({
        title: "Download Started",
        description: "Your document download has started.",
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: number) =>
      apiRequest('DELETE', `/api/document-vault/${documentId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-vault'] });
      toast({
        title: "Document Deleted",
        description: "Document has been permanently deleted.",
        variant: "destructive"
      });
    },
  });

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-5 w-5" />;
    
    if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5 text-blue-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    if (mimeType.includes('document') || mimeType.includes('word')) return <FileText className="h-5 w-5 text-blue-500" />;
    
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getDocumentStatus = (doc: DocumentWithMetrics) => {
    if (doc.expiryDate && new Date(doc.expiryDate) < new Date()) {
      return { status: 'expired', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    }
    if (doc.isExpiringSoon) {
      return { status: 'expiring soon', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    }
    if (doc.isOfficial) {
      return { status: 'official', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
    return { status: 'active', color: 'bg-blue-100 text-blue-800', icon: FileText };
  };

  const documentCategories: DocumentCategory[] = [
    {
      id: 'incorporation',
      name: 'Incorporation Documents',
      icon: Shield,
      color: 'text-blue-600',
      count: documents.filter(d => d.documentType?.includes('incorporation')).length,
      totalSize: documents.filter(d => d.documentType?.includes('incorporation')).reduce((sum, d) => sum + (d.fileSize || 0), 0)
    },
    {
      id: 'tax',
      name: 'Tax Documents',
      icon: FileText,
      color: 'text-green-600',
      count: documents.filter(d => d.documentType?.includes('tax') || d.documentType?.includes('gst')).length,
      totalSize: documents.filter(d => d.documentType?.includes('tax') || d.documentType?.includes('gst')).reduce((sum, d) => sum + (d.fileSize || 0), 0)
    },
    {
      id: 'compliance',
      name: 'Compliance Filings',
      icon: CheckCircle,
      color: 'text-purple-600',
      count: documents.filter(d => d.documentType?.includes('filing') || d.documentType?.includes('annual')).length,
      totalSize: documents.filter(d => d.documentType?.includes('filing') || d.documentType?.includes('annual')).reduce((sum, d) => sum + (d.fileSize || 0), 0)
    },
    {
      id: 'certificates',
      name: 'Certificates',
      icon: Star,
      color: 'text-yellow-600',
      count: documents.filter(d => d.documentType?.includes('certificate')).length,
      totalSize: documents.filter(d => d.documentType?.includes('certificate')).reduce((sum, d) => sum + (d.fileSize || 0), 0)
    }
  ];

  const filteredDocuments = documents.filter(doc => {
    if (searchQuery && !doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !doc.documentType.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    if (selectedCategory !== 'all') {
      const category = documentCategories.find(c => c.id === selectedCategory);
      if (category) {
        switch (selectedCategory) {
          case 'incorporation':
            return doc.documentType?.includes('incorporation');
          case 'tax':
            return doc.documentType?.includes('tax') || doc.documentType?.includes('gst');
          case 'compliance':
            return doc.documentType?.includes('filing') || doc.documentType?.includes('annual');
          case 'certificates':
            return doc.documentType?.includes('certificate');
        }
      }
    }
    
    return true;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.fileName.localeCompare(b.fileName);
      case 'type':
        return a.documentType.localeCompare(b.documentType);
      case 'size':
        return (b.fileSize || 0) - (a.fileSize || 0);
      case 'date':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const totalDocuments = documents.length;
  const totalSize = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
  const officialDocuments = documents.filter(doc => doc.isOfficial).length;
  const expiringDocuments = documents.filter(doc => doc.isExpiringSoon).length;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FolderOpen className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Document Vault</h1>
        </div>
        <p className="text-gray-600">
          Securely store, organize, and access all your business documents in one place.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold">{totalDocuments}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Storage Used</p>
                <p className="text-3xl font-bold">{formatFileSize(totalSize)}</p>
              </div>
              <Archive className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Official Documents</p>
                <p className="text-3xl font-bold">{officialDocuments}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-3xl font-bold text-orange-600">{expiringDocuments}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents by name or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="all">All Categories</option>
                {documentCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.count})
                  </option>
                ))}
              </select>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border rounded"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="type">Sort by Type</option>
                <option value="size">Sort by Size</option>
              </select>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">All Documents</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        {/* All Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Documents ({sortedDocuments.length})</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    List
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    Grid
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'list' ? (
                <div className="space-y-3">
                  {sortedDocuments.map((doc) => {
                    const status = getDocumentStatus(doc);
                    const StatusIcon = status.icon;
                    
                    return (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          {getFileIcon(doc.mimeType)}
                          <div className="flex-1">
                            <h3 className="font-medium">{doc.fileName}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{doc.documentType}</span>
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                              {doc.downloadCount && doc.downloadCount > 0 && (
                                <span>{doc.downloadCount} downloads</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.status}
                            </Badge>
                            {doc.accessLevel === 'private' ? (
                              <Lock className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Unlock className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* Preview logic */}}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocumentMutation.mutate(doc.id)}
                            disabled={downloadDocumentMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* Share logic */}}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDocumentMutation.mutate(doc.id)}
                            disabled={deleteDocumentMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedDocuments.map((doc) => {
                    const status = getDocumentStatus(doc);
                    const StatusIcon = status.icon;
                    
                    return (
                      <Card key={doc.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            {getFileIcon(doc.mimeType)}
                            <Badge className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.status}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-sm mb-2 truncate" title={doc.fileName}>
                            {doc.fileName}
                          </h3>
                          <div className="text-xs text-gray-600 space-y-1 mb-3">
                            <div>{doc.documentType}</div>
                            <div>{formatFileSize(doc.fileSize)}</div>
                            <div>{new Date(doc.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div className="flex justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadDocumentMutation.mutate(doc.id)}
                              disabled={downloadDocumentMutation.isPending}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {/* Preview logic */}}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {sortedDocuments.length === 0 && (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Documents Found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery 
                      ? "No documents match your search criteria."
                      : "Start by uploading your first document."
                    }
                  </p>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documentCategories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <category.icon className={`h-6 w-6 ${category.color}`} />
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-2xl font-bold">{category.count}</p>
                      <p className="text-sm text-gray-600">Documents</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-2xl font-bold">{formatFileSize(category.totalSize)}</p>
                      <p className="text-sm text-gray-600">Total Size</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    View Documents
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recent Activity */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest document uploads and downloads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.slice(0, 10).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.mimeType)}
                      <div>
                        <p className="font-medium">{doc.fileName}</p>
                        <p className="text-sm text-gray-600">
                          Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {doc.downloadCount || 0} downloads
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocumentMutation.mutate(doc.id)}
                        disabled={downloadDocumentMutation.isPending}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentVault;