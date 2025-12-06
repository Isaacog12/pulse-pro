import { useState, useEffect } from "react";
import { X, Search, MessageSquare, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, is_verified")
      .neq("id", user?.id)
      .ilike("username", `%${searchQuery}%`)
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
      // Check if conversation already exists
      const { data: existingParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (existingParticipations) {
        for (const p of existingParticipations) {
          const { data: otherParticipant } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", p.conversation_id)
            .eq("user_id", targetUser.id)
            .single();

          if (otherParticipant) {
            // Conversation exists, open it
            onStartChat(p.conversation_id, targetUser);
            return;
          }
        }
      }

      // Create new conversation - don't use .select() to avoid RLS issue
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({})
        .select("id")
        .single();

      if (convError) {
        console.error("Conversation creation error:", convError);
        throw convError;
      }

      // Add current user as participant first
      const { error: selfPartError } = await supabase
        .from("conversation_participants")
        .insert({ conversation_id: newConv.id, user_id: user.id });

      if (selfPartError) {
        console.error("Self participant error:", selfPartError);
        throw selfPartError;
      }

      // Add target user as participant
      const { error: targetPartError } = await supabase
        .from("conversation_participants")
        .insert({ conversation_id: newConv.id, user_id: targetUser.id });

      if (targetPartError) {
        console.error("Target participant error:", targetPartError);
        throw targetPartError;
      }

      onStartChat(newConv.id, targetUser);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Failed to start conversation");
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">New Message</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X size={20} className="text-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-4 pt-0 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : searchQuery.length < 2 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Type at least 2 characters to search
            </p>
          ) : results.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No users found
            </p>
          ) : (
            results.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      profile.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`
                    }
                    alt={profile.username}
                    className="w-12 h-12 rounded-full object-cover bg-secondary"
                  />
                  <div>
                    <p className="font-medium text-foreground">{profile.username}</p>
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
                >
                  {startingChat === profile.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      <MessageSquare size={16} className="mr-2" />
                      Message
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
