import { useState, useEffect } from "react";
import { Heart, MessageCircle, UserPlus, Check, Trash2, Bell, Loader2 } from "lucide-react";
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
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select(`*, from_profile:profiles!notifications_from_user_id_fkey(username, avatar_url), post:posts(image_url)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) setNotifications(data as Notification[]);
    setLoading(false);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user?.id}` },
        async (payload) => {
          const { data } = await supabase
            .from("notifications")
            .select(`*, from_profile:profiles!notifications_from_user_id_fkey(username, avatar_url), post:posts(image_url)`)
            .eq("id", payload.new.id)
            .single();
          if (data) setNotifications((prev) => [data as Notification, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
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
      case "like": return <Heart size={12} className="text-white fill-white" />;
      case "comment": return <MessageCircle size={12} className="text-white fill-white" />;
      case "follow": return <UserPlus size={12} className="text-white fill-white" />;
      default: return <Bell size={12} className="text-white" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "like": return "bg-gradient-to-br from-red-500 to-pink-500";
      case "comment": return "bg-gradient-to-br from-blue-500 to-cyan-500";
      case "follow": return "bg-gradient-to-br from-green-500 to-emerald-500";
      default: return "bg-gray-500";
    }
  };

  const getNotificationText = (notification: Notification) => {
    const username = notification.from_profile?.username || "Someone";
    switch (notification.type) {
      case "like": return <span><span className="font-bold text-foreground">{username}</span> liked your post.</span>;
      case "comment": return <span><span className="font-bold text-foreground">{username}</span> commented: <span className="text-muted-foreground">"{notification.message}"</span></span>;
      case "follow": return <span><span className="font-bold text-foreground">{username}</span> started following you.</span>;
      default: return "";
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto pb-24 px-2">
      
      {/* Header */}
      <div className="flex items-center justify-between py-6 px-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-2">
          Notifications
          {unreadCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold shadow-lg shadow-red-500/20">
              {unreadCount}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={markAllAsRead} 
            className="text-primary hover:bg-primary/10 rounded-full transition-all"
          >
            <Check size={16} className="mr-2" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4 px-2">
           {[1,2,3,4].map(i => (
             <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-secondary/20 animate-pulse">
               <div className="w-12 h-12 rounded-full bg-secondary/50" />
               <div className="flex-1 space-y-2">
                 <div className="h-4 w-3/4 bg-secondary/50 rounded" />
                 <div className="h-3 w-1/4 bg-secondary/30 rounded" />
               </div>
             </div>
           ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-60">
          <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
            <Bell size={40} className="stroke-1" />
          </div>
          <p className="text-lg font-medium">No notifications yet</p>
          <p className="text-sm">When someone interacts with you, you'll see it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.read && markAsRead(notification.id)}
              className={cn(
                "group relative p-4 rounded-[24px] flex items-center gap-4 cursor-pointer transition-all duration-300 border border-white/5",
                // Unread State vs Read State
                !notification.read 
                  ? "bg-gradient-to-r from-secondary/40 to-background backdrop-blur-xl shadow-lg border-l-4 border-l-primary" 
                  : "bg-background/20 hover:bg-background/40 hover:backdrop-blur-lg"
              )}
            >
              {/* Avatar & Icon Badge */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-white/10 to-transparent">
                  <img
                    src={notification.from_profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.from_user_id}`}
                    alt=""
                    className="w-full h-full rounded-full object-cover bg-secondary"
                  />
                </div>
                <div className={cn(
                  "absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 border-background shadow-sm",
                  getNotificationColor(notification.type)
                )}>
                  {getNotificationIcon(notification.type)}
                </div>
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/90 leading-snug">
                  {getNotificationText(notification)}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground mt-1">
                  {formatTime(notification.created_at)}
                </p>
              </div>

              {/* Post Thumbnail (if applicable) */}
              {notification.post?.image_url && (
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 shadow-sm">
                  <img
                    src={notification.post.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Delete Action (Visible on Hover/Swipe) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all duration-200 absolute right-2 top-2 sm:relative sm:right-auto sm:top-auto sm:opacity-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};