import { useState, useEffect } from "react";
import { AuthPage } from "@/components/pulse/AuthPage";
import { Navigation } from "@/components/pulse/Navigation";
import { Stories } from "@/components/pulse/Stories";
import { PostCard } from "@/components/pulse/PostCard";
import { CommentsSheet } from "@/components/pulse/CommentsSheet";
import { UserProfile } from "@/components/pulse/UserProfile";
import { CreatePostModal } from "@/components/pulse/CreatePostModal";
import { PulseLogo } from "@/components/pulse/PulseLogo";
import { PulseLoader } from "@/components/pulse/WaveLoader";

// Mock data
const MOCK_USER = {
  uid: "user1",
  displayName: "Alex Chen",
  photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
  email: "alex@pulse.app",
  bio: "✨ Creative soul | 📸 Photography enthusiast | 🌍 Explorer",
  status: "Living the dream",
  isPro: false,
  isVerified: false,
  followers: ["user2", "user3"],
  following: ["user2"],
};

const MOCK_STORIES = [
  {
    id: "s1",
    username: "Sarah",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    imageUrl: "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&h=400&fit=crop",
  },
  {
    id: "s2",
    username: "Mike",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    imageUrl: "https://images.unsplash.com/photo-1682687221038-404670f09ef1?w=400&h=400&fit=crop",
  },
  {
    id: "s3",
    username: "Emma",
    userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    imageUrl: "https://images.unsplash.com/photo-1682695796954-bad0d0f59ff1?w=400&h=400&fit=crop",
  },
];

const MOCK_POSTS = [
  {
    id: "p1",
    username: "Sarah",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    userIsVerified: true,
    imageUrl: "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&h=800&fit=crop",
    caption: "Golden hour magic ✨ Chasing sunsets and making memories.",
    likes: ["user1", "user2", "user3"],
    comments: [
      { id: "c1", text: "Absolutely stunning!", username: "Mike", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" },
    ],
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: "p2",
    username: "Mike",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    userIsVerified: false,
    imageUrl: "https://images.unsplash.com/photo-1682687221038-404670f09ef1?w=800&h=800&fit=crop",
    caption: "Morning coffee with a view ☕️ Starting the day right.",
    likes: ["user1"],
    comments: [],
    timestamp: new Date(Date.now() - 7200000),
  },
  {
    id: "p3",
    username: "Emma",
    userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    userIsVerified: true,
    imageUrl: "https://images.unsplash.com/photo-1682695796954-bad0d0f59ff1?w=800&h=800&fit=crop",
    caption: "Adventure awaits 🏔️ The mountains are calling.",
    likes: ["user2", "user3"],
    comments: [
      { id: "c2", text: "Where is this? So beautiful!", username: "Sarah", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" },
    ],
    timestamp: new Date(Date.now() - 86400000),
  },
];

type ViewType = "home" | "explore" | "create" | "notifications" | "profile" | "reels" | "settings";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(MOCK_USER);
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [isMobile, setIsMobile] = useState(false);
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // Check screen size
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Simulate loading
    setTimeout(() => setIsLoading(false), 1500);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogin = (user: { name: string; email: string }) => {
    setCurrentUser({
      ...MOCK_USER,
      displayName: user.name,
      email: user.email,
    });
    setIsAuthenticated(true);
  };

  const handleLike = (postId: string, liked: boolean) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: liked 
            ? [...post.likes, currentUser.uid]
            : post.likes.filter(id => id !== currentUser.uid)
        };
      }
      return post;
    }));
  };

  const handleSave = (postId: string) => {
    setSavedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const handleAddComment = (postId: string, comment: any) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...post.comments, comment]
        };
      }
      return post;
    }));
  };

  const handleCreatePost = (imageData: string, caption: string, filter: string) => {
    const newPost = {
      id: `p${Date.now()}`,
      username: currentUser.displayName,
      userAvatar: currentUser.photoURL,
      userIsVerified: currentUser.isVerified,
      imageUrl: imageData,
      caption,
      likes: [],
      comments: [],
      timestamp: new Date(),
      filter,
    };
    setPosts([newPost, ...posts]);
    setCurrentView("home");
  };

  // Loading screen
  if (isLoading) {
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
  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} />;
  }

  // Handle create view
  if (currentView === "create") {
    return (
      <>
        <CreatePostModal
          onClose={() => setCurrentView("home")}
          onPost={handleCreatePost}
        />
      </>
    );
  }

  const userPosts = posts.filter(p => p.username === currentUser.displayName);
  const savedPostsData = posts.filter(p => savedPosts.includes(p.id));

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop Navigation */}
        {!isMobile && (
          <Navigation
            currentView={currentView}
            setView={setCurrentView}
            isMobile={false}
            isPro={currentUser.isPro}
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
              <Stories stories={MOCK_STORIES} currentUserAvatar={currentUser.photoURL} />
              <div className="px-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUser.uid}
                    isSaved={savedPosts.includes(post.id)}
                    onLike={handleLike}
                    onViewComments={setSelectedPost}
                    onSave={handleSave}
                  />
                ))}
              </div>
            </div>
          )}

          {currentView === "profile" && (
            <div className="p-4">
              <UserProfile
                user={currentUser}
                currentUser={currentUser}
                isOwnProfile={true}
                posts={userPosts}
                savedPosts={savedPostsData}
                onOpenSettings={() => setCurrentView("settings")}
              />
            </div>
          )}

          {currentView === "explore" && (
            <div className="p-4">
              <h2 className="text-2xl font-bold text-foreground mb-6">Explore</h2>
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <div key={post.id} className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg">
                    <img src={post.imageUrl} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === "notifications" && (
            <div className="p-4">
              <h2 className="text-2xl font-bold text-foreground mb-6">Notifications</h2>
              <div className="text-center text-muted-foreground py-16">
                <p>No new notifications</p>
              </div>
            </div>
          )}

          {currentView === "settings" && (
            <div className="p-4">
              <h2 className="text-2xl font-bold text-foreground mb-6">Settings</h2>
              <div className="glass rounded-2xl p-6">
                <p className="text-muted-foreground">Settings coming soon...</p>
              </div>
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
            isPro={currentUser.isPro}
          />
        )}
      </div>

      {/* Comments Sheet */}
      {selectedPost && (
        <CommentsSheet
          post={selectedPost}
          user={currentUser}
          onClose={() => setSelectedPost(null)}
          onAddComment={handleAddComment}
        />
      )}

      {/* Create Modal for mobile */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPost={(imageData, caption, filter) => {
            handleCreatePost(imageData, caption, filter);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Index;
