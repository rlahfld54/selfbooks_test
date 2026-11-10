import type { FixtureScope } from "./directory.js";
// Explicitly selected by the user. Must also belong to the server fixture allowlist.
export const salesCompanyId = "20000000-0000-4000-8000-000000000001";
export const salesEstablishmentId = "30000000-0000-4000-8000-000000000001";
export function createSalesContext(fixtures: FixtureScope) {
  if (!fixtures.clientIds.includes(salesCompanyId)) return undefined;
  return {
    officeId: fixtures.officeId,
    companyId: salesCompanyId,
    establishmentId: salesEstablishmentId,
    userId: "development-admin",
  };
}
export type SalesContext = NonNullable<ReturnType<typeof createSalesContext>>;
