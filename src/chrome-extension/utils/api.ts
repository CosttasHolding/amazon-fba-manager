export async function sendToWebApp(payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://amazon-fba-manager-virid.vercel.app/api/research/capture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: (data as Record<string, string>).error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
