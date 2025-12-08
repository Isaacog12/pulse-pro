import { useState, useEffect } from "react";
import { MessageCircleDashed, Search, Plus } from "lucide-react";
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

  useEffect(() => {
    if (user) {
      fetchConversations();
      setupRealtimeSubscription();
    }
  }, [user]);

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

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("messages-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchConversations()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
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
        <h2 className="text-2xl font-bold text-foreground">Messages</h2>
        <button
          onClick={onNewMessage}
          className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredConversations.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <MessageCircleDashed className="mx-auto mb-4 text-muted-foreground/50" size={48} />
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Start a conversation with someone!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id, conv.other_user)}
              className={cn(
                "glass rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:bg-secondary/50",
                conv.unread_count > 0 && "border-l-4 border-primary bg-primary/5"
              )}
            >
              <div className="relative">
                <img
                  src={
                    conv.other_user.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.other_user.id}`
                  }
                  alt={conv.other_user.username}
                  className="w-14 h-14 rounded-full object-cover bg-secondary"
                />
                {conv.unread_count > 0 && (
                  <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {conv.unread_count}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{conv.other_user.username}</p>
                  {conv.last_message && (
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conv.last_message.created_at)}
                    </span>
                  )}
                </div>
                {conv.last_message && (
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.last_message.sender_id === user?.id && "You: "}
                    {conv.last_message.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
