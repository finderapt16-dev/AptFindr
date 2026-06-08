import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { AlertCircle, CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { AppLogo } from "@/app/components/common/AppLogo";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for success message from signup
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login({ email, password });

      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.error || "Login failed");
      }
    } catch {
      setError("Login failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center space-x-3 group mb-6">
            <AppLogo className="h-14 w-14 rounded-2xl transition-all duration-300 group-hover:scale-105" iconClassName="h-8 w-8" />
            <div className="text-left">
              <span className="text-2xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">AptFindr</span>
              <p className="text-xs text-amber-600/60 font-bold uppercase tracking-wider">La Paz, Iloilo City</p>
            </div>
          </Link>
          
          <div className="inline-block mb-4 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-full shadow-sm">
            <span className="text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Welcome Back
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Access Your Account</h1>
        </div>

        <Card className="border-amber-100/50 shadow-2xl bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-slate-900">Sign In</CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Enter your credentials to manage your apartments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {successMessage && (
                <Alert className="border-green-200 bg-green-50/50 backdrop-blur-sm rounded-xl">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 font-medium">{successMessage}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-bold ml-1">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" title="Password" className="text-slate-700 font-bold">Password</Label>
                  <Link to="/forgot-password" title="Forgot password?" className="text-xs font-bold text-amber-600 hover:text-orange-600">
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full py-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl hover:shadow-orange-300/50 transform hover:scale-[1.02] transition-all duration-300 rounded-xl font-bold text-lg flex items-center justify-center gap-2" 
                disabled={loading}
              >
                {loading ? "Verifying..." : (
                  <>
                    Sign In
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col bg-amber-50/50 border-t border-amber-100/50 py-6">
            <div className="text-sm text-center text-slate-600 font-medium">
              New to AptFindr?{" "}
              <Link to="/signup" className="text-amber-600 hover:text-orange-600 font-bold transition-colors">
                Create an account
              </Link>
            </div>
          </CardFooter>
        </Card>

        <p className="text-center mt-8 text-xs text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} AptFindr. All rights reserved.
        </p>
      </div>
    </div>
  );
}
