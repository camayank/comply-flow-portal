import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Sparkles, 
  Zap,
  Star,
  Heart
} from 'lucide-react';

/**
 * Design System Showcase Component
 * Demonstrates the comprehensive design system capabilities
 */
const DesignSystemShowcase = () => {
  const [progress, setProgress] = useState(75);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen bg-background text-foreground transition-all duration-normal ${isDarkMode ? 'dark' : ''}`}>
      <div className="container-wide py-lg">
        {/* Header */}
        <div className="text-center mb-xl">
          <h1 className="text-4xl font-bold mb-md gradient-brand bg-clip-text text-transparent">
            Universal Design System
          </h1>
          <p className="text-responsive-lg text-muted-foreground mb-lg">
            Comprehensive design system with enhanced animations and interactions
          </p>
          
          <div className="flex justify-center gap-md mb-lg">
            <Button onClick={toggleDarkMode} variant="outline" className="interactive">
              {isDarkMode ? '☀️' : '🌙'} Toggle Theme
            </Button>
          </div>
        </div>

        {/* Color Palette Demo */}
        <section className="mb-2xl">
          <h2 className="text-2xl font-semibold mb-lg">Enhanced Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            <Card className="card-interactive">
              <CardContent className="p-md">
                <div className="w-full h-16 bg-primary rounded-md mb-sm"></div>
                <h3 className="font-medium text-sm">Primary</h3>
                <p className="text-xs text-muted-foreground">Brand color</p>
              </CardContent>
            </Card>
            
            <Card className="card-interactive">
              <CardContent className="p-md">
                <div className="w-full h-16 bg-success rounded-md mb-sm"></div>
                <h3 className="font-medium text-sm">Success</h3>
                <p className="text-xs text-muted-foreground">Positive actions</p>
              </CardContent>
            </Card>
            
            <Card className="card-interactive">
              <CardContent className="p-md">
                <div className="w-full h-16 bg-warning rounded-md mb-sm"></div>
                <h3 className="font-medium text-sm">Warning</h3>
                <p className="text-xs text-muted-foreground">Caution states</p>
              </CardContent>
            </Card>
            
            <Card className="card-interactive">
              <CardContent className="p-md">
                <div className="w-full h-16 bg-error rounded-md mb-sm"></div>
                <h3 className="font-medium text-sm">Error</h3>
                <p className="text-xs text-muted-foreground">Destructive actions</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Button Variants */}
        <section className="mb-2xl">
          <h2 className="text-2xl font-semibold mb-lg">Enhanced Button System</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Primary Buttons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-md">
                <Button className="w-full btn-gradient" data-testid="button-primary-gradient">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gradient Button
                </Button>
                <Button className="w-full shadow-brand" data-testid="button-primary-shadow">
                  <Zap className="h-4 w-4 mr-2" />
                  Shadow Button
                </Button>
                <Button className="w-full interactive" data-testid="button-primary-interactive">
                  <Star className="h-4 w-4 mr-2" />
                  Interactive Button
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">State Buttons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-md">
                <Button className="w-full bg-success hover:bg-success-hover" data-testid="button-success">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Success Action
                </Button>
                <Button className="w-full bg-warning hover:bg-warning-hover" data-testid="button-warning">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Warning Action
                </Button>
                <Button className="w-full bg-error hover:bg-error-hover" data-testid="button-error">
                  <XCircle className="h-4 w-4 mr-2" />
                  Error Action
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Outline Variants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-md">
                <Button variant="outline" className="w-full btn-outline-enhanced" data-testid="button-outline-enhanced">
                  Enhanced Outline
                </Button>
                <Button variant="outline" className="w-full border-success text-success hover:bg-success hover:text-success-foreground" data-testid="button-outline-success">
                  Success Outline
                </Button>
                <Button variant="ghost" className="w-full interactive-subtle" data-testid="button-ghost-interactive">
                  Ghost Interactive
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Status Indicators */}
        <section className="mb-2xl">
          <h2 className="text-2xl font-semibold mb-lg">Status Indicators & Badges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Cards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-md">
                <div className="p-md rounded-md status-success flex items-center gap-sm">
                  <CheckCircle className="h-5 w-5" />
                  <span>Success Status</span>
                </div>
                <div className="p-md rounded-md status-warning flex items-center gap-sm">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Warning Status</span>
                </div>
                <div className="p-md rounded-md status-error flex items-center gap-sm">
                  <XCircle className="h-5 w-5" />
                  <span>Error Status</span>
                </div>
                <div className="p-md rounded-md status-info flex items-center gap-sm">
                  <Info className="h-5 w-5" />
                  <span>Info Status</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enhanced Badges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-md">
                <div className="flex flex-wrap gap-sm">
                  <Badge className="bg-success text-success-foreground">Success Badge</Badge>
                  <Badge className="bg-warning text-warning-foreground">Warning Badge</Badge>
                  <Badge className="bg-error text-error-foreground">Error Badge</Badge>
                  <Badge variant="outline" className="border-primary text-primary">Primary Outline</Badge>
                </div>
                <div className="flex flex-wrap gap-sm">
                  <Badge className="animate-pulse-subtle bg-primary">Animated</Badge>
                  <Badge className="interactive bg-secondary">Interactive</Badge>
                  <Badge className="gradient-brand text-white">Gradient</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Animation Showcase */}
        <section className="mb-2xl">
          <h2 className="text-2xl font-semibold mb-lg">Animation System</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">Fade In</CardTitle>
                <CardDescription>Smooth entrance animation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-20 bg-gradient-to-r from-primary to-primary-hover rounded-md animate-fade-in"></div>
              </CardContent>
            </Card>

            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="text-lg">Slide Up</CardTitle>
                <CardDescription>Upward slide transition</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-20 gradient-success rounded-md animate-slide-up"></div>
              </CardContent>
            </Card>

            <Card className="animate-scale-in">
              <CardHeader>
                <CardTitle className="text-lg">Scale In</CardTitle>
                <CardDescription>Scale entrance animation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-20 gradient-warning rounded-md animate-scale-in"></div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Interactive Elements */}
        <section className="mb-2xl">
          <h2 className="text-2xl font-semibold mb-lg">Interactive Elements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <Card className="card-gradient">
              <CardHeader>
                <CardTitle className="text-lg">Progress Tracking</CardTitle>
                <CardDescription>Enhanced progress indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-md">
                <div>
                  <div className="flex justify-between mb-sm">
                    <span className="text-sm">Completion</span>
                    <span className="text-sm font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                <div className="flex gap-sm">
                  <Button 
                    size="sm" 
                    onClick={() => setProgress(Math.max(0, progress - 10))}
                    className="interactive"
                    data-testid="button-decrease-progress"
                  >
                    Decrease
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                    className="interactive"
                    data-testid="button-increase-progress"
                  >
                    Increase
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-sm">
                  <Heart className="h-5 w-5 text-error animate-pulse-subtle" />
                  Glass Morphism
                </CardTitle>
                <CardDescription>Modern glassmorphism effects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-md glass rounded-lg">
                  <p className="text-sm">
                    This card demonstrates the new glass morphism utility classes
                    with backdrop blur and transparency effects.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Typography System */}
        <section className="mb-2xl">
          <h2 className="text-2xl font-semibold mb-lg">Typography System</h2>
          <Card>
            <CardContent className="p-lg space-y-md">
              <div className="text-responsive-xl font-bold">Responsive Extra Large</div>
              <div className="text-responsive-lg font-semibold">Responsive Large</div>
              <div className="text-responsive-base font-medium">Responsive Base</div>
              <div className="text-responsive-sm font-normal">Responsive Small</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                The typography system includes responsive scaling, proper line heights,
                and semantic font weights for optimal readability across all devices.
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Performance Features */}
        <section className="mb-2xl">
          <h2 className="text-2xl font-semibold mb-lg">Performance Optimizations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">GPU Acceleration</CardTitle>
                <CardDescription>Hardware-accelerated animations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="gpu-accelerated p-md bg-primary/10 rounded-md transition-transform hover:scale-105">
                  GPU-accelerated element with smooth transforms
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Optimized Text</CardTitle>
                <CardDescription>Enhanced text rendering</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="optimize-text">
                  <p>This text uses optimized rendering for better performance and readability.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-xl border-t border-border">
          <p className="text-muted-foreground">
            Universal Design System • Enhanced with animations, interactions, and performance optimizations
          </p>
        </footer>
      </div>
    </div>
  );
};

export default DesignSystemShowcase;