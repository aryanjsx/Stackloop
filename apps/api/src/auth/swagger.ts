export const swaggerAuthDocs = {
  openapi: '3.0.0',
  info: {
    title: 'StackLoop Auth API',
    version: '1.0.0',
    description: 'Production-ready GitHub OAuth authentication endpoints for StackLoop.',
  },
  paths: {
    '/auth/github/login': {
      get: {
        summary: 'Initiate GitHub OAuth login',
        parameters: [{ in: 'query', name: 'redirect_uri', schema: { type: 'string' } }],
        responses: { '302': { description: 'Redirect to GitHub OAuth provider' } },
      },
    },
    '/auth/github/callback': {
      post: {
        summary: 'Exchange OAuth code for StackLoop session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  state: { type: 'string' },
                  code_verifier: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Session created' } },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout the current session',
        responses: { '200': { description: 'Logout successful' } },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { refresh_token: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Tokens refreshed' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Return the current user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Authenticated user profile' } },
      },
    },
  },
};
