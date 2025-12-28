import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// 1. IMPORT LAYOUT (Global Shell)
import { Layout } from "@/components/Layout";

// 2. IMPORT PAGES (From your Pulse folder)
import Index from "./pages/Index"; // Home Feed
import NotFound from "./pages/NotFound";
import { MessagesView } from "@/components/pulse/MessagesView";
import { ExploreView } from "@/components/pulse/ExploreView"; // <--- Found in your screenshot!

// Note: I didn't see "ProfileView.tsx" in your screenshot, so I'm using Index as a placeholder.
// If you have a file named "ProfileView.tsx", import it here similarly.
const ProfilePlaceholder = () => <div className="p-4 text-center">Profile Page Coming Soon</div>;
const CreatePlaceholder = () => <div className="p-4 text-center">Create Page Coming Soon</div>;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner 
          className="toaster group"
          toastOptions={{
            classNames: {
              toast: "group toast group-[.toaster]:bg-background/60 group-[.toaster]:backdrop-blur-xl group-[.toaster]:border-white/10 group-[.toaster]:text-foreground group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl",
              description: "group-[.toast]:text-muted-foreground",
              actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
              cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            }
          }}
        />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              {/* HOME */}
              <Route path="/" element={<Index />} />
              
              {/* MESSAGES */}
              <Route path="/messages" element={<MessagesView />} />
              
              {/* EXPLORE (Fixed the 404!) */}
              <Route path="/explore" element={<ExploreView />} />

              {/* PLACEHOLDERS (Prevents 404s on other tabs) */}
              <Route path="/create" element={<CreatePlaceholder />} />
              <Route path="/profile" element={<ProfilePlaceholder />} />

              {/* 404 PAGE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;