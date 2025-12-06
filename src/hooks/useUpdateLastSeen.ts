import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useUpdateLastSeen = () => {
  const { user } = useAuth();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    const updateLastSeen = async () => {
      const now = Date.now();
      // Only update if at least 60 seconds have passed since last update
      if (now - lastUpdateRef.current < 60000) return;

      lastUpdateRef.current = now;
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", user.id);
    };

    // Update on mount
    updateLastSeen();

    // Update on user activity
    const handleActivity = () => updateLastSeen();
    
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    // Also update periodically
    const interval = setInterval(updateLastSeen, 60000);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      clearInterval(interval);
    };
  }, [user]);
};