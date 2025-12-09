import { useState, useEffect } from "react";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { GlintLogo } from "./GlintLogo"; // Updated Logo Import
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

  // Enhanced Password Strength Logic
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-muted" };
    
    let score = 0;
    if (pass.length > 7) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 0: return { score: 1, label: "Too Weak", color: "bg-red-500/50" };
      case 1: return { score: 1, label: "Weak", color: "bg-red-500" };
      case 2: return { score: 2, label: "Medium", color: "bg-yellow-500" };
      case 3: return { score: 3, label: "Strong", color: "bg-blue-500" };
      case 4: return { score: 4, label: "Secure", color: "bg-green-500" };
      default: return { score: 0, label: "", color: "bg-muted" };
    }
  };

  const strength = getPasswordStrength(password);

  useEffect(() => {
    // Rebranded Storage Key
    const rememberedEmail = localStorage.getItem("glint_remembered_email");
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
        setTimeout(() => setResetSent(true), 1500); // Mock for now
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
        toast.success("Account created! Please check your email.");
      }

      if (view === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        if (rememberMe) localStorage.setItem("glint_remembered_email", email);
        else localStorage.removeItem("glint_remembered_email");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isSignup = view === "signup";
  const isLogin = view === "login";
  const isForgot = view === "forgot";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "10s" }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="z-10 w-full max-w-[400px] flex flex-col items-center">
        
        {/* Logo */}
        <div className="mb-8 cursor-pointer hover:scale-105 transition-transform duration-500 ease-out">
          <GlintLogo size="lg" animated />
        </div>

        {/* Main Glass Card */}
        <div className="w-full bg-background/40 backdrop-blur-3xl border border-white/10 p-8 rounded-[32px] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group animate-in zoom-in-95 duration-500">
          
          {/* Subtle Shine */}
          <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/5 to-transparent -rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight transition-all">
              {isSignup ? "Create Account" : isForgot ? "Reset Password" : "Welcome Back"}
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              {isSignup ? "Join Glint to connect with friends" : isForgot ? "Enter email to restore access" : "Sign in to continue"}
            </p>
          </div>

          {/* Tab Switcher */}
          {!isForgot && (
            <div className="flex bg-black/20 p-1 rounded-2xl mb-6 relative z-10 border border-white/5">
              {(["login", "signup"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 capitalize relative overflow-hidden",
                    view === v
                      ? "text-white shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  {view === v && (
                    <div className="absolute inset-0 bg-secondary rounded-xl -z-10" />
                  )}
                  {v === "login" ? "Log In" : "Sign Up"}
                </button>
              ))}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            
            {/* Username */}
            {isSignup && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <div className={cn(
                  "relative group transition-all duration-300 rounded-2xl border",
                  focusedField === "username" ? "bg-background/80 border-blue-500/50 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]" : "bg-secondary/30 border-transparent hover:bg-secondary/50"
                )}>
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={18} className={cn("transition-colors", focusedField === "username" ? "text-blue-400" : "text-muted-foreground")} />
                  </div>
                  <Input
                    placeholder="Username"
                    className="pl-11 h-12 bg-transparent border-none focus-visible:ring-0 rounded-2xl"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    required={isSignup}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className={cn(
              "relative group transition-all duration-300 rounded-2xl border",
              focusedField === "email" ? "bg-background/80 border-blue-500/50 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]" : "bg-secondary/30 border-transparent hover:bg-secondary/50"
            )}>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className={cn("transition-colors", focusedField === "email" ? "text-blue-400" : "text-muted-foreground")} />
              </div>
              <Input
                type="email"
                placeholder="Email Address"
                className="pl-11 h-12 bg-transparent border-none focus-visible:ring-0 rounded-2xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                required
              />
            </div>

            {/* Password */}
            {!isForgot && (
              <div className="space-y-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className={cn(
                  "relative group transition-all duration-300 rounded-2xl border",
                  focusedField === "password" ? "bg-background/80 border-blue-500/50 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]" : "bg-secondary/30 border-transparent hover:bg-secondary/50"
                )}>
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className={cn("transition-colors", focusedField === "password" ? "text-blue-400" : "text-muted-foreground")} />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="pl-11 pr-11 h-12 bg-transparent border-none focus-visible:ring-0 rounded-2xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {isSignup && (
                  <div className={cn("space-y-2 overflow-hidden transition-all duration-500", password ? "max-h-20 opacity-100" : "max-h-0 opacity-0")}>
                    <div className="flex justify-between items-center px-1">
                       <span className={cn("text-xs font-bold transition-colors duration-300", strength.color.replace("bg-", "text-"))}>
                         {strength.label}
                       </span>
                       <span className="text-[10px] text-muted-foreground">{password.length}/8 chars</span>
                    </div>
                    <div className="flex gap-1.5 h-1.5 px-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-full flex-1 rounded-full transition-all duration-500 ease-out",
                            i <= strength.score ? strength.color : "bg-secondary/50"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Remember & Forgot */}
            {isLogin && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2 group">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe}
                    onCheckedChange={(c) => setRememberMe(!!c)}
                    className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <label htmlFor="remember" className="text-xs font-medium text-muted-foreground cursor-pointer select-none group-hover:text-foreground transition-colors">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => { setView("forgot"); setResetSent(false); }}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            {resetSent ? (
              <div className="bg-green-500/10 text-green-400 p-4 rounded-2xl text-center text-sm font-bold border border-green-500/20 animate-in zoom-in-95 flex items-center justify-center gap-2">
                <Check size={16} /> Check your inbox!
              </div>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full h-12 rounded-2xl font-bold shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-2",
                  "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-blue-500/25"
                )}
              >
                {loading ? <WaveLoader /> : (
                  <span className="flex items-center gap-2">
                    {isForgot ? "Send Reset Link" : isSignup ? "Create Account" : "Sign In"}
                    <ArrowRight size={18} />
                  </span>
                )}
              </Button>
            )}

            {/* Back Button */}
            {isForgot && (
              <button
                type="button"
                onClick={() => setView("login")}
                className="w-full py-2 text-muted-foreground font-bold hover:text-foreground flex items-center justify-center transition-colors group"
              >
                <ArrowLeft size={16} className="mr-2 transition-transform group-hover:-translate-x-1" /> Back to Login
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center max-w-xs">
          <p className="text-xs text-muted-foreground/50">
            By continuing, you agree to Glint's Terms of Service and Privacy Policy.
          </p>
          <div className="text-[10px] text-muted-foreground/30 mt-2 font-mono">
             All rights reserved © 2025
          </div>
        </div>
      </div>
    </div>
  );
};