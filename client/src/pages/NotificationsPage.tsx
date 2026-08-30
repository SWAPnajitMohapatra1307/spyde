// client/src/pages/NotificationsPage.tsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Bell,
  BellOff,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Users,
  CheckCheck,
  ChevronRight,
} from "lucide-react";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  NotificationItem,
  NotificationType,
} from "../hooks/useNotifications";

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "PAYMENT_BLOCKED":
      return <CreditCard size={18} className="text-accent-red" />;
    case "RISK_ALERT":
    case "TAMPER_WARNING":
      return <ShieldAlert size={18} className="text-accent-orange" />;
    case "SAFE_CIRCLE":
      return <Users size={18} className="text-primary" />;
    case "COMPLAINT_UPDATE":
      return <ShieldCheck size={18} className="text-accent-green" />;
    case "SYSTEM":
    default:
      return <Bell size={18} className="text-bone-muted" />;
  }
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNREAD">("ALL");

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? notifications.filter((n) => !n.read).length;

  const filteredList = useMemo(() => {
    if (activeFilter === "UNREAD") {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, activeFilter]);

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      markReadMutation.mutate(item.id);
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      markAllReadMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 h-64 justify-center text-bone-muted">
        <AlertTriangle size={24} className="text-accent-red" />
        <p className="text-sm">Failed to load security notifications.</p>
        <p className="text-xs text-accent-red">{error?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="p-2 rounded-lg hover:bg-white/5 text-bone-muted transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-bone text-2xl font-bold">Security Alerts</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-pill bg-accent-red text-white text-xs font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-bone-muted text-sm mt-0.5">
              Real-time threat alerts, dispute status updates, and circle requests
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium self-start sm:self-center"
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => setActiveFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeFilter === "ALL"
              ? "bg-primary text-white"
              : "text-bone-muted hover:text-bone"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("UNREAD")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeFilter === "UNREAD"
              ? "bg-primary text-white"
              : "text-bone-muted hover:text-bone"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filteredList.length === 0 ? (
        <div className="bg-canvas-card rounded-2xl p-12 border border-white/5 text-center flex flex-col items-center gap-3">
          <BellOff size={36} className="text-bone-muted opacity-30" />
          <p className="text-bone font-medium">No alerts right now</p>
          <p className="text-bone-muted text-xs max-w-xs">
            {activeFilter === "UNREAD"
              ? "You've read all your notifications."
              : "Your account is secure with no outstanding risk alerts."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredList.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                item.read
                  ? "bg-canvas-card border-white/5 opacity-80 hover:opacity-100 hover:border-white/15"
                  : "bg-canvas-card border-primary/30 shadow-[0_0_15px_rgba(255,102,0,0.04)] hover:border-primary/50"
              }`}
            >
              {/* Type Icon */}
              <div className="p-2.5 rounded-xl bg-white/5 shrink-0 mt-0.5">
                {getNotificationIcon(item.type)}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-semibold truncate ${
                      item.read ? "text-bone" : "text-white"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="text-[11px] text-bone-muted shrink-0">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                <p className="text-bone-muted text-xs leading-relaxed line-clamp-2">
                  {item.message}
                </p>
              </div>

              {/* Right Action Chevron / Unread Dot */}
              <div className="flex items-center gap-2 self-center shrink-0">
                {!item.read && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
                {item.link && (
                  <ChevronRight size={16} className="text-bone-muted" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};