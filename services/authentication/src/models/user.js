// User schema validation using Zod and JSON-Schema

// JSON-Schema for Fastify validation
export const userRegisterSchema = {
  type: 'object',
  required: ['email', 'password', 'fullName'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 },
    fullName: { type: 'string', minLength: 1 }
  }
};

export const userLoginSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string' }
  }
};

export function sanitizeUser(user) {
  // Remove sensitive fields before sending to client
  const { _id, email, fullName, createdAt, status } = user;
  return { userId: _id, email, fullName, createdAt, status };
}

// JSON-Schema for user response (shared by routes)
export const userResponseSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    email: { type: 'string', format: 'email' },
    fullName: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    status: { type: 'string' }
  },
  required: ['userId', 'email', 'fullName', 'createdAt', 'status'],
  additionalProperties: false
};