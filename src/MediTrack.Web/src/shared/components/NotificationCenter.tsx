import { useState } from "react";
import { Bell, AlertCircle, CalendarDays, Sparkles, CheckCheck } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/components/ui/popover";
import { clsxMerge } from "@/shared/utils/clsxMerge";

/* ── Types ── */

interface Notification {
  readonly id: string;
  readonly category: "critical" | "appointment" | "clara";
  readonly title: string;
  readonly timeAgo: string;
  readonly isRead: boolean;
}

const CATEGORY_CONFIG = {
  critical: {
    icon: AlertCircle,
    borderColor: "border-l-error-500",
    iconColor: "text-error-500",
    label: "Critical",
  },
  appointment: {
    icon: CalendarDays,
    borderColor: "border-l-info-500",
    iconColor: "text-info-500",
    label: "Appointment",
  },
  clara: {
    icon: Sparkles,
    borderColor: "border-l-accent-500",
    iconColor: "text-accent-500",
    label: "Clara AI",
  },
} as const;

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "crit-1",
    category: "critical",
    title: "Lab results: Sarah Johnson - Elevated troponin levels",
    timeAgo: "5 min ago",
    isRead: false,
  },
  {
    id: "crit-2",
    category: "critical",
    title: "Urgent referral response for Michael Chen",
    timeAgo: "12 min ago",
    isRead: false,
  },
  {
    id: "appt-1",
    category: "appointment",
    title: "Appointment reminder: Emily Rivera at 2:00 PM",
    timeAgo: "30 min ago",
    isRead: false,
  },
  {
    id: "appt-2",
    category: "appointment",
    title: "James O'Brien rescheduled to Friday",
    timeAgo: "1 hr ago",
    isRead: false,
  },
  {
    id: "clara-1",
    category: "clara",
    title: "Clara suggestion: Review drug interaction for Patient #3312",
    timeAgo: "2 hr ago",
    isRead: false,
  },
  {
    id: "clara-2",
    category: "clara",
    title: "Session summary ready for today's consults",
    timeAgo: "3 hr ago",
    isRead: false,
  },
];

/* ── Component ── */

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  function handleMarkAllAsRead() {
    setNotifications((previous) =>
      previous.map((notification) => ({ ...notification, isRead: true }))
    );
  }

  function handleMarkAsRead(notificationId: string) {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error-500 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className={clsxMerge(
          "w-80 sm:w-96",
          "rounded-xl border border-border bg-card p-0 shadow-lg"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-error-50 px-1.5 text-xs font-semibold text-error-700">
                {unreadCount}
              </span>
            )}
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 text-xs font-medium text-primary-700 transition-colors hover:text-primary-800"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto sm:max-h-96">
          {notifications.map((notification) => {
            const config = CATEGORY_CONFIG[notification.category];
            const CategoryIcon = config.icon;

            return (
              <button
                key={notification.id}
                onClick={() => handleMarkAsRead(notification.id)}
                className={clsxMerge(
                  "flex w-full gap-3 border-l-2 px-4 py-3 text-left transition-colors hover:bg-muted",
                  config.borderColor,
                  !notification.isRead && "bg-muted/50"
                )}
              >
                <CategoryIcon className={clsxMerge("mt-0.5 h-4 w-4 flex-shrink-0", config.iconColor)} />
                <div className="min-w-0 flex-1">
                  <p className={clsxMerge(
                    "text-sm leading-snug",
                    notification.isRead ? "text-muted-foreground" : "font-medium text-foreground"
                  )}>
                    {notification.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">{notification.timeAgo}</p>
                </div>
                {!notification.isRead && (
                  <span className="mt-1.5 block h-2 w-2 flex-shrink-0 rounded-full bg-primary-700" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3">
          <button className="w-full text-center text-sm font-medium text-primary-700 transition-colors hover:text-primary-800 hover:underline">
            View all notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
