import { useState, useEffect } from "react";
import { MessageSquareDashed, Search, Plus, Loader2, Check, CheckCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { decryptMessage } from "@/lib/crypto";
import { NewChatDialog } from "./NewChatDialog";

interface Conversation {
  id: string;
  updated_at: string;
  other_user: { id: string; username: string; avatar_url: string | null; };
  last_message?: { content: string; created_at: string; sender_id: string; read: boolean; };
  unread_count: number;
}

interface MessagesViewProps {
  onSelectConversation: (conversationId: string, otherUser: any) => void;
  onNewMessage?: () => void;
}

export const MessagesView = ({ onSelectConversation }: MessagesViewProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  // --- 1. SETUP & AUTO-SYNC ---
  useEffect(() => {
    if (!user) return;
    autoSyncKeys();

    const channel = supabase.channel("messages-view")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchConversations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Re-fetch conversations whenever the key changes (to try decrypting again)
  useEffect(() => {
    if (privateKey) fetchConversations();
  }, [privateKey]);

  // --- 2. AUTOMATIC KEY SYNC ---
  const autoSyncKeys = async () => {
    try {
        const localKey = localStorage.getItem(`priv_key_${user?.id}`);
        const { data } = await supabase.from("profiles").select("private_key").eq("id", user?.id).single();
        const cloudKey = data?.private_key;

        if (localKey) {
            setPrivateKey(localKey);
            // If local exists but cloud is empty, BACK IT UP silently
            if (!cloudKey) {
                console.log("Backing up key to cloud...");
                await supabase.from("profiles").update({ private_key: localKey }).eq("id", user?.id);
            }
        } else if (cloudKey) {
            // If local is missing but cloud exists, DOWNLOAD IT silently
            console.log("Restoring key from cloud...");
            localStorage.setItem(`priv_key_${user?.id}`, cloudKey);
            setPrivateKey(cloudKey);
        }
    } catch (e) {
        console.error("Auto-sync failed:", e);
    }
    
    fetchConversations();
  };

  // --- 3. FETCH & DECRYPT ---
  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data: rawData, error } = await supabase.rpc('get_conversations_preview', { current_user_id: user.id });
      if (error) throw error;

      const formattedData = (rawData as any[]).map((item) => ({
        id: item.conversation_id,
        updated_at: item.last_message_json?.created_at || new Date().toISOString(),
        other_user: item.other_user_json,
        last_message: item.last_message_json,
        unread_count: item.unread_count || 0
      })).filter(c => c.other_user);

      // Decrypt
      const decrypted = await Promise.all(formattedData.map(async (c) => {
          if (!c.last_message) return c;
          let text = c.last_message.content;
          
          const pk = privateKey || localStorage.getItem(`priv_key_${user.id}`);
          
          // CHECK FOR VOICE MESSAGE HERE
          const isSystem = text.startsWith("📷") || 
                           text.startsWith("🎤") || // <--- Voice Message Check
                           text.startsWith("🎥") || 
                           text.startsWith("📎") ||
                           text === "deleted";

          if (pk && !isSystem) {
             const decryptedText = await decryptMessage(text, pk, c.last_message.sender_id === user.id);
             // If decrypt returns the same encrypted string, it failed.
             if (decryptedText !== text && !decryptedText.startsWith("🔒")) {
                 text = decryptedText;
             }
          }
          
          if (text === "deleted") text = "🚫 Message deleted";
          
          return { ...c, last_message: { ...c.last_message, content: text } };
      }));
  
      decrypted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setConversations(decrypted as Conversation[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- 4. RENDER ---
  const filtered = conversations.filter(c => c.other_user.username.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex items-center justify-between py-6 mb-2 sticky top-0 z-20 bg-background/80 backdrop-blur-md -mx-4 px-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Messages</h2>
        <NewChatDialog onStartChat={(id, user) => onSelectConversation(id, user)}>
            <button className="p-3 rounded-full bg-gradient-to-tr from-primary to-accent text-white shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all">
                <Plus size={20} strokeWidth={3} />
            </button>
        </NewChatDialog>
      </div>

      {/* SEARCH */}
      <div className="relative mb-6">
         <div className="bg-secondary/30 border border-white/5 rounded-2xl flex items-center p-1">
            <Search className="ml-3 text-muted-foreground" size={18} />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search chats..." className="border-none bg-transparent focus-visible:ring-0" />
         </div>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
           <MessageSquareDashed size={48} className="mb-4 opacity-20" />
           <p>No messages yet</p>
        </div>
      ) : (
       <div className="space-y-3 pb-24">
          {filtered.map(c => (
             <div key={c.id} onClick={() => onSelectConversation(c.id, c.other_user)}
               className={cn("group p-4 rounded-[24px] flex items-center gap-4 cursor-pointer border transition-all duration-300",
                 c.unread_count > 0 ? "bg-secondary/40 border-primary/20 shadow-lg" : "bg-background/20 border-white/5 hover:bg-white/5"
               )}>
                <div className="relative">
                   <img src={c.other_user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.other_user.id}`} className="w-14 h-14 rounded-full object-cover bg-secondary" />
                   {c.unread_count > 0 && <div className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-background">{c.unread_count}</div>}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <h4 className={cn("text-base truncate", c.unread_count > 0 ? "font-bold text-foreground" : "font-semibold text-foreground/90")}>{c.other_user.username}</h4>
                        {c.last_message && <span className={cn("text-[10px]", c.unread_count > 0 ? "text-primary font-bold" : "text-muted-foreground/60")}>{new Date(c.last_message.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                        <p className={cn("text-sm truncate opacity-70 flex-1 pr-4", c.unread_count > 0 && "opacity-100 font-medium text-foreground")}>
                            {c.last_message?.sender_id === user?.id && <span className="opacity-60">You: </span>}
                            {/* Visual Logic for Encrypted vs Decrypted */}
                            {c.last_message?.content.startsWith("🔒") 
                                ? <span className="flex items-center gap-1 text-red-400 italic"><ShieldAlert size={12}/> Encrypted</span> 
                                : c.last_message?.content || "No messages yet"}
                        </p>
                        {c.last_message?.sender_id === user?.id && <span className={cn(c.last_message.read ? "text-blue-400" : "text-muted-foreground/40")}>{c.last_message.read ? <CheckCheck size={14} /> : <Check size={14} />}</span>}
                    </div>
                </div>
             </div>
          ))}
       </div>
      )}
    </div>
  );
};