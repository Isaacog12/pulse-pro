import { useState } from "react";
import { Mail, Lock, User, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PulseLogo } from "./PulseLogo";
import { WaveLoader } from "./WaveLoader";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export const AuthPage = () => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [view, setView] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (view === "forgot") {
      // Password reset would go here
      setResetSent(true);
      setLoading(false);
      return;
    }

    try {
      if (view === "signup") {
        if (!username.trim()) {
          toast.error("Please enter a username");
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, username);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please log in.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Account created! You are now logged in.");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden selection:bg-primary/30">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-primary/20 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-accent/15 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: "10s" }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150 mix-blend-overlay" />
      </div>

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8 transform hover:scale-110 transition-transform duration-500 cursor-pointer drop-shadow-2xl">
          <PulseLogo size="lg" animated />
        </div>

        {/* Auth Card */}
        <div className="w-full glass-strong p-8 rounded-3xl shadow-[0_0_50px_-12px_hsl(var(--primary)/0.3)] relative overflow-hidden group">
          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight drop-shadow-md">
              {view === "signup" ? "Join the Pulse" : view === "forgot" ? "Reset Password" : "Welcome Back"}
            </h1>
            <p className="text-muted-foreground text-sm font-medium tracking-wide">
              {view === "signup" ? "Experience the next generation of social." : "Enter your credentials to access."}
            </p>
          </div>

          {/* Tab Switcher */}
          {view !== "forgot" && (
            <div className="flex bg-background/50 p-1.5 rounded-2xl mb-8 relative z-10 border border-border/30">
              <button
                onClick={() => setView("login")}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                  view === "login"
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Log In
              </button>
              <button
                onClick={() => setView("signup")}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                  view === "signup"
                    ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {view === "signup" && (
              <div className="group">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={20} className="text-muted-foreground group-focus-within:text-accent transition-colors" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Username"
                    className="pl-12"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={view === "signup"}
                  />
                </div>
              </div>
            )}

            <div className="group">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={20} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <Input
                  type="email"
                  placeholder="Email Address"
                  className="pl-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {view !== "forgot" && (
              <div className="group">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={20} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    type="password"
                    placeholder="Password"
                    className="pl-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                {view === "login" && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {resetSent ? (
              <div className="bg-green-500/20 text-green-400 p-4 rounded-xl text-center text-sm font-bold border border-green-500/30">
                Check your email!
              </div>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                variant="gradient"
                size="xl"
                className="w-full mt-6"
              >
                {loading ? (
                  <WaveLoader />
                ) : (
                  <span className="flex items-center">
                    {view === "forgot" ? "Send Link" : view === "signup" ? "Create Account" : "Continue"}
                    <ArrowRight size={20} className="ml-2" />
                  </span>
                )}
              </Button>
            )}

            {view === "forgot" && (
              <button
                type="button"
                onClick={() => setView("login")}
                className="w-full py-3 text-muted-foreground font-bold hover:text-foreground flex items-center justify-center transition-colors"
              >
                <ArrowLeft size={16} className="mr-2" /> Back to Login
              </button>
            )}

            {view !== "forgot" && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-medium">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="xl"
                  className="w-full"
                  onClick={async () => {
                    const { error } = await signInWithGoogle();
                    if (error) {
                      toast.error(error.message);
                    }
                  }}
                >
                  <GoogleIcon />
                  <span className="ml-2">Continue with Google</span>
                </Button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
