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

8. Open API:

   - `GET /users`
   - `GET /users/:id`
   - `POST /users`
   - `GET /jobs`
   - `GET /jobs/:jobId`
   - `POST /jobs`
   - `POST /jobs/:jobId/skills`
   - `GET /projects`
   - `GET /projects/:id`
   - `POST /projects`

## Notes

- If your Docker network requires localhost, set `DB_HOST=localhost` in `.env`.
- If using service name in Docker Compose, set `DB_HOST=postgres`.
