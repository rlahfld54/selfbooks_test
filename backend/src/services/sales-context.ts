import type { FixtureScope } from "./directory.js";
// Explicitly selected by the user. Must also belong to the server fixture allowlist.
export const salesCompanyId = "70b03d21-cf5d-4ac2-b479-06aff24385bc";
export const salesEstablishmentId = "30000000-0000-4000-8000-000000000001";
export function createSalesContext(fixtures: FixtureScope) {
  // Server-selected existing company, verified within this office at every transaction.
  if (fixtures.officeId !== '2dd26db6-92bd-4110-9e06-51f6e43b89cf') return undefined;
  return {
    officeId: fixtures.officeId,
    companyId: salesCompanyId,
    establishmentId: salesEstablishmentId,
    userId: "development-admin",
  };
}
export type SalesContext = NonNullable<ReturnType<typeof createSalesContext>>;
