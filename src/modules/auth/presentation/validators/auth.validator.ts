import { z } from 'zod';

export const registerBodySchema = z.object({
  companyName: z
    .string({ required_error: 'Company name is required' })
    .min(2, 'Company name must be at least 2 characters long')
    .max(100, 'Company name must not exceed 100 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email address is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters'),
});

export const loginBodySchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export type RegisterBodyInput = z.infer<typeof registerBodySchema>;
export type LoginBodyInput = z.infer<typeof loginBodySchema>;
