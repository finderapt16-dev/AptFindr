import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/app/contexts/AuthContext";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/app/components/ui/radio-group";
import {
  Home,
  AlertCircle,
  User,
  Briefcase,
  Building2,
  Sparkles,
  ArrowRight,
  MapPin,
  Users,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
} from "@/app/components/ui/alert";
import { AppLogo } from "@/app/components/common/AppLogo";

export function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    // Common fields
    firstName: "",
    lastName: "",
    middleInitial: "",
    email: "",
    mobileNumber: "",
    address: "",
    password: "",
    confirmPassword: "",
    role: "student" as UserRole,

    // Student-specific
    school: "",
    guardian: "",
    guardianAddress: "",
    guardianContact: "",

    // Employee-specific
    company: "",
    workAddress: "",

    // Landlord-specific
    permitNumber: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    // Combine name fields
    const fullName =
      `${formData.firstName} ${formData.middleInitial ? formData.middleInitial + ". " : ""}${formData.lastName}`.trim();

    try {
      const result = await signup({
        name: fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        middleInitial: formData.middleInitial,
        address: formData.address,
        mobileNumber: formData.mobileNumber,
        school: formData.school,
        guardianName: formData.guardian,
        guardianAddress: formData.guardianAddress,
        guardianContact: formData.guardianContact,
        company: formData.company,
        workAddress: formData.workAddress,
        permitNumber: formData.permitNumber,
      });

      if (result.success) {
        navigate("/login", {
          state: {
            message: "Account created successfully! Please login.",
          },
        });
      } else {
        setError(result.error || "Signup failed");
      }
    } catch {
      setError("Signup failed. Check your connection and Supabase setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4 py-16 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center space-x-3 group mb-6"
          >
            <AppLogo className="h-12 w-12 rounded-xl transition-all duration-300 group-hover:scale-105" iconClassName="h-6 w-6" />
            <div className="text-left">
              <span className="text-2xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                AptFindr
              </span>
              <p className="text-xs text-amber-600/60 font-bold uppercase tracking-wider">
                La Paz, Iloilo City
              </p>
            </div>
          </Link>

          <div className="inline-block mb-4 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-full shadow-sm">
            <span className="text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Secure Registration
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Create Your Account
          </h1>
        </div>

        <Card className="border-amber-100/50 shadow-2xl bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-slate-900">
              Sign Up
            </CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Join the most trusted apartment network in La Paz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <Alert
                  variant="destructive"
                  className="rounded-xl animate-in fade-in slide-in-from-top-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Role Selection */}
              <div className="space-y-4">
                <Label className="text-xs font-bold text-amber-600 uppercase tracking-widest ml-1">
                  I am a...
                </Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      role: value as UserRole,
                    })
                  }
                  className="grid grid-cols-3 gap-4"
                >
                  {[
                    {
                      id: "student",
                      label: "Student",
                      sub: "Looking for a home",
                      icon: User,
                    },
                    {
                      id: "employee",
                      label: "Employee",
                      sub: "Professional",
                      icon: Briefcase,
                    },
                    {
                      id: "landlord",
                      label: "Landlord",
                      sub: "List & Manage",
                      icon: Building2,
                    },
                  ].map((item) => (
                    <div key={item.id}>
                      <RadioGroupItem
                        value={item.id}
                        id={item.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={item.id}
                        className="flex flex-col items-center justify-center rounded-2xl border-2 border-amber-100 bg-white/50 p-4 hover:bg-amber-50/50 peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50 cursor-pointer transition-all h-32 text-center group"
                      >
                        <item.icon className="h-8 w-8 mb-2 text-slate-400 group-hover:text-amber-500 peer-data-[state=checked]:text-amber-600 transition-colors" />
                        <span className="font-bold text-sm text-slate-900">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 leading-tight">
                          {item.sub}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Personal Information */}
              <div className="space-y-5">
                <Label className="text-xs font-bold text-amber-600 uppercase tracking-widest ml-1">
                  Personal Information
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="firstName"
                      className="text-slate-700 font-bold ml-1"
                    >
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="Juan"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          firstName: e.target.value,
                        })
                      }
                      required
                      className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="lastName"
                      className="text-slate-700 font-bold ml-1"
                    >
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Dela Cruz"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lastName: e.target.value,
                        })
                      }
                      required
                      className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="middleInitial"
                      className="text-slate-700 font-bold ml-1"
                    >
                      Middle Initial
                    </Label>
                    <Input
                      id="middleInitial"
                      placeholder="M."
                      value={formData.middleInitial}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          middleInitial: e.target.value,
                        })
                      }
                      className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="address"
                      className="text-slate-700 font-bold ml-1"
                    >
                      Home Address
                    </Label>
                    <Input
                      id="address"
                      placeholder="Street, City, Province"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: e.target.value,
                        })
                      }
                      required
                      className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                    />
                  </div>
                </div>
              </div>

              {/* Role Specific Details */}
              {formData.role === "student" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-left-2">
                  <Label className="text-xs font-bold text-amber-600 uppercase tracking-widest ml-1">
                    Student & Guardian Details
                  </Label>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="school" className="text-slate-700 font-bold ml-1">
                        School
                      </Label>
                      <Input
                        id="school"
                        placeholder="Enter your school"
                        value={formData.school}
                        onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                        required
                        className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="guardian" className="text-slate-700 font-bold ml-1 flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" /> Guardian Name
                        </Label>
                        <Input
                          id="guardian"
                          placeholder="Full Name"
                          value={formData.guardian}
                          onChange={(e) => setFormData({ ...formData, guardian: e.target.value })}
                          required
                          className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guardianContact" className="text-slate-700 font-bold ml-1">
                          Guardian Contact Number
                        </Label>
                        <Input
                          id="guardianContact"
                          placeholder="+63 9XX XXX XXXX"
                          value={formData.guardianContact}
                          onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value })}
                          required
                          className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardianAddress" className="text-slate-700 font-bold ml-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" /> Guardian Address
                      </Label>
                      <Input
                        id="guardianAddress"
                        placeholder="Complete Address"
                        value={formData.guardianAddress}
                        onChange={(e) => setFormData({ ...formData, guardianAddress: e.target.value })}
                        required
                        className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.role === "employee" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-left-2">
                  <Label className="text-xs font-bold text-amber-600 uppercase tracking-widest ml-1">
                    Employment Details
                  </Label>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-slate-700 font-bold ml-1">
                      Company
                    </Label>
                    <Input
                      id="company"
                      placeholder="Company / organization"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      required
                      className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workAddress" className="text-slate-700 font-bold ml-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" /> Work Address
                    </Label>
                    <Input
                      id="workAddress"
                      placeholder="Company Address"
                      value={formData.workAddress}
                      onChange={(e) => setFormData({ ...formData, workAddress: e.target.value })}
                      required
                      className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                    />
                  </div>
                </div>
              )}

              {formData.role === "landlord" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-left-2">
                  <Label className="text-xs font-bold text-amber-600 uppercase tracking-widest ml-1">
                    Landlord Verification
                  </Label>
                  <div className="space-y-2">
                    <Label htmlFor="permitNumber" className="text-slate-700 font-bold ml-1">
                      Business Permit Number
                    </Label>
                    <Input
                      id="permitNumber"
                      placeholder="B-2026-XXXXX"
                      value={formData.permitNumber}
                      onChange={(e) => setFormData({ ...formData, permitNumber: e.target.value })}
                      required
                      className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                    />
                  </div>
                </div>
              )}

              {/* Contact & Security */}
              <div className="space-y-5">
                <Label className="text-xs font-bold text-amber-600 uppercase tracking-widest ml-1">
                  Account Security
                </Label>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-slate-700 font-bold ml-1"
                      >
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            email: e.target.value,
                          })
                        }
                        required
                        className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="mobile"
                        className="text-slate-700 font-bold ml-1"
                      >
                        Mobile
                      </Label>
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="+63 9XX XXX XXXX"
                        value={formData.mobileNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            mobileNumber: e.target.value,
                          })
                        }
                        required
                        className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="password"
                        className="text-slate-700 font-bold ml-1"
                      >
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          })
                        }
                        required
                        className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="confirm"
                        className="text-slate-700 font-bold ml-1"
                      >
                        Confirm Password
                      </Label>
                      <Input
                        id="confirm"
                        type="password"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                        className="rounded-xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 bg-white/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-7 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl hover:shadow-orange-300/50 transform hover:scale-[1.01] transition-all duration-300 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  "Creating Account..."
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col bg-amber-50/50 border-t border-amber-100/50 py-8">
            <div className="text-sm text-center text-slate-600 font-medium">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-amber-600 hover:text-orange-600 font-bold transition-colors"
              >
                Sign in here
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
