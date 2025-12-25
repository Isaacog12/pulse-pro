import { useState, useEffect } from "react";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { GlintLogo } from "./GlintLogo";
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("pulse_email");
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
        setTimeout(() => setResetSent(true), 1500);
        return;
      }

      if (view === "signup") {
        if (!username.trim()) {
          toast.error("Please enter a username");
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, username);
        if (error) throw error;
      }

      if (view === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;

        if (rememberMe) localStorage.setItem("pulse_email", email);
        else localStorage.removeItem("pulse_email");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      if (view !== "forgot") setLoading(false);
    }
  };

  const isSignup = view === "signup";
  const isLogin = view === "login";
  const isForgot = view === "forgot";

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background font-sans text-foreground overflow-hidden">

      {/* Left Panel: Visual/Brand (Hidden on Mobile) */}
      <div className="hidden lg:flex relative bg-black items-center justify-center p-12 overflow-hidden">
        {/* Abstract Gradient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#1a1d26_0,_transparent_50%),radial-gradient(circle_at_100%_100%,_#0f0f12_0,_transparent_50%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }} />

        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[128px] animate-pulse duration-[10000ms]" />

        <div className="relative z-10 text-center space-y-6 max-w-lg">
          <div className="mx-auto transform transition-transform hover:scale-105 duration-700">
            <GlintLogo size="xl" animated />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Connect with your circle.
          </h1>
          <p className="text-lg text-white/50 leading-relaxed">
            Experience the next evolution of social connection. Minimalist, fast, and focused on what matters most.
          </p>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="w-full max-w-[400px] space-y-8 animate-in slide-in-from-right-8 duration-700 fade-in">

          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <GlintLogo size="lg" animated />
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isSignup ? "Create an account" : isForgot ? "Reset password" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignup ? "Enter your details below to create your account" : isForgot ? "Enter your email address and we'll send you a link" : "Enter your credentials to access your account"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Controls */}
            <div className="space-y-4">
              {isSignup && (
                <div className="relative group">
                  <Input
                    placeholder="Username"
                    className="h-12 bg-secondary/30 border-secondary hover:border-primary/50 focus:border-primary transition-all duration-300 pl-11 rounded-lg"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    required={isSignup}
                  />
                  <User size={18} className={cn("absolute left-4 top-3.5 transition-colors duration-300", focusedField === "username" ? "text-primary" : "text-muted-foreground")} />
                </div>
              )}

              <div className="relative group">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="h-12 bg-secondary/30 border-secondary hover:border-primary/50 focus:border-primary transition-all duration-300 pl-11 rounded-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  required
                />
                <Mail size={18} className={cn("absolute left-4 top-3.5 transition-colors duration-300", focusedField === "email" ? "text-primary" : "text-muted-foreground")} />
              </div>

              {!isForgot && (
                <div className="relative group">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="h-12 bg-secondary/30 border-secondary hover:border-primary/50 focus:border-primary transition-all duration-300 pl-11 pr-11 rounded-lg"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                  <Lock size={18} className={cn("absolute left-4 top-3.5 transition-colors duration-300", focusedField === "password" ? "text-primary" : "text-muted-foreground")} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}
            </div>

            {/* Auxiliary Links */}
            <div className="flex items-center justify-between text-sm">
              {isLogin && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(c) => setRememberMe(!!c)}
                      className="border-muted-foreground/30 data-[state=checked]:bg-primary"
                    />
                    <label htmlFor="remember" className="font-medium text-muted-foreground cursor-pointer select-none">Remember me</label>
                  </div>
                  <button type="button" onClick={() => { setView("forgot"); setResetSent(false); }} className="text-primary hover:text-primary/80 font-semibold transition-colors">
                    Forgot password?
                  </button>
                </>
              )}
            </div>

            {/* Submit Button */}
            {resetSent ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-lg flex items-center gap-3 animate-in zoom-in-95">
                <div className="bg-emerald-500/20 p-1.5 rounded-full"><Check size={16} /></div>
                <span className="text-sm font-semibold">Check your email for instructions</span>
              </div>
            ) : (
              <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all active:scale-[0.98]">
                {loading ? <WaveLoader /> : (isForgot ? "Send Reset Link" : isSignup ? "Create Account" : "Sign In")}
              </Button>
            )}

            {/* View Toggle */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {!isForgot ? (
              <div className="text-center text-sm">
                <span className="text-muted-foreground">{isSignup ? "Already have an account? " : "Don't have an account? "}</span>
                <button type="button" onClick={() => setView(isSignup ? "login" : "signup")} className="font-bold text-foreground hover:underline underline-offset-4 transition-all">
                  {isSignup ? "Sign In" : "Sign Up"}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setView("login")} className="w-full flex justify-center items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-all gap-2">
                <ArrowLeft size={16} /> Back to Log In
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
