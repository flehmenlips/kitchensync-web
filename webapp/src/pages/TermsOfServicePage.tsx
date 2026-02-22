import { Link } from 'react-router-dom';
import { ChefHat, ArrowLeft, FileText } from 'lucide-react';
import { FooterSection } from '@/components/landing/FooterSection';

export function TermsOfServicePage() {
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
          <FileText className="h-7 w-7 text-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Terms of Service</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">Last Updated: February 2, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <Section title="Agreement to Terms">
            <p>
              By downloading, installing, or using cook.book ("the App"), you agree to be bound by
              these Terms of Service ("Terms"). If you do not agree to these Terms, please do not
              use the App.
            </p>
          </Section>

          <Section title="Description of Service">
            <p>cook.book is a social culinary platform that allows you to:</p>
            <ul>
              <li>Create, store, and organize recipes</li>
              <li>Import recipes from various sources</li>
              <li>Sync recipes across your devices</li>
              <li>Scale ingredients and convert measurements</li>
              <li>Create shopping lists and meal plans</li>
              <li>Share recipes and posts with the community</li>
              <li>Discover local restaurants, farms, and food businesses</li>
              <li>Make reservations and order food</li>
            </ul>
          </Section>

          <Section title="User Accounts">
            <p>
              To use certain features of the App, you must create an account. You agree to:
            </p>
            <ul>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </Section>

          <Section title="Your Content">
            <p>
              You retain ownership of all recipes and content you create in the App ("Your
              Content"). By using the App, you grant us a limited license to store and display Your
              Content solely for the purpose of providing the service to you.
            </p>
            <p>
              You are responsible for ensuring that Your Content does not violate any third-party
              rights or applicable laws. We do not claim ownership over your recipes.
            </p>
          </Section>

          <Section title="Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the App for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the App's functionality</li>
              <li>Upload malicious content or software</li>
              <li>Violate the intellectual property rights of others</li>
            </ul>
          </Section>

          <Section title="Subscriptions and Payments">
            <p>Some features may require a paid subscription. Subscription terms:</p>
            <ul>
              <li>Subscriptions auto-renew unless canceled before the renewal date</li>
              <li>
                Prices may change with notice; existing subscriptions are honored until renewal
              </li>
              <li>Refunds are handled according to Apple App Store and Google Play policies</li>
              <li>You can manage subscriptions in your device settings</li>
            </ul>
          </Section>

          <Section title="Intellectual Property">
            <p>
              The App, including its design, features, and branding, is owned by cook.book and
              protected by intellectual property laws. You may not copy, modify, or distribute any
              part of the App without our written permission.
            </p>
          </Section>

          <Section title="Disclaimer of Warranties">
            <p>
              The App is provided "as is" without warranties of any kind. We do not guarantee that
              the App will be error-free or uninterrupted. Recipe information, including nutritional
              data, is provided for convenience and should not be relied upon for dietary or medical
              decisions.
            </p>
          </Section>

          <Section title="Limitation of Liability">
            <p>
              To the maximum extent permitted by law, cook.book shall not be liable for any
              indirect, incidental, special, or consequential damages arising from your use of the
              App, including loss of data or recipes.
            </p>
          </Section>

          <Section title="Account Termination">
            <p>
              We may suspend or terminate your account if you violate these Terms. You may delete
              your account at any time through the App settings. Upon termination, your data will be
              deleted in accordance with our Privacy Policy.
            </p>
          </Section>

          <Section title="Changes to Terms">
            <p>
              We may update these Terms from time to time. Continued use of the App after changes
              constitutes acceptance of the new Terms. We will notify you of significant changes
              through the App and on our website.
            </p>
          </Section>

          <Section title="Governing Law">
            <p>
              These Terms are governed by the laws of the jurisdiction in which cook.book operates,
              without regard to conflict of law principles.
            </p>
          </Section>

          <Section title="Contact Us">
            <p>
              If you have questions about these Terms of Service, please contact us at:{' '}
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

export default TermsOfServicePage;
