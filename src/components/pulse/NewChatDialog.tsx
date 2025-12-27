import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, UserPlus, MessageSquarePlus, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NewChatDialogProps {
  children: React.ReactNode;
  onStartChat: (userId: string, user: any) => void;
}

export const NewChatDialog = ({ children, onStartChat }: NewChatDialogProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Search users in Supabase
  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
        setResults([]);
        return;
    }
    
    setSearching(true);
    // Find users where username matches (case insensitive)
    const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user?.id) // Don't show myself
        .ilike("username", `%${val}%`)
        .limit(5);
        
    setResults(data || []);
    setSearching(false);
  };

  const startConversation = async (otherUser: any) => {
    // 1. Check if conversation already exists
    // (This is complex in SQL, for now let's just create/get)
    
    // Simplest way: Just pass to parent to handle "Selection"
    // The parent (MessagesView) usually handles "get or create" logic
    onStartChat(otherUser.id, otherUser);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by username..." 
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-secondary/50 border-none"
            />
          </div>

          <div className="space-y-2 min-h-[200px]">
            {searching ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
            ) : results.length > 0 ? (
                results.map((u) => (
                    <div 
                      key={u.id} 
                      onClick={() => startConversation(u)}
                      className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                    >
                        <Avatar>
                            <AvatarImage src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} />
                            <AvatarFallback>{u.username[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm">{u.username}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">{u.bio || "No bio"}</p>
                        </div>
                        <MessageSquarePlus className="text-primary h-5 w-5" />
                    </div>
                ))
            ) : query.length > 1 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No users found</p>
            ) : (
                <div className="text-center text-muted-foreground/50 py-8 flex flex-col items-center">
                    <UserPlus size={40} className="mb-2 opacity-20" />
                    <p className="text-sm">Type a name to find people</p>
                </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};