import { useState } from "react";
import { Mail, Lock, User, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PulseLogo } from "./PulseLogo";
import { WaveLoader } from "./WaveLoader";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const AuthPage = () => {
  const { signIn, signUp } = useAuth();
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
            toast.error("This email is already registered and is in use. Please log in.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Account created! Please check your email to activate your account.");
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
          </form>
        </div>
      </div>
    </div>
  );
};
