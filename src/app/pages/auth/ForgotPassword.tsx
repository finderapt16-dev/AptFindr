import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { AlertCircle, CheckCircle, ArrowRight, ArrowLeft, Key } from "lucide-react";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseclient";
import { AppLogo } from "@/app/components/common/AppLogo";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/settings`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
    toast.success("Password reset email sent.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4 relative overflow-hidden">
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
              <Key className="h-3.5 w-3.5 text-amber-500" />
              Password Recovery
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Reset Your Password</h1>
        </div>

        <Card className="border-amber-100/50 shadow-2xl bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-slate-900">
              {sent ? "Check Your Email" : "Find Your Account"}
            </CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              {sent ? "Use the secure reset link from Supabase" : "Enter your email and we will send a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sent ? (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
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
                  <p className="text-xs text-slate-500 font-medium ml-1">
                    If this email exists, Supabase will send a password reset link.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full py-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl hover:shadow-orange-300/50 transform hover:scale-[1.02] transition-all duration-300 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? "Sending..." : (
                    <>
                      Send Reset Link
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-5">
                <Alert className="border-green-200 bg-green-50/50 backdrop-blur-sm rounded-xl">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 font-medium">
                    Reset link sent to <span className="font-bold">{email}</span>. Open the email and follow the link to set a new password.
                  </AlertDescription>
                </Alert>

                <Button
                  type="button"
                  className="w-full py-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl hover:shadow-orange-300/50 transform hover:scale-[1.02] transition-all duration-300 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                  onClick={() => navigate("/login")}
                >
                  Back to Sign In
                  <CheckCircle className="h-5 w-5" />
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col bg-amber-50/50 border-t border-amber-100/50 py-6">
            <div className="text-sm text-center text-slate-600 font-medium">
              <Link to="/login" className="text-amber-600 hover:text-orange-600 font-bold transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
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
