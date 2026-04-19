export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("Error al obtener datos");
    throw error;
  }
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
};