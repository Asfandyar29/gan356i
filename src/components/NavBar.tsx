import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, User, Loader2, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useState } from 'react';

const NavBar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <nav className="z-50 backdrop-blur-lg bg-background/70 border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="GAN Logo" className="w-8 h-8 rounded-md" />
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent hidden sm:block">
                GAN Tracker
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-8">
                  <Link
                    to="/about"
                    className="text-lg font-semibold text-primary hover:text-primary/80 transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    About Developer
                  </Link>
                  <div className="border-t border-border pt-4 space-y-3">
                    <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default block py-2">
                      Stats
                    </span>
                    <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default block py-2">
                      Analyzer
                    </span>
                    <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default block py-2">
                      Settings
                    </span>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <span className="cursor-default hover:text-foreground transition-colors">Stats</span>
              <span className="cursor-default hover:text-foreground transition-colors">Analyzer</span>
              <span className="cursor-default hover:text-foreground transition-colors">Settings</span>
              <Link to="/about" className="hover:text-foreground transition-colors text-primary font-semibold">
                About Developer
              </Link>
            </div>

            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" title="Live Connection Ready" />

            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm">{user?.email}</p>
                      <p className="text-xs text-muted-foreground">Manage your account</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/auth')}
                className="gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
