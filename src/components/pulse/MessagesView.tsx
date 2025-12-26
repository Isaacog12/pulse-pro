import { useState, useEffect } from "react";
import { MessageSquareDashed, Search, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface Conversation {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
}

interface MessagesViewProps {
  onSelectConversation: (conversationId: string, otherUser: Conversation["other_user"]) => void;
  onNewMessage: () => void;
}

export const MessagesView = ({ onSelectConversation, onNewMessage }: MessagesViewProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // ==========================================
  // 1. Unified Realtime Listener & Data Fetching
  // ==========================================
  useEffect(() => {
    if (!user) return;

    // A. Initial Fetch
    fetchConversations();

    // B. Setup Realtime Subscription
    const channel = supabase
      .channel("messages-view-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          // Refresh list when a new message arrives (updates last msg / unread count)
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${user.id}`, // <--- CRITICAL FIX: Listen for when YOU are added to a chat
        },
        () => {
          // Refresh list when a new conversation starts
          fetchConversations();
        }
      )
      .subscribe();

    // C. Cleanup on Unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ==========================================
  // 2. Fetch Logic (Unchanged)
  // ==========================================
  const fetchConversations = async () => {
    if (!user) return;

    // Get all conversations the user is part of
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participations?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const conversationIds = participations.map((p) => p.conversation_id);

    // Get conversation details with other participants
    const conversationsData: Conversation[] = [];

    for (const convId of conversationIds) {
      // Get other participant
      const { data: otherParticipant } = await supabase
        .from("conversation_participants")
        .select("user_id, profiles:profiles(id, username, avatar_url)")
        .eq("conversation_id", convId)
        .neq("user_id", user.id)
        .single();

      // Get last message
      const { data: lastMessage } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Get unread count
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", convId)
        .eq("read", false)
        .neq("sender_id", user.id);

      if (otherParticipant?.profiles) {
        conversationsData.push({
          id: convId,
          updated_at: lastMessage?.created_at || new Date().toISOString(),
          other_user: otherParticipant.profiles as Conversation["other_user"],
          last_message: lastMessage || undefined,
          unread_count: unreadCount || 0,
        });
      }
    }

    // Sort by last message time
    conversationsData.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    setConversations(conversationsData);
    setLoading(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return "now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.other_user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 sm:px-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between py-6 mb-2 sticky top-0 z-20 bg-background/0 backdrop-blur-sm -mx-4 px-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Messages
        </h2>
        <button
          onClick={onNewMessage}
          className="p-3 rounded-full bg-gradient-to-tr from-primary to-accent text-white shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6 group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-secondary/30 border border-white/5 rounded-2xl flex items-center shadow-inner group-focus-within:border-primary/30 group-focus-within:bg-secondary/50 transition-all duration-300">
          <Search className="ml-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-3 h-12 bg-transparent border-none focus-visible:ring-0 placeholder:text-muted-foreground/50 text-base"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground/50">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-secondary/50 to-transparent flex items-center justify-center mb-6 border border-white/5">
            <MessageSquareDashed size={40} className="stroke-[1.5]" />
          </div>
          <p className="text-lg font-medium text-foreground/80">No messages yet</p>
          <p className="text-sm">Start a conversation with someone!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id, conv.other_user)}
              className={cn(
                "group relative p-4 rounded-[24px] flex items-center gap-4 cursor-pointer transition-all duration-300 border",
                // Active/Unread State
                conv.unread_count > 0
                  ? "bg-secondary/40 backdrop-blur-xl border-primary/20 shadow-lg shadow-primary/5" 
                  : "bg-background/20 border-white/5 hover:bg-white/5 hover:border-white/10"
              )}
            >
              {/* Avatar & Status */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-white/10 to-transparent group-hover:from-primary/50 group-hover:to-accent/50 transition-colors">
                  <img
                    src={
                      conv.other_user.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.other_user.id}`
                    }
                    alt={conv.other_user.username}
                    className="w-full h-full rounded-full object-cover bg-secondary"
                  />
                </div>
                {conv.unread_count > 0 && (
                  <div className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-background shadow-sm animate-in zoom-in">
                    {conv.unread_count}
                  </div>
                )}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                    {conv.other_user.username}
                  </p>
                  {conv.last_message && (
                    <span className="text-[10px] font-medium text-muted-foreground/60 whitespace-nowrap ml-2">
                      {formatTime(conv.last_message.created_at)}
                    </span>
                  )}
                </div>
                
                {conv.last_message && (
                  <p className={cn(
                    "text-sm truncate pr-4",
                    conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {conv.last_message.sender_id === user?.id && <span className="opacity-60">You: </span>}
                    {conv.last_message.content}
                  </p>
                )}
              </div>

              {/* Hover Indicator (Desktop) */}
              <div className="w-1 h-8 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};