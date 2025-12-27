import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Loader2, Phone, Video, MoreVertical, Paperclip, Smile, Check, CheckCheck, FileText, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// Import our new crypto helper
import { generateKeyPair, encryptMessage, decryptMessage } from "@/lib/crypto";

interface Message {
  id: string;
  content: string; // This will now store the JSON blob
  sender_id: string;
  created_at: string;
  read: boolean;
  attachment_url?: string;
  attachment_type?: 'image' | 'video' | 'file';
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
  // Store decrypted text in a map: { messageId: "Hello World" }
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // CRYPTO STATE
  const [myKeys, setMyKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [otherUserPublicKey, setOtherUserPublicKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. SETUP KEYS ON MOUNT
  useEffect(() => {
    if(!user) return;
    
    const setupKeys = async () => {
      const storedPriv = localStorage.getItem(`priv_key_${user.id}`);
      const storedPub = localStorage.getItem(`pub_key_${user.id}`);

      if (storedPriv && storedPub) {
        setMyKeys({ privateKey: storedPriv, publicKey: storedPub });
      } else {
        // Generate new keys
        toast.loading("Generating Encryption Keys...");
        const keys = await generateKeyPair();
        localStorage.setItem(`priv_key_${user.id}`, keys.privateKey);
        localStorage.setItem(`pub_key_${user.id}`, keys.publicKey);
        setMyKeys(keys);

        // Upload public key to DB
        await supabase.from("profiles").update({ public_key: keys.publicKey }).eq("id", user.id);
        toast.dismiss();
        toast.success("Encryption Keys Created");
      }
    };

    setupKeys();
  }, [user]);

  // 2. FETCH OTHER USER'S PUBLIC KEY
  useEffect(() => {
    const fetchRecipientKey = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("public_key")
        .eq("id", otherUser.id)
        .single();
      
      if (data?.public_key) {
        setOtherUserPublicKey(data.public_key);
      }
    };
    fetchRecipientKey();
  }, [otherUser.id]);


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
  }, [messages, isOtherUserTyping]);

  // DECRYPT MESSAGES AS THEY ARRIVE
  useEffect(() => {
    if (!myKeys || messages.length === 0) return;

    const processMessages = async () => {
      const newCache = { ...decryptedCache };
      let hasChanges = false;

      for (const msg of messages) {
        // Skip if already decrypted or if it's a file placeholder
        if (newCache[msg.id]) continue;
        if (msg.content.startsWith("📷") || msg.content.startsWith("🎥") || msg.content.startsWith("📎")) {
           newCache[msg.id] = msg.content;
           hasChanges = true;
           continue;
        }

        const isSender = msg.sender_id === user?.id;
        const text = await decryptMessage(msg.content, myKeys.privateKey, isSender);
        newCache[msg.id] = text;
        hasChanges = true;
      }

      if (hasChanges) setDecryptedCache(newCache);
    };

    processMessages();
  }, [messages, myKeys]);


  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && data) setMessages(data as Message[]);
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    if (!user) return;
    await supabase.from("messages").update({ read: true }).eq("conversation_id", conversationId).neq("sender_id", user.id).eq("read", false);
  };

  const checkOtherUserStatus = async () => {
    const { data } = await supabase.from("profiles").select("last_seen").eq("id", otherUser.id).single();
    if (data?.last_seen) {
      const diffMinutes = (new Date().getTime() - new Date(data.last_seen).getTime()) / 1000 / 60;
      setOtherUserOnline(diffMinutes < 5);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          if (newMsg.sender_id !== user?.id) {
            setIsOtherUserTyping(false); 
            supabase.from("messages").update({ read: true }).eq("id", newMsg.id);
          }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          setMessages((prev) => prev.map(msg => msg.id === payload.new.id ? (payload.new as Message) : msg));
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.user_id === otherUser.id) setIsOtherUserTyping(payload.payload.is_typing);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const broadcastTyping = async (isTyping: boolean) => {
    if (!user) return;
    await supabase.channel(`chat-${conversationId}`).send({ type: "broadcast", event: "typing", payload: { user_id: user.id, is_typing: isTyping } });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      let type: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';

      const fileExt = file.name.split('.').pop();
      const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      
      const fallbackText = type === 'image' ? '📷 Image' : type === 'video' ? '🎥 Video' : '📎 File';
      const { error: dbError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: fallbackText, 
        attachment_url: publicUrl,
        attachment_type: type
      });
      if (dbError) throw dbError;
    } catch (error: any) {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- ENCRYPTED SEND ---
  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;
    
    if (!myKeys || !otherUserPublicKey) {
      toast.error("Waiting for encryption keys...");
      return;
    }

    setSending(true);
    const plainText = newMessage.trim();
    setNewMessage("");
    broadcastTyping(false); 
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // ENCRYPT BEFORE SENDING
    const encryptedContent = await encryptMessage(plainText, otherUserPublicKey, myKeys.publicKey);
    
    if (!encryptedContent) {
      toast.error("Encryption failed");
      setSending(false);
      return;
    }

    // Update Cache immediately so I can see what I just sent
    const tempId = Date.now().toString(); // Temporary ID until DB responds
    setDecryptedCache(prev => ({ ...prev, [tempId]: plainText }));

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: encryptedContent, // SENDING GIBBERISH TO DB
    });

    if (error) {
      console.error("Error sending message:", error);
      setNewMessage(plainText);
      toast.error("Failed to send message");
    }
    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    const existing = groupedMessages.find((g) => g.date === dateKey);
    if (existing) existing.messages.push(msg);
    else groupedMessages.push({ date: dateKey, messages: [msg] });
  });

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-background/5">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-10 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* HEADER */}
      <div className="flex-shrink-0 px-4 py-3 z-20">
        <div className="bg-background/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} />
            </button>
            <div className="relative">
              <img src={otherUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.id}`} alt={otherUser.username} className="w-10 h-10 rounded-full object-cover bg-secondary" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground">{otherUser.username}</span>
              {isOtherUserTyping ? (
                <span className="text-[10px] font-medium text-primary animate-pulse">typing...</span>
              ) : (
                <span className={cn("text-[10px] font-medium", otherUserOnline ? "text-green-500" : "text-muted-foreground")}>{otherUserOnline ? "Active now" : "Offline"}</span>
              )}
            </div>
          </div>
          {/* E2EE BADGE */}
          <div className="flex items-center gap-1 text-muted-foreground">
             <div title="End-to-End Encrypted" className="p-2 text-emerald-500/80 bg-emerald-500/10 rounded-full border border-emerald-500/20">
               <Lock size={14} />
             </div>
             <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><MoreVertical size={18} /></button>
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
             <p>Messages are end-to-end encrypted 🔒</p>
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
                {group.messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  // USE DECRYPTED TEXT OR LOADING STATE
                  const displayText = decryptedCache[msg.id] || (msg.attachment_url ? null : "Decrypting...");

                  return (
                    <div key={msg.id} className={cn("flex w-full animate-in slide-in-from-bottom-2 duration-300", isOwn ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] relative px-4 py-2.5 shadow-sm transition-all", isOwn ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl rounded-tr-sm" : "bg-secondary/40 backdrop-blur-md border border-white/5 text-foreground rounded-2xl rounded-tl-sm")}>
                        
                        {/* ATTACHMENTS (NOT ENCRYPTED IN THIS VERSION) */}
                        {msg.attachment_url && (
                          <div className="mb-2 mt-0.5">
                            {msg.attachment_type === 'image' && <img src={msg.attachment_url} className="rounded-lg max-h-64 object-cover w-full border border-white/10 bg-black/20" />}
                            {msg.attachment_type === 'video' && <video src={msg.attachment_url} controls className="rounded-lg max-h-64 w-full border border-white/10 bg-black/20" />}
                            {msg.attachment_type === 'file' && (
                               <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-black/20 rounded-lg hover:bg-black/30 border border-white/10">
                                <FileText size={20} className="text-white" /><span className="text-sm underline truncate opacity-90">Download File</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* TEXT CONTENT */}
                        {(!msg.attachment_url || (msg.content !== '📷 Image' && msg.content !== '🎥 Video' && msg.content !== '📎 File')) && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {displayText === "Decrypting..." ? <span className="animate-pulse opacity-50">Locked message...</span> : displayText}
                          </p>
                        )}
                        
                        <div className={cn("flex items-center justify-end gap-1 mt-1", isOwn ? "text-blue-100/70" : "text-muted-foreground/60")}>
                          <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                          {isOwn && (msg.read ? <CheckCheck size={14} className="text-white" /> : <Check size={14} />)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isOtherUserTyping && (
                  <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-secondary/40 backdrop-blur-md border border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 z-20">
        <div className="bg-background/60 backdrop-blur-2xl border border-white/10 rounded-[24px] p-2 flex items-end gap-2 shadow-lg">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,video/*,application/pdf" />
          <div className="flex items-center gap-1 pb-2 pl-2">
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded-full transition-colors">
              {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
            </button>
          </div>
          <Input 
            placeholder={!otherUserPublicKey ? "Generating keys..." : "Type a message..."}
            value={newMessage} 
            onChange={handleTyping} 
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())} 
            disabled={!otherUserPublicKey}
            className="flex-1 min-h-[44px] max-h-32 py-3 bg-transparent border-none focus-visible:ring-0 placeholder:text-muted-foreground/50 resize-none overflow-hidden" 
          />
          <div className="flex items-center gap-2 pb-1 pr-1">
            <button className="p-2 text-muted-foreground hover:text-yellow-500 hover:bg-secondary/50 rounded-full transition-colors"><Smile size={20} /></button>
            <Button onClick={handleSend} disabled={!newMessage.trim() || sending || !otherUserPublicKey} size="icon" className={cn("h-10 w-10 rounded-full shadow-lg transition-all duration-300", newMessage.trim() ? "bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-105" : "bg-secondary text-muted-foreground")}>
              {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} className={newMessage.trim() ? "ml-0.5" : ""} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};