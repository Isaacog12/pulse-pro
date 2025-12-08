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

  // 1. Debounce the search input to prevent API spam
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // Wait 300ms after typing stops

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. Trigger search when debounced query changes
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

    if (!error && data) {
      setResults(data);
    }
    setLoading(false);
  };

  const startConversation = async (targetUser: UserProfile) => {
    if (!user) return;
    setStartingChat(targetUser.id);

    try {
      const { data: conversationId, error } = await supabase
        .rpc('create_private_conversation', { 
          _user2: targetUser.id 
        });

      if (error) throw error;

      onStartChat(conversationId, targetUser);
      onClose();
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Failed to start conversation");
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-background/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h3 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            New Message
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input Area */}
        <div className="p-4">
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-500 transition-colors">
              <Search size={18} />
            </div>
            <Input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-secondary/50 border-transparent focus:bg-background focus:border-blue-500/30 rounded-2xl transition-all text-base"
              autoFocus
            />
          </div>
        </div>

        {/* Results List */}
        <div className="h-[400px] overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {loading ? (
            // Loading Skeletons
            <div className="space-y-3 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-12 h-12 rounded-full bg-secondary/70 animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-24 bg-secondary/70 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-secondary/50 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
              <Search size={40} className="mb-3 opacity-50" />
              <p className="text-sm">Type at least 2 characters</p>
            </div>
          ) : results.length === 0 && debouncedQuery.length >= 2 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                <UserX size={32} className="opacity-50" />
              </div>
              <p className="text-sm">No users found for "{debouncedQuery}"</p>
            </div>
          ) : (
            // Actual Results
            <div className="space-y-1">
              {results.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar with subtle ring */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-blue-500/20 to-purple-500/20 group-hover:from-blue-500 group-hover:to-cyan-400 transition-colors">
                        <img
                          src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                          alt={profile.username}
                          className="w-full h-full rounded-full object-cover bg-background border border-background"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-foreground">{profile.username}</span>
                        {profile.is_verified && (
                          <CheckCircle2 size={14} className="text-blue-500 fill-blue-500/10" />
                        )}
                      </div>
                      {profile.bio && (
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
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
                      "rounded-xl transition-all duration-300",
                      startingChat === profile.id 
                        ? "bg-secondary text-muted-foreground" 
                        : "bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-500/20"
                    )}
                  >
                    {startingChat === profile.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <MessageSquare size={16} className="mr-2" />
                        Chat
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};