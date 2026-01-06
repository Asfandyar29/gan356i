import { Link } from 'react-router-dom';

const NavBar = () => {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-background/70 border-b border-border shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <img src="/logo.png" alt="GAN Logo" className="w-8 h-8 rounded-md" />
                            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent hidden sm:block">
                                GAN Tracker
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                            <span className="cursor-default hover:text-foreground transition-colors">Stats</span>
                            <span className="cursor-default hover:text-foreground transition-colors">Analyzer</span>
                            <span className="cursor-default hover:text-foreground transition-colors">Settings</span>
                        </div>
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse ml-2" title="Live Connection Ready" />
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
