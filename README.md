# Hopin-Server

## Local development setup

1. Clone the repo:

   ```bash
   git clone <repo-url>
   cd Hopin-Server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and configure as needed:

   ```bash
   copy .env.example .env
   # or on PowerShell: cp .env.example .env
   ```

4. Start database with Docker Compose:

   ```bash
   docker-compose up -d
   ```

5. Run TypeORM migrations:

   ```bash
   npm run migration:run
   ```

6. Seed sample data:

   ```bash
   npm run seed
   ```

7. Run the app in development mode:

   ```bash
   npm run dev
   ```

## API Documentation

The API runs on `http://localhost:3000` by default.

### CORS and authentication notes

- The backend allows cross-origin requests from the frontend.
- For auth routes that use cookies, send requests with `credentials: 'include'`.
- Access-protected endpoints require `Authorization: Bearer <accessToken>`.
- The refresh token is stored in an HTTP-only cookie named `refresh_token` and can also be sent in the request body.

### Health

- `GET /health`
  - Response: `{ status: 'ok' }`

### Authentication

- `POST /auth/register`
  - Body: `{ name, email, password }`
  - Response: `{ id, name, email }`

- `POST /auth/login`
  - Body: `{ email, password }`
  - Response: `{ accessToken }`
  - Sets `refresh_token` cookie on success.

- `POST /auth/refresh`
  - Cookie: `refresh_token` OR body `{ refreshToken }`
  - Response: `{ accessToken }`
  - Rotates the refresh cookie.

- `POST /auth/logout`
  - Requires header: `Authorization: Bearer <accessToken>`
  - Response: `204 No Content`

### Users

- `GET /users`
  - Response: list of users.

- `GET /users/:id`
  - Response: single user.

- `POST /users`
  - Body: user creation payload.
  - Response: created user.

### Jobs

- `GET /jobs`
  - Response: list of jobs.

- `GET /jobs/:jobId`
  - Response: single job.

- `POST /jobs`
  - Body: job creation payload.
  - Response: created job.

- `POST /jobs/:jobId/skills`
  - Body: skill assignment payload.
  - Response: updated job.

### Projects

- `GET /projects`
  - Response: list of projects.

- `GET /projects/:id`
  - Response: single project.

- `POST /projects`
  - Body: project creation payload.
  - Response: created project.

- `PATCH /projects/:projectId/members/:memberId/role`
  - Body: role update payload.
  - Response: updated member.

- `DELETE /projects/members/:memberId`
  - Response: `204 No Content`

### Tasks

- `PUT /tasks`
  - Creates or updates a task.
  - To **create**: omit `id`; `order`, `title`, `description`, and `estimatedDays` are required.
  - To **update**: include `id`; all other fields are optional (only provided fields are updated).
  - Body:
    ```json
    {
      "id": 1,
      "order": 1,
      "title": "...",
      "description": "...",
      "estimatedDays": 3,
      "isCompleted": false,
      "links": ["https://example.com/doc"],
      "onboardingId": 1,
      "parentId": null
    }
    ```
  - Response `201` (create) / `200` (update):
    ```json
    { "task": { "id": 1, "order": 1, "title": "...", "description": "...", "estimatedDays": 3, "isCompleted": false, "links": [] } }
    ```
  - Response `404`: task with given `id` not found.

- `DELETE /tasks/:taskId`
  - Deletes the task.
  - Response `204 No Content` on success.
  - Response `404`: task not found.

- `PATCH /tasks/:taskId/complete`
  - Marks the task as completed (`isCompleted: true`).
  - Response:
    ```json
    {
      "task": {
        "id": 1,
        "title": "...",
        "description": "...",
        "estimatedDays": 3,
        "isCompleted": true,
        "order": 1,
        "links": ["https://example.com/doc"]
      }
    }
    ```

### Onboarding

- `POST /onboarding/generate`
  - Body:
    ```json
    {
      "userId": 1,
      "jobId": 1,
      "daysDuration": 30,
      "documents": ["Optional document text to customize onboarding"]
    }
    ```
  - `userId`, `jobId`, and `daysDuration` are required. `documents` is optional.
  - Response:
    ```json
    {
      "onBoarding": {
        "id": 1,
        "user": { ... },
        "job": { ... },
        "project": { ... },
        "tasks": [ ... ],
        "progress": 0
      }
    }
    ```

- `GET /onboarding/user/:userId/job/:jobId`
  - Response: onboarding plan for that user/job combination. `progress` (0–100) is a calculated field: sum of `estimatedDays` for completed tasks divided by total `estimatedDays`, multiplied by 100.
    ```json
    {
      "onboarding": {
        "id": 1,
        "user": { ... },
        "job": { ... },
        "project": { ... },
        "tasks": [ ... ],
        "progress": 42.5
      }
    }
    ```

- `GET /onboarding/project/:projectId`
  - Response: all onboarding plans for the given project, each including a `progress` field.
    ```json
    [
      {
        "id": 1,
        "user": { ... },
        "job": { ... },
        "project": { ... },
        "tasks": [ ... ],
        "progress": 42.5
      }
    ]
    ```

### Client integration examples

#### Login with fetch

```js
const loginResponse = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email, password }),
});
const data = await loginResponse.json();
const accessToken = data.accessToken;
```

#### Generate onboarding

```js
const response = await fetch('http://localhost:3000/onboarding/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  credentials: 'include',
  body: JSON.stringify({
    userId: 1,
    jobId: 2,
    daysDuration: 30,
    documents: ['Project onboarding guide...', 'Team procedures...'],
  }),
});
const result = await response.json();
console.log(result.onBoarding);
```

#### Refresh access token

```js
const refreshResponse = await fetch('http://localhost:3000/auth/refresh', {
  method: 'POST',
  credentials: 'include',
});
const refreshData = await refreshResponse.json();
const newAccessToken = refreshData.accessToken;
```

### Notes

- If your Docker network requires localhost, set `DB_HOST=localhost` in `.env`.
- If using service name in Docker Compose, set `DB_HOST=postgres`.
