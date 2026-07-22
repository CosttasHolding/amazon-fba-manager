export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period") || "30d";
  const type = searchParams.get("type") || "daily";
  const dateLocale = searchParams.get("locale") === "en" ? "en-US" : "es-ES";

  let currentDays: number;
  switch (period) {
    case "7d": currentDays = 7; break;
    case "60d": currentDays = 60; break;
    case "90d": currentDays = 90; break;
    default: currentDays = 30;
  }

  const now = new Date();
  const totalDays = currentDays * 2;

  const { data: sales } = await supabase
    .from("sales")
    .select("sale_date, revenue, units_sold")
    .eq("org_id", orgId)
    .gte("sale_date", new Date(now.getTime() - totalDays * 86400000).toISOString().split("T")[0])
    .order("sale_date", { ascending: true });

  const salesData = sales || [];

  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - currentDays);
  const currentStartStr = currentStart.toISOString().split("T")[0];
  const currentEndStr = now.toISOString().split("T")[0];

  const previousStart = new Date(now);
  previousStart.setDate(previousStart.getDate() - currentDays * 2);
  const previousStartStr = previousStart.toISOString().split("T")[0];
  const previousEndStr = currentStartStr;

  const currentMap: Record<string, number> = {};
  const previousMap: Record<string, number> = {};
  for (let i = currentDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    currentMap[d.toISOString().split("T")[0]] = 0;
  }
  for (let i = currentDays * 2 - 1; i >= currentDays; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    previousMap[d.toISOString().split("T")[0]] = 0;
  }

  for (const sale of salesData) {
    const key = sale.sale_date;
    if (currentMap[key] !== undefined) currentMap[key] += sale.revenue || 0;
    if (previousMap[key] !== undefined) previousMap[key] += sale.revenue || 0;
  }

  const totalCurrent = Object.values(currentMap).reduce((a, b) => a + b, 0);
  const totalPrevious = Object.values(previousMap).reduce((a, b) => a + b, 0);

  let daily: { date: string; current: number; previous: number }[];

  if (type === "weekly") {
    const weekMap: Record<string, { current: number; previous: number; label: string }> = {};
    const weekCount = Math.ceil(currentDays / 7);
    for (let i = weekCount - 1; i >= 0; i--) {
      const label = `S${weekCount - i}`;
      weekMap[label] = { current: 0, previous: 0, label };
    }
    for (const [key, val] of Object.entries(currentMap)) {
      const d = new Date(key + "T12:00:00");
      const weekOffset = Math.floor((now.getTime() - d.getTime()) / (7 * 86400000));
      const weekLabel = `S${Math.min(weekOffset + 1, weekCount)}`;
      if (weekMap[weekLabel]) weekMap[weekLabel].current += val;
    }
    for (const [key, val] of Object.entries(previousMap)) {
      const d = new Date(key + "T12:00:00");
      const baseDate = new Date(now);
      baseDate.setDate(baseDate.getDate() - currentDays);
      const weekOffset = Math.floor((baseDate.getTime() - d.getTime()) / (7 * 86400000));
      const weekLabel = `S${Math.min(weekOffset + 1, weekCount)}`;
      if (weekMap[weekLabel]) weekMap[weekLabel].previous += val;
    }
    daily = Object.values(weekMap).map((w) => ({
      date: w.label,
      current: Math.round(w.current * 100) / 100,
      previous: Math.round(w.previous * 100) / 100,
    }));
  } else if (type === "monthly") {
    const monthMap: Record<string, { current: number; previous: number; label: string }> = {};
    const monthCount = Math.max(Math.ceil(currentDays / 30), 1);
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString(dateLocale, { month: "short", year: "2-digit" });
      monthMap[label] = { current: 0, previous: 0, label };
    }
    for (const [key, val] of Object.entries(currentMap)) {
      const d = new Date(key + "T12:00:00");
      const monthOffset = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      const label = d.toLocaleDateString(dateLocale, { month: "short", year: "2-digit" });
      if (monthOffset < monthCount && monthMap[label]) monthMap[label].current += val;
    }
    for (const [key, val] of Object.entries(previousMap)) {
      const d = new Date(key + "T12:00:00");
      const baseDate = new Date(now);
      baseDate.setDate(baseDate.getDate() - currentDays);
      const monthOffset = (baseDate.getFullYear() - d.getFullYear()) * 12 + (baseDate.getMonth() - d.getMonth());
      const label = d.toLocaleDateString(dateLocale, { month: "short", year: "2-digit" });
      if (monthOffset < monthCount && monthMap[label]) monthMap[label].previous += val;
    }
    daily = Object.values(monthMap).map((m) => ({
      date: m.label,
      current: Math.round(m.current * 100) / 100,
      previous: Math.round(m.previous * 100) / 100,
    }));
  } else {
    daily = Object.entries(currentMap).map(([date, current]) => ({
      date: new Date(date + "T12:00:00").toLocaleDateString(dateLocale, { day: "2-digit", month: "short" }),
      current: Math.round(current * 100) / 100,
      previous: Math.round((previousMap[date] || 0) * 100) / 100,
    }));
  }

  return NextResponse.json({
    daily,
    totalCurrent: Math.round(totalCurrent * 100) / 100,
    totalPrevious: Math.round(totalPrevious * 100) / 100,
    metrics: {
      currentUnits: salesData.filter((s) => s.sale_date >= currentStartStr && s.sale_date <= currentEndStr).reduce((s, x) => s + (x.units_sold || 0), 0),
      previousUnits: salesData.filter((s) => s.sale_date >= previousStartStr && s.sale_date <= previousEndStr).reduce((s, x) => s + (x.units_sold || 0), 0),
    },
  });
});
