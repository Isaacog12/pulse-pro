import { useState, useEffect } from "react";
import { Heart, MessageCircleDashed, UserPlus, Check, Trash2, Bell, Loader2 } from "lucide-react";
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

  // --- UPDATED ICON MAPPING ---
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like": return <Heart size={14} className="text-white fill-white" strokeWidth={0} />;
      // ✅ Updated to MessageCircleDashed
      case "comment": return <MessageCircleDashed size={14} className="text-white" strokeWidth={2.5} />;
      case "follow": return <UserPlus size={14} className="text-white fill-white" strokeWidth={0} />;
      default: return <Bell size={14} className="text-white" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "like": return "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30";
      case "comment": return "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30";
      case "follow": return "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30";
      default: return "bg-gray-500";
    }
  };

  const getNotificationText = (notification: Notification) => {
    const username = notification.from_profile?.username || "Someone";
    switch (notification.type) {
      case "like": return <span><span className="font-bold text-foreground">{username}</span> liked your post.</span>;
      case "comment": return <span><span className="font-bold text-foreground">{username}</span> commented: <span className="text-muted-foreground font-normal">"{notification.message}"</span></span>;
      case "follow": return <span><span className="font-bold text-foreground">{username}</span> started following you.</span>;
      default: return "";
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex items-center justify-between py-6 mb-2 sticky top-0 z-20 bg-background/0 backdrop-blur-sm -mx-4 px-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-3">
          Notifications
          {unreadCount > 0 && (
            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold border border-primary/20 animate-in zoom-in">
              {unreadCount} NEW
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={markAllAsRead} 
            className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full transition-all text-xs"
          >
            Mark all read <Check size={14} className="ml-1.5" /> 
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
           {[1,2,3,4].map(i => (
             <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-secondary/20 animate-pulse border border-white/5">
               <div className="w-12 h-12 rounded-full bg-secondary/50" />
               <div className="flex-1 space-y-2">
                 <div className="h-4 w-3/4 bg-secondary/50 rounded" />
                 <div className="h-3 w-1/4 bg-secondary/30 rounded" />
               </div>
             </div>
           ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground/50 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-secondary/50 to-transparent flex items-center justify-center mb-6 border border-white/5">
            <Bell size={40} className="stroke-[1.5]" />
          </div>
          <p className="text-lg font-medium text-foreground/80">All caught up!</p>
          <p className="text-sm">No new notifications for now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.read && markAsRead(notification.id)}
              className={cn(
                "group relative p-4 rounded-[24px] flex items-start gap-4 cursor-pointer transition-all duration-300 border",
                // Unread vs Read Styles
                !notification.read 
                  ? "bg-secondary/40 backdrop-blur-xl border-primary/20 shadow-lg shadow-primary/5" 
                  : "bg-background/20 border-white/5 hover:bg-white/5 hover:border-white/10"
              )}
            >
              {/* Unread Indicator Dot */}
              {!notification.read && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full blur-[1px]" />
              )}

              {/* Avatar & Icon Badge */}
              <div className="relative flex-shrink-0 mt-1">
                <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-white/10 to-transparent">
                  <img
                    src={notification.from_profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.from_user_id}`}
                    alt=""
                    className="w-full h-full rounded-full object-cover bg-secondary"
                  />
                </div>
                <div className={cn(
                  "absolute -bottom-1 -right-1 p-1.5 rounded-full border-[3px] border-background shadow-md",
                  getNotificationColor(notification.type)
                )}>
                  {getNotificationIcon(notification.type)}
                </div>
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm text-foreground/90 leading-snug">
                  {getNotificationText(notification)}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                  {formatTime(notification.created_at)}
                </p>
              </div>

              {/* Post Thumbnail (if applicable) */}
              {notification.post?.image_url && (
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 shadow-sm mt-1 group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={notification.post.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Delete Action (Desktop: Hover, Mobile: Always subtle) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                className="opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 absolute top-2 right-2 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};