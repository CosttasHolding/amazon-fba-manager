export function buildContentDisposition(fileName: string): string {
  const safeName = fileName.replace(/[\r\n"]/g, "_");
  return `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
