export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "Error al obtener datos");
    const error = new Error(body || "Error al obtener datos");
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  return res.json();
}
