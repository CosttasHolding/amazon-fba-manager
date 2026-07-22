import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./use-debounce";

describe("useDebounce", () => {
  it("devuelve el valor inicial inmediatamente", () => {
    const { result } = renderHook(() => useDebounce("test", 300));
    expect(result.current).toBe("test");
  });

  it("actualiza el valor despues del delay", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hola", delay: 300 } }
    );

    expect(result.current).toBe("hola");

    rerender({ value: "mundo", delay: 300 });
    expect(result.current).toBe("hola");

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe("mundo");

    vi.useRealTimers();
  });

  it("cancela el timer anterior si el valor cambia antes del delay", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } }
    );

    rerender({ value: "b", delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: "c", delay: 300 });

    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe("a");

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe("c");

    vi.useRealTimers();
  });
});
