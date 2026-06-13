---
trigger: always_on
---

# 🧪 PeopleCRM Quality & Verification Pipeline

This rules file defines guidelines for formatting, building, and running tests.

---

- **ESLint & Formatting**: Run Prettier (`npx prettier --write`) and `nx lint` before committing. Ensure all local lint errors/warnings are resolved.
- **Build Verification**: Always run local builds to verify code compilation stability:
  - `npx nx build frontend`
  - `npx nx build backend`
- **Test Suites**: Verify modifications by running testing targets:
  - `npx nx test frontend`
  - `npx nx test backend`
  - `npx nx e2e`
