import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Loader2, Paperclip, Mic, X, Reply, MoreVertical, Edit2, Trash2, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateKeyPair, encryptMessage, decryptMessage } from "@/lib/crypto";

// --- TYPES ---
interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  attachment_url?: string;
  attachment_type?: 'image' | 'video' | 'file' | 'audio';
  reply_to_id?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
}

interface ChatViewProps {
  conversationId: string;
  otherUser: { id: string; username: string; avatar_url: string | null; };
  onBack: () => void;
  isGroup?: boolean;
}

export const ChatView = ({ conversationId, otherUser, onBack, isGroup = false }: ChatViewProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  
  // INPUT STATE
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  
  // PRESENCE
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  
  // RECORDING STATE
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // ACTIONS
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // KEYS
  const [myKeys, setMyKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [otherUserPublicKey, setOtherUserPublicKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. SETUP & FETCH ---
  useEffect(() => {
    if(!user) return;
    const loadKeys = async () => {
      const priv = localStorage.getItem(`priv_key_${user.id}`);
      const pub = localStorage.getItem(`pub_key_${user.id}`);
      if (priv && pub) {
        setMyKeys({ privateKey: priv, publicKey: pub });
      } else {
        const keys = await generateKeyPair();
        localStorage.setItem(`priv_key_${user.id}`, keys.privateKey);
        localStorage.setItem(`pub_key_${user.id}`, keys.publicKey);
        setMyKeys(keys);
        await supabase.from("profiles").update({ public_key: keys.publicKey }).eq("id", user.id);
      }
    };
    loadKeys();
  }, [user]);

  useEffect(() => {
    if (!isGroup) {
      supabase.from("profiles").select("public_key").eq("id", otherUser.id).single()
        .then(({ data }) => data && setOtherUserPublicKey(data.public_key));
    }
  }, [otherUser.id, isGroup]);

  useEffect(() => {
    fetchMessages();
    const cleanup = setupSubs();
    const interval = setInterval(checkStatus, 30000);
    checkStatus(); 
    return () => { cleanup(); clearInterval(interval); };
  }, [conversationId]);

  useEffect(() => { scrollToBottom(); }, [messages, isOtherUserTyping, replyingTo]);

  // --- 2. LOGIC HELPERS ---
  const fetchMessages = async () => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  const checkStatus = async () => {
    if (isGroup) return;
    const { data } = await supabase.from("profiles").select("last_seen").eq("id", otherUser.id).single();
    if (data?.last_seen) {
      const diff = (new Date().getTime() - new Date(data.last_seen).getTime()) / 1000 / 60;
      setOtherUserOnline(diff < 5); 
    }
  };

  const setupSubs = () => {
    const channel = supabase.channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMessages(prev => [...prev, payload.new as Message]);
        } else if (payload.eventType === "UPDATE") {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m));
        }
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.user_id === otherUser.id) setIsOtherUserTyping(payload.payload.is_typing);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

  const getDisplayText = (msg: Message) => {
    if (msg.is_deleted) return "🚫 This message was deleted";
    if (decryptedCache[msg.id]) return decryptedCache[msg.id];
    
    // Pass through system messages or media labels
    if (msg.attachment_url && !msg.content.startsWith("{")) return msg.content; 
    if (msg.content === "🎤 Voice Message") return msg.content;
    
    if (!msg.content.startsWith("{")) return msg.content; // Plain text fallback

    if (myKeys) {
      decryptMessage(msg.content, myKeys.privateKey, msg.sender_id === user?.id).then(text => {
        if (text !== msg.content) setDecryptedCache(prev => ({ ...prev, [msg.id]: text }));
      });
      return "Decrypting...";
    }
    return "🔒 Encrypted";
  };

  // --- 3. VOICE RECORDING ---
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
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err) {
      console.error(err);
      toast.error("Microphone access denied. Check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const sendVoiceNote = async (audioBlob: Blob) => {
    if (!user) return;
    try {
      setSending(true);
      // Upload to 'chat-media' bucket
      const fileName = `${conversationId}/${Date.now()}_voice.webm`;
      const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, audioBlob);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: "🎤 Voice Message", // Visible label
        attachment_url: publicUrl,
        attachment_type: 'audio',
        reply_to_id: replyingTo?.id || null
      });
      setReplyingTo(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to send audio");
    } finally {
      setSending(false);
    }
  };

  // --- 4. TEXT ACTIONS ---
  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);

    const plainText = newMessage.trim();
    setNewMessage(""); 

    if (editingMessage) {
      await submitEdit(editingMessage, plainText);
    } else {
      let content = plainText;
      if (!isGroup && myKeys && otherUserPublicKey) {
         const enc = await encryptMessage(plainText, otherUserPublicKey, myKeys.publicKey);
         if (enc) content = enc;
      }
      
      // Optimistic Cache
      const tempId = Date.now().toString();
      setDecryptedCache(prev => ({ ...prev, [tempId]: plainText }));

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        reply_to_id: replyingTo?.id || null
      });
      setReplyingTo(null);
    }
    setSending(false);
  };

  const submitEdit = async (msg: Message, newText: string) => {
     let content = newText;
     if (!isGroup && myKeys && otherUserPublicKey) {
         const enc = await encryptMessage(newText, otherUserPublicKey, myKeys.publicKey);
         if (enc) content = enc;
     }
     setDecryptedCache(prev => ({ ...prev, [msg.id]: newText }));

     const { error } = await supabase.from("messages").update({ content, is_edited: true }).eq("id", msg.id);
     if (error) toast.error("Failed to edit");
     else toast.success("Message edited");
     
     setEditingMessage(null);
  };

  const deleteMessage = async (msgId: string) => {
    setActiveMenuId(null);
    const { error } = await supabase.from("messages").update({ is_deleted: true, content: "deleted" }).eq("id", msgId);
    if (error) toast.error("Failed to delete");
  };

  const startEdit = (msg: Message) => {
    setActiveMenuId(null);
    const text = getDisplayText(msg);
    if (text === "Decrypting..." || text === "🔒 Encrypted") {
        toast.error("Wait for decryption");
        return;
    }
    setNewMessage(text);
    setEditingMessage(msg);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- 5. RENDER ---
  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-background/5">
      {/* HEADER */}
      <div className="px-4 py-3 z-20 flex-shrink-0">
        <div className="bg-background/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10"><ArrowLeft size={20} /></button>
            <div className="relative">
              <img src={otherUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.id}`} className="w-10 h-10 rounded-full object-cover bg-secondary" />
              {otherUserOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />}
            </div>
            <div>
              <p className="font-semibold text-sm">{isGroup ? "Group" : otherUser.username}</p>
              <p className="text-[10px] text-muted-foreground">{isGroup ? "Chat" : (otherUserOnline ? "Online" : "Offline")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* MESSAGES LIST */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 scrollbar-thin">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          const text = getDisplayText(msg);
          const replied = messages.find(m => m.id === msg.reply_to_id);
          const repliedText = replied ? getDisplayText(replied) : null;

          return (
            <div key={msg.id} className={cn("flex w-full group relative", isOwn ? "justify-end" : "justify-start")}>
              
              {/* MESSAGE BUBBLE */}
              <div className={cn(
                  "max-w-[75%] relative px-4 py-2.5 shadow-sm transition-all",
                  isOwn ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm" : "bg-secondary/40 backdrop-blur-md rounded-2xl rounded-tl-sm",
                  msg.is_deleted && "opacity-50 italic bg-gray-500/20"
              )}>
                
                {/* REPLIED BLOCK */}
                {replied && !msg.is_deleted && (
                   <div className="mb-2 p-2 rounded bg-black/20 border-l-2 border-white/50 text-xs opacity-80 truncate">
                      <span className="font-bold block mb-0.5">{replied.sender_id === user?.id ? "You" : "Them"}</span>
                      {repliedText}
                   </div>
                )}

                {/* ATTACHMENTS (Audio/Image) */}
                {!msg.is_deleted && msg.attachment_url && (
                   msg.attachment_type === 'audio' ? (
                       <div className="flex items-center gap-2 mb-1 min-w-[150px]">
                           <audio controls src={msg.attachment_url} className="h-8 w-full accent-white" />
                       </div>
                   ) : msg.attachment_type === 'image' ? (
                       <img src={msg.attachment_url} className="rounded-lg max-h-60 w-full object-cover my-1" />
                   ) : null
                )}
                
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{text}</p>
                
                {/* FOOTER */}
                <div className="flex justify-between items-center mt-1 gap-2 text-[10px] opacity-70">
                   <div className="flex items-center gap-1">
                      {msg.is_edited && <span>(edited)</span>}
                      <span>{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                   </div>
                   {isOwn && (msg.read ? <CheckCheck size={12} /> : <Check size={12} />)}
                </div>

                {/* MENU TRIGGER */}
                {isOwn && !msg.is_deleted && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === msg.id ? null : msg.id); }}
                    className="absolute -top-2 -left-2 p-1 bg-background border rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-foreground"
                  >
                    <MoreVertical size={12} />
                  </button>
                )}

                {/* DROPDOWN MENU */}
                {activeMenuId === msg.id && (
                  <div className="absolute top-0 -left-28 bg-background border border-white/10 rounded-lg shadow-xl p-1 flex flex-col z-50 animate-in zoom-in-95 w-24">
                    <button onClick={() => startEdit(msg)} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-secondary rounded text-left">
                       <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => deleteMessage(msg.id)} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-red-500/10 text-red-500 rounded text-left">
                       <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
              
              {/* REPLY BUTTON */}
              {!msg.is_deleted && (
                 <button onClick={() => setReplyingTo(msg)} className={cn("opacity-0 group-hover:opacity-50 hover:!opacity-100 p-2", isOwn ? "mr-2" : "ml-2 order-last")}>
                    <Reply size={16} />
                 </button>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* REPLY/EDIT INDICATOR */}
      {(replyingTo || editingMessage) && (
        <div className="px-4 pt-2">
            <div className={cn("backdrop-blur border-l-4 p-2 rounded-r-lg flex justify-between items-center", editingMessage ? "bg-yellow-500/10 border-yellow-500" : "bg-secondary/60 border-primary")}>
                <div className="text-sm overflow-hidden">
                    <p className={cn("font-bold text-xs", editingMessage ? "text-yellow-500" : "text-primary")}>
                       {editingMessage ? "Editing Message" : `Replying to ${replyingTo?.sender_id === user?.id ? "yourself" : "them"}`}
                    </p>
                    <p className="truncate opacity-70 text-xs">{editingMessage ? getDisplayText(editingMessage) : getDisplayText(replyingTo!)}</p>
                </div>
                <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessage(""); }} className="p-1 hover:bg-white/10 rounded-full"><X size={16} /></button>
            </div>
        </div>
      )}

      {/* INPUT AREA */}
      <div className="p-4 z-20">
        <div className="bg-background/60 backdrop-blur-2xl border border-white/10 rounded-[24px] p-2 flex items-end gap-2 shadow-lg relative">
           
           {isRecording ? (
             // --- RECORDING UI ---
             <div className="flex-1 flex items-center justify-between px-3 h-10 animate-in fade-in">
                <div className="flex items-center gap-2 text-red-500">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-mono text-sm">{formatDuration(recordingDuration)}</span>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">Recording...</span>
                <Button onClick={stopRecording} size="sm" variant="destructive" className="h-8 rounded-full px-4">
                    <Send size={14} className="mr-1" /> Send
                </Button>
             </div>
           ) : (
             // --- TYPING UI ---
             <>
               <input type="file" ref={fileInputRef} className="hidden" />
               <button onClick={() => fileInputRef.current?.click()} className="p-2 text-muted-foreground hover:text-primary rounded-full transition-colors">
                  <Paperclip size={20} />
               </button>
               
               <Input 
                 placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 className="flex-1 bg-transparent border-none focus-visible:ring-0 px-2" 
               />

               {newMessage.trim() ? (
                 <Button onClick={handleSend} size="icon" className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 transition-all">
                    {sending ? <Loader2 className="animate-spin" size={18} /> : (editingMessage ? <Check size={18} /> : <Send size={18} />)}
                 </Button>
               ) : (
                 <Button onClick={startRecording} size="icon" className="h-10 w-10 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground transition-all">
                    <Mic size={18} />
                 </Button>
               )}
             </>
           )}
        </div>
      </div>
    </div>
  );
};