import { Home, Search, PlusSquare, MessageSquare, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex justify-around items-center bg-background/80 backdrop-blur-lg border-t border-white/10 py-3 px-2 pb-5 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.3)]">
      
      {/* Home */}
      <Link to="/" className={cn("p-2 rounded-full transition-all duration-300", isActive("/") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary")}>
        <Home size={24} strokeWidth={isActive("/") ? 2.5 : 2} />
      </Link>

      {/* Explore / Search */}
      <Link to="/explore" className={cn("p-2 rounded-full transition-all duration-300", isActive("/explore") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary")}>
        <Search size={24} strokeWidth={isActive("/explore") ? 2.5 : 2} />
      </Link>

      {/* Create (Center Button) */}
      <Link to="/create" className="relative -top-5 bg-gradient-to-tr from-primary to-blue-600 text-white p-4 rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-all">
        <PlusSquare size={28} />
      </Link>

      {/* Messages */}
      <Link to="/messages" className={cn("p-2 rounded-full transition-all duration-300", isActive("/messages") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary")}>
        <MessageSquare size={24} strokeWidth={isActive("/messages") ? 2.5 : 2} />
      </Link>

      {/* Profile */}
      <Link to="/profile" className={cn("p-2 rounded-full transition-all duration-300", isActive("/profile") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary")}>
        <User size={24} strokeWidth={isActive("/profile") ? 2.5 : 2} />
      </Link>

    </div>
  );
};