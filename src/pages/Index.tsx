import { useState, useEffect } from "react";
import { AuthPage } from "@/components/pulse/AuthPage";
import { Navigation } from "@/components/pulse/Navigation";
import { Stories } from "@/components/pulse/Stories";
import { PostCard } from "@/components/pulse/PostCard";
import { CommentsSheet } from "@/components/pulse/CommentsSheet";
import { UserProfile } from "@/components/pulse/UserProfile";
import { CreatePostModal } from "@/components/pulse/CreatePostModal";
import { NotificationsView } from "@/components/pulse/NotificationsView";
import { SettingsView } from "@/components/pulse/SettingsView";
import { MessagesView } from "@/components/pulse/MessagesView";
import { ChatView } from "@/components/pulse/ChatView";
import { UserSearchModal } from "@/components/pulse/UserSearchModal";
import { ExploreView } from "@/components/pulse/ExploreView";
import { ProfileViewModal } from "@/components/pulse/ProfileViewModal";
import { PostDetailModal } from "@/components/pulse/PostDetailModal";
import { GlintLogo } from "@/components/pulse/GlintLogo"; // ✅ Rebranded Logo
import { PulseLoader } from "@/components/pulse/WaveLoader";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateLastSeen } from "@/hooks/useUpdateLastSeen";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ViewType = "home" | "explore" | "create" | "notifications" | "profile" | "reels" | "settings" | "messages";

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  filter: string | null;
  is_exclusive: boolean;
  pinned: boolean;
  reposted_by: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    is_pro: boolean;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
}

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

const Index = () => {
  const { user, profile, loading: authLoading } = useAuth();
  useUpdateLastSeen(); 
  
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [isMobile, setIsMobile] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [activeChat, setActiveChat] = useState<{
    conversationId: string;
    otherUser: { id: string; username: string; avatar_url: string | null };
  } | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Deep Linking Logic
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const postIdParam = params.get("post");
    const profileIdParam = params.get("profile");

    if (postIdParam) {
      setViewingPostId(postIdParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (profileIdParam) {
      setViewingProfileId(profileIdParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPosts();
      fetchStories();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("posts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchPosts = async () => {
    if (!user) return;
    const { data: followingData } = await supabase.from("followers").select("following_id").eq("follower_id", user.id);
    const followingIds = followingData?.map((f) => f.following_id) || [];
    const userIdsToFetch = [user.id, ...followingIds];

    if (userIdsToFetch.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const { data: postsData, error } = await supabase
      .from("posts")
      .select("*, profile:profiles(username, avatar_url, is_verified, is_pro)")
      .in("user_id", userIdsToFetch)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching posts:", error);
      setLoading(false);
      return;
    }

    const postsWithCounts = await Promise.all(
      (postsData || []).map(async (post) => {
        const { count: likesCount } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", post.id);
        const { count: commentsCount } = await supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", post.id);
        const { data: likeData } = await supabase.from("likes").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle();
        const { data: savedData } = await supabase.from("saved_posts").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle();

        return {
          ...post,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          is_liked: !!likeData,
          is_saved: !!savedData,
        };
      })
    );
    setPosts(postsWithCounts);
    setLoading(false);
  };

  const fetchStories = async () => {
    if (!user) return;
    const { data: followingData } = await supabase.from("followers").select("following_id").eq("follower_id", user.id);
    const followingIds = followingData?.map((f) => f.following_id) || [];
    const userIdsToFetch = [user.id, ...followingIds];

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    if (userIdsToFetch.length === 0) {
      setStories([]);
      return;
    }

    const { data } = await supabase
      .from("stories")
      .select("*, profile:profiles(username, avatar_url)")
      .in("user_id", userIdsToFetch)
      .gte("created_at", twentyFourHoursAgo.toISOString())
      .order("created_at", { ascending: false });

    if (data) setStories(data);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center">
          <GlintLogo size="lg" animated /> {/* Rebranded Loader */}
          <div className="mt-8">
            <PulseLoader />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (currentView === "create") {
    return (
      <CreatePostModal
        onClose={() => setCurrentView("home")}
        onPostCreated={() => { fetchPosts(); setCurrentView("home"); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      
      <div className="flex">
        {!isMobile && (
          <Navigation
            currentView={currentView}
            setView={setCurrentView}
            isMobile={false}
            isPro={profile?.is_pro || false}
          />
        )}

        <main 
          className={cn(
            "flex-1 w-full transition-all duration-300",
            isMobile ? "pt-[88px] pb-28" : "md:pl-0 md:pt-8 md:pr-8 max-w-2xl mx-auto"
          )}
        >
           {/* Mobile Header (Rebranded) */}
           {isMobile && (
            <header className="fixed top-0 left-0 right-0 z-40 bg-background/60 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2">
                <GlintLogo size="sm" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">
                  Glint
                </h1>
              </div>
            </header>
          )}

          {currentView === "home" && (
            <div className="animate-in fade-in duration-500">
              <Stories stories={stories} onStoryAdded={fetchStories} />
              
              <div className="px-0 sm:px-4 mt-4">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <PulseLoader />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground bg-secondary/20 rounded-3xl mx-4 border border-dashed border-white/10">
                    <p className="text-lg font-medium">Your feed is empty</p>
                    <p className="text-sm mt-2 max-w-xs mx-auto">Follow people to see their posts here, or check explore!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={user.id}
                        onViewComments={() => setSelectedPostId(post.id)}
                        onPostDeleted={fetchPosts}
                        onViewProfile={(userId) => setViewingProfileId(userId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === "profile" && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <UserProfile onOpenSettings={() => setCurrentView("settings")} />
            </div>
          )}

          {currentView === "explore" && (
            <div className="px-4 animate-in slide-in-from-right-4 duration-300">
              <ExploreView 
                posts={posts} 
                onViewProfile={(userId) => setViewingProfileId(userId)}
                onViewPost={(postId) => setViewingPostId(postId)}
              />
            </div>
          )}

          {currentView === "messages" && !activeChat && (
            <div className="p-4 animate-in slide-in-from-right-4 duration-300">
              <MessagesView
                onSelectConversation={(convId, otherUser) =>
                  setActiveChat({ conversationId: convId, otherUser })
                }
                onNewMessage={() => setShowNewMessageModal(true)}
              />
            </div>
          )}

          {currentView === "messages" && activeChat && (
            <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-40px)] animate-in slide-in-from-right-8 duration-300">
              <ChatView
                conversationId={activeChat.conversationId}
                otherUser={activeChat.otherUser}
                onBack={() => setActiveChat(null)}
              />
            </div>
          )}

          {currentView === "notifications" && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <NotificationsView />
            </div>
          )}

          {currentView === "settings" && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <SettingsView onBack={() => setCurrentView("profile")} />
            </div>
          )}

          {currentView === "reels" && (
            <div className="p-4 text-center py-32 animate-in fade-in">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent mb-4">Reels</h2>
              <p className="text-muted-foreground">Coming soon to Glint Pro...</p>
            </div>
          )}
        </main>

        {isMobile && (
          <Navigation
            currentView={currentView}
            setView={(view) => {
              if (view === "create") {
                setShowCreateModal(true);
              } else {
                setCurrentView(view);
                if (view !== "messages") setActiveChat(null);
              }
            }}
            isMobile={true}
            isPro={profile?.is_pro || false}
            unreadMessages={0} 
            unreadNotifications={0}
          />
        )}
      </div>

      {/* Modals & Sheets */}
      {selectedPostId && (
        <CommentsSheet
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={() => {
            fetchPosts();
            setShowCreateModal(false);
          }}
        />
      )}

      {showNewMessageModal && (
        <UserSearchModal
          onClose={() => setShowNewMessageModal(false)}
          onStartChat={(convId, user) => {
            setShowNewMessageModal(false);
            setActiveChat({
              conversationId: convId,
              otherUser: { id: user.id, username: user.username, avatar_url: user.avatar_url },
            });
            setCurrentView("messages");
          }}
        />
      )}

      {viewingProfileId && (
        <ProfileViewModal
          userId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
          onViewPost={(postId) => setViewingPostId(postId)}
        />
      )}

      {viewingPostId && (
        <PostDetailModal
          postId={viewingPostId}
          onClose={() => setViewingPostId(null)}
          onViewProfile={(userId) => setViewingProfileId(userId)}
        />
      )}
    </div>
  );
};

export default Index;