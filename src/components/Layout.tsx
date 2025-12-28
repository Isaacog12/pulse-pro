import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/pulse/BottomNav"; 

export const Layout = () => {
  return (
    // 1. LOCK THE WINDOW HEIGHT (h-screen) so the address bar doesn't jump
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      
      {/* 2. MAKE THIS MAIN AREA SCROLLABLE (overflow-y-auto) */}
      <main className="flex-1 w-full overflow-y-auto relative scroll-smooth">
        <Outlet />

        {/* 3. PHYSICAL SPACER (The Magic Fix) 
           This invisible block sits at the bottom of the scroll area.
           It forces the browser to let you scroll past the floating buttons.
        */}
        <div className="w-full h-32 md:h-0 flex-shrink-0" />
      </main>

      {/* 4. NAVIGATION BAR (Floats on top) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </div>
  );
};