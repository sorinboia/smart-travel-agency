// User schema validation using Zod

import { z } from 'zod';

export const userRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1)
});

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export function sanitizeUser(user) {
  // Remove sensitive fields before sending to client
  const { _id, email, fullName, createdAt, status } = user;
  return { userId: _id, email, fullName, createdAt, status };
}