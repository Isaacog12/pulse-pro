import { CheckCircle, Pin, Lock, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostHeaderProps {
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isPro: boolean;
  createdAt: string;
  isExclusive: boolean;
  pinned: boolean;
  repostedBy: string | null;
  onViewProfile?: (userId: string) => void;
  userId: string;
}

export const PostHeader = ({
  username,
  avatarUrl,
  isVerified,
  isPro,
  createdAt,
  isExclusive,
  pinned,
  repostedBy,
  onViewProfile,
  userId,
}: PostHeaderProps) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "now";
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onViewProfile?.(userId)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`}
            alt={username}
            className="w-10 h-10 rounded-full object-cover bg-secondary"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">{username}</span>
              {isVerified && <CheckCircle size={14} className="text-yellow-400 fill-blue-500/10" />}
              {isPro && (
                <div className="px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-bold rounded">
                  PRO
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatTime(createdAt)}</span>
              {isExclusive && <Lock size={10} />}
              {pinned && <Pin size={10} />}
            </div>
          </div>
        </button>
      </div>

      {repostedBy && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Repeat size={12} />
          <span>Reposted by {repostedBy}</span>
        </div>
      )}
    </div>
  );
};