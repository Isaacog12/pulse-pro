import { useState, useEffect } from "react";
import { Heart, MessageSquare, UserPlus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  user_id: string;
  from_user_id: string;
  type: "like" | "comment" | "follow";
  post_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  from_profile?: {
    username: string;
    avatar_url: string | null;
  };
  post?: {
    image_url: string;
  };
}

export const NotificationsView = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select(`
        *,
        from_profile:profiles!notifications_from_user_id_fkey(username, avatar_url),
        post:posts(image_url)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as Notification[]);
    }
    setLoading(false);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        async (payload) => {
          // Fetch the full notification with relations
          const { data } = await supabase
            .from("notifications")
            .select(`
              *,
              from_profile:profiles!notifications_from_user_id_fkey(username, avatar_url),
              post:posts(image_url)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setNotifications((prev) => [data as Notification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart size={16} className="text-accent fill-current" />;
      case "comment":
        return <MessageSquare size={16} className="text-primary" />;
      case "follow":
        return <UserPlus size={16} className="text-green-400" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const username = notification.from_profile?.username || "Someone";
    switch (notification.type) {
      case "like":
        return `${username} liked your post`;
      case "comment":
        return `${username} commented: "${notification.message}"`;
      case "follow":
        return `${username} started following you`;
      default:
        return "";
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check size={16} className="mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <p className="text-lg font-medium">No notifications yet</p>
          <p className="text-sm">When someone interacts with you, you'll see it here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.read && markAsRead(notification.id)}
              className={cn(
                "glass rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:bg-secondary/50",
                !notification.read && "border-l-4 border-primary bg-primary/5"
              )}
            >
              <div className="relative">
                <img
                  src={
                    notification.from_profile?.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.from_user_id}`
                  }
                  alt=""
                  className="w-12 h-12 rounded-full object-cover bg-secondary"
                />
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background">
                  {getNotificationIcon(notification.type)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm">
                  {getNotificationText(notification)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(notification.created_at)}
                </p>
              </div>

              {notification.post?.image_url && (
                <img
                  src={notification.post.image_url}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}

              <Button
                variant="ghost"
                size="iconSm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                className="opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};