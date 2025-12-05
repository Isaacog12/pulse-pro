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
import { PulseLogo } from "@/components/pulse/PulseLogo";
import { PulseLoader } from "@/components/pulse/WaveLoader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (user) {
      fetchPosts();
      fetchStories();
    }
  }, [user]);

  // Realtime subscription for posts
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchPosts = async () => {
    if (!user) return;

    const { data: postsData, error } = await supabase
      .from("posts")
      .select("*, profile:profiles(username, avatar_url, is_verified, is_pro)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching posts:", error);
      setLoading(false);
      return;
    }

    // Get likes, comments, and saved status for each post
    const postsWithCounts = await Promise.all(
      (postsData || []).map(async (post) => {
        const { count: likesCount } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        const { count: commentsCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        const { data: likeData } = await supabase
          .from("likes")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle();

        const { data: savedData } = await supabase
          .from("saved_posts")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle();

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
    // Get stories from last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data } = await supabase
      .from("stories")
      .select("*, profile:profiles(username, avatar_url)")
      .gte("created_at", twentyFourHoursAgo.toISOString())
      .order("created_at", { ascending: false });

    if (data) {
      setStories(data);
    }
  };

  // Loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center">
          <PulseLogo size="lg" animated />
          <div className="mt-8">
            <PulseLoader />
          </div>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return <AuthPage />;
  }

  // Handle create view
  if (currentView === "create") {
    return (
      <CreatePostModal
        onClose={() => setCurrentView("home")}
        onPostCreated={() => {
          fetchPosts();
          setCurrentView("home");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop Navigation */}
        {!isMobile && (
          <Navigation
            currentView={currentView}
            setView={setCurrentView}
            isMobile={false}
            isPro={profile?.is_pro || false}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 max-w-2xl mx-auto pb-24 md:pb-8">
          {/* Mobile Header */}
          {isMobile && (
            <header className="sticky top-0 z-40 glass-strong px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PulseLogo size="sm" />
                <h1 className="text-xl font-bold text-gradient">Pulse</h1>
              </div>
            </header>
          )}

          {/* Views */}
          {currentView === "home" && (
            <div>
              <Stories stories={stories} onStoryAdded={fetchStories} />
              <div className="px-4">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <PulseLoader />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <p className="text-lg font-medium">No posts yet</p>
                    <p className="text-sm">Be the first to share something!</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={user.id}
                      onViewComments={() => setSelectedPostId(post.id)}
                      onPostDeleted={fetchPosts}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {currentView === "profile" && (
            <div className="p-4">
              <UserProfile onOpenSettings={() => setCurrentView("settings")} />
            </div>
          )}

          {currentView === "explore" && (
            <div className="p-4">
              <ExploreView posts={posts} />
            </div>
          )}

          {currentView === "messages" && !activeChat && (
            <div className="p-4">
              <MessagesView
                onSelectConversation={(convId, otherUser) =>
                  setActiveChat({ conversationId: convId, otherUser })
                }
                onNewMessage={() => setShowNewMessageModal(true)}
              />
            </div>
          )}

          {currentView === "messages" && activeChat && (
            <div className="p-4">
              <ChatView
                conversationId={activeChat.conversationId}
                otherUser={activeChat.otherUser}
                onBack={() => setActiveChat(null)}
              />
            </div>
          )}

          {currentView === "notifications" && (
            <div className="p-4">
              <NotificationsView />
            </div>
          )}

          {currentView === "settings" && (
            <div className="p-4">
              <SettingsView onBack={() => setCurrentView("profile")} />
            </div>
          )}

          {currentView === "reels" && (
            <div className="p-4">
              <h2 className="text-2xl font-bold text-foreground mb-6">Reels</h2>
              <div className="text-center text-muted-foreground py-16">
                <p>Reels feature coming soon...</p>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Navigation */}
        {isMobile && (
          <Navigation
            currentView={currentView}
            setView={(view) => {
              if (view === "create") {
                setShowCreateModal(true);
              } else {
                setCurrentView(view);
              }
            }}
            isMobile={true}
            isPro={profile?.is_pro || false}
          />
        )}
      </div>

      {/* Comments Sheet */}
      {selectedPostId && (
        <CommentsSheet
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}

      {/* Create Modal for mobile */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={() => {
            fetchPosts();
            setShowCreateModal(false);
          }}
        />
      )}

      {/* New Message Modal */}
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
    </div>
  );
};

export default Index;
