import { motion } from 'framer-motion';
import {
  Smartphone,
  ShoppingBag,
  BookOpen,
  Bell,
  MapPin,
  Heart,
} from 'lucide-react';

const mobileFeatures = [
  { icon: ShoppingBag, label: 'Browse & order from local food businesses' },
  { icon: BookOpen, label: 'Discover recipes from your favorite creators' },
  { icon: Bell, label: 'Get notified about new products & specials' },
  { icon: MapPin, label: 'Find farms, restaurants & markets near you' },
  { icon: Heart, label: 'Save favorites and build your food network' },
];

export function AppDownloadSection() {
  return (
    <section id="download" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-accent/6 blur-[120px]" />
        <div className="absolute left-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Mobile App
            </span>
            <h2 className="mt-3 font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Take KitchenSync{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                }}
              >
                Everywhere
              </span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              The KitchenSync iOS app puts the entire food ecosystem in your pocket.
              Customers can discover local businesses, browse menus, order products,
              and connect with the food community — all from their phone.
            </p>

            {/* Feature list */}
            <ul className="mt-8 space-y-4">
              {mobileFeatures.map((feature, index) => (
                <motion.li
                  key={feature.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{feature.label}</span>
                </motion.li>
              ))}
            </ul>

            {/* App Store button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8"
            >
              <a
                href="https://apps.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] leading-none opacity-70">Download on the</div>
                  <div className="text-base font-semibold leading-tight">App Store</div>
                </div>
              </a>
            </motion.div>
          </motion.div>

          {/* Right: Phone mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Glow behind phone */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 rounded-[3rem] blur-3xl scale-110" />

              {/* Phone frame */}
              <div className="relative w-[280px] sm:w-[300px] h-[560px] sm:h-[600px] rounded-[2.5rem] border-2 border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl overflow-hidden">
                {/* Status bar */}
                <div className="flex items-center justify-between px-6 pt-4 pb-2">
                  <span className="text-[10px] text-muted-foreground font-medium">9:41</span>
                  <div className="w-20 h-5 rounded-full bg-foreground/10" />
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-2 rounded-sm bg-muted-foreground/40" />
                  </div>
                </div>

                {/* App content mockup */}
                <div className="px-5 pt-4 space-y-4">
                  {/* App header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-foreground font-syne">Discover</div>
                      <div className="text-xs text-muted-foreground">Near Portland, OR</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                  </div>

                  {/* Search bar */}
                  <div className="h-10 rounded-xl bg-secondary/80 border border-border/50 flex items-center px-3">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                    <span className="text-xs text-muted-foreground">Search restaurants, farms...</span>
                  </div>

                  {/* Category pills */}
                  <div className="flex gap-2 overflow-hidden">
                    {['All', 'Restaurants', 'Farms', 'Markets'].map((cat, i) => (
                      <div
                        key={cat}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                          i === 0
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/80 text-muted-foreground border border-border/50'
                        }`}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>

                  {/* Food business cards */}
                  {[
                    { name: 'Sunrise Farm', type: 'Farm Stand', color: 'bg-emerald-500/20' },
                    { name: 'The Local Kitchen', type: 'Restaurant', color: 'bg-amber-500/20' },
                    { name: 'Harbor Market', type: 'Farmers Market', color: 'bg-sky-500/20' },
                  ].map((biz) => (
                    <div
                      key={biz.name}
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/30"
                    >
                      <div className={`w-10 h-10 rounded-lg ${biz.color} flex items-center justify-center`}>
                        <Store className="h-5 w-5 text-foreground/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">{biz.name}</div>
                        <div className="text-[10px] text-muted-foreground">{biz.type}</div>
                      </div>
                      <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  ))}
                </div>

                {/* Bottom nav */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-card/90 backdrop-blur-sm border-t border-border/30 flex items-center justify-around px-4">
                  {['Home', 'Search', 'Orders', 'Profile'].map((tab, i) => (
                    <div key={tab} className="flex flex-col items-center gap-0.5">
                      <div
                        className={`w-5 h-5 rounded-full ${
                          i === 0 ? 'bg-primary/20' : 'bg-transparent'
                        } flex items-center justify-center`}
                      >
                        <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                      </div>
                      <span className={`text-[8px] ${i === 0 ? 'text-primary' : 'text-muted-foreground/60'}`}>
                        {tab}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Small helper component used in the phone mockup
function Store(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
    </svg>
  );
}
