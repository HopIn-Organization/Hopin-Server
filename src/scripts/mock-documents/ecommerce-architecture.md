# E-Commerce Platform — Architecture Overview

## Module Breakdown
The backend is split into feature modules (auth, product, cart, order, user), each with its own
controller, service, and TypeORM entity. Modules communicate only through their public service
interfaces — no cross-module repository access.

## Request Flow
Client → Express Router → Controller → Service → TypeORM Repository → PostgreSQL

## Key Decisions
- **TypeORM + PostgreSQL** chosen for relational integrity across orders, products, and users.
- **S3 pre-signed URLs** served through the API to avoid CORS issues with direct S3 access.
- **JWT auth** with 15-minute access tokens and rotating refresh tokens stored in HttpOnly cookies.
- **No ORM eager loading** on list endpoints — explicit `select` columns to keep payloads small.
