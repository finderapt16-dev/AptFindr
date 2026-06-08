import { Link, useLocation } from "react-router-dom";
import { Home, Heart, Menu, User, LogOut, LayoutDashboard, Settings, Palette, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "./ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useAuth, User as UserType } from "../contexts/AuthContext";

export function Header() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  // Get pending verifications count for admin
  const getPendingCount = () => {
    if (user?.role !== "admin") return 0;
    const usersStr = localStorage.getItem("users");
    const users: UserType[] = usersStr ? JSON.parse(usersStr) : [];
    return users.filter(u => u.role === "landlord" && !u.isVerified).length;
  };

  const pendingCount = getPendingCount();

  const isActive = (path: string) => {
    if (path === "/browse") {
      return location.pathname === "/browse";
    }
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-indigo-100 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center space-x-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
              <Home className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">AptFinder</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/browse"
              className={`transition-all duration-300 hover:text-indigo-600 font-medium ${
                isActive("/browse") ? "text-indigo-600" : "text-slate-600"
              }`}
            >
              Browse
            </Link>
            {(user?.role === "student" || user?.role === "employee") && (
              <Link
                to="/favorites"
                className={`flex items-center space-x-2 transition-all duration-300 hover:text-pink-600 font-medium ${
                  isActive("/favorites") ? "text-pink-600" : "text-slate-600"
                }`}
              >
                <Heart className="h-4 w-4" />
                <span>Favorites</span>
              </Link>
            )}

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-300">
                    <User className="h-4 w-4 text-indigo-600" />
                    {user?.name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                      <p className="text-xs font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent capitalize">{user?.role}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to="/dashboard">
                    <DropdownMenuItem>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                      {user?.role === "admin" && pendingCount > 0 && (
                        <Badge className="ml-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 animate-pulse shadow-md" variant="default">
                          {pendingCount}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/settings">
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/design-guide">
                    <DropdownMenuItem>
                      <Palette className="h-4 w-4 mr-2" />
                      Design Guide
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger className="md:hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 hover:bg-slate-100 hover:text-slate-900 h-9 w-9">
              <Menu className="h-6 w-6" />
            </SheetTrigger>
            <SheetContent>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>Navigate through the apartment finder</SheetDescription>
              <nav className="flex flex-col space-y-4 mt-8">
                {isAuthenticated && (
                  <div className="pb-4 border-b">
                    <p className="font-medium text-slate-900">{user?.name}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                    <p className="text-xs font-medium text-sky-600 capitalize mt-1">{user?.role}</p>
                  </div>
                )}
                {isAuthenticated && (
                  <>
                    <Link
                      to="/dashboard"
                      className={`flex items-center space-x-2 text-lg transition-colors hover:text-slate-900 ${
                        isActive("/dashboard") ? "text-slate-900" : "text-slate-600"
                      }`}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      to="/settings"
                      className={`flex items-center space-x-2 text-lg transition-colors hover:text-slate-900 ${
                        isActive("/settings") ? "text-slate-900" : "text-slate-600"
                      }`}
                    >
                      <Settings className="h-5 w-5" />
                      <span>Settings</span>
                    </Link>
                  </>
                )}
                <Link
                  to="/browse"
                  className={`text-lg transition-colors hover:text-slate-900 ${
                    isActive("/browse") ? "text-slate-900" : "text-slate-600"
                  }`}
                >
                  Browse Apartments
                </Link>
                {(user?.role === "student" || user?.role === "employee") && (
                  <Link
                    to="/favorites"
                    className={`flex items-center space-x-2 text-lg transition-colors hover:text-slate-900 ${
                      isActive("/favorites") ? "text-slate-900" : "text-slate-600"
                    }`}
                  >
                    <Heart className="h-5 w-5" />
                    <span>Favorites</span>
                  </Link>
                )}
                {isAuthenticated ? (
                  <Button variant="outline" onClick={logout} className="w-full justify-start">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                ) : (
                  <>
                    <Link to="/login" className="w-full">
                      <Button variant="outline" className="w-full">
                        Login
                      </Button>
                    </Link>
                    <Link to="/signup" className="w-full">
                      <Button className="w-full">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
