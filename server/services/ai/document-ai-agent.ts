/**
 * Document AI Agent
 *
 * AI-powered document intelligence:
 * - Auto-classify documents
 * - Extract key information
 * - Document Q&A
 * - Translation
 * - Expiry detection
 */

import { aiGateway } from './ai-gateway';

interface DocumentMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: Date;
  textContent?: string;
}

interface ClassificationResult {
  category: string;
  subCategory?: string;
  confidence: number;
  documentType: string;
  suggestedTags: string[];
  isCompliance: boolean;
  expiryDetected?: {
    hasExpiry: boolean;
    expiryDate?: string;
    renewalRequired?: boolean;
  };
}

interface ExtractedData {
  documentNumber?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  holderName?: string;
  holderAddress?: string;
  keyValues: Record<string, string>;
  amounts?: Array<{ description: string; amount: number; currency: string }>;
  dates?: Array<{ type: string; date: string }>;
  signatures?: Array<{ name: string; designation: string }>;
}

interface DocumentQAResponse {
  answer: string;
  confidence: number;
  sourceSection?: string;
  pageReference?: string;
  relatedQuestions?: string[];
}

/**
 * Document AI Agent
 */
class DocumentAIAgent {

  // Document category definitions
  private categories = {
    identity: ['Aadhaar', 'PAN Card', 'Passport', 'Driving License', 'Voter ID'],
    business: ['COI', 'MOA', 'AOA', 'GST Certificate', 'MSME Certificate', 'IEC', 'Shop Act', 'FSSAI'],
    financial: ['Bank Statement', 'ITR', 'Balance Sheet', 'P&L Statement', 'Audit Report', 'Invoice'],
    tax: ['GST Return', 'TDS Certificate', 'Tax Challan', 'Form 16', 'Form 26AS'],
    legal: ['Contract', 'Agreement', 'NDA', 'MOU', 'Board Resolution', 'Power of Attorney'],
    hr: ['Appointment Letter', 'Salary Slip', 'Form 11', 'PF Statement', 'ESI Card'],
    property: ['Sale Deed', 'Lease Agreement', 'Rent Agreement', 'Property Tax Receipt'],
    other: ['General Document']
  };

  /**
   * Classify document automatically
   */
  async classifyDocument(
    document: DocumentMetadata,
    textSample?: string
  ): Promise<ClassificationResult> {
    const systemPrompt = `You are an expert document classifier for Indian business documents. Classify documents into appropriate categories.

Categories:
- identity: Aadhaar, PAN, Passport, DL, Voter ID
- business: COI, MOA, AOA, GST Certificate, MSME, IEC, Shop Act, FSSAI
- financial: Bank Statement, ITR, Balance Sheet, P&L, Audit Report, Invoice
- tax: GST Return, TDS Certificate, Tax Challan, Form 16, Form 26AS
- legal: Contract, Agreement, NDA, MOU, Board Resolution, POA
- hr: Appointment Letter, Salary Slip, PF documents, ESI
- property: Sale Deed, Lease, Rent Agreement, Property Tax
- other: Unclassified

Also detect:
- Document expiry dates
- Renewal requirements
- Compliance relevance`;

    const textContent = textSample || document.textContent || '';

    const userMessage = `Classify this document:

File Name: ${document.fileName}
File Type: ${document.fileType}
File Size: ${document.fileSize} bytes

${textContent ? `Content Sample:\n${textContent.substring(0, 3000)}` : 'No text content available'}

Provide classification in JSON format:
{
  "category": "identity|business|financial|tax|legal|hr|property|other",
  "subCategory": "specific document type",
  "confidence": 0.0-1.0,
  "documentType": "exact document name",
  "suggestedTags": ["relevant tags"],
  "isCompliance": true/false,
  "expiryDetected": {
    "hasExpiry": true/false,
    "expiryDate": "YYYY-MM-DD or null",
    "renewalRequired": true/false
  }
}`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { provider: 'anthropic', temperature: 0.2 }
    );

    const defaultResult: ClassificationResult = {
      category: 'other',
      confidence: 0.5,
      documentType: 'Unknown Document',
      suggestedTags: [],
      isCompliance: false
    };

    if (!response.success || !response.content) {
      return defaultResult;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultResult, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Document AI] Failed to parse classification:', e);
    }

    return defaultResult;
  }

  /**
   * Extract key information from document
   */
  async extractInformation(
    documentText: string,
    documentType?: string
  ): Promise<ExtractedData> {
    const systemPrompt = `You are an expert at extracting structured information from Indian business and compliance documents.

Extract:
- Document numbers (PAN, GST, CIN, etc.)
- Issuing authority
- Issue and expiry dates
- Names and addresses
- Key-value pairs
- Monetary amounts
- Important dates
- Signatures and designations

Be precise with Indian document formats:
- PAN: XXXXX0000X
- GST: 00XXXXX0000X0X0
- CIN: U00000XX0000XXX000000
- Aadhaar: 0000 0000 0000`;

    const userMessage = `Extract information from this ${documentType || 'document'}:

${documentText.substring(0, 6000)}

Provide extraction in JSON format:
{
  "documentNumber": "primary document ID",
  "issuingAuthority": "issuer name",
  "issueDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD or null",
  "holderName": "name on document",
  "holderAddress": "address if present",
  "keyValues": {"field": "value"},
  "amounts": [{"description": "string", "amount": number, "currency": "INR"}],
  "dates": [{"type": "string", "date": "YYYY-MM-DD"}],
  "signatures": [{"name": "string", "designation": "string"}]
}`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { provider: 'anthropic', temperature: 0.1 }
    );

    const defaultData: ExtractedData = {
      keyValues: {},
      amounts: [],
      dates: [],
      signatures: []
    };

    if (!response.success || !response.content) {
      return defaultData;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultData, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Document AI] Failed to parse extraction:', e);
    }

    return defaultData;
  }

  /**
   * Answer questions about a document
   */
  async answerQuestion(
    documentText: string,
    question: string,
    documentType?: string
  ): Promise<DocumentQAResponse> {
    const systemPrompt = `You are a document analysis assistant. Answer questions about documents accurately, citing specific sections when possible.

Guidelines:
- Be precise and factual
- Quote relevant text when helpful
- Indicate confidence level
- Suggest related questions`;

    const userMessage = `Document Type: ${documentType || 'Unknown'}

Document Content:
${documentText.substring(0, 8000)}

Question: ${question}

Provide answer in JSON format:
{
  "answer": "detailed answer",
  "confidence": 0.0-1.0,
  "sourceSection": "relevant section from document",
  "pageReference": "page/section number if identifiable",
  "relatedQuestions": ["other relevant questions"]
}`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { provider: 'anthropic', temperature: 0.2 }
    );

    const defaultResponse: DocumentQAResponse = {
      answer: 'Unable to answer the question based on the document.',
      confidence: 0,
      relatedQuestions: []
    };

    if (!response.success || !response.content) {
      return defaultResponse;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultResponse, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      // Return raw text as answer
      return {
        answer: response.content,
        confidence: 0.7,
        relatedQuestions: []
      };
    }

    return defaultResponse;
  }

  /**
   * Translate document content
   */
  async translateDocument(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    preserveFormatting: boolean = true
  ): Promise<{
    translatedText: string;
    confidence: number;
    warnings?: string[];
  }> {
    const systemPrompt = `You are an expert translator specializing in Indian business and legal documents.

Guidelines:
- Preserve technical and legal terminology
- Maintain document structure
- Note any ambiguous translations
- Keep numbers and proper nouns unchanged
- Preserve formatting if requested`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Translate from ${sourceLanguage} to ${targetLanguage}:

${text.substring(0, 6000)}

${preserveFormatting ? 'Preserve the original formatting and structure.' : ''}

Provide in JSON:
{
  "translatedText": "translation",
  "confidence": 0.0-1.0,
  "warnings": ["any translation notes"]
}`
        }
      ],
      { provider: 'gemini', temperature: 0.2 } // Gemini is good for translation
    );

    if (!response.success || !response.content) {
      return {
        translatedText: text,
        confidence: 0,
        warnings: ['Translation failed']
      };
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      return {
        translatedText: response.content,
        confidence: 0.7,
        warnings: []
      };
    }

    return {
      translatedText: response.content,
      confidence: 0.7,
      warnings: []
    };
  }

  /**
   * Summarize document
   */
  async summarizeDocument(
    documentText: string,
    documentType?: string,
    summaryLength: 'brief' | 'detailed' = 'brief'
  ): Promise<{
    summary: string;
    keyPoints: string[];
    actionItems?: string[];
    importantDates?: Array<{ event: string; date: string }>;
  }> {
    const lengthInstructions = summaryLength === 'brief'
      ? '2-3 sentences'
      : '1-2 paragraphs';

    const response = await aiGateway.complete(
      [
        {
          role: 'system',
          content: 'You are a document summarization expert for business documents.'
        },
        {
          role: 'user',
          content: `Summarize this ${documentType || 'document'} (${lengthInstructions}):

${documentText.substring(0, 8000)}

Format as JSON:
{
  "summary": "concise summary",
  "keyPoints": ["main points"],
  "actionItems": ["required actions if any"],
  "importantDates": [{"event": "string", "date": "string"}]
}`
        }
      ],
      { provider: 'anthropic', temperature: 0.3 }
    );

    const defaultSummary = {
      summary: 'Unable to summarize document',
      keyPoints: [],
      actionItems: [],
      importantDates: []
    };

    if (!response.success || !response.content) {
      return defaultSummary;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultSummary, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      return {
        summary: response.content,
        keyPoints: [],
        actionItems: [],
        importantDates: []
      };
    }

    return defaultSummary;
  }

  /**
   * Compare two documents
   */
  async compareDocuments(
    doc1Text: string,
    doc2Text: string,
    comparisonType: 'changes' | 'compliance' | 'general' = 'general'
  ): Promise<{
    summary: string;
    similarities: string[];
    differences: string[];
    recommendations?: string[];
    riskAreas?: string[];
  }> {
    const response = await aiGateway.complete(
      [
        {
          role: 'system',
          content: `You are a document comparison expert. Compare documents for ${comparisonType === 'changes' ? 'changes and revisions' : comparisonType === 'compliance' ? 'compliance alignment' : 'general differences'}.`
        },
        {
          role: 'user',
          content: `Compare these two documents:

DOCUMENT 1:
${doc1Text.substring(0, 4000)}

DOCUMENT 2:
${doc2Text.substring(0, 4000)}

Provide comparison in JSON:
{
  "summary": "overall comparison summary",
  "similarities": ["what's the same"],
  "differences": ["what's different"],
  "recommendations": ["suggested actions"],
  "riskAreas": ["potential issues"]
}`
        }
      ],
      { provider: 'anthropic', temperature: 0.2 }
    );

    const defaultComparison = {
      summary: 'Unable to compare documents',
      similarities: [],
      differences: [],
      recommendations: [],
      riskAreas: []
    };

    if (!response.success || !response.content) {
      return defaultComparison;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultComparison, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Document AI] Failed to parse comparison:', e);
    }

    return defaultComparison;
  }

  /**
   * Validate document for compliance
   */
  async validateForCompliance(
    documentText: string,
    documentType: string,
    entityType: string
  ): Promise<{
    isValid: boolean;
    validationScore: number;
    issues: Array<{
      severity: 'error' | 'warning' | 'info';
      field: string;
      issue: string;
      suggestion: string;
    }>;
    missingFields: string[];
    recommendations: string[];
  }> {
    const response = await aiGateway.complete(
      [
        {
          role: 'system',
          content: `You are a compliance document validator for Indian businesses. Validate ${documentType} documents for ${entityType} entities.`
        },
        {
          role: 'user',
          content: `Validate this ${documentType} for compliance:

${documentText.substring(0, 6000)}

Entity Type: ${entityType}

Check for:
- Required fields
- Format correctness
- Consistency
- Regulatory compliance
- Common errors

Format as JSON:
{
  "isValid": true/false,
  "validationScore": 0-100,
  "issues": [
    {"severity": "error|warning|info", "field": "string", "issue": "string", "suggestion": "string"}
  ],
  "missingFields": ["required fields not found"],
  "recommendations": ["improvement suggestions"]
}`
        }
      ],
      { provider: 'anthropic', temperature: 0.1 }
    );

    const defaultValidation = {
      isValid: false,
      validationScore: 0,
      issues: [],
      missingFields: [],
      recommendations: []
    };

    if (!response.success || !response.content) {
      return defaultValidation;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultValidation, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Document AI] Failed to parse validation:', e);
    }

    return defaultValidation;
  }
}

export const documentAIAgent = new DocumentAIAgent();
export default documentAIAgent;
