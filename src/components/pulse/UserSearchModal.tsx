import { useState, useEffect } from "react";
import { X, Search, MessageSquare, Loader2, CheckCircle2, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
}

interface UserSearchModalProps {
  onClose: () => void;
  onStartChat: (conversationId: string, user: UserProfile) => void;
}

export const UserSearchModal = ({ onClose, onStartChat }: UserSearchModalProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchUsers();
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const searchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, is_verified")
      .neq("id", user?.id)
      .ilike("username", `%${debouncedQuery}%`)
      .limit(20);

    if (!error && data) setResults(data);
    setLoading(false);
  };

  const startConversation = async (targetUser: UserProfile) => {
    if (!user) return;
    setStartingChat(targetUser.id);

    try {
      // @ts-ignore - Ignoring type check for dynamic RPC call
      const { data: conversationId, error } = await supabase
        .rpc('create_private_conversation', { 
          _user2: targetUser.id 
        });

      if (error) throw error;

      if (conversationId) {
        onStartChat(conversationId as string, targetUser);
        onClose();
      } else {
        throw new Error("Failed to start conversation");
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start conversation");
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Ultra-Glass Modal */}
      <div className="relative w-full max-w-md bg-background/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
        
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between relative z-10">
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              New Message
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Find people to chat with on Glint</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors group"
          >
            <X size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-6 pt-2 pb-4 relative z-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center bg-secondary/30 border border-white/5 rounded-2xl overflow-hidden shadow-inner focus-within:ring-1 focus-within:ring-primary/50 transition-all">
              <Search className="ml-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-3 h-12 bg-transparent border-none focus-visible:ring-0 placeholder:text-muted-foreground/50 text-base"
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar space-y-2">
          {loading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-white/10" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-24 bg-white/10 rounded" />
                    <div className="h-3 w-32 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
              <Search size={40} className="mb-2 opacity-50" strokeWidth={1.5} />
              <p className="text-sm">Type at least 2 characters</p>
            </div>
          ) : results.length === 0 && debouncedQuery.length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
              <UserX size={40} className="mb-2 opacity-50" strokeWidth={1.5} />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            results.map((profile) => (
              <div
                key={profile.id}
                className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-300"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative">
                    <div className="absolute -inset-[2px] rounded-full bg-gradient-to-tr from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[2px]" />
                    <div className="relative w-12 h-12 rounded-full p-[2px] bg-background group-hover:bg-transparent transition-colors">
                      <img
                        src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                        alt={profile.username}
                        className="w-full h-full rounded-full object-cover bg-secondary"
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-foreground truncate">{profile.username}</p>
                      {profile.is_verified && (
                        <CheckCircle2 size={14} className="text-yellow-400 fill-yellow-400/20 shrink-0" />
                      )}
                    </div>
                    {profile.bio && (
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {profile.bio}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => startConversation(profile)}
                  disabled={startingChat === profile.id}
                  className={cn(
                    "rounded-xl px-4 h-9 font-semibold shadow-lg transition-all duration-300 transform active:scale-95",
                    startingChat === profile.id
                      ? "bg-secondary text-muted-foreground"
                      : "bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-primary/20 border-0"
                  )}
                >
                  {startingChat === profile.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      <MessageSquare size={16} className="mr-2 fill-white/20" />
                      Chat
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};