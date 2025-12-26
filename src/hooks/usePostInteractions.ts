import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsePostInteractionsProps {
  postId: string;
  userId: string;
  postUserId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  initialSaved: boolean;
}

export const usePostInteractions = ({
  postId,
  userId,
  postUserId,
  initialLiked,
  initialLikeCount,
  initialSaved,
}: UsePostInteractionsProps) => {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [saved, setSaved] = useState(initialSaved);
  const [likeAnim, setLikeAnim] = useState(false);

  useEffect(() => {
    setLiked(initialLiked);
    setLikeCount(initialLikeCount);
    setSaved(initialSaved);
  }, [initialLiked, initialLikeCount, initialSaved]);

  const handleLike = async () => {
    const isNowLiked = !liked;
    setLiked(isNowLiked);
    setLikeCount((prev) => (isNowLiked ? prev + 1 : prev - 1));

    if (isNowLiked) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 1000);

      await supabase.from("likes").insert({
        post_id: postId,
        user_id: userId
      });

      if (postUserId !== userId) {
        await supabase.from("notifications").insert({
          user_id: postUserId,
          from_user_id: userId,
          type: "like",
          post_id: postId,
        });
      }
    } else {
      await supabase.from("likes").delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
    }
  };

  const handleSave = async () => {
    const isNowSaved = !saved;
    setSaved(isNowSaved);

    if (isNowSaved) {
      await supabase.from("saved_posts").insert({
        post_id: postId,
        user_id: userId
      });
    } else {
      await supabase.from("saved_posts").delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
    }
  };

  const handleDelete = async () => {
    await supabase.from("posts").delete().eq("id", postId);
  };

  return {
    liked,
    likeCount,
    saved,
    likeAnim,
    handleLike,
    handleSave,
    handleDelete,
  };
};