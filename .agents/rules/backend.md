---
trigger: always_on
---

# ⚙️ PeopleCRM Backend Standards (Fastify 5 + tRPC + Kysely)

This rules file defines the backend architecture, database interactions, background jobs, and security guidelines.

---

- **API Endpoints**:
  - Expose all internal client-server endpoints via tRPC routers.
  - Only use Fastify REST routes for external webhooks, file binary downloads/uploads, or when REST is explicitly required.
  - Throw standard `TRPCError` instances (e.g., `BAD_REQUEST`, `NOT_FOUND`) to return error statuses.
- **Type-Safe Database Access (Kysely)**:
  - Explicitly type payload operations with `OperationDataType<'table', 'insert' | 'update'>` and `Models`.
  - Always append `.returningAll()` or `.returning('id')` to insert/update queries.
  - Execute multi-table updates within database transactions:
    ```typescript
    await this.getRepo().transaction().execute(async (trx) => { ... });
    ```
- **Background Jobs**: Offload heavy or long-running tasks (e.g., SMTP emails, syncs, file cleanups) to the background queue by inserting job payloads into the `background_jobs` table inside database transactions.
- **Security & Hardening**:
  - Validate all inputs using Zod to block injection vulnerabilities.
  - Sanitize and scrub error messages to prevent backend schema or stack trace data leaks.
