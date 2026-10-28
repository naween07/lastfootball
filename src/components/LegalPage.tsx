import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';

/// Shared shell for the privacy policy and terms pages.
///
/// These are long-form prose, which nothing else on the site is -- every other
/// page is cards, tables and scores. Rather than let each one invent its own
/// measure and spacing, both render through here: one column capped at a
/// comfortable reading width, and one set of heading and list styles.
export function LegalPage({
  title,
  description,
  path,
  updated,
  children,
}: {
  title: string;
  description: string;
  path: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={title} description={description} path={path} />
      <Header />
      <main className="container max-w-3xl py-10 pb-28">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {updated}
        </p>

        <div className="mt-8 space-y-8">{children}</div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link to="/" className="text-primary hover:underline">
            Back to LastFootball
          </Link>
          <Link
            to={path === '/privacy' ? '/terms' : '/privacy'}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {path === '/privacy' ? 'Terms of Service' : 'Privacy Policy'}
          </Link>
        </div>
      </main>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-5 list-disc marker:text-primary">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
