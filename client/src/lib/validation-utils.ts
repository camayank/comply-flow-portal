/**
 * Validation Utilities - Common Zod schemas and validation patterns
 * Use these reusable validators across forms for consistency
 */

import { z } from 'zod';

// ============ COMMON FIELD VALIDATORS ============

/**
 * Email validation with proper format checking
 */
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required')
  .toLowerCase()
  .trim();

/**
 * Optional email (can be empty string or valid email)
 */
export const optionalEmailSchema = z
  .string()
  .email('Please enter a valid email address')
  .optional()
  .or(z.literal(''));

/**
 * Indian phone number validation (10 digits)
 */
export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(13, 'Phone number must not exceed 13 digits')
  .regex(/^[+]?[0-9\s-()]*$/, 'Phone number can only contain digits, spaces, and symbols +, -, ()')
  .trim();

/**
 * PAN card validation (Indian tax ID)
 * Format: AAAAA9999A (5 letters, 4 digits, 1 letter)
 */
export const panSchema = z
  .string()
  .length(10, 'PAN must be exactly 10 characters')
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'PAN must be in format AAAAA9999A (e.g., ABCDE1234F)')
  .toUpperCase()
  .trim();

/**
 * Aadhar number validation (12 digits)
 */
export const aadharSchema = z
  .string()
  .length(12, 'Aadhar number must be exactly 12 digits')
  .regex(/^[0-9]{12}$/, 'Aadhar number must contain only digits');

/**
 * GST number validation
 * Format: 22AAAAA0000A1Z5 (2 digits for state code + 10 chars PAN + more)
 */
export const gstSchema = z
  .string()
  .length(15, 'GST number must be exactly 15 characters')
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/, 'Invalid GST number format')
  .toUpperCase()
  .trim();

/**
 * Indian pincode validation (6 digits)
 */
export const pincodeSchema = z
  .string()
  .length(6, 'Pincode must be exactly 6 digits')
  .regex(/^[1-9][0-9]{5}$/, 'Pincode must be a valid 6-digit number');

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .trim();

/**
 * Optional URL (can be empty)
 */
export const optionalUrlSchema = z
  .string()
  .url('Please enter a valid URL')
  .optional()
  .or(z.literal(''));

/**
 * Name validation (person or company)
 */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s.&'-]+$/, 'Name can only contain letters, spaces, and symbols . & \' -')
  .trim();

/**
 * Amount/currency validation (positive number)
 */
export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Please enter a valid amount (e.g., 1000 or 1000.50)')
  .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0');

/**
 * Positive integer validation
 */
export const positiveIntSchema = z
  .string()
  .regex(/^\d+$/, 'Please enter a valid positive number')
  .refine((val) => parseInt(val) > 0, 'Number must be greater than 0');

/**
 * Non-empty text validation
 */
export const requiredTextSchema = z
  .string()
  .min(1, 'This field is required')
  .trim();

/**
 * Optional text (can be empty)
 */
export const optionalTextSchema = z
  .string()
  .optional()
  .or(z.literal(''));

// ============ DATE VALIDATORS ============

/**
 * Future date validation
 */
export const futureDateSchema = z
  .date()
  .refine((date) => date > new Date(), 'Date must be in the future');

/**
 * Past date validation
 */
export const pastDateSchema = z
  .date()
  .refine((date) => date < new Date(), 'Date must be in the past');

/**
 * Optional future date
 */
export const optionalFutureDateSchema = z
  .date()
  .refine((date) => date > new Date(), 'Date must be in the future')
  .optional();

// ============ COMPOSITE VALIDATORS ============

/**
 * Address schema for Indian addresses
 */
export const addressSchema = z.object({
  addressLine1: requiredTextSchema.min(5, 'Address must be at least 5 characters'),
  addressLine2: optionalTextSchema,
  city: requiredTextSchema.min(2, 'City must be at least 2 characters'),
  state: requiredTextSchema,
  pincode: pincodeSchema,
});

/**
 * Contact details schema
 */
export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  alternatePhone: phoneSchema.optional().or(z.literal('')),
});

/**
 * Business entity basic info schema
 */
export const businessBasicSchema = z.object({
  companyName: nameSchema,
  pan: panSchema.optional().or(z.literal('')),
  gst: gstSchema.optional().or(z.literal('')),
  entityType: z.enum(['proprietorship', 'partnership', 'private_limited', 'public_limited', 'llp', 'one_person_company']),
});

// ============ FORM HELPERS ============

/**
 * Transform string to number safely
 */
export const stringToNumber = (schema: z.ZodString) =>
  schema.transform((val) => (val === '' ? undefined : parseFloat(val)));

/**
 * Transform string to integer safely
 */
export const stringToInt = (schema: z.ZodString) =>
  schema.transform((val) => (val === '' ? undefined : parseInt(val, 10)));

/**
 * Validate file size (in MB)
 */
export const fileSizeValidator = (maxSizeMB: number) =>
  z.custom<File>(
    (file) => {
      if (!(file instanceof File)) return false;
      return file.size <= maxSizeMB * 1024 * 1024;
    },
    { message: `File size must not exceed ${maxSizeMB}MB` }
  );

/**
 * Validate file type
 */
export const fileTypeValidator = (allowedTypes: string[]) =>
  z.custom<File>(
    (file) => {
      if (!(file instanceof File)) return false;
      return allowedTypes.includes(file.type);
    },
    { message: `File type must be one of: ${allowedTypes.join(', ')}` }
  );

// ============ ERROR FORMATTING ============

/**
 * Format Zod errors for display to users
 */
export function formatZodErrors(errors: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  errors.errors.forEach((error) => {
    const path = error.path.join('.');
    formatted[path] = error.message;
  });
  return formatted;
}

/**
 * Get first error message from Zod error
 */
export function getFirstError(errors: z.ZodError): string {
  return errors.errors[0]?.message || 'Validation failed';
}

// ============ EXAMPLE USAGE ============

/*
Example: Using in a form component

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { emailSchema, phoneSchema, amountSchema } from '@/lib/validation-utils';

const formSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  amount: amountSchema,
  description: requiredTextSchema,
  website: optionalUrlSchema,
});

type FormData = z.infer<typeof formSchema>;

export function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      phone: '',
      amount: '',
      description: '',
      website: '',
    }
  });

  const onSubmit = (data: FormData) => {
    // Form data is now validated and type-safe
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        // ... more fields
      </form>
    </Form>
  );
}
*/
