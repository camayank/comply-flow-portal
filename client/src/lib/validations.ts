import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid phone number. Must be a valid 10-digit Indian mobile number');

export const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format. Format: ABCDE1234F');

export const gstinSchema = z
  .string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format');

export const cinSchema = z
  .string()
  .regex(/^[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/, 'Invalid CIN format');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const pincodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Invalid pincode. Must be 6 digits');

export const ifscSchema = z
  .string()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format');

// Auth validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: phoneSchema,
    businessName: z.string().optional(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    otp: z.string().length(6, 'OTP must be 6 digits'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Client validation schemas
export const clientProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  email: emailSchema,
  phone: phoneSchema,
  pan: panSchema.optional(),
  gstin: gstinSchema.optional(),
  cin: cinSchema.optional(),
  businessType: z.enum([
    'INDIVIDUAL',
    'PARTNERSHIP',
    'LLP',
    'PRIVATE_LIMITED',
    'PUBLIC_LIMITED',
    'OPC',
  ]),
  industry: z.string().optional(),
  address: z
    .object({
      street: z.string().min(5, 'Street address must be at least 5 characters'),
      city: z.string().min(2, 'City must be at least 2 characters'),
      state: z.string().min(2, 'State must be at least 2 characters'),
      pincode: pincodeSchema,
      country: z.string().default('India'),
    })
    .optional(),
});

// Lead validation schemas
export const createLeadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  phone: phoneSchema,
  businessName: z.string().optional(),
  source: z.enum(['WEBSITE', 'REFERRAL', 'AGENT', 'DIRECT', 'MARKETING']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  notes: z.string().optional(),
});

// Service booking schema
export const bookServiceSchema = z.object({
  serviceId: z.string().min(1, 'Service is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  notes: z.string().optional(),
});

// Task creation schema
export const createTaskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

// Proposal creation schema
export const createProposalSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  services: z
    .array(
      z.object({
        serviceId: z.string(),
        quantity: z.number().min(1),
        price: z.number().min(0),
      })
    )
    .min(1, 'At least one service is required'),
  validUntil: z.string(),
  termsAndConditions: z.string().optional(),
});

// Agent registration schema
export const agentRegistrationSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: phoneSchema,
  businessName: z.string().optional(),
  pan: panSchema,
  gstin: gstinSchema.optional(),
  bankDetails: z.object({
    accountNumber: z.string().min(9, 'Invalid account number'),
    ifscCode: ifscSchema,
    accountHolderName: z.string().min(2, 'Account holder name is required'),
    bankName: z.string().min(2, 'Bank name is required'),
  }),
});

// Document upload schema
export const documentUploadSchema = z.object({
  category: z.enum(['IDENTITY', 'ADDRESS', 'BUSINESS', 'TAX', 'COMPLIANCE', 'OTHER']),
  file: z.any().refine((file) => file instanceof File, 'File is required'),
});

// Export type inference helpers
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type OTPFormData = z.infer<typeof otpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ClientProfileFormData = z.infer<typeof clientProfileSchema>;
export type CreateLeadFormData = z.infer<typeof createLeadSchema>;
export type BookServiceFormData = z.infer<typeof bookServiceSchema>;
export type CreateTaskFormData = z.infer<typeof createTaskSchema>;
export type CreateProposalFormData = z.infer<typeof createProposalSchema>;
export type AgentRegistrationFormData = z.infer<typeof agentRegistrationSchema>;
export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;
