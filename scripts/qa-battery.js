require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const { createClient } = require("@supabase/supabase-js");
const { chromium } = require("@playwright/test");
const { canRunDriveCrud } = require("./qa-drive-guard");

const BASE = process.env.QA_BASE_URL || "https://amazon-fba-manager-virid.vercel.app";
const EMAIL = process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD;
const driveCrudAllowed = canRunDriveCrud(BASE, process.env);

if (!EMAIL || !PASSWORD) {
  console.error("Faltan QA_EMAIL y QA_PASSWORD en .env.local (usuario de prueba dedicado).");
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const lines = [];
function out(s) { lines.push(s); console.log(s); }

(async () => {
  let pass = 0, fail = 0;
  const check = (name, cond, detail = "") => {
    if (cond) { pass++; out(`PASS ${name}`); } else { fail++; out(`FAIL ${name} ${detail}`); }
  };

  const { data: u } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  const qaUser = (u?.users || []).find((x) => x.email === EMAIL);
  if (!qaUser) { out(`FAIL no existe el usuario QA ${EMAIL} en este proyecto`); process.exit(1); }
  const UID = qaUser.id;
  const { data: memRow } = await admin.from("org_members").select("org_id").eq("user_id", UID).eq("status", "active").limit(1).maybeSingle();
  if (!memRow) { out("FAIL usuario QA sin organización activa"); process.exit(1); }
  const ORG_A = memRow.org_id;
  out(`Org A del usuario QA: ${ORG_A}`);

  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();

  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  let loggedIn = true;
  try {
    await page.waitForURL("**/dashboard**", { timeout: 30000 });
  } catch { loggedIn = false; }
  check("QA0 login por UI -> dashboard", loggedIn, `(url: ${page.url()})`);
  if (!loggedIn) {
    await browser.close();
    return finish();
  }

  const api = async (path, opts = {}) => page.evaluate(async ({ path, opts }) => {
    const r = await fetch(path, {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let body;
    try { body = await r.json(); } catch { body = null; }
    return { status: r.status, body };
  }, { path, opts });

  let r = await api("/api/products");
  check("QA1 GET /api/products autenticado -> 200", r.status === 200, `(status ${r.status} ${JSON.stringify(r.body).slice(0, 150)})`);

  r = await api("/api/products", { headers: { "x-org-id": "00000000-0000-0000-0000-000000000000" } });
  check("QA2 H1 x-org-id falso -> 403", r.status === 403, `(status ${r.status})`);

  const { data: orgB } = await admin.from("organizations").insert({
    name: "QA-ORG-HUERFANA", slug: "qa-orphan-" + Date.now(), owner_id: UID,
  }).select().single();
  if (!orgB) { fail++; out("FAIL QA3 no se pudo crear org B"); } else {
    r = await api("/api/products", { headers: { "x-org-id": orgB.id } });
    check("QA3 org sin membership -> 403", r.status === 403, `(status ${r.status})`);
  }

  r = await api("/api/drive/list?folderId=root");
  out(`INFO QA4 GET /api/drive/list?folderId=root -> ${r.status} ${r.status === 200 || r.status === 403 ? "(esperable)" : "(REVISAR)"} ${JSON.stringify(r.body).slice(0, 120)}`);

  const stamp = Date.now();
  r = await api("/api/research/capture", {
    method: "POST",
    body: {
      products: [{ asin: "B0QATEMP001", title: `QA temp ${stamp}`, price: 19.99, currency: "USD", bsr: 42000 }],
      mode: "scraper",
      page_type: "search",
      search_keyword: "qa-battery",
    },
  });
  check("QA5a POST capture -> 2xx", r.status >= 200 && r.status < 300, `(status ${r.status} ${JSON.stringify(r.body).slice(0, 250)})`);
  const { data: capRows } = await admin.from("product_research").select("id, asin_reference, org_id").eq("asin_reference", "B0QATEMP001");
  const persisted = (capRows || []).filter((x) => x.org_id === ORG_A);
  check("QA5b captura persistida con org_id correcto", persisted.length >= 1, `(filas ${(capRows || []).length})`);
  r = await api("/api/research");
  check("QA5c GET /api/research -> 200", r.status === 200, `(status ${r.status})`);

  r = await api("/api/products", { method: "POST", body: { name: `QA-CRUD-${stamp}`, unitCost: 5, salePrice: 25, dutyRate: 0.25 } });
  const created = r.body || {};
  const pid = created?.product?.id || created?.id || created?.data?.id;
  check("QA6a POST /api/products crea", r.status >= 200 && r.status < 300 && !!pid, `(status ${r.status} ${JSON.stringify(created).slice(0, 250)})`);
  let pidForCleanup = pid;
  if (pid) {
    const { data: prodRow } = await admin.from("products").select("org_id, duty_rate, name").eq("id", pid).single();
    check("QA6b org_id y duty_rate correctos en DB", prodRow && prodRow.org_id === ORG_A && prodRow.duty_rate === 0.25, JSON.stringify(prodRow || {}));
    r = await api(`/api/products/${pid}`, { method: "PUT", body: { name: `QA-CRUD-EDIT-${stamp}` } });
    check("QA6c PUT actualiza", r.status >= 200 && r.status < 300, `(status ${r.status})`);
    r = await api(`/api/products/${pid}`);
    check("QA6d GET por id -> 200 con costos calculados", r.status === 200 && r.body?.duty_rate === 0.25 && r.body?.duty_cost === 1.25 && r.body?.total_cost === 6.25, `(status ${r.status} ${JSON.stringify(r.body).slice(0, 250)})`);
    r = await api(`/api/products/${pid}`, { method: "DELETE" });
    check("QA6e DELETE ok", r.status < 300, `(status ${r.status})`);
    const { data: stillThere } = await admin.from("products").select("id, deleted_at").eq("id", pid).maybeSingle();
    out(`INFO QA6f post-DELETE: ${stillThere ? (stillThere.deleted_at ? "soft-deleted" : "SIGUE VIVO") : "eliminado fisico"}`);
  }

  // QA7 CRUD proveedores
  r = await api("/api/suppliers", { method: "POST", body: { name: `QA-SUPP-${stamp}`, country: "AR", rating: 4 } });
  const supp = r.body || {};
  const sid = supp?.supplier?.id || supp?.id || supp?.data?.id;
  check("QA7a POST /api/suppliers crea", r.status >= 200 && r.status < 300 && !!sid, `(status ${r.status} ${JSON.stringify(supp).slice(0, 200)})`);
  if (sid) {
    const { data: suppRow } = await admin.from("suppliers").select("org_id, name").eq("id", sid).single();
    check("QA7b org_id correcto en DB", suppRow && suppRow.org_id === ORG_A, JSON.stringify(suppRow || {}));
    r = await api(`/api/suppliers/${sid}`, { method: "PUT", body: { name: `QA-SUPP-EDIT-${stamp}`, status: "inactive" } });
    check("QA7c PUT actualiza", r.status >= 200 && r.status < 300, `(status ${r.status})`);
  }
  r = await api("/api/suppliers");
  check("QA7d GET /api/suppliers -> 200", r.status === 200, `(status ${r.status})`);
  if (sid) {
    r = await api(`/api/suppliers/${sid}`, { method: "DELETE" });
    check("QA7e DELETE ok", r.status < 300, `(status ${r.status})`);
  }

  // QA8 ventas (producto efímero propio; QA6 ya eliminó el suyo)
  let salePid = null, saleId = null;
  r = await api("/api/products", { method: "POST", body: { name: `QA-SALE-PROD-${stamp}` } });
  salePid = r.body?.product?.id || r.body?.id || r.body?.data?.id || null;
  check("QA8-0 producto efímero creado", r.status >= 200 && r.status < 300 && !!salePid, `(status ${r.status})`);
  if (!salePid) {
    fail++;
    out("FAIL QA8 sin producto disponible para venta");
  } else {
    r = await api("/api/sales", { method: "POST", body: { product_id: salePid, sale_date: new Date().toISOString().slice(0, 10), units_sold: 2, revenue: 49.98 } });
    const sale = r.body || {};
    saleId = sale?.sale?.id || sale?.id || sale?.data?.id;
    check("QA8a POST /api/sales crea", r.status >= 200 && r.status < 300 && !!saleId, `(status ${r.status} ${JSON.stringify(sale).slice(0, 250)})`);
    if (saleId) {
      const { data: saleRow } = await admin.from("sales").select("org_id, units_sold").eq("id", saleId).single();
      check("QA8b org_id correcto en DB", saleRow && saleRow.org_id === ORG_A && saleRow.units_sold === 2, JSON.stringify(saleRow || {}));
    }
    r = await api("/api/sales");
    check("QA8c GET /api/sales -> 200", r.status === 200, `(status ${r.status})`);
    r = await api("/api/sales/summary");
    out(`INFO QA8d GET /api/sales/summary -> ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
  }

  // QA9 inventario + movimiento de stock
  r = await api("/api/inventory");
  check("QA9a GET /api/inventory -> 200", r.status === 200, `(status ${r.status})`);
  if (salePid) {
    r = await api("/api/inventory/movements", { method: "POST", body: { productId: salePid, movementType: "adjustment", quantity: 5, reference: "qa-battery" } });
    const mv = r.body || {};
    const mvid = mv?.movement?.id || mv?.id || mv?.data?.id;
    check("QA9b POST movement adjustment -> 2xx", r.status >= 200 && r.status < 300, `(status ${r.status} ${JSON.stringify(mv).slice(0, 250)})`);
    if (mvid) {
      const { data: mvRow } = await admin.from("stock_movements").select("org_id, quantity").eq("id", mvid).single();
      check("QA9c movimiento con org_id correcto", mvRow && mvRow.org_id === ORG_A && mvRow.quantity === 5, JSON.stringify(mvRow || {}));
    }
  }

  // QA10 rutas refactorizadas a getOrgId (antes leian profiles.org_id inexistente)
  r = await api("/api/sp-api/connections");
  check("QA10a GET /api/sp-api/connections -> 200 (refactor vivo)", r.status === 200 && Array.isArray(r.body?.data), `(status ${r.status} ${JSON.stringify(r.body).slice(0, 120)})`);
  r = await api("/api/amazon-payouts");
  check("QA10b GET /api/amazon-payouts -> 200 (refactor + 039)", r.status === 200, `(status ${r.status} ${JSON.stringify(r.body).slice(0, 150)})`);

  // QA11 datos inválidos -> error controlado (nunca 500)
  r = await api("/api/products", { method: "POST", body: { name: "" } });
  check("QA11a producto sin nombre -> 4xx", r.status >= 400 && r.status < 500, `(status ${r.status})`);
  r = await api("/api/products", { method: "POST", body: { name: `QA-NEG-${stamp}`, unitCost: -5 } });
  check("QA11b costo negativo -> 4xx", r.status >= 400 && r.status < 500, `(status ${r.status})`);
  if (salePid) {
    r = await api("/api/sales", { method: "POST", body: { product_id: salePid, sale_date: new Date().toISOString().slice(0, 10), units_sold: 0, revenue: 1 } });
    check("QA11c units_sold=0 -> 4xx", r.status >= 400 && r.status < 500, `(status ${r.status})`);
  }
  r = await api("/api/products/esto-no-es-uuid");
  check("QA11d id malformed -> controlado (no 500)", r.status < 500, `(status ${r.status})`);
  const junk = await page.evaluate(async () => {
    const res = await fetch("/api/products", { headers: { "x-org-id": "garbage" } });
    return { status: res.status };
  });
  check("QA11e x-org-id garbage -> controlado (no 500)", junk.status < 500, `(status ${junk.status})`);
  r = await api("/api/expenses", { method: "POST", body: { category: "software", description: "", amount: -1 } });
  check("QA11f expense inválido -> 4xx", r.status >= 400 && r.status < 500, `(status ${r.status})`);

  // QA12 orders + expenses + returns CRUD
  r = await api("/api/orders", { method: "POST", body: { quantity: 10, unit_cost: 2.5, po_number: `QA-PO-${stamp}` } });
  const ord = r.body || {};
  const oid = ord?.order?.id || ord?.data?.id || ord?.id;
  check("QA12a POST /api/orders crea", r.status >= 200 && r.status < 300 && !!oid, `(status ${r.status} ${JSON.stringify(ord).slice(0, 250)})`);
  if (oid) {
    const { data: ordRow } = await admin.from("purchase_orders").select("org_id").eq("id", oid).single();
    check("QA12b orden con org_id correcto", ordRow && ordRow.org_id === ORG_A, JSON.stringify(ordRow || {}));
  }
  r = await api("/api/orders");
  check("QA12c GET /api/orders -> 200", r.status === 200, `(status ${r.status})`);

  r = await api("/api/expenses", { method: "POST", body: { category: "software", description: `QA expense ${stamp}`, amount: 9.99, vendor: "qa-battery" } });
  const exp = r.body || {};
  const eid = exp?.expense?.id || exp?.data?.id || exp?.id;
  check("QA12d POST /api/expenses crea", r.status >= 200 && r.status < 300 && !!eid, `(status ${r.status} ${JSON.stringify(exp).slice(0, 250)})`);
  if (eid) {
    const { data: expRow } = await admin.from("expenses").select("org_id").eq("id", eid).single();
    check("QA12e gasto con org_id correcto", expRow && expRow.org_id === ORG_A, JSON.stringify(expRow || {}));
  }

  let retId = null;
  if (salePid) {
    r = await api("/api/returns", { method: "POST", body: { product_id: salePid, quantity: 1, return_reason: "defective", return_date: new Date().toISOString().slice(0, 10), amazon_return_id: `QA-RET-${stamp}`, refund_amount: 12.5 } });
    const ret = r.body || {};
    retId = ret?.return?.id || ret?.data?.id || ret?.id;
    check("QA12f POST /api/returns crea", r.status >= 200 && r.status < 300 && !!retId, `(status ${r.status} ${JSON.stringify(ret).slice(0, 250)})`);
    if (retId) {
      const { data: retRow } = await admin.from("returns").select("org_id, status, refund_amount").eq("id", retId).single();
      check("QA12g devolución con org_id y estado inicial correctos", retRow && retRow.org_id === ORG_A && retRow.status === "requested" && Number(retRow.refund_amount) === 12.5, JSON.stringify(retRow || {}));
    }
  }

  // QA13 Flow A: lifecycle de compra + consistencia matemática
  if (oid) {
    const expectedProductTotal = 10 * 2.5;
    const expectedLandedTotal = expectedProductTotal + 15 + 5 + 3;
    r = await api(`/api/orders/${oid}`, { method: "PUT", body: { shipping_cost: 15, customs_cost: 5, prep_center_cost: 3, status: "draft" } });
    check("QA13a orden conserva total producto y landed cost", r.status >= 200 && r.status < 300 && Number(r.body?.total_cost) === expectedProductTotal && Number(r.body?.quantity) * Number(r.body?.unit_cost) + Number(r.body?.shipping_cost || 0) + Number(r.body?.customs_cost || 0) + Number(r.body?.prep_center_cost || 0) === expectedLandedTotal, `(status ${r.status} ${JSON.stringify(r.body).slice(0, 180)})`);
    const orderStatuses = ["sent", "confirmed", "in_production", "shipped", "in_transit", "customs", "delivered"];
    for (const status of orderStatuses) {
      r = await api(`/api/orders/${oid}`, { method: "PUT", body: { status } });
      check(`QA13 lifecycle orden -> ${status}`, r.status >= 200 && r.status < 300 && r.body?.status === status, `(status ${r.status})`);
    }
    const { data: finalOrder } = await admin.from("purchase_orders").select("org_id, status, quantity, unit_cost, total_cost, shipping_cost, customs_cost, prep_center_cost").eq("id", oid).single();
    check("QA13b orden final scoped y consistente", finalOrder && finalOrder.org_id === ORG_A && finalOrder.status === "delivered" && Number(finalOrder.total_cost) === Number(finalOrder.quantity) * Number(finalOrder.unit_cost) && Number(finalOrder.total_cost) + Number(finalOrder.shipping_cost || 0) + Number(finalOrder.customs_cost || 0) + Number(finalOrder.prep_center_cost || 0) === expectedLandedTotal, JSON.stringify(finalOrder || {}));
  }
  out("INFO QA13c Flow B: returns crea estado requested y refund_amount consistente; el avance de estados requiere repetir el flujo completo en producción");

  // QA14 aislamiento multi-org: membership real + API + UI con Org B
  let orgBMembership = false, orgBProductId = null;
  if (orgB) {
    const { error: membershipError } = await admin.from("org_members").insert({ org_id: orgB.id, user_id: UID, role: "editor", status: "active" });
    orgBMembership = !membershipError;
    check("QA14a membership QA en Org B creada", orgBMembership, membershipError?.message || "");
    if (orgBMembership) {
      r = await api("/api/products", { headers: { "x-org-id": orgB.id } });
      check("QA14b Org B lista sin productos de Org A", r.status === 200 && Array.isArray(r.body?.data) && !r.body.data.some((p) => p.org_id === ORG_A), `(status ${r.status})`);
      const orgBName = `QA-ORG-B-PRODUCT-${stamp}`;
      r = await api("/api/products", { method: "POST", headers: { "x-org-id": orgB.id }, body: { name: orgBName, unitCost: 3, salePrice: 12 } });
      orgBProductId = r.body?.product?.id || r.body?.id || r.body?.data?.id || null;
      check("QA14c producto creado en Org B", r.status >= 200 && r.status < 300 && !!orgBProductId, `(status ${r.status})`);
      if (orgBProductId) {
        const { data: orgBProduct } = await admin.from("products").select("org_id, name").eq("id", orgBProductId).single();
        check("QA14d org_id del producto B correcto", orgBProduct?.org_id === orgB.id && orgBProduct.name === orgBName, JSON.stringify(orgBProduct || {}));
        r = await api("/api/products");
        check("QA14e Org A no ve producto de Org B", r.status === 200 && !JSON.stringify(r.body).includes(orgBName), `(status ${r.status})`);
        await page.goto(BASE + "/products", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1000);
        const productsPageText = await page.locator("body").innerText();
        check("QA14f UI Org A no muestra producto de Org B", !productsPageText.includes(orgBName), `url ${page.url()}`);
      }
    }
  }

  // QA15 Drive E2E: upload -> list + metadata -> delete. Never run it against production by default.
  if (!driveCrudAllowed) {
    out("INFO QA15 Drive CRUD omitido: requiere QA_DRIVE_CRUD_ALLOW=I_UNDERSTAND_NON_PRODUCTION y hostname exacto en QA_DRIVE_ALLOWED_HOSTS");
  } else {
    let driveFileId = null;
    const driveName = `qa-battery-${stamp}.txt`;
    const driveUpload = await page.evaluate(async (name) => {
      const form = new FormData();
      form.append("file", new File(["qa-battery"], name, { type: "text/plain" }));
      const response = await fetch("/api/drive/upload", { method: "POST", body: form });
      let body = null;
      try { body = await response.json(); } catch {}
      return { status: response.status, body };
    }, driveName);
    driveFileId = driveUpload.body?.data?.id || null;
    const driveAvailable = driveUpload.status >= 200 && driveUpload.status < 300 && !!driveFileId;
    if (!driveAvailable && driveUpload.status === 500 && JSON.stringify(driveUpload.body).includes("quota")) {
      out("INFO QA15 Drive NOT CONFIGURED: la cuenta OAuth no tiene cuota disponible");
    } else {
      check("QA15a Drive upload crea archivo", driveAvailable, `(status ${driveUpload.status} ${JSON.stringify(driveUpload.body).slice(0, 180)})`);
    }
    if (driveFileId) {
      r = await api("/api/drive/list");
      const driveFiles = r.body?.data?.files || [];
      const listedDriveFile = driveFiles.find((file) => file.id === driveFileId);
      check("QA15b Drive list incluye archivo", r.status === 200 && !!listedDriveFile, `(status ${r.status})`);
      check("QA15c metadata Drive correcta", listedDriveFile?.name === driveName && listedDriveFile?.mimeType === "text/plain" && Number(listedDriveFile?.size) === 10, JSON.stringify(listedDriveFile || {}));
      const renamedDriveName = `qa-renamed-${stamp}.txt`;
      r = await api(`/api/drive/rename/${driveFileId}`, { method: "PATCH", body: { name: renamedDriveName } });
      check("QA15d Drive rename ok", r.status >= 200 && r.status < 300 && r.body?.data?.name === renamedDriveName, `(status ${r.status})`);
      r = await api("/api/drive/list");
      const renamedDriveFile = (r.body?.data?.files || []).find((file) => file.id === driveFileId);
      check("QA15e Drive list refleja rename", r.status === 200 && renamedDriveFile?.name === renamedDriveName, `(status ${r.status})`);
      r = await api(`/api/drive/delete/${driveFileId}`, { method: "DELETE" });
      check("QA15f Drive delete ok", r.status >= 200 && r.status < 300, `(status ${r.status})`);
      r = await api("/api/drive/list");
      check("QA15g Drive list ya no incluye archivo", r.status === 200 && !(r.body?.data?.files || []).some((file) => file.id === driveFileId), `(status ${r.status})`);
    }
  }

  await browser.close();

  // ===== LIMPIEZA =====
  out("--- LIMPIEZA ---");
  if (retId) { await admin.from("returns").delete().eq("id", retId); }
  if (eid) { await admin.from("expenses").delete().eq("id", eid); }
  if (oid) { await admin.from("purchase_orders").delete().eq("id", oid); }
  if (saleId) { await admin.from("sales").delete().eq("id", saleId); }
  await admin.from("stock_movements").delete().eq("reference", "qa-battery");
  if (salePid && salePid !== pidForCleanup) { await admin.from("products").delete().eq("id", salePid); }
  if (orgBProductId) { await admin.from("products").delete().eq("id", orgBProductId); }
  if (orgBMembership && orgB) { await admin.from("org_members").delete().eq("org_id", orgB.id).eq("user_id", UID); }
  if (pidForCleanup) { await admin.from("products").delete().eq("id", pidForCleanup); }
  await admin.from("product_research").delete().eq("asin_reference", "B0QATEMP001");
  await admin.from("products").delete().like("name", `QA-NEG-${stamp}%`);
  if (orgB) { await admin.from("organizations").delete().eq("id", orgB.id); }
  out(`Limpieza OK. RESUMEN: ${pass} PASS / ${fail} FAIL`);
  finish();

  function finish() {
    require("fs").writeFileSync(".qa-results.tmp.txt", lines.join("\n"));
  }
})();
