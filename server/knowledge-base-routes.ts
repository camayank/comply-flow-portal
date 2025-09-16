import { Express, Request, Response } from "express";
import { z } from "zod";
import { 
  insertKnowledgeArticleSchema, 
  insertKnowledgeCategorySchema,
  insertKnowledgeGapSchema,
  insertContentApprovalSchema,
  insertEnhancedFaqSchema,
  CONTENT_STATUS,
  CONTENT_TYPES 
} from "@shared/schema";

interface KnowledgeBaseStorage {
  // Knowledge Articles
  getAllKnowledgeArticles: (filters?: any) => Promise<{ articles: any[]; total: number }>;
  getKnowledgeArticle: (id: number) => Promise<any>;
  getKnowledgeArticleBySlug: (slug: string) => Promise<any>;
  createKnowledgeArticle: (article: any) => Promise<any>;
  updateKnowledgeArticle: (id: number, updates: any) => Promise<any>;
  deleteKnowledgeArticle: (id: number) => Promise<boolean>;
  publishKnowledgeArticle: (id: number) => Promise<any>;
  searchKnowledgeArticles: (query: string, filters?: any) => Promise<any[]>;
  
  // Knowledge Categories  
  getAllKnowledgeCategories: () => Promise<any[]>;
  getKnowledgeCategory: (id: number) => Promise<any>;
  createKnowledgeCategory: (category: any) => Promise<any>;
  updateKnowledgeCategory: (id: number, updates: any) => Promise<any>;
  deleteKnowledgeCategory: (id: number) => Promise<boolean>;
  getCategoryHierarchy: () => Promise<any[]>;
  
  // Analytics and Insights
  getKnowledgeInsights: () => Promise<any>;
  getPopularArticles: (limit?: number) => Promise<any[]>;
  trackKnowledgeEvent: (analytics: any) => Promise<any>;
  
  // Knowledge Gaps
  getAllKnowledgeGaps: (filters?: any) => Promise<any[]>;
  createKnowledgeGap: (gap: any) => Promise<any>;
  updateKnowledgeGap: (id: number, updates: any) => Promise<any>;
  
  // Content Approvals
  getContentApprovals: (filters?: any) => Promise<any[]>;
  createContentApproval: (approval: any) => Promise<any>;
  updateContentApproval: (id: number, updates: any) => Promise<any>;
  approveContent: (id: number, reviewerId: number, feedback?: string) => Promise<any>;
  rejectContent: (id: number, reviewerId: number, feedback: string) => Promise<any>;
  
  // Enhanced FAQs
  getAllEnhancedFaqs: (filters?: any) => Promise<any[]>;
  getEnhancedFaq: (id: number) => Promise<any>;
  createEnhancedFaq: (faq: any) => Promise<any>;
  updateEnhancedFaq: (id: number, updates: any) => Promise<any>;
  deleteEnhancedFaq: (id: number) => Promise<boolean>;
  searchEnhancedFaqs: (query: string) => Promise<any[]>;
  voteFaqHelpfulness: (id: number, helpful: boolean) => Promise<any>;
  
  // Search functionality
  fullTextSearch: (query: string, filters?: any) => Promise<any[]>;
  getSearchSuggestions: (partialQuery: string) => Promise<string[]>;
}

export function registerKnowledgeBaseRoutes(app: Express, storage: KnowledgeBaseStorage) {
  
  // ============================================================================
  // KNOWLEDGE ARTICLES MANAGEMENT
  // ============================================================================
  
  // Get all knowledge articles with filtering and pagination
  app.get("/api/knowledge/articles", async (req: Request, res: Response) => {
    try {
      const {
        search,
        category,
        tags,
        status = 'published',
        contentType,
        difficulty,
        limit = '20',
        offset = '0'
      } = req.query;
      
      const filters = {
        search: search as string,
        category: category as string,
        tags: tags ? (tags as string).split(',') : undefined,
        status: status as string,
        contentType: contentType as string,
        difficulty: difficulty as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };
      
      const result = await storage.getAllKnowledgeArticles(filters);
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching knowledge articles:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single knowledge article by ID
  app.get("/api/knowledge/articles/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const article = await storage.getKnowledgeArticle(parseInt(id));
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      // Track view event
      await storage.trackKnowledgeEvent({
        articleId: article.id,
        userId: req.body.userId || null,
        eventType: 'view',
        deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
        ipAddress: req.ip
      });
      
      res.json(article);
    } catch (error: any) {
      console.error('Error fetching knowledge article:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get knowledge article by slug
  app.get("/api/knowledge/articles/slug/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const article = await storage.getKnowledgeArticleBySlug(slug);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      // Track view event
      await storage.trackKnowledgeEvent({
        articleId: article.id,
        userId: req.body.userId || null,
        eventType: 'view',
        deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
        ipAddress: req.ip
      });
      
      res.json(article);
    } catch (error: any) {
      console.error('Error fetching knowledge article by slug:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create new knowledge article
  app.post("/api/knowledge/articles", async (req: Request, res: Response) => {
    try {
      const articleData = insertKnowledgeArticleSchema.parse(req.body);
      
      // Generate slug from title if not provided
      if (!articleData.slug) {
        articleData.slug = articleData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      
      const article = await storage.createKnowledgeArticle(articleData);
      
      // Create content approval workflow if needed
      if (articleData.status === CONTENT_STATUS.PENDING_REVIEW) {
        await storage.createContentApproval({
          articleId: article.id,
          versionId: 1, // Initial version
          workflowStage: 'initial_review',
          currentReviewerId: articleData.reviewerId || 1,
          reviewerRole: 'editor',
          status: 'pending'
        });
      }
      
      res.status(201).json(article);
    } catch (error: any) {
      console.error('Error creating knowledge article:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid article data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update knowledge article
  app.put("/api/knowledge/articles/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const article = await storage.updateKnowledgeArticle(parseInt(id), updates);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      res.json(article);
    } catch (error: any) {
      console.error('Error updating knowledge article:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete knowledge article
  app.delete("/api/knowledge/articles/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteKnowledgeArticle(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      res.json({ message: "Article deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting knowledge article:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Publish knowledge article
  app.post("/api/knowledge/articles/:id/publish", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const article = await storage.publishKnowledgeArticle(parseInt(id));
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      res.json(article);
    } catch (error: any) {
      console.error('Error publishing knowledge article:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // KNOWLEDGE CATEGORIES MANAGEMENT
  // ============================================================================
  
  // Get all knowledge categories
  app.get("/api/knowledge/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllKnowledgeCategories();
      res.json(categories);
    } catch (error: any) {
      console.error('Error fetching knowledge categories:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get category hierarchy
  app.get("/api/knowledge/categories/hierarchy", async (req: Request, res: Response) => {
    try {
      const hierarchy = await storage.getCategoryHierarchy();
      res.json(hierarchy);
    } catch (error: any) {
      console.error('Error fetching category hierarchy:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create new knowledge category
  app.post("/api/knowledge/categories", async (req: Request, res: Response) => {
    try {
      const categoryData = insertKnowledgeCategorySchema.parse(req.body);
      
      // Generate slug from name if not provided
      if (!categoryData.slug) {
        categoryData.slug = categoryData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      
      const category = await storage.createKnowledgeCategory(categoryData);
      res.status(201).json(category);
    } catch (error: any) {
      console.error('Error creating knowledge category:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid category data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update knowledge category
  app.put("/api/knowledge/categories/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const category = await storage.updateKnowledgeCategory(parseInt(id), updates);
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.json(category);
    } catch (error: any) {
      console.error('Error updating knowledge category:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete knowledge category
  app.delete("/api/knowledge/categories/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteKnowledgeCategory(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Category not found or has articles" });
      }
      
      res.json({ message: "Category deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting knowledge category:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // SEARCH AND ANALYTICS
  // ============================================================================
  
  // Search knowledge articles
  app.get("/api/knowledge/search", async (req: Request, res: Response) => {
    try {
      const { q, category, tags, difficulty, type = 'articles' } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      let results;
      
      if (type === 'articles') {
        const filters = {
          category: category as string,
          tags: tags ? (tags as string).split(',') : undefined,
          difficulty: difficulty as string
        };
        results = await storage.searchKnowledgeArticles(q, filters);
      } else if (type === 'faqs') {
        results = await storage.searchEnhancedFaqs(q);
      } else {
        // Full-text search across all content
        const filters = {
          contentType: type as string,
          category: category as string,
          tags: tags ? (tags as string).split(',') : undefined
        };
        results = await storage.fullTextSearch(q, filters);
      }
      
      // Track search event
      await storage.trackKnowledgeEvent({
        articleId: null,
        userId: req.body.userId || null,
        eventType: 'search',
        searchQuery: q,
        deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
        ipAddress: req.ip
      });
      
      res.json(results);
    } catch (error: any) {
      console.error('Error searching knowledge base:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get search suggestions
  app.get("/api/knowledge/search/suggestions", async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }
      
      const suggestions = await storage.getSearchSuggestions(q);
      res.json(suggestions);
    } catch (error: any) {
      console.error('Error getting search suggestions:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get knowledge base analytics and insights
  app.get("/api/knowledge/analytics", async (req: Request, res: Response) => {
    try {
      const insights = await storage.getKnowledgeInsights();
      res.json(insights);
    } catch (error: any) {
      console.error('Error fetching knowledge analytics:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get popular articles
  app.get("/api/knowledge/popular", async (req: Request, res: Response) => {
    try {
      const { limit = '10' } = req.query;
      const articles = await storage.getPopularArticles(parseInt(limit as string));
      res.json(articles);
    } catch (error: any) {
      console.error('Error fetching popular articles:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // KNOWLEDGE GAPS MANAGEMENT
  // ============================================================================
  
  // Get all knowledge gaps
  app.get("/api/knowledge/gaps", async (req: Request, res: Response) => {
    try {
      const { status, priority, category } = req.query;
      const filters = {
        status: status as string,
        priority: priority as string,
        category: category as string
      };
      
      const gaps = await storage.getAllKnowledgeGaps(filters);
      res.json(gaps);
    } catch (error: any) {
      console.error('Error fetching knowledge gaps:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create knowledge gap
  app.post("/api/knowledge/gaps", async (req: Request, res: Response) => {
    try {
      const gapData = insertKnowledgeGapSchema.parse(req.body);
      const gap = await storage.createKnowledgeGap(gapData);
      res.status(201).json(gap);
    } catch (error: any) {
      console.error('Error creating knowledge gap:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid gap data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update knowledge gap
  app.put("/api/knowledge/gaps/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const gap = await storage.updateKnowledgeGap(parseInt(id), updates);
      
      if (!gap) {
        return res.status(404).json({ error: "Knowledge gap not found" });
      }
      
      res.json(gap);
    } catch (error: any) {
      console.error('Error updating knowledge gap:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // ENHANCED FAQS MANAGEMENT
  // ============================================================================
  
  // Get all enhanced FAQs
  app.get("/api/knowledge/faqs", async (req: Request, res: Response) => {
    try {
      const { categoryId, search, difficulty, status } = req.query;
      const filters = {
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        search: search as string,
        difficulty: difficulty as string,
        status: status as string
      };
      
      const faqs = await storage.getAllEnhancedFaqs(filters);
      res.json(faqs);
    } catch (error: any) {
      console.error('Error fetching enhanced FAQs:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create enhanced FAQ
  app.post("/api/knowledge/faqs", async (req: Request, res: Response) => {
    try {
      const faqData = insertEnhancedFaqSchema.parse(req.body);
      const faq = await storage.createEnhancedFaq(faqData);
      res.status(201).json(faq);
    } catch (error: any) {
      console.error('Error creating enhanced FAQ:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid FAQ data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update enhanced FAQ
  app.put("/api/knowledge/faqs/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const faq = await storage.updateEnhancedFaq(parseInt(id), updates);
      
      if (!faq) {
        return res.status(404).json({ error: "FAQ not found" });
      }
      
      res.json(faq);
    } catch (error: any) {
      console.error('Error updating enhanced FAQ:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Vote on FAQ helpfulness
  app.post("/api/knowledge/faqs/:id/vote", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { helpful } = req.body;
      
      if (typeof helpful !== 'boolean') {
        return res.status(400).json({ error: "Helpful vote must be boolean" });
      }
      
      const faq = await storage.voteFaqHelpfulness(parseInt(id), helpful);
      
      if (!faq) {
        return res.status(404).json({ error: "FAQ not found" });
      }
      
      res.json(faq);
    } catch (error: any) {
      console.error('Error voting on FAQ:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // CONTENT APPROVAL WORKFLOW
  // ============================================================================
  
  // Get content approvals
  app.get("/api/knowledge/approvals", async (req: Request, res: Response) => {
    try {
      const { status, reviewerId, workflowStage } = req.query;
      const filters = {
        status: status as string,
        reviewerId: reviewerId ? parseInt(reviewerId as string) : undefined,
        workflowStage: workflowStage as string
      };
      
      const approvals = await storage.getContentApprovals(filters);
      res.json(approvals);
    } catch (error: any) {
      console.error('Error fetching content approvals:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Approve content
  app.post("/api/knowledge/approvals/:id/approve", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reviewerId, feedback } = req.body;
      
      if (!reviewerId) {
        return res.status(400).json({ error: "Reviewer ID is required" });
      }
      
      const approval = await storage.approveContent(parseInt(id), reviewerId, feedback);
      
      if (!approval) {
        return res.status(404).json({ error: "Content approval not found" });
      }
      
      res.json(approval);
    } catch (error: any) {
      console.error('Error approving content:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Reject content
  app.post("/api/knowledge/approvals/:id/reject", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reviewerId, feedback, changesRequested } = req.body;
      
      if (!reviewerId || !feedback) {
        return res.status(400).json({ error: "Reviewer ID and feedback are required" });
      }
      
      const approval = await storage.rejectContent(parseInt(id), reviewerId, feedback, changesRequested);
      
      if (!approval) {
        return res.status(404).json({ error: "Content approval not found" });
      }
      
      res.json(approval);
    } catch (error: any) {
      console.error('Error rejecting content:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  console.log("✅ Knowledge Base routes registered");
}