import { useState, useEffect } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
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
}

export const FollowButton = ({
  targetUserId,
  onFollowChange,
  variant = "default",
  size = "default",
}: FollowButtonProps) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const handleFollow = async () => {
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

        // Create notification for the followed user
        await supabase.from("notifications").insert({
          user_id: targetUserId,
          from_user_id: user.id,
          type: "follow",
          message: "started following you",
        });

        setIsFollowing(true);
        toast.success("Following!");
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
      variant={isFollowing ? "outline" : variant}
      size={size}
      onClick={handleFollow}
      disabled={loading}
      className={cn(
        "transition-all",
        isFollowing && "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
      )}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus size={16} className="mr-2" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus size={16} className="mr-2" />
          Follow
        </>
      )}
    </Button>
  );
};
