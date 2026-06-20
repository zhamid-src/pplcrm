---
trigger: always_on
---

# ⚙️ PeopleCRM Backend Standards (Fastify 5 + tRPC + Kysely)

This rules file defines the backend architecture, database interactions, background jobs, and security guidelines.

---

### **API Endpoints**

- **tRPC First:** Expose all internal client-server endpoints via tRPC routers to maintain end-to-end type safety.
- **Fastify REST:** Only use standard Fastify REST routes for external webhooks, file binary downloads/uploads, or when REST is explicitly required.
- **Error Handling:** Throw standard `TRPCError` instances (e.g., `BAD_REQUEST`, `NOT_FOUND`) to return consistent error statuses to the client.

### **Type-Safe Database Access (Kysely)**

- **Native Typing:** Leverage Kysely's built-in `Insertable<T>` and `Updateable<T>` utility types for payload operations to minimize type boilerplate.
- **Intentional Retrieval:** Use `.returning('id')` or `.returningAll()` only when the immediate state retrieval is explicitly required by the subsequent business logic, avoiding unnecessary over-fetching.
- **Transactions:** Execute multi-table updates within database transactions to maintain ACID compliance and prevent orphaned records:

````typescript
    await this.getRepo().transaction().execute(async (trx) => { ... });
    ```

### **Background Jobs**
* **Transactional Outbox:** Offload heavy or long-running tasks (e.g., SMTP emails, syncs, file cleanups) to the background queue by inserting job payloads into the `background_jobs` table *inside* database transactions. This guarantees jobs are only queued if the core business logic commits successfully.

### **Security, Hardening & Observability**
* **Input Validation:** Validate all inputs at the tRPC boundary using Zod to block malformed payloads and injection vulnerabilities.
* **Error Sanitization & Traceability:** Sanitize and scrub frontend error messages to prevent the leakage of database schemas or stack traces.
    * Generate a unique `correlationId` for unhandled exceptions.
    * Send the sanitized message to the client containing only the safe message and the `correlationId`.
    * Log the full stack trace and request context to the backend logger (e.g., Pino) using that same `correlationId` to ensure the application remains securely debuggable.
````
