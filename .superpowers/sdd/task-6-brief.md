# Task 6: Scrape API Route

**Files:**
- Create: `src/app/api/scrape/route.ts`

**Interfaces:**
- Consumes: `scrapeUrl` from `@/lib/scraping`
- Produces: `POST /api/scrape` endpoint returning `{ ok, platform, data }` or `{ ok: false, error }`

- [ ] **Step 1: Create API route**

Create `src/app/api/scrape/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scraping";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { ok: false, error: "URL es requerida" },
        { status: 400 }
      );
    }

    const result = await scrapeUrl(url);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      platform: result.platform,
      data: result.data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/scrape/route.ts
git commit -m "feat: add POST /api/scrape endpoint"
```
