import { describe, it, expect } from "vitest";
import { MARKETPLACE_IDS, getSpEndpoint, SP_API_ENDPOINTS } from "./types";

describe("SP-API Types", () => {
  it("MARKETPLACE_IDS tiene IDs para marketplaces principales", () => {
    expect(MARKETPLACE_IDS.US).toBe("ATVPDKIKX0DER");
    expect(MARKETPLACE_IDS.ES).toBe("A1RKKUPIHCS9H3");
    expect(MARKETPLACE_IDS.DE).toBe("A1PA6795UKMFR9");
  });

  it("getSpEndpoint devuelve NA para US/CA/MX", () => {
    expect(getSpEndpoint("US")).toBe(SP_API_ENDPOINTS.NA);
    expect(getSpEndpoint("CA")).toBe(SP_API_ENDPOINTS.NA);
    expect(getSpEndpoint("MX")).toBe(SP_API_ENDPOINTS.NA);
  });

  it("getSpEndpoint devuelve EU para UK/DE/FR/IT/ES", () => {
    expect(getSpEndpoint("ES")).toBe(SP_API_ENDPOINTS.EU);
    expect(getSpEndpoint("DE")).toBe(SP_API_ENDPOINTS.EU);
    expect(getSpEndpoint("UK")).toBe(SP_API_ENDPOINTS.EU);
  });

  it("getSpEndpoint devuelve NA para marketplace desconocido", () => {
    expect(getSpEndpoint("JP")).toBe(SP_API_ENDPOINTS.NA);
  });
});
