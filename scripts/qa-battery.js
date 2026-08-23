require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const { createClient } = require("@supabase/supabase-js");
const { chromium } = require("@playwright/test");

const BASE = process.env.QA_BASE_URL || "https://amazon-fba-manager-virid.vercel.app";
const EMAIL = process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD;

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

  r = await api("/api/products", { method: "POST", body: { name: `QA-CRUD-${stamp}`, unitCost: 5, salePrice: 25 } });
  const created = r.body || {};
  const pid = created?.product?.id || created?.id || created?.data?.id;
  check("QA6a POST /api/products crea", r.status >= 200 && r.status < 300 && !!pid, `(status ${r.status} ${JSON.stringify(created).slice(0, 250)})`);
  let pidForCleanup = pid;
  if (pid) {
    const { data: prodRow } = await admin.from("products").select("org_id, name").eq("id", pid).single();
    check("QA6b org_id correcto en DB", prodRow && prodRow.org_id === ORG_A, JSON.stringify(prodRow || {}));
    r = await api(`/api/products/${pid}`, { method: "PUT", body: { name: `QA-CRUD-EDIT-${stamp}` } });
    check("QA6c PUT actualiza", r.status >= 200 && r.status < 300, `(status ${r.status})`);
    r = await api(`/api/products/${pid}`);
    check("QA6d GET por id -> 200", r.status === 200, `(status ${r.status})`);
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

  await browser.close();

  // ===== LIMPIEZA =====
  out("--- LIMPIEZA ---");
  if (saleId) { await admin.from("sales").delete().eq("id", saleId); }
  await admin.from("stock_movements").delete().eq("reference", "qa-battery");
  if (salePid && salePid !== pidForCleanup) { await admin.from("products").delete().eq("id", salePid); }
  if (pidForCleanup) { await admin.from("products").delete().eq("id", pidForCleanup); }
  await admin.from("product_research").delete().eq("asin_reference", "B0QATEMP001");
  if (orgB) { await admin.from("organizations").delete().eq("id", orgB.id); }
  out(`Limpieza OK. RESUMEN: ${pass} PASS / ${fail} FAIL`);
  finish();

  function finish() {
    require("fs").writeFileSync(".qa-results.tmp.txt", lines.join("\n"));
  }
})();
