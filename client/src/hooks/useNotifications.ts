import { useCallback, useState } from "react";

export interface NotificationItem {
  id: string;
  channel: "email" | "slack" | "system";
  message: string;
  createdAt: string;
}

// Local notification queue for demo; integrate with real providers in production.
export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const push = useCallback((channel: NotificationItem["channel"], message: string) => {
    setItems((prev) => [
      {
        id: crypto.randomUUID(),
        channel,
        message,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  return { items, push };
}
