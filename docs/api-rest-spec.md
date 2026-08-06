# StackLoop REST API Specification

## 1. API Conventions

### Base URL
```text
https://api.stackloop.dev/v1
```

### Versioning
- API version is included in the URL path as /v1
- Breaking changes require a new version
- Non-breaking changes should be additive

### Authentication
- Public endpoints: no authentication required
- Authenticated endpoints: Bearer token in Authorization header
- Admin endpoints: role-based access control with admin scope

### Content Type
- Request/response: application/json
- File upload endpoints: multipart/form-data

### Common Response Shape
```json
{
  "data": {},
  "meta": {
    "request_id": "uuid",
    "timestamp": "2026-08-07T00:00:00Z"
  }
}
```

### Error Response Shape
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request payload is invalid.",
    "details": []
  },
  "meta": {
    "request_id": "uuid"
  }
}
```

### Pagination
- Default page size: 20
- Maximum page size: 100
- Use query parameters: page and page_size
- Response includes pagination metadata

### Rate Limits
- Anonymous: 60 requests/minute
- Authenticated: 600 requests/minute
- Admin: 1200 requests/minute
- Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

---

## 2. Authentication Endpoints

### 2.1 Initiate GitHub OAuth
- Method: GET
- URL: /v1/auth/github
- Description: Initiate GitHub OAuth login flow
- Authentication: None
- Request: Query parameters optional: redirect_uri
- Response: 302 redirect to GitHub OAuth provider
- Errors:
  - 400 invalid redirect_uri
  - 500 provider unavailable
- Validation:
  - redirect_uri must be a safe absolute URL
- Rate Limits: 30/minute per IP
- Pagination: Not applicable
- Versioning: v1

### 2.2 Exchange OAuth Code
- Method: POST
- URL: /v1/auth/github/callback
- Description: Exchange OAuth code for a StackLoop session token
- Authentication: None
- Request:
```json
{
  "code": "string",
  "state": "string"
}
```
- Response:
```json
{
  "data": {
    "access_token": "string",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "username": "string",
      "display_name": "string"
    }
  }
}
```
- Errors:
  - 400 invalid code/state
  - 401 unauthorized
  - 409 account already linked to another provider
- Validation:
  - code and state required
- Rate Limits: 20/minute per IP
- Pagination: Not applicable
- Versioning: v1

### 2.3 Get Current User
- Method: GET
- URL: /v1/auth/me
- Description: Return the authenticated user profile
- Authentication: Bearer token required
- Request: None
- Response:
```json
{
  "data": {
    "id": "uuid",
    "username": "string",
    "display_name": "string",
    "email": "string",
    "avatar_url": "string",
    "role": "user"
  }
}
```
- Errors:
  - 401 unauthorized
  - 403 forbidden
- Validation: None
- Rate Limits: 120/minute per user
- Pagination: Not applicable
- Versioning: v1

### 2.4 Logout
- Method: POST
- URL: /v1/auth/logout
- Description: Invalidate the current session token
- Authentication: Bearer token required
- Request: None
- Response:
```json
{
  "data": {
    "success": true
  }
}
```
- Errors:
  - 401 unauthorized
- Validation: None
- Rate Limits: 60/minute per user
- Pagination: Not applicable
- Versioning: v1

### 2.5 Refresh Token
- Method: POST
- URL: /v1/auth/refresh
- Description: Refresh an expired access token
- Authentication: Bearer token required
- Request:
```json
{
  "refresh_token": "string"
}
```
- Response:
```json
{
  "data": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": 3600
  }
}
```
- Errors:
  - 401 invalid refresh token
- Validation:
  - refresh_token required
- Rate Limits: 60/minute per user
- Pagination: Not applicable
- Versioning: v1

---

## 3. Repositories Endpoints

### 3.1 List Repositories
- Method: GET
- URL: /v1/repositories
- Description: List repositories with filtering and sorting
- Authentication: None
- Request:
  - query: optional search term
  - category: optional UUID
  - technology: optional UUID
  - language: optional string
  - sort: newest|popular|updated|recommended
  - page: integer
  - page_size: integer
- Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "full_name": "owner/repo",
      "name": "repo",
      "description": "string",
      "stargazers_count": 1200,
      "forks_count": 300,
      "language": "TypeScript",
      "is_verified": true
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 12500
  }
}
```
- Errors:
  - 400 invalid query params
- Validation:
  - page >= 1
  - page_size between 1 and 100
- Rate Limits: 120/minute per IP
- Pagination: Supported
- Versioning: v1

### 3.2 Get Repository by ID
- Method: GET
- URL: /v1/repositories/{repository_id}
- Description: Return repository detail and metadata
- Authentication: None
- Request: Path parameter repository_id
- Response:
```json
{
  "data": {
    "id": "uuid",
    "full_name": "owner/repo",
    "description": "string",
    "repository_url": "string",
    "stargazers_count": 1200,
    "forks_count": 300,
    "open_issues_count": 42,
    "technologies": [],
    "categories": [],
    "ai_summary": {
      "summary": "string",
      "confidence_score": 0.92
    }
  }
}
```
- Errors:
  - 404 repository not found
- Validation:
  - repository_id must be a valid UUID
- Rate Limits: 180/minute per IP
- Pagination: Not applicable
- Versioning: v1

### 3.3 Create Repository Record
- Method: POST
- URL: /v1/repositories
- Description: Create a repository record for a verified or claimed repo
- Authentication: Bearer token required
- Request:
```json
{
  "github_id": 12345,
  "owner_login": "owner",
  "name": "repo",
  "description": "string"
}
```
- Response:
```json
{
  "data": {
    "id": "uuid",
    "full_name": "owner/repo"
  }
}
```
- Errors:
  - 400 invalid body
  - 409 repository already exists
  - 403 forbidden
- Validation:
  - github_id required integer
  - owner_login and name required
- Rate Limits: 60/minute per user
- Pagination: Not applicable
- Versioning: v1

### 3.4 Update Repository Metadata
- Method: PATCH
- URL: /v1/repositories/{repository_id}
- Description: Update repository metadata for verified maintainers
- Authentication: Bearer token required
- Request:
```json
{
  "description": "string",
  "homepage_url": "string",
  "is_verified": true
}
```
- Response:
```json
{
  "data": {
    "id": "uuid",
    "updated_at": "timestamp"
  }
}
```
- Errors:
  - 403 unauthorized maintainer action
  - 404 repository not found
- Validation:
  - fields must be valid strings or booleans
- Rate Limits: 120/minute per user
- Pagination: Not applicable
- Versioning: v1

### 3.5 Claim Repository
- Method: POST
- URL: /v1/repositories/{repository_id}/claim
- Description: Claim repository ownership for a maintainer
- Authentication: Bearer token required
- Request:
```json
{
  "verification_code": "string"
}
```
- Response:
```json
{
  "data": {
    "claimed": true,
    "maintainer_id": "uuid"
  }
}
```
- Errors:
  - 400 invalid verification code
  - 409 already claimed
- Validation:
  - verification_code required
- Rate Limits: 30/minute per user
- Pagination: Not applicable
- Versioning: v1

---

## 4. Search Endpoints

### 4.1 Global Search
- Method: GET
- URL: /v1/search
- Description: Search repositories, technologies, maintainers, contributors, categories, and collections
- Authentication: None
- Request:
  - q: required string
  - type: optional repository|technology|maintainer|contributor|category|collection
  - page: integer
  - page_size: integer
- Response:
```json
{
  "data": {
    "repositories": [],
    "technologies": [],
    "maintainers": [],
    "categories": []
  },
  "meta": {
    "page": 1,
    "page_size": 20
  }
}
```
- Errors:
  - 400 invalid query
- Validation:
  - q length between 1 and 200
- Rate Limits: 120/minute per IP
- Pagination: Supported per group
- Versioning: v1

### 4.2 Search Suggestions
- Method: GET
- URL: /v1/search/suggestions
- Description: Return autocomplete suggestions
- Authentication: None
- Request:
  - q: required string
- Response:
```json
{
  "data": [
    { "type": "repository", "value": "owner/repo" },
    { "type": "technology", "value": "Next.js" }
  ]
}
```
- Errors:
  - 400 invalid query
- Validation:
  - q length between 1 and 100
- Rate Limits: 60/minute per IP
- Pagination: Not applicable
- Versioning: v1

---

## 5. Categories Endpoints

### 5.1 List Categories
- Method: GET
- URL: /v1/categories
- Description: List all categories
- Authentication: None
- Request:
  - page, page_size
- Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "ai",
      "name": "AI",
      "description": "string"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 12
  }
}
```
- Errors:
  - 400 invalid pagination params
- Validation:
  - pagination values valid
- Rate Limits: 120/minute per IP
- Pagination: Supported
- Versioning: v1

### 5.2 Get Category by ID or Slug
- Method: GET
- URL: /v1/categories/{category_id_or_slug}
- Description: Return category details and featured repositories
- Authentication: None
- Request: Path parameter
- Response:
```json
{
  "data": {
    "id": "uuid",
    "slug": "ai",
    "name": "AI",
    "description": "string",
    "repositories": []
  }
}
```
- Errors:
  - 404 category not found
- Validation:
  - category identifier must be valid
- Rate Limits: 120/minute per IP
- Pagination: Not applicable
- Versioning: v1

---

## 6. Recommendations Endpoints

### 6.1 Get Recommendations
- Method: GET
- URL: /v1/recommendations
- Description: Return personalized repository recommendations
- Authentication: Bearer token required
- Request:
  - page, page_size
- Response:
```json
{
  "data": [
    {
      "repository": {
        "id": "uuid",
        "full_name": "owner/repo"
      },
      "score": 0.97,
      "reason": "Matches your interest in AI and TypeScript"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20
  }
}
```
- Errors:
  - 401 unauthorized
- Validation:
  - page and page_size valid
- Rate Limits: 180/minute per user
- Pagination: Supported
- Versioning: v1

### 6.2 Refresh Recommendations
- Method: POST
- URL: /v1/recommendations/refresh
- Description: Trigger recommendation refresh for the authenticated user
- Authentication: Bearer token required
- Request: None
- Response:
```json
{
  "data": {
    "status": "queued"
  }
}
```
- Errors:
  - 202 accepted for async generation
- Validation: None
- Rate Limits: 20/minute per user
- Pagination: Not applicable
- Versioning: v1

---

## 7. Collections Endpoints

### 7.1 List Collections
- Method: GET
- URL: /v1/collections
- Description: List public collections and user-owned collections
- Authentication: None for public collections, Bearer for private collections
- Request:
  - page, page_size
- Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "AI Starter Projects",
      "description": "string",
      "is_public": true
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 120
  }
}
```
- Errors:
  - 401 unauthorized when requesting private collections without auth
- Validation:
  - pagination valid
- Rate Limits: 120/minute per IP or user
- Pagination: Supported
- Versioning: v1

### 7.2 Create Collection
- Method: POST
- URL: /v1/collections
- Description: Create a new collection
- Authentication: Bearer token required
- Request:
```json
{
  "name": "AI Starter Projects",
  "description": "string",
  "is_public": false
}
```
- Response:
```json
{
  "data": {
    "id": "uuid",
    "name": "AI Starter Projects"
  }
}
```
- Errors:
  - 400 invalid payload
- Validation:
  - name required; max length 255
- Rate Limits: 60/minute per user
- Pagination: Not applicable
- Versioning: v1

### 7.3 Get Collection by ID
- Method: GET
- URL: /v1/collections/{collection_id}
- Description: Return a collection and its repositories
- Authentication: None for public, Bearer for private
- Request: Path parameter
- Response:
```json
{
  "data": {
    "id": "uuid",
    "name": "AI Starter Projects",
    "repositories": []
  }
}
```
- Errors:
  - 404 collection not found
  - 403 forbidden for private collection
- Validation:
  - collection_id must be a valid UUID
- Rate Limits: 120/minute per IP or user
- Pagination: Not applicable
- Versioning: v1

### 7.4 Add Repository to Collection
- Method: POST
- URL: /v1/collections/{collection_id}/repositories
- Description: Add a repository to a collection
- Authentication: Bearer token required
- Request:
```json
{
  "repository_id": "uuid"
}
```
- Response:
```json
{
  "data": {
    "added": true
  }
}
```
- Errors:
  - 404 collection or repository not found
  - 409 already added
- Validation:
  - repository_id required UUID
- Rate Limits: 60/minute per user
- Pagination: Not applicable
- Versioning: v1

---

## 8. Learning Paths Endpoints

### 8.1 List Learning Paths
- Method: GET
- URL: /v1/learning-paths
- Description: List learning paths
- Authentication: None
- Request:
  - difficulty: optional
  - page, page_size
- Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "nextjs-for-beginners",
      "title": "Next.js for Beginners",
      "difficulty": "beginner"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 40
  }
}
```
- Errors:
  - 400 invalid query params
- Validation:
  - difficulty must be one of beginner|intermediate|advanced
- Rate Limits: 120/minute per IP
- Pagination: Supported
- Versioning: v1

### 8.2 Get Learning Path by ID
- Method: GET
- URL: /v1/learning-paths/{learning_path_id}
- Description: Return path details and associated repositories
- Authentication: None
- Request: Path parameter
- Response:
```json
{
  "data": {
    "id": "uuid",
    "slug": "nextjs-for-beginners",
    "title": "Next.js for Beginners",
    "description": "string",
    "repositories": []
  }
}
```
- Errors:
  - 404 learning path not found
- Validation:
  - learning_path_id must be a valid UUID
- Rate Limits: 120/minute per IP
- Pagination: Not applicable
- Versioning: v1

---

## 9. Users Endpoints

### 9.1 Get User Profile
- Method: GET
- URL: /v1/users/{user_id}
- Description: Return a public user profile
- Authentication: None
- Request: Path parameter user_id
- Response:
```json
{
  "data": {
    "id": "uuid",
    "username": "string",
    "display_name": "string",
    "avatar_url": "string",
    "bio": "string"
  }
}
```
- Errors:
  - 404 user not found
- Validation:
  - user_id must be a valid UUID
- Rate Limits: 120/minute per IP
- Pagination: Not applicable
- Versioning: v1

### 9.2 Update User Profile
- Method: PATCH
- URL: /v1/users/me
- Description: Update the authenticated user profile
- Authentication: Bearer token required
- Request:
```json
{
  "display_name": "string",
  "bio": "string",
  "location": "string"
}
```
- Response:
```json
{
  "data": {
    "id": "uuid",
    "display_name": "string"
  }
}
```
- Errors:
  - 400 invalid payload
  - 401 unauthorized
- Validation:
  - display_name max length 255
  - bio max length 2000
- Rate Limits: 60/minute per user
- Pagination: Not applicable
- Versioning: v1

---

## 10. Saved Repositories Endpoints

### 10.1 List Saved Repositories
- Method: GET
- URL: /v1/saved-repositories
- Description: Return repositories saved by the current user
- Authentication: Bearer token required
- Request:
  - page, page_size
- Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "repository": {
        "id": "uuid",
        "full_name": "owner/repo"
      },
      "saved_at": "timestamp"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 80
  }
}
```
- Errors:
  - 401 unauthorized
- Validation:
  - pagination valid
- Rate Limits: 120/minute per user
- Pagination: Supported
- Versioning: v1

### 10.2 Save Repository
- Method: POST
- URL: /v1/saved-repositories
- Description: Save a repository to the user’s library
- Authentication: Bearer token required
- Request:
```json
{
  "repository_id": "uuid"
}
```
- Response:
```json
{
  "data": {
    "saved": true,
    "saved_at": "timestamp"
  }
}
```
- Errors:
  - 404 repository not found
  - 409 already saved
- Validation:
  - repository_id required UUID
- Rate Limits: 60/minute per user
- Pagination: Not applicable
- Versioning: v1

### 10.3 Remove Saved Repository
- Method: DELETE
- URL: /v1/saved-repositories/{saved_repository_id}
- Description: Remove a saved repository entry
- Authentication: Bearer token required
- Request: Path parameter saved_repository_id
- Response:
```json
{
  "data": {
    "removed": true
  }
}
```
- Errors:
  - 404 not found
  - 403 forbidden
- Validation:
  - saved_repository_id must be a valid UUID
- Rate Limits: 60/minute per user
- Pagination: Not applicable
- Versioning: v1

---

## 11. Notifications Endpoints

### 11.1 List Notifications
- Method: GET
- URL: /v1/notifications
- Description: Return notifications for the current user
- Authentication: Bearer token required
- Request:
  - unread_only: bool
  - page, page_size
- Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "notification_type": "contribution_update",
      "title": "New issue matched",
      "is_read": false
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 42
  }
}
```
- Errors:
  - 401 unauthorized
- Validation:
  - unread_only must be boolean
- Rate Limits: 120/minute per user
- Pagination: Supported
- Versioning: v1

### 11.2 Mark Notification as Read
- Method: PATCH
- URL: /v1/notifications/{notification_id}/read
- Description: Mark a specific notification as read
- Authentication: Bearer token required
- Request: None
- Response:
```json
{
  "data": {
    "read": true
  }
}
```
- Errors:
  - 404 notification not found
  - 403 forbidden
- Validation:
  - notification_id must be a valid UUID
- Rate Limits: 60/minute per user
- Pagination: Not applicable
- Versioning: v1

---

## 12. AI Services Endpoints

### 12.1 Generate Repository Summary
- Method: POST
- URL: /v1/ai/repositories/{repository_id}/summary
- Description: Trigger generation of AI summary for a repository
- Authentication: Bearer token required
- Request:
```json
{
  "force_refresh": false
}
```
- Response:
```json
{
  "data": {
    "status": "queued",
    "job_id": "uuid"
  }
}
```
- Errors:
  - 404 repository not found
  - 409 summary already exists
- Validation:
  - force_refresh must be boolean
- Rate Limits: 20/minute per user
- Pagination: Not applicable
- Versioning: v1

### 12.2 Get Repository Summary
- Method: GET
- URL: /v1/ai/repositories/{repository_id}/summary
- Description: Return the latest AI summary for a repository
- Authentication: None
- Request: None
- Response:
```json
{
  "data": {
    "summary": "string",
    "confidence_score": 0.91,
    "generated_at": "timestamp"
  }
}
```
- Errors:
  - 404 summary not found
- Validation:
  - repository_id must be a valid UUID
- Rate Limits: 120/minute per IP
- Pagination: Not applicable
- Versioning: v1

### 12.3 Generate Learning Path
- Method: POST
- URL: /v1/ai/learning-paths
- Description: Generate a learning path from technology preferences and goals
- Authentication: Bearer token required
- Request:
```json
{
  "technologies": ["Next.js", "TypeScript"],
  "goals": ["build a full-stack app"]
}
```
- Response:
```json
{
  "data": {
    "status": "queued",
    "job_id": "uuid"
  }
}
```
- Errors:
  - 400 invalid payload
- Validation:
  - technologies array min 1, max 10
  - goals array max 5
- Rate Limits: 20/minute per user
- Pagination: Not applicable
- Versioning: v1

---

## 13. Admin Endpoints

### 13.1 Admin List Users
- Method: GET
- URL: /v1/admin/users
- Description: Return user records for administrators
- Authentication: Bearer token required with admin role
- Request:
  - page, page_size, search
- Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "username": "string",
      "role": "user"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 50000
  }
}
```
- Errors:
  - 403 forbidden
- Validation:
  - pagination values valid
- Rate Limits: 60/minute per admin
- Pagination: Supported
- Versioning: v1

### 13.2 Admin Update Repository Verification
- Method: PATCH
- URL: /v1/admin/repositories/{repository_id}/verification
- Description: Toggle repository verification status
- Authentication: Bearer token required with admin role
- Request:
```json
{
  "is_verified": true
}
```
- Response:
```json
{
  "data": {
    "id": "uuid",
    "is_verified": true
  }
}
```
- Errors:
  - 404 repository not found
  - 403 forbidden
- Validation:
  - is_verified required boolean
- Rate Limits: 60/minute per admin
- Pagination: Not applicable
- Versioning: v1

### 13.3 Admin Reindex Search Data
- Method: POST
- URL: /v1/admin/search/reindex
- Description: Trigger a full or partial search reindex
- Authentication: Bearer token required with admin role
- Request:
```json
{
  "scope": "all"
}
```
- Response:
```json
{
  "data": {
    "status": "queued"
  }
}
```
- Errors:
  - 400 invalid scope
- Validation:
  - scope must be all|repositories|technologies|categories
- Rate Limits: 10/minute per admin
- Pagination: Not applicable
- Versioning: v1

---

## 14. OpenAPI-Style Summary

```yaml
openapi: 3.1.0
info:
  title: StackLoop API
  version: 1.0.0
servers:
  - url: https://api.stackloop.dev/v1
paths:
  /auth/github:
    get:
      summary: Initiate GitHub OAuth
  /auth/github/callback:
    post:
      summary: Exchange OAuth code for session
  /auth/me:
    get:
      summary: Get current user
  /auth/logout:
    post:
      summary: Logout current user
  /auth/refresh:
    post:
      summary: Refresh auth token
  /repositories:
    get:
      summary: List repositories
    post:
      summary: Create repository record
  /repositories/{repository_id}:
    get:
      summary: Get repository details
    patch:
      summary: Update repository metadata
  /repositories/{repository_id}/claim:
    post:
      summary: Claim repository
  /search:
    get:
      summary: Global search
  /search/suggestions:
    get:
      summary: Search suggestions
  /categories:
    get:
      summary: List categories
  /categories/{category_id_or_slug}:
    get:
      summary: Get category details
  /recommendations:
    get:
      summary: Get recommendations
  /recommendations/refresh:
    post:
      summary: Refresh recommendations
  /collections:
    get:
      summary: List collections
    post:
      summary: Create collection
  /collections/{collection_id}:
    get:
      summary: Get collection
  /collections/{collection_id}/repositories:
    post:
      summary: Add repository to collection
  /learning-paths:
    get:
      summary: List learning paths
  /learning-paths/{learning_path_id}:
    get:
      summary: Get learning path
  /users/{user_id}:
    get:
      summary: Get user profile
  /users/me:
    patch:
      summary: Update current user profile
  /saved-repositories:
    get:
      summary: List saved repositories
    post:
      summary: Save repository
  /saved-repositories/{saved_repository_id}:
    delete:
      summary: Remove saved repository
  /notifications:
    get:
      summary: List notifications
  /notifications/{notification_id}/read:
    patch:
      summary: Mark notification as read
  /ai/repositories/{repository_id}/summary:
    post:
      summary: Generate repository summary
    get:
      summary: Get repository summary
  /ai/learning-paths:
    post:
      summary: Generate learning path
  /admin/users:
    get:
      summary: List users for admin
  /admin/repositories/{repository_id}/verification:
    patch:
      summary: Update repository verification
  /admin/search/reindex:
    post:
      summary: Reindex search data
```

---

## 15. API Design Notes

### RESTfulness
- Use nouns for resources, not verbs
- Keep endpoint naming consistent and predictable
- Prefer resource nesting for related entities
- Use standard status codes and consistent error payloads

### Recommended Status Codes
- 200 OK for successful read and update operations
- 201 Created for successful creation
- 202 Accepted for asynchronous jobs
- 204 No Content for successful deletes with no body
- 400 Bad Request for validation issues
- 401 Unauthorized for expired or missing auth
- 403 Forbidden for insufficient privileges
- 404 Not Found for missing resources
- 409 Conflict for duplicate or state conflicts
- 429 Too Many Requests for rate limiting
- 500 Internal Server Error for unexpected failures

### Implementation Guidance
- Use DTOs and validation schemas for request payloads
- Enforce authorization at the resource or service layer
- Use request IDs and correlation IDs for observability
- Support idempotency for write operations where appropriate

---

## 16. Summary

The StackLoop REST API is designed to be clean, predictable, and production-ready. It supports authenticated and anonymous experiences, resource-oriented endpoints, clear validation, pagination, and scalable future growth for new product capabilities.
