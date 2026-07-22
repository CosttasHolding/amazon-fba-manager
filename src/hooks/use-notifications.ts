"use client";

import { useState, useCallback } from "react";
import type { NotificationsResponse } from "@/types";

export function useNotifications() {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async (dismissedIds?: string) => {
    setLoading(true);
    try {
      const url = dismissedIds
        ? `/api/notifications?dismissed=${encodeURIComponent(dismissedIds)}`
        : "/api/notifications";
      const res = await fetch(url);
      if (res.ok) {
        const json: NotificationsResponse = await res.json();
        setData(json);
        return json;
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const totalCount =
    (data?.notifications?.length ?? 0);
  const unreadCount = data?.unread_count ?? 0;

  return { data, loading, totalCount, unreadCount, fetchNotifications, setData };
}
