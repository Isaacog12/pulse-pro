import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Users, UserPlus, Link as LinkIcon } from "lucide-react";

export const CreateGroupDialog = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim() || !user) return;
    setLoading(true);

    try {
      // 1. Create Conversation
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          is_group: true,
          title: groupName,
          admin_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Add Admin (You) to participants
      await supabase.from("conversation_participants").insert({
        conversation_id: conv.id,
        user_id: user.id
      });

      toast.success("Group created!");
      setIsOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background/90 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input 
              placeholder="Group Name" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="bg-secondary/50"
            />
          </div>
          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};