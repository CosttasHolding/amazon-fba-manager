import { describe, expect, it } from "vitest";
import { buildContentDisposition } from "./download";

describe("buildContentDisposition", () => {
  it("escapes header-breaking characters and preserves the UTF-8 filename", () => {
    const header = buildContentDisposition('reporte"\r\n.txt');

    expect(header).toBe(
      "attachment; filename=\"reporte___.txt\"; filename*=UTF-8''reporte%22%0D%0A.txt",
    );
  });

  it("keeps backslashes and non-ASCII names without raw header-breaking characters", () => {
    const header = buildContentDisposition("reporte\\ ñ.txt");

    expect(header).toContain('filename="reporte\\ ñ.txt"');
    expect(header).toContain("filename*=UTF-8''reporte%5C%20%C3%B1.txt");
    expect(header).not.toMatch(/[\r\n]/);
  });
});
