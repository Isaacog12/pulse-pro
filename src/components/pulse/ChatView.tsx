import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Loader2, Phone, Video, MoreVertical, Paperclip, Smile, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
}

interface ChatViewProps {
  conversationId: string;
  otherUser: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  onBack: () => void;
}

export const ChatView = ({ conversationId, otherUser, onBack }: ChatViewProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();
    checkOtherUserStatus();
    const cleanup = setupRealtimeSubscription();
    const statusInterval = setInterval(checkOtherUserStatus, 30000);
    return () => {
      cleanup();
      clearInterval(statusInterval);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && data) setMessages(data);
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    if (!user) return;
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("read", false);
  };

  const checkOtherUserStatus = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("last_seen")
      .eq("id", otherUser.id)
      .single();

    if (data?.last_seen) {
      const diffMinutes = (new Date().getTime() - new Date(data.last_seen).getTime()) / 1000 / 60;
      setOtherUserOnline(diffMinutes < 5);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          if (newMsg.sender_id !== user?.id) {
            supabase.from("messages").update({ read: true }).eq("id", newMsg.id);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    });

    if (error) {
      console.error("Error sending message:", error);
      setNewMessage(content);
    }
    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Grouping logic
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    const existing = groupedMessages.find((g) => g.date === dateKey);
    if (existing) existing.messages.push(msg);
    else groupedMessages.push({ date: dateKey, messages: [msg] });
  });

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-background/5">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-10 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header - Glass Bar */}
      <div className="flex-shrink-0 px-4 py-3 z-20">
        <div className="bg-background/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="relative">
              <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-transparent to-transparent hover:from-primary hover:to-blue-400 transition-colors">
                 <img
                  src={otherUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.id}`}
                  alt={otherUser.username}
                  className="w-full h-full rounded-full object-cover bg-secondary"
                />
              </div>
              {otherUserOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
              )}
            </div>
            
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground">{otherUser.username}</span>
              <span className={cn("text-[10px] font-medium", otherUserOnline ? "text-green-500" : "text-muted-foreground")}>
                {otherUserOnline ? "Active now" : "Offline"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><Phone size={18} /></button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><Video size={18} /></button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><MoreVertical size={18} /></button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
            <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center">
              <span className="text-4xl">👋</span>
            </div>
            <p>Say hello to start the conversation!</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex items-center justify-center mb-6">
                <span className="text-[10px] font-medium text-muted-foreground/60 bg-secondary/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/5">
                  {new Date(group.date).toDateString() === new Date().toDateString() ? "Today" : group.date}
                </span>
              </div>
              
              <div className="space-y-3">
                {group.messages.map((msg, i) => {
                  const isOwn = msg.sender_id === user?.id;
                  
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex w-full animate-in slide-in-from-bottom-2 duration-300",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[75%] relative px-4 py-2.5 shadow-sm transition-all",
                        isOwn 
                          ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl rounded-tr-sm shadow-blue-500/20" 
                          : "bg-secondary/40 backdrop-blur-md border border-white/5 text-foreground rounded-2xl rounded-tl-sm"
                      )}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        
                        <div className={cn(
                          "flex items-center justify-end gap-1 mt-1",
                          isOwn ? "text-blue-100/70" : "text-muted-foreground/60"
                        )}>
                          <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                          {isOwn && (
                             msg.read 
                               ? <CheckCheck size={12} className="text-blue-100" />
                               : <Check size={12} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Floating Glass Island */}
      <div className="p-4 z-20">
        <div className="bg-background/60 backdrop-blur-2xl border border-white/10 rounded-[24px] p-2 flex items-end gap-2 shadow-lg">
          
          <div className="flex items-center gap-1 pb-2 pl-2">
            <button className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded-full transition-colors">
              <Paperclip size={20} />
            </button>
          </div>

          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            className="flex-1 min-h-[44px] max-h-32 py-3 bg-transparent border-none focus-visible:ring-0 placeholder:text-muted-foreground/50 resize-none overflow-hidden"
          />

          <div className="flex items-center gap-2 pb-1 pr-1">
             <button className="p-2 text-muted-foreground hover:text-yellow-500 hover:bg-secondary/50 rounded-full transition-colors">
              <Smile size={20} />
            </button>
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full shadow-lg transition-all duration-300",
                newMessage.trim() 
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-105" 
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} className={newMessage.trim() ? "ml-0.5" : ""} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};