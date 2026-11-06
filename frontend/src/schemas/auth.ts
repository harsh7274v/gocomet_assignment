import { z } from 'zod';

export const userRoleSchema = z.enum(['BUYER', 'SUPPLIER']);

export const supplierProfileSchema = z.object({
  id: z.string(),
  carrier_name: z.string(),
  contact_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean().default(true),
  created_at: z.string().default(() => new Date().toISOString()),
  supplier_profile: supplierProfileSchema.optional().nullable(),
});

export const loginInputSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address (e.g. buyer@acme.com)'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long'),
});

export const authResponseSchema = z.object({
  access_token: z.string().min(1, 'Access token is required'),
  token_type: z.string().default('bearer'),
  user: userSchema,
});

export type LoginInput = z.infer<typeof loginInputSchema>;
export type UserSchemaType = z.infer<typeof userSchema>;
export type AuthResponseSchemaType = z.infer<typeof authResponseSchema>;
