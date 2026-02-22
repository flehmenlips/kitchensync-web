import { Link } from 'react-router-dom';
import { ChefHat, ArrowLeft, Shield } from 'lucide-react';
import { FooterSection } from '@/components/landing/FooterSection';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ChefHat className="h-5 w-5 text-primary" />
              </div>
              <span className="font-syne text-lg font-bold text-foreground">
                cook.book
              </span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">Last Updated: February 2, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <Section title="Introduction">
            <p>
              cook.book ("we," "our," or "us") is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our mobile application and web platform.
            </p>
          </Section>

          <Section title="Information We Collect">
            <ul>
              <li>
                <strong>Account Information:</strong> When you create an account, we collect your
                email address and any profile information you choose to provide (such as your
                kitchen name).
              </li>
              <li>
                <strong>Recipe Data:</strong> We store the recipes you create, import, or save,
                including ingredients, instructions, notes, and images.
              </li>
              <li>
                <strong>Usage Data:</strong> We may collect information about how you interact with
                the app, such as features used and time spent in the app.
              </li>
              <li>
                <strong>Device Information:</strong> We may collect device identifiers and operating
                system information to improve app performance.
              </li>
            </ul>
          </Section>

          <Section title="How We Use Your Information">
            <ul>
              <li>To provide and maintain the cook.book service</li>
              <li>To sync your recipes and data across your devices</li>
              <li>To improve and personalize your experience</li>
              <li>To communicate with you about updates or support</li>
              <li>To ensure the security of your account</li>
            </ul>
          </Section>

          <Section title="Data Storage and Security">
            <p>
              Your data is stored securely using industry-standard encryption. We use Supabase as
              our backend service provider, which employs robust security measures to protect your
              information. Your recipes and personal data are accessible only to you unless you
              choose to share them.
            </p>
          </Section>

          <Section title="Data Sharing">
            <p>
              We do not sell your personal information. We may share your information only in the
              following circumstances:
            </p>
            <ul>
              <li>
                With service providers who assist in operating our app (under strict confidentiality
                agreements)
              </li>
              <li>If required by law or to protect our legal rights</li>
              <li>In connection with a merger or acquisition (with notice to you)</li>
            </ul>
          </Section>

          <Section title="Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Export your recipes</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </Section>

          <Section title="Children's Privacy">
            <p>
              cook.book is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13.
            </p>
          </Section>

          <Section title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on our website and in the app, and updating the
              "Last Updated" date.
            </p>
          </Section>

          <Section title="Contact Us">
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact
              us at:{' '}
              <a
                href="mailto:george@seabreeze.farm"
                className="text-primary hover:underline"
              >
                george@seabreeze.farm
              </a>
            </p>
          </Section>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default PrivacyPolicyPage;
