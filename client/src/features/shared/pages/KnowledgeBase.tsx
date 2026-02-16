import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/layouts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, BookOpen, Tag, Filter, Eye, ThumbsUp, ThumbsDown, Clock, User, Edit3, Trash2, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface KnowledgeArticle {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  contentType: string;
  category: string;
  subcategory?: string;
  tags: string[];
  difficulty: string;
  estimatedReadTime: number;
  status: string;
  authorId: number;
  viewCount: number;
  helpfulVotes: number;
  unhelpfulVotes: number;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  parentId?: number;
  icon?: string;
  color?: string;
  articleCount: number;
  totalViews: number;
}

interface KnowledgeInsights {
  totalArticles: number;
  totalViews: number;
  averageRating: number;
  popularCategories: Array<{
    category: string;
    views: number;
    articles: number;
  }>;
  searchTrends: Array<{
    query: string;
    count: number;
  }>;
  gapAnalysis: Array<{
    topic: string;
    searches: number;
    hasContent: boolean;
  }>;
}

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('articles');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch knowledge articles
  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['knowledge-articles', searchQuery, selectedCategory, selectedDifficulty],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
      
      const response = await fetch(`/api/knowledge/articles?${params}`);
      if (!response.ok) throw new Error('Failed to fetch articles');
      return response.json();
    }
  });

  // Fetch knowledge categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['knowledge-categories'],
    queryFn: async () => {
      const response = await fetch('/api/knowledge/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Fetch popular articles
  const { data: popularArticles } = useQuery({
    queryKey: ['popular-articles'],
    queryFn: async () => {
      const response = await fetch('/api/knowledge/popular?limit=5');
      if (!response.ok) throw new Error('Failed to fetch popular articles');
      return response.json();
    }
  });

  // Fetch knowledge insights
  const { data: insights } = useQuery({
    queryKey: ['knowledge-insights'],
    queryFn: async () => {
      const response = await fetch('/api/knowledge/analytics');
      if (!response.ok) throw new Error('Failed to fetch insights');
      return response.json();
    }
  });

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Vote on article helpfulness
  const voteHelpfulness = useMutation({
    mutationFn: async ({ articleId, helpful }: { articleId: number; helpful: boolean }) => {
      return apiRequest(`/api/knowledge/articles/${articleId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ helpful })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast({
        title: "Thank you!",
        description: "Your feedback has been recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return <BookOpen className="h-4 w-4" />;
      case 'procedure': return <Edit3 className="h-4 w-4" />;
      case 'best_practice': return <Star className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Knowledge Base
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Comprehensive documentation and best practices
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" data-testid="button-export-knowledge">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button data-testid="button-create-article">
                <Plus className="h-4 w-4 mr-2" />
                Create Article
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search knowledge base..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-knowledge"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((category: KnowledgeCategory) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-32" data-testid="select-difficulty">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" data-testid="button-filter">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Analytics Overview */}
              {insights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Articles</span>
                      <span className="font-medium" data-testid="text-total-articles">{insights.totalArticles}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Views</span>
                      <span className="font-medium" data-testid="text-total-views">{insights.totalViews}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</span>
                      <span className="font-medium" data-testid="text-avg-rating">{insights.averageRating.toFixed(1)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categories?.slice(0, 8).map((category: KnowledgeCategory) => (
                    <div
                      key={category.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedCategory === category.slug ? 'bg-blue-50 dark:bg-blue-900' : ''
                      }`}
                      onClick={() => setSelectedCategory(category.slug)}
                      data-testid={`category-${category.slug}`}
                    >
                      <div className="flex items-center gap-2">
                        {category.icon && <span>{category.icon}</span>}
                        <span className="text-sm">{category.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {category.articleCount}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Popular Articles */}
              {popularArticles && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Popular Articles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {popularArticles.slice(0, 5).map((article: KnowledgeArticle) => (
                      <div key={article.id} className="space-y-1">
                        <h4 className="text-sm font-medium line-clamp-2 hover:text-blue-600 cursor-pointer">
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Eye className="h-3 w-3" />
                          {article.viewCount}
                          <Clock className="h-3 w-3" />
                          {article.estimatedReadTime} min
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="articles">Articles</TabsTrigger>
                <TabsTrigger value="faqs">FAQs</TabsTrigger>
                <TabsTrigger value="gaps">Knowledge Gaps</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              {/* Articles Tab */}
              <TabsContent value="articles">
                {articlesLoading ? (
                  <div className="grid gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                        <div className="flex gap-2">
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {articlesData?.articles?.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {articlesData.total} articles found
                          </span>
                        </div>
                        
                        {articlesData.articles.map((article: KnowledgeArticle) => (
                          <Card key={article.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getContentTypeIcon(article.contentType)}
                                    <CardTitle className="text-lg hover:text-blue-600 cursor-pointer">
                                      {article.title}
                                    </CardTitle>
                                  </div>
                                  <CardDescription className="line-clamp-2">
                                    {article.summary}
                                  </CardDescription>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <Button variant="ghost" size="sm" data-testid={`button-edit-${article.id}`}>
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" data-testid={`button-delete-${article.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge className={getDifficultyColor(article.difficulty)}>
                                    {article.difficulty}
                                  </Badge>
                                  <div className="flex items-center gap-1 text-sm text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    {article.estimatedReadTime} min read
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-gray-500">
                                    <Eye className="h-3 w-3" />
                                    {article.viewCount} views
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => voteHelpfulness.mutate({ articleId: article.id, helpful: true })}
                                    data-testid={`button-helpful-${article.id}`}
                                  >
                                    <ThumbsUp className="h-4 w-4 mr-1" />
                                    {article.helpfulVotes}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => voteHelpfulness.mutate({ articleId: article.id, helpful: false })}
                                    data-testid={`button-unhelpful-${article.id}`}
                                  >
                                    <ThumbsDown className="h-4 w-4 mr-1" />
                                    {article.unhelpfulVotes}
                                  </Button>
                                </div>
                              </div>
                              
                              {article.tags && article.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {article.tags.map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          No articles found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {searchQuery ? 'Try adjusting your search terms or filters.' : 'Get started by creating your first article.'}
                        </p>
                        <Button data-testid="button-create-first-article">
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Article
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* FAQs Tab */}
              <TabsContent value="faqs">
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    FAQs Management
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    FAQ management interface coming soon...
                  </p>
                </div>
              </TabsContent>

              {/* Knowledge Gaps Tab */}
              <TabsContent value="gaps">
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Knowledge Gaps Analysis
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Identify and track knowledge gaps in your documentation...
                  </p>
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics">
                <div className="grid gap-6">
                  {insights && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Popular Categories</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {insights.popularCategories.slice(0, 5).map((cat, index) => (
                                <div key={index} className="flex justify-between items-center">
                                  <span className="text-sm">{cat.category}</span>
                                  <Badge variant="outline">{cat.views} views</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Search Trends</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {insights.searchTrends.slice(0, 5).map((trend, index) => (
                                <div key={index} className="flex justify-between items-center">
                                  <span className="text-sm">{trend.query}</span>
                                  <Badge variant="outline">{trend.count}</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Content Gaps</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {insights.gapAnalysis.slice(0, 5).map((gap, index) => (
                                <div key={index} className="flex justify-between items-center">
                                  <span className="text-sm">{gap.topic}</span>
                                  <Badge variant={gap.hasContent ? "secondary" : "destructive"}>
                                    {gap.hasContent ? "Covered" : "Gap"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}