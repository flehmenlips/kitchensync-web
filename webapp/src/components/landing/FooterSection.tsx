import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';

export function FooterSection() {
  return (
    <footer className="border-t border-border/40 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <ChefHat className="h-5 w-5 text-primary" />
              </div>
              <span className="font-syne text-lg font-bold text-foreground">
                KitchenSync
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The all-in-one platform for food businesses to sell, manage, and grow.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">Platform</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'Download App', href: '#download' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Businesses */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">For Businesses</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/business/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/business/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Business Login
                </Link>
              </li>
              <li>
                <Link to="/business/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Register Business
                </Link>
              </li>
            </ul>
          </div>

          {/* Business Types */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">Who It's For</h4>
            <ul className="space-y-2.5">
              {['Restaurants', 'Farms & Farm Stands', 'Food Trucks', 'Cafes', 'Catering', 'Food Producers'].map(
                (item) => (
                  <li key={item}>
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} KitchenSync. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
