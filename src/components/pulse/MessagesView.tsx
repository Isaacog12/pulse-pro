import { useState, useEffect } from "react";
import { MessageSquareDashed, Search, Plus, Loader2, Check, CheckCheck, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { decryptMessage } from "@/lib/crypto"; // Import our crypto helper

interface Conversation {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  last_message?: {
    content: string; // We will overwrite this with decrypted text
    created_at: string;
    sender_id: string;
    read: boolean;
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
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // 1. Get Private Key immediately
    const storedPriv = localStorage.getItem(`priv_key_${user.id}`);
    if (storedPriv) setPrivateKey(storedPriv);

    fetchConversations();

    // 2. Realtime Subscriptions
    const dbChannel = supabase
      .channel("messages-list-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchConversations() // Refresh list on new message
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_participants", filter: `user_id=eq.${user.id}` },
        () => fetchConversations()
      )
      .subscribe();

    const presenceChannel = supabase.channel(`typing-status:${user.id}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const { conversation_id, is_typing } = payload.payload;
        setTypingUsers((prev) => ({
          ...prev,
          [conversation_id]: is_typing,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  // Re-fetch if private key loads late (rare but safe)
  useEffect(() => {
    if (privateKey && conversations.length > 0) {
      fetchConversations();
    }
  }, [privateKey]);

  const fetchConversations = async () => {
    if (!user) return;

    // A. Get conversations
    const { data: myParticipations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!myParticipations?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const conversationIds = myParticipations.map((p) => p.conversation_id);
    const rawConversations: any[] = [];

    // B. Fetch Data Loop
    for (const convId of conversationIds) {
      const { data: otherParticipant } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", convId)
        .neq("user_id", user.id)
        .limit(1)
        .single();

      if (otherParticipant) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", otherParticipant.user_id)
          .single();

        const { data: lastMessage } = await supabase
          .from("messages")
          .select("content, created_at, sender_id, read")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", convId)
          .eq("read", false)
          .neq("sender_id", user.id);

        if (profile) {
          rawConversations.push({
            id: convId,
            updated_at: lastMessage?.created_at || new Date().toISOString(),
            other_user: profile,
            last_message: lastMessage,
            unread_count: count || 0,
          });
        }
      }
    }

    // C. DECRYPT PREVIEWS (The Magic Step)
    // We process all conversations in parallel to keep it fast
    const decryptedConversations = await Promise.all(
      rawConversations.map(async (conv) => {
        if (!conv.last_message) return conv;

        // Get key from local state or storage directly
        const myPrivKey = privateKey || localStorage.getItem(`priv_key_${user.id}`);
        
        let previewText = conv.last_message.content;

        // Check if it looks like a media file placeholder first
        if (previewText.startsWith("📷") || previewText.startsWith("🎥") || previewText.startsWith("📎")) {
             // Leave as is
        } else if (myPrivKey) {
          // Attempt Decryption
          const isSender = conv.last_message.sender_id === user.id;
          previewText = await decryptMessage(conv.last_message.content, myPrivKey, isSender);
        } else {
          // No key found? Show generic text
          previewText = "🔒 Encrypted Message";
        }

        return {
          ...conv,
          last_message: {
            ...conv.last_message,
            content: previewText,
          },
        };
      })
    );

    // Sort by newest
    decryptedConversations.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    setConversations(decryptedConversations);
    setLoading(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    if (now.toDateString() === date.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.other_user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 sm:px-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
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

      {/* SEARCH */}
      <div className="relative mb-6 group">
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

      {/* LIST */}
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
                conv.unread_count > 0
                  ? "bg-secondary/40 backdrop-blur-xl border-primary/20 shadow-lg shadow-primary/5" 
                  : "bg-background/20 border-white/5 hover:bg-white/5 hover:border-white/10"
              )}
            >
              {/* AVATAR + BADGE */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-white/10 to-transparent group-hover:from-primary/50 group-hover:to-accent/50 transition-colors">
                  <img
                    src={conv.other_user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.other_user.id}`}
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

              {/* CONTENT */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className={cn(
                    "text-base transition-colors",
                    conv.unread_count > 0 ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                  )}>
                    {conv.other_user.username}
                  </p>
                  {conv.last_message && (
                    <span className={cn(
                      "text-[10px] whitespace-nowrap ml-2",
                      conv.unread_count > 0 ? "text-primary font-bold" : "text-muted-foreground/60 font-medium"
                    )}>
                      {formatTime(conv.last_message.created_at)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5">
                  {/* READ RECEIPT (If I sent the last message) */}
                  {conv.last_message?.sender_id === user?.id && (
                    <span className={cn("flex-shrink-0", conv.last_message.read ? "text-blue-400" : "text-muted-foreground/60")}>
                      {conv.last_message.read ? <CheckCheck size={14} /> : <Check size={14} />}
                    </span>
                  )}

                  <p className={cn(
                    "text-sm truncate pr-4 flex-1",
                    conv.unread_count > 0 ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}>
                    {/* TYPING INDICATOR vs LAST MESSAGE */}
                    {typingUsers[conv.id] ? (
                      <span className="text-primary italic animate-pulse">Typing...</span>
                    ) : (
                      <>
                        {conv.last_message?.sender_id === user?.id && <span className="opacity-60 font-normal">You: </span>}
                        {conv.last_message?.content}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};