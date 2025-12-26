import { useState, useEffect } from "react";
import { X, Users, UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FollowButton } from "./FollowButton";

interface FollowsListModalProps {
  type: "followers" | "following";
  userId: string;
  onClose: () => void;
}

export const FollowsListModal = ({ type, userId, onClose }: FollowsListModalProps) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      let userList: any[] = [];
      if (type === "followers") {
        const { data } = await supabase
          .from("followers")
          .select("follower_id, profiles!followers_follower_id_fkey(*)")
          .eq("following_id", userId);
        userList = data?.map(d => d.profiles) || [];
      } else {
        const { data } = await supabase
          .from("followers")
          .select("following_id, profiles!followers_following_id_fkey(*)")
          .eq("follower_id", userId);
        userList = data?.map(d => d.profiles) || [];
      }
      setUsers(userList);

      if (currentUser) {
        const existingIds = userList.map(u => u.id);
        const { data: suggested } = await supabase
          .from("profiles")
          .select("*")
          .neq("id", currentUser.id)
          .not("id", "in", `(${existingIds.join(',')})`)
          .limit(5);

        if (suggested) setSuggestions(suggested);
      }

      setLoading(false);
    };

    fetchData();
  }, [type, userId, currentUser]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative w-full max-w-md h-[80vh] bg-background/60 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="font-bold text-lg capitalize">{type}</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="pb-8">
              {/* Main List */}
              {users.length > 0 ? (
                <div className="p-2">
                  {users.map(u => (
                    <UserRow key={u.id} profile={u} />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No {type} yet</p>
                </div>
              )}

              {/* Suggestions Section */}
              <div className="mt-4 pt-4 border-t border-white/5 bg-white/5">
                <h4 className="px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <UserPlus size={14} /> Suggested for you
                </h4>
                <div className="p-2">
                  {suggestions.map(u => (
                    <UserRow key={u.id} profile={u} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UserRow = ({ profile }: { profile: any }) => (
  <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer">
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-full p-[1px] bg-gradient-to-tr from-white/10 to-transparent">
          <img src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} className="w-full h-full rounded-full object-cover bg-secondary" />
        </div>
        {profile.is_verified && <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5"><CheckCircle size={10} className="text-yellow-400 fill-yellow-400/20" /></div>}
      </div>
      <div>
        <p className="text-sm font-semibold">{profile.username}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{profile.bio || "No bio"}</p>
      </div>
    </div>
    <FollowButton targetUserId={profile.id} size="sm" />
  </div>
);