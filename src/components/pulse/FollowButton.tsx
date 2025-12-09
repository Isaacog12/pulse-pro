import { useState, useEffect } from "react";
import { UserPlus, UserCheck, UserX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: string;
  onFollowChange?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const FollowButton = ({
  targetUserId,
  onFollowChange,
  size = "default",
  className,
}: FollowButtonProps) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (user && targetUserId) {
      checkFollowStatus();
    }
  }, [user, targetUserId]);

  const checkFollowStatus = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("followers")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    setIsFollowing(!!data);
    setLoading(false);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent clicks (like navigating to profile)
    if (!user) return;

    setLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);

        if (error) throw error;

        setIsFollowing(false);
        toast.success("Unfollowed successfully");
      } else {
        // Follow
        const { error } = await supabase.from("followers").insert({
          follower_id: user.id,
          following_id: targetUserId,
        });

        if (error) throw error;

        // Notification
        await supabase.from("notifications").insert({
          user_id: targetUserId,
          from_user_id: user.id,
          type: "follow",
          message: "started following you",
        });

        setIsFollowing(true);
        toast.success("You are now following this user!");
      }

      onFollowChange?.();
    } catch (error) {
      console.error("Follow error:", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Don't show button if viewing own profile
  if (!user || user.id === targetUserId) return null;

  return (
    <Button
      size={size}
      onClick={handleFollow}
      disabled={loading}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        "relative transition-all duration-300 font-semibold rounded-xl overflow-hidden active:scale-95",
        // State Styles
        isFollowing
          ? "bg-secondary/30 backdrop-blur-md border border-white/10 text-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 shadow-sm" // Glassy "Following"
          : "bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg shadow-primary/25 border-0", // Glint Gradient "Follow"
        className
      )}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isFollowing ? (
        <span className="flex items-center group">
          {hovering ? (
            <>
              <UserX size={16} className="mr-2" />
              Unfollow
            </>
          ) : (
            <>
              <UserCheck size={16} className="mr-2 text-primary" />
              Following
            </>
          )}
        </span>
      ) : (
        <>
          <UserPlus size={16} className="mr-2" />
          Follow
        </>
      )}
    </Button>
  );
};