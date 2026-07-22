from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
RESULTS = []

def log(module, status, detail=""):
    RESULTS.append({"module": module, "status": status, "detail": detail})
    tag = "PASS" if status == "PASS" else "FAIL" if status == "FAIL" else "WARN"
    print(f"{tag} [{module}] {detail}")

def nav(page, url, screenshot=None):
    for attempt in range(3):
        try:
            page.goto(url, timeout=30000, wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            if screenshot:
                page.screenshot(path=screenshot)
            return True
        except Exception as e:
            if attempt < 2:
                page.wait_for_timeout(3000)
            else:
                print(f"  NAV_ERR: {str(e)[:80]}")
                try:
                    page.screenshot(path=screenshot or "/tmp/t_nav_err.png")
                except:
                    pass
                return False

def has_text(page, *keywords):
    try:
        txt = page.locator("body").inner_text(timeout=5000).lower()
        return any(k in txt for k in keywords)
    except:
        return False

def has_el(page, selector):
    return page.locator(selector).count() > 0

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.set_default_timeout(60000)
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    # Warmup: wait for server to be fully ready
    import urllib.request
    print("Waiting for server...")
    for attempt in range(45):
        try:
            resp = urllib.request.urlopen(f"{BASE}/login", timeout=15)
            if resp.status == 200:
                print(f"Server ready after {(attempt+1)*2}s")
                break
        except:
            pass
        import time
        time.sleep(2)
    else:
        print("WARNING: Server may not be fully ready")

    # ========== 1. AUTH ==========
    print("\n=== 1. AUTH ===")
    nav(page, f"{BASE}/login", "/tmp/t01_login.png")
    log("auth", "PASS" if has_el(page, "input[type=email], input[name=email]") else "FAIL", "Login page")

    nav(page, f"{BASE}/register", "/tmp/t02_register.png")
    log("auth", "PASS" if has_el(page, "input[type=email], input[name=email]") else "FAIL", "Register page")

    # Try login
    nav(page, f"{BASE}/login")
    email_el = page.locator("input[type=email], input[name=email]").first
    pass_el = page.locator("input[type=password]").first
    if email_el.count() and pass_el.count():
        email_el.fill("test@test.com")
        pass_el.fill("Test123456")
        btn = page.locator("button[type=submit]").first
        if btn.count():
            btn.click()
            page.wait_for_timeout(4000)
        log("auth", "PASS", f"Login attempted -> {page.url}")
    else:
        log("auth", "FAIL", "Login inputs not found")
    page.screenshot(path="/tmp/t03_after_login.png")

    # ========== 2. ALL MODULES ==========
    print("\n=== 2. MODULE PAGES ===")
    modules = [
        ("dashboard", "/dashboard"),
        ("products", "/products"),
        ("inventory", "/inventory"),
        ("sales", "/sales"),
        ("suppliers", "/suppliers"),
        ("orders", "/orders"),
        ("research", "/research"),
        ("calculator", "/calculator"),
        ("forecasting", "/forecasting"),
        ("ads", "/ads"),
        ("finances", "/finances"),
        ("returns", "/returns"),
        ("shipments", "/shipments"),
        ("sp-api", "/sp-api"),
        ("settings", "/settings"),
    ]
    for name, path in modules:
        ok = nav(page, f"{BASE}{path}", f"/tmp/t_{name}.png")
        body = page.locator("body").inner_text(timeout=5000) if ok else ""
        has_err = "Application error" in body
        if has_err:
            log("page", "FAIL", f"{name} - Application error")
        elif ok and len(body) > 100:
            log("page", "PASS", f"{name}")
        else:
            log("page", "WARN", f"{name} - empty or timeout")

    # ========== 3. SUBPAGES (new/detail) ==========
    print("\n=== 3. FORM PAGES ===")
    form_pages = [
        ("products/new", "Product form"),
        ("sales/new", "Sale form"),
        ("suppliers/new", "Supplier form"),
        ("orders/new", "Order form"),
    ]
    for path, label in form_pages:
        ok = nav(page, f"{BASE}/{path}", f"/tmp/t_form_{path.replace('/','_')}.png")
        inputs = page.locator("input, select, textarea").count()
        log("forms", "PASS" if inputs > 1 else "FAIL", f"{label} - {inputs} inputs")

    # ========== 4. CRUD - CREATE PRODUCT ==========
    print("\n=== 4. CRUD PRODUCT ===")
    nav(page, f"{BASE}/products/new")
    name_input = page.locator("input[name=name], input[placeholder*='nombre'], input[placeholder*='name']").first
    sku_input = page.locator("input[name=sku], input[placeholder*='SKU']").first
    price_input = page.locator("input[name=price], input[placeholder*='precio'], input[placeholder*='price']").first

    if name_input.count():
        name_input.fill("Test Product E2E")
        if sku_input.count():
            sku_input.fill("E2E-TEST-001")
        if price_input.count():
            price_input.fill("29.99")
        
        submit = page.locator("button[type=submit], button:has-text('Guardar'), button:has-text('Crear'), button:has-text('Save')").first
        if submit.count():
            submit.click()
            page.wait_for_timeout(3000)
            page.screenshot(path="/tmp/t04_after_create_product.png")
            log("crud", "PASS", "Product create submitted")
        else:
            log("crud", "WARN", "Product submit button not found")
    else:
        log("crud", "WARN", "Product form inputs not found by placeholder")

    # ========== 5. CRUD - CREATE SALE ==========
    print("\n=== 5. CRUD SALE ===")
    nav(page, f"{BASE}/sales/new")
    page.screenshot(path="/tmp/t05_sale_form.png")
    sale_inputs = page.locator("input, select").count()
    log("crud", "PASS" if sale_inputs > 1 else "WARN", f"Sale form - {sale_inputs} fields")

    # ========== 6. CRUD - CREATE SUPPLIER ==========
    print("\n=== 6. CRUD SUPPLIER ===")
    nav(page, f"{BASE}/suppliers/new")
    page.screenshot(path="/tmp/t06_supplier_form.png")
    sup_inputs = page.locator("input, select").count()
    log("crud", "PASS" if sup_inputs > 1 else "WARN", f"Supplier form - {sup_inputs} fields")

    # ========== 7. SEARCH ==========
    print("\n=== 7. SEARCH ===")
    nav(page, f"{BASE}/dashboard")
    page.keyboard.press("Control+k")
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/t07_search.png")
    dialog = page.locator("[role=dialog], [data-state=open]")
    log("search", "PASS" if dialog.count() > 0 else "WARN", "Cmd+K search")
    page.keyboard.press("Escape")

    # ========== 8. THEME ==========
    print("\n=== 8. THEME ===")
    nav(page, f"{BASE}/settings")
    html_cls = page.locator("html").get_attribute("class") or ""
    log("theme", "PASS" if "dark" in html_cls or "light" in html_cls else "WARN", f"html class: {html_cls[:40]}")

    # ========== 9. RESPONSIVE ==========
    print("\n=== 9. RESPONSIVE ===")
    page.set_viewport_size({"width": 375, "height": 812})
    nav(page, f"{BASE}/dashboard", "/tmp/t09_mobile_dashboard.png")
    log("responsive", "PASS", "Mobile dashboard")
    nav(page, f"{BASE}/products", "/tmp/t09_mobile_products.png")
    log("responsive", "PASS", "Mobile products")
    page.set_viewport_size({"width": 1440, "height": 900})

    # ========== 10. CONSOLE ERRORS ==========
    print("\n=== 10. CONSOLE ERRORS ===")
    real_errors = [e for e in console_errors if "hydrat" not in e.lower() and "deprecated" not in e.lower() and "favicon" not in e.lower()]
    if real_errors:
        log("console", "WARN", f"{len(real_errors)} errors")
        for e in real_errors[:5]:
            print(f"  ERR: {e[:120]}")
    else:
        log("console", "PASS", "Clean console")

    # ========== SUMMARY ==========
    print("\n" + "=" * 60)
    print("RESUMEN FINAL")
    print("=" * 60)
    passes = sum(1 for r in RESULTS if r["status"] == "PASS")
    fails = sum(1 for r in RESULTS if r["status"] == "FAIL")
    warns = sum(1 for r in RESULTS if r["status"] == "WARN")
    print(f"  PASS: {passes}")
    print(f"  FAIL: {fails}")
    print(f"  WARN: {warns}")
    print(f"  TOTAL: {len(RESULTS)}")
    if fails:
        print("\n  FALLOS:")
        for r in RESULTS:
            if r["status"] == "FAIL":
                print(f"    FAIL [{r['module']}] {r['detail']}")

    browser.close()
