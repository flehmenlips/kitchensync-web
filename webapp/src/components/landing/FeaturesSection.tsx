import { motion } from 'framer-motion';
import {
  ShoppingBag,
  CalendarCheck,
  UtensilsCrossed,
  ClipboardList,
  Users,
  Store,
  BarChart3,
  UserPlus,
} from 'lucide-react';

const features = [
  {
    icon: ShoppingBag,
    title: 'Sell Products & Items',
    description:
      'List your products, set pricing, and let customers order directly from your business. Perfect for farm stands, food producers, and artisan goods.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
  {
    icon: UtensilsCrossed,
    title: 'Menu Management',
    description:
      'Build and manage your full menu with categories, modifiers, dietary info, photos, and real-time availability updates.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
  {
    icon: CalendarCheck,
    title: 'Reservation System',
    description:
      'Accept and manage table reservations with smart capacity management, waitlists, and automated confirmations for restaurants and cafes.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
  },
  {
    icon: ClipboardList,
    title: 'Recipes, Prep Lists & To-Dos',
    description:
      'Organize your recipes, create daily prep checklists, and manage tasks across your team. Keep your kitchen running like clockwork.',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/20',
  },
  {
    icon: Users,
    title: 'Connect with Foodies',
    description:
      'Build a community around your food. Engage with local foodies, share behind-the-scenes content, and grow your customer base organically.',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/20',
  },
  {
    icon: Store,
    title: 'Business Listing & Profile',
    description:
      'Create a rich business profile with photos, hours, location, story, and more. Get discovered by food lovers in your area.',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
    border: 'border-sky-400/20',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description:
      'Track sales, reservations, customer trends, and popular items. Make data-driven decisions to grow your food business.',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
  },
  {
    icon: UserPlus,
    title: 'Team Management',
    description:
      'Invite your staff, assign roles, and collaborate on orders, reservations, and daily operations from one shared dashboard.',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Features
          </span>
          <h2 className="mt-3 font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
            Built for Every Food Business
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you run a restaurant, farm stand, food truck, or catering company —
            KitchenSync gives you the tools to manage, sell, and grow.
          </p>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className={`group relative rounded-xl border ${feature.border} bg-card/50 p-6 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-black/10`}
            >
              <div
                className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}
              >
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="font-syne font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
