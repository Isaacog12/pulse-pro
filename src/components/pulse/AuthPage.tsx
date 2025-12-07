import { useState, useEffect } from "react";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("pulse_remembered_email");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === "forgot") {
        setResetSent(true);
        return;
      }

      if (view === "signup") {
        if (!username.trim()) {
          toast.error("Please enter a username");
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
          toast.success("Account created, check your email to activate your account.");
        }
      }

      if (view === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
        } else {
          // Save or remove remembered email
          if (rememberMe) {
            localStorage.setItem("pulse_remembered_email", email);
          } else {
            localStorage.removeItem("pulse_remembered_email");
          }
        }
      }
    } catch {
      toast.error("An unexpected error occurred. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const isSignup = view === "signup";
  const isLogin = view === "login";
  const isForgot = view === "forgot";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden selection:bg-primary/30">

      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-primary/20 rounded-full blur-[150px] animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-accent/15 rounded-full blur-[150px] animate-pulse"
          style={{ animationDuration: "10s" }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="z-10 w-full max-w-md flex flex-col items-center animate-fade-in">

        {/* Logo */}
        <div className="mb-8 transform hover:scale-110 transition-transform duration-500 cursor-pointer animate-scale-in" style={{ animationDelay: "0.1s" }}>
          <PulseLogo size="lg" animated />
        </div>

        {/* Card */}
        <div 
          className="w-full glass-strong p-8 rounded-3xl shadow-[0_0_50px_-12px_hsl(var(--primary)/0.3)] relative overflow-hidden animate-scale-in"
          style={{ animationDelay: "0.2s" }}
        >

          {/* Header */}
          <div className="text-center mb-8">
            <h1 
              className={cn(
                "text-4xl font-bold text-foreground mb-2 tracking-tight transition-all duration-300",
                "animate-fade-in"
              )}
              style={{ animationDelay: "0.3s" }}
            >
              {isSignup ? "Join the Pulse" : isForgot ? "Reset Password" : "Welcome Back"}
            </h1>

            <p 
              className="text-muted-foreground text-sm font-medium animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              {isSignup
                ? "Experience the next generation of social."
                : isForgot
                ? "Enter your email to receive a reset link."
                : "Enter your credentials to access."}
            </p>
          </div>

          {/* Tabs */}
          {!isForgot && (
            <div 
              className="flex bg-background/50 p-1.5 rounded-2xl mb-8 border border-border/30 animate-fade-in"
              style={{ animationDelay: "0.5s" }}
            >
              <button
                onClick={() => setView("login")}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                  isLogin
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                Log In
              </button>

              <button
                onClick={() => setView("signup")}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                  isSignup
                    ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-lg scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username (signup only) */}
            {isSignup && (
              <div className="relative animate-fade-in" style={{ animationDelay: "0.6s" }}>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={20} className="text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  placeholder="Username"
                  className="pl-12 transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={isSignup}
                />
              </div>
            )}

            {/* Email */}
            <div 
              className="relative animate-fade-in" 
              style={{ animationDelay: isSignup ? "0.7s" : "0.6s" }}
            >
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={20} className="text-muted-foreground" />
              </div>
              <Input
                type="email"
                placeholder="Email Address"
                className="pl-12 transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password (not for forgot) */}
            {!isForgot && (
              <div 
                className="animate-fade-in"
                style={{ animationDelay: isSignup ? "0.8s" : "0.7s" }}
              >
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={20} className="text-muted-foreground" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="pl-12 pr-12 transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {isLogin && (
                  <div 
                    className="flex items-center justify-between mt-3 animate-fade-in"
                    style={{ animationDelay: "0.8s" }}
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        className="transition-transform duration-200 hover:scale-110"
                      />
                      <label 
                        htmlFor="remember" 
                        className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      >
                        Remember me
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setView("forgot");
                        setResetSent(false);
                      }}
                      className="text-xs text-muted-foreground hover:text-primary font-medium transition-all duration-200 hover:translate-x-1"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Success message */}
            {resetSent ? (
              <div className="bg-green-500/20 text-green-400 p-4 rounded-xl text-center text-sm font-bold border border-green-500/30 animate-scale-in">
                Check your email!
              </div>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                variant="gradient"
                size="xl"
                className={cn(
                  "w-full mt-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98] animate-fade-in",
                )}
                style={{ animationDelay: isSignup ? "0.9s" : "0.9s" }}
              >
                {loading ? <WaveLoader /> : (
                  <span className="flex items-center group">
                    {isForgot ? "Send Link" : isSignup ? "Create Account" : "Continue"}
                    <ArrowRight size={20} className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            )}

            {/* Back to login */}
            {isForgot && (
              <button
                type="button"
                onClick={() => setView("login")}
                className="w-full py-3 text-muted-foreground font-bold hover:text-foreground flex items-center justify-center transition-all duration-200 hover:-translate-x-1 group animate-fade-in"
              >
                <ArrowLeft size={16} className="mr-2 transition-transform duration-300 group-hover:-translate-x-1" /> Back to Login
              </button>
            )}
          </form>
        </div>

        {/* Footer text */}
        <p 
          className="text-xs text-muted-foreground mt-6 text-center animate-fade-in"
          style={{ animationDelay: "1s" }}
        >
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};
