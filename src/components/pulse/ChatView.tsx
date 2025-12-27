import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Loader2, Phone, Video, MoreVertical, Paperclip, Smile, Check, CheckCheck, FileText, Lock, LockOpen, Mic, X, Reply } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateKeyPair, encryptMessage, decryptMessage } from "@/lib/crypto";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  attachment_url?: string;
  attachment_type?: 'image' | 'video' | 'file' | 'audio';
  reply_to_id?: string;
}

interface ChatViewProps {
  conversationId: string;
  otherUser: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  onBack: () => void;
  isGroup?: boolean; // New prop for later
}

export const ChatView = ({ conversationId, otherUser, onBack, isGroup = false }: ChatViewProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  
  // VOICE NOTE STATE
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  // REPLY STATE
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  // CRYPTO STATE
  const [myKeys, setMyKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [otherUserPublicKey, setOtherUserPublicKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- INITIALIZATION (Keys, Fetch, Subs) ---
  useEffect(() => {
    if(!user) return;
    const setupKeys = async () => {
      const storedPriv = localStorage.getItem(`priv_key_${user.id}`);
      const storedPub = localStorage.getItem(`pub_key_${user.id}`);
      if (storedPriv && storedPub) {
        setMyKeys({ privateKey: storedPriv, publicKey: storedPub });
      } else {
        const keys = await generateKeyPair();
        localStorage.setItem(`priv_key_${user.id}`, keys.privateKey);
        localStorage.setItem(`pub_key_${user.id}`, keys.publicKey);
        setMyKeys(keys);
        await supabase.from("profiles").update({ public_key: keys.publicKey }).eq("id", user.id);
      }
    };
    setupKeys();
  }, [user]);

  useEffect(() => {
    // Only fetch other user key if it is NOT a group (Encryption doesn't work easily in groups yet)
    if (!isGroup) {
      const fetchRecipientKey = async () => {
        const { data } = await supabase.from("profiles").select("public_key").eq("id", otherUser.id).single();
        if (data?.public_key) setOtherUserPublicKey(data.public_key);
      };
      fetchRecipientKey();
    }
  }, [otherUser.id, isGroup]);

  useEffect(() => {
    fetchMessages();
    const cleanup = setupRealtimeSubscription();
    const statusInterval = setInterval(checkOtherUserStatus, 30000);
    return () => { cleanup(); clearInterval(statusInterval); };
  }, [conversationId]);

  useEffect(() => { scrollToBottom(); }, [messages, isOtherUserTyping, replyingTo]);

  // --- AUDIO RECORDING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        sendVoiceNote(blob);
      };

      recorder.start();
      setIsRecording(true);
      setAudioChunks([]);
    } catch (err) {
      console.error("Mic error:", err);
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop()); // Stop mic
    }
  };

  const sendVoiceNote = async (audioBlob: Blob) => {
    if (!user) return;
    try {
      const fileName = `${conversationId}/${Date.now()}_voice.webm`;
      const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, audioBlob);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      
      // Send as message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: "🎤 Voice Message",
        attachment_url: publicUrl,
        attachment_type: 'audio',
        reply_to_id: replyingTo?.id || null // Support replying with voice
      });
      
      setReplyingTo(null); // Clear reply
    } catch (error) {
      toast.error("Failed to send voice note");
    }
  };

  // --- HELPERS ---
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (!error && data) setMessages(data as Message[]);
  };

  const checkOtherUserStatus = async () => {
    if (isGroup) return;
    const { data } = await supabase.from("profiles").select("last_seen").eq("id", otherUser.id).single();
    if (data?.last_seen) {
      const diffMinutes = (new Date().getTime() - new Date(data.last_seen).getTime()) / 1000 / 60;
      setOtherUserOnline(diffMinutes < 5);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase.channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.user_id === otherUser.id) setIsOtherUserTyping(payload.payload.is_typing);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const scrollToBottom = () => {
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
  };

  // --- SEND LOGIC ---
  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);
    const plainText = newMessage.trim();
    setNewMessage(""); 
    
    // Encrypt if possible (and not group)
    let contentToSend = plainText;
    if (!isGroup && myKeys && otherUserPublicKey) {
      const encrypted = await encryptMessage(plainText, otherUserPublicKey, myKeys.publicKey);
      if (encrypted) contentToSend = encrypted;
    }

    const tempId = Date.now().toString();
    setDecryptedCache(prev => ({ ...prev, [tempId]: plainText }));

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: contentToSend,
      reply_to_id: replyingTo?.id || null
    });

    setReplyingTo(null);
    setSending(false);
  };

  // --- DECRYPT LOGIC FOR RENDER ---
  const getDisplayText = (msg: Message) => {
    // If it's cached/decrypted already
    if (decryptedCache[msg.id]) return decryptedCache[msg.id];
    
    // If it's media or plain text (not JSON)
    if (!msg.content.startsWith("{") || msg.attachment_url) return msg.content;

    // Try decrypting
    if (myKeys) {
        // Since we can't await in render, we trigger a side-effect. 
        // Ideally handled in useEffect, but for simplicity:
        decryptMessage(msg.content, myKeys.privateKey, msg.sender_id === user?.id).then(text => {
            if (text !== msg.content) {
                setDecryptedCache(prev => ({...prev, [msg.id]: text}));
            }
        });
        return "Decrypting...";
    }
    return "🔒 Encrypted";
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-background/5">
      {/* HEADER */}
      <div className="flex-shrink-0 px-4 py-3 z-20">
        <div className="bg-background/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors"><ArrowLeft size={20} /></button>
            <div className="relative">
              <img src={otherUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.id}`} className="w-10 h-10 rounded-full object-cover bg-secondary" />
              {otherUserOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{isGroup ? "Group Chat" : otherUser.username}</span>
              <span className="text-[10px] text-muted-foreground">{isGroup ? "Tap for info" : (otherUserOnline ? "Online" : "Offline")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 scrollbar-thin">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          const displayText = getDisplayText(msg);
          // Find replied message text if exists
          const repliedMsg = messages.find(m => m.id === msg.reply_to_id);
          const repliedText = repliedMsg ? getDisplayText(repliedMsg) : null;

          return (
            <div key={msg.id} className={cn("flex w-full", isOwn ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] relative px-4 py-2.5 shadow-sm", isOwn ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm" : "bg-secondary/40 backdrop-blur-md rounded-2xl rounded-tl-sm")}>
                
                {/* REPLY PREVIEW */}
                {repliedMsg && (
                    <div className="mb-2 p-2 rounded bg-black/20 border-l-2 border-white/50 text-xs opacity-80 truncate">
                        <span className="font-bold block mb-0.5">{repliedMsg.sender_id === user?.id ? "You" : "Them"}</span>
                        {repliedText}
                    </div>
                )}

                {/* MEDIA */}
                {msg.attachment_url && msg.attachment_type === 'audio' && (
                    <audio controls src={msg.attachment_url} className="h-8 w-48 mt-1 mb-1" />
                )}
                 {msg.attachment_url && msg.attachment_type === 'image' && (
                    <img src={msg.attachment_url} className="rounded-lg max-h-60 w-full object-cover mb-1" />
                )}

                {/* TEXT */}
                {!msg.attachment_type || msg.attachment_type === 'file' ? (
                     <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
                ) : null}

                {/* FOOTER */}
                <div className="flex justify-between items-center mt-1 gap-2">
                    <button onClick={() => setReplyingTo(msg)} className="text-[10px] opacity-50 hover:opacity-100 flex items-center gap-1">
                        <Reply size={10} /> Reply
                    </button>
                    <span className="text-[10px] opacity-70">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>

              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* REPLY BANNER */}
      {replyingTo && (
        <div className="px-4 pt-2">
            <div className="bg-secondary/60 backdrop-blur border-l-4 border-primary p-2 rounded-r-lg flex justify-between items-center">
                <div className="text-sm overflow-hidden">
                    <p className="text-primary font-bold text-xs">Replying to {replyingTo.sender_id === user?.id ? "yourself" : "them"}</p>
                    <p className="truncate opacity-70 text-xs">{getDisplayText(replyingTo)}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full"><X size={16} /></button>
            </div>
        </div>
      )}

      {/* INPUT */}
      <div className="p-4 z-20">
        <div className="bg-background/60 backdrop-blur-2xl border border-white/10 rounded-[24px] p-2 flex items-end gap-2 shadow-lg">
           {/* ATTACHMENT */}
           <input type="file" ref={fileInputRef} className="hidden" />
           <button onClick={() => fileInputRef.current?.click()} className="p-2 text-muted-foreground hover:text-primary rounded-full"><Paperclip size={20} /></button>

           {/* TEXT INPUT */}
           <Input 
             placeholder={isRecording ? "Recording..." : "Type a message..."}
             value={newMessage}
             onChange={(e) => setNewMessage(e.target.value)}
             disabled={isRecording}
             className="flex-1 bg-transparent border-none focus-visible:ring-0" 
           />

           {/* ACTIONS */}
           {newMessage.trim() || sending ? (
             <Button onClick={handleSend} size="icon" className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700">
                {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
             </Button>
           ) : (
             <Button 
                onClick={isRecording ? stopRecording : startRecording} 
                size="icon" 
                className={cn("h-10 w-10 rounded-full transition-all", isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-secondary text-muted-foreground hover:bg-secondary/80")}
             >
                {isRecording ? <div className="w-3 h-3 bg-white rounded-sm" /> : <Mic size={18} />}
             </Button>
           )}
        </div>
      </div>
    </div>
  );
};