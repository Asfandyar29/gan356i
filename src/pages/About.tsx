import { ArrowLeft, Github, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useState } from 'react';

const About = () => {
    const [glowColor, setGlowColor] = useState('rgba(255,255,255,0.1)');

    const rubiksColors = [
        'rgba(220, 38, 38, 0.8)',   // Red
        'rgba(22, 163, 74, 0.8)',   // Green
        'rgba(37, 99, 235, 0.8)',   // Blue
        'rgba(255, 255, 255, 0.8)', // White
        'rgba(249, 115, 22, 0.8)',  // Orange
    ];

    const handleMouseEnter = () => {
        const randomColor = rubiksColors[Math.floor(Math.random() * rubiksColors.length)];
        setGlowColor(randomColor);
    };

    return (
        <div className="min-h-screen w-full relative bg-background text-foreground flex flex-col selection:bg-primary/20">
            <NavBar />

            <main className="flex-1 container max-w-5xl mx-auto px-4 py-8 md:py-12 animate-fade-in">
                {/* Back Link */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Tracker
                </Link>

                {/* Hero Section */}
                <div className="grid md:grid-cols-[auto,1fr] gap-8 items-center mb-16">
                    <div className="relative group w-48 h-48 mx-auto md:mx-0 shrink-0">
                        <div
                            className="absolute inset-0 rounded-full blur-xl transition-all duration-300 opacity-60 group-hover:opacity-100"
                            style={{ boxShadow: `0 0 20px 5px ${glowColor}` }}
                        />
                        <div
                            className="relative w-full h-full overflow-hidden rounded-full border-2 border-white/20 shadow-2xl transition-transform duration-500 group-hover:scale-105"
                            onMouseEnter={handleMouseEnter}
                            style={{ boxShadow: `0 0 30px ${glowColor}` }}
                        >
                            <img
                                src="/developer.jpg"
                                alt="Asfandyar Khan"
                                className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                            />
                        </div>
                    </div>

                    <div className="space-y-6 text-center md:text-left">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Asfandyar Khan</h1>
                            <p className="text-xl text-muted-foreground font-medium">Computer Systems Engineer</p>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            <Badge variant="secondary" className="px-3 py-1">Full Stack Developer</Badge>
                            <Badge variant="secondary" className="px-3 py-1">AI/ML Engineer</Badge>
                            <Badge variant="secondary" className="px-3 py-1">Cubing Enthusiast</Badge>
                        </div>

                        <div className="space-y-4 text-lg leading-relaxed text-muted-foreground/90">
                            <p>
                                Hi! 👋 I’m the developer behind this Bluetooth-enabled Rubik’s Cube tracking app — a project built from a genuine love for cubing, engineering, and intelligent problem-solving.
                            </p>
                            <p>
                                My enthusiasm for the Rubik’s Cube goes far beyond solving it quickly. What fascinates me most is the mathematics, spatial reasoning, and optimization hidden inside every solve.
                            </p>
                        </div>

                        <div className="pt-4 flex gap-4 justify-center md:justify-start">
                            <Button asChild variant="outline" size="icon" className="rounded-full">
                                <a href="https://github.com/Asfandyar29" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                                    <Github className="w-5 h-5" />
                                </a>
                            </Button>
                            <Button asChild variant="outline" size="icon" className="rounded-full">
                                <a href="https://www.linkedin.com/in/asfandyar-khan-4821191a4/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                                    <Linkedin className="w-5 h-5" />
                                </a>
                            </Button>
                            <Button asChild variant="outline" size="icon" className="rounded-full">
                                <a href="mailto:asfandyar29@gmail.com" aria-label="Email">
                                    <Mail className="w-5 h-5" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content Blocks */}
                <div className="grid gap-8 md:grid-cols-2">

                    <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-xl md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <span className="text-4xl">🧩</span> A Cube Fact That Says It All
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-muted-foreground leading-relaxed text-lg">
                            <p>
                                A standard 3×3 Rubik’s Cube has over <span className="text-primary font-bold">43 quintillion</span> possible combinations, yet every one of them can be solved in 20 moves or fewer. This idea — known as <strong>God’s Number</strong> — perfectly represents how structure, logic, and the right approach can tame overwhelming complexity. That philosophy heavily influenced how this app was designed.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                        <CardHeader>
                            <CardTitle className="text-xl text-primary">What Makes This App Different</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground">
                            <p>
                                This is currently the only app designed to track the full <strong>3D gyroscopic movement</strong> of your actual GAN 356 series smart cube.
                            </p>
                            <ul className="space-y-2 list-disc list-inside marker:text-primary">
                                <li>Real-time gyroscopic and orientation data</li>
                                <li>True 3D movement during solves</li>
                                <li>Accurate representation of physical manipulation</li>
                            </ul>
                            <p>
                                This allows for deeper analysis and a far more realistic understanding of your solving style compared to traditional trackers.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl text-primary">Engineering Background</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground">
                            <p>
                                I’m a Computer Systems Engineering graduate from <strong>UET Peshawar</strong>, with a solid foundation in software development, data analysis, and AI-driven systems.
                            </p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex gap-2">
                                    <span className="text-primary">•</span>
                                    <span>Building ML/DL pipelines with Python, TensorFlow, PyTorch</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-primary">•</span>
                                    <span>AI-based CT scan analysis (Final Year Project)</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-primary">•</span>
                                    <span>ML Intern at National Center of Artificial Intelligence (NCAI)</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-primary">•</span>
                                    <span>IT Internship at National Bank of Pakistan</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-xl md:col-span-2 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <CardHeader>
                            <CardTitle className="text-2xl">The Vision</CardTitle>
                        </CardHeader>
                        <CardContent className="text-muted-foreground leading-relaxed relative z-10">
                            <p className="mb-4">
                                This app is built for cubers who want more than basic stats. It’s for those who care about <em>how</em> they solve, not just how fast. By combining smart hardware, 3D motion tracking, and thoughtful engineering, the goal is to push cubing analytics to the next level.
                            </p>
                            <p className="text-lg font-medium text-foreground italic border-l-4 border-primary pl-4 py-1 bg-white/5 rounded-r-lg">
                                "An engineer who loves understanding systems — especially the ones that twist, turn, and challenge the mind."
                            </p>
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    );
};

export default About;
