import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { UserPlus, Settings, Rocket, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Create Your Account',
    description:
      'Sign up for free in under a minute. No credit card needed — just your email and a password to get started.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    borderColor: 'border-primary/30',
    glowColor: 'shadow-primary/10',
  },
  {
    number: '02',
    icon: Settings,
    title: 'Set Up Your Business',
    description:
      'Add your business details, upload your menu or product catalog, set your hours, and customize your public profile.',
    color: 'text-accent',
    bg: 'bg-accent/10',
    borderColor: 'border-accent/30',
    glowColor: 'shadow-accent/10',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Start Selling & Growing',
    description:
      'Go live on the KitchenSync platform. Accept orders, manage reservations, connect with customers, and track everything from your dashboard.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/30',
    glowColor: 'shadow-emerald-400/10',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32">
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[300px] w-[300px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            How It Works
          </span>
          <h2 className="mt-3 font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
            Up and Running in Minutes
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Getting your food business on KitchenSync is simple. Three steps and you're live.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className={`relative rounded-xl border ${step.borderColor} bg-card/60 p-8 hover:shadow-xl ${step.glowColor} transition-all duration-300`}
            >
              {/* Step number */}
              <span className="font-syne text-5xl font-bold text-foreground/5 absolute top-4 right-6">
                {step.number}
              </span>

              <div
                className={`w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center mb-5`}
              >
                <step.icon className={`h-6 w-6 ${step.color}`} />
              </div>

              <h3 className="font-syne text-xl font-bold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {/* Connector line (desktop) */}
              {index < steps.length - 1 ? (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t border-dashed border-border/50" />
              ) : null}
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Button
            size="lg"
            className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link to="/business/signup">
              Create Your Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
