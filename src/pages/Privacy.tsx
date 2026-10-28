import { LegalPage, Section, List } from '@/components/LegalPage';

const CONTACT = '1lastfootball@gmail.com';

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="What LastFootball collects, why, who it is shared with, and how to have it deleted."
      path="/privacy"
      updated="28 October 2026"
    >
      <Section title="Who we are">
        <p>
          LastFootball is a football live scores, fixtures, statistics and news
          service, available at lastfootball.com and as an Android app. It is
          operated from Kathmandu, Nepal. This policy covers both the website
          and the app, which share one account and one database.
        </p>
        <p>
          You can read scores, fixtures, statistics and news without an account.
          Everything in the next section applies only once you create one.
        </p>
      </Section>

      <Section title="What we collect">
        <p>When you create an account, we store:</p>
        <List
          items={[
            'Your email address.',
            'A display name, if you set one.',
            'Your password, stored only as a bcrypt hash. We never store or see the password itself.',
          ]}
        />
        <p>
          If you sign in with Google instead, Google gives us your email
          address, your name and your profile picture, and we store those. We do
          not receive your Google password, and we have no access to anything
          else in your Google account.
        </p>
        <p>As you use the service, we also store:</p>
        <List
          items={[
            'A profile picture, if you upload one.',
            'The teams, leagues and players you follow, and whether you have notifications switched on for each.',
            'Comments you post on articles, and articles you like.',
            'Notifications generated for you, and whether you have seen them.',
            'When your account was created and last updated.',
          ]}
        />
      </Section>

      <Section title="What stays on your device">
        <p>
          Some things never reach our servers. They are stored on your phone or
          in your browser and are cleared when you sign out, clear the app's
          data, or clear your browser storage:
        </p>
        <List
          items={[
            'Your signed-in session, so you do not have to sign in on every launch.',
            'Whether you prefer the light or dark theme.',
            'Recently loaded match data, so screens you have already opened appear immediately.',
          ]}
        />
      </Section>

      <Section title="What is collected automatically">
        <List
          items={[
            <>
              <span className="text-foreground">On the website:</span> Google
              Analytics records which pages are visited, roughly where in the
              world visitors are, and what browser and device they use. It is
              used to understand which parts of the site people actually read.
              It does not tell us who you are.
            </>,
            <>
              <span className="text-foreground">In the app:</span> OneSignal, our
              push notification provider, assigns your installation an
              identifier so a notification can be delivered to it. If you deny
              or switch off notification permission, no identifier is created
              and no notifications are sent.
            </>,
            <>
              <span className="text-foreground">On our server:</span> ordinary
              web server logs, which include IP addresses and the requests made.
              These are used for diagnosing faults and abuse.
            </>,
          ]}
        />
      </Section>

      <Section title="What we do not collect">
        <p>
          We do not collect your location, we do not access your camera or
          contacts, and we do not ask for or process payment details — there is
          nothing to pay for. The app requests permission to read your photos
          only at the moment you choose a profile picture, and only the picture
          you pick is uploaded.
        </p>
        <p>
          We do not sell your data, and we do not share it with advertisers.
        </p>
      </Section>

      <Section title="Who else is involved">
        <p>
          Running the service means relying on a small number of other
          companies. Each receives only what it needs to do its job:
        </p>
        <List
          items={[
            <>
              <span className="text-foreground">API-Football</span> supplies all
              match, fixture, team and player data. Nothing about you is sent to
              them — we request football data, not anything tied to your account.
            </>,
            <>
              <span className="text-foreground">Google</span> handles sign-in if
              you choose it, and provides the analytics on the website.
            </>,
            <>
              <span className="text-foreground">OneSignal</span> delivers push
              notifications to the app.
            </>,
            <>
              <span className="text-foreground">Our hosting provider</span>{' '}
              stores the database and uploaded images on servers we control.
            </>,
          ]}
        />
      </Section>

      <Section title="How long we keep it">
        <p>
          Account data is kept for as long as the account exists. If you ask us
          to delete your account, we remove your email address, display name,
          password hash, profile picture, follows and notifications. Comments
          you have posted are removed along with the account.
        </p>
        <p>
          Server logs and analytics are retained for a limited period and are
          not tied to your account.
        </p>
      </Section>

      <Section title="Your choices">
        <List
          items={[
            'You can read everything on the site and in the app without an account at all.',
            'You can change your display name and profile picture at any time, and change your password from within the app.',
            'You can turn notifications off per team or entirely, in the app or in your device settings.',
            <>
              You can ask for a copy of what we hold about you, ask us to
              correct it, or ask us to delete your account. Email{' '}
              <a
                href={`mailto:${CONTACT}`}
                className="text-primary hover:underline"
              >
                {CONTACT}
              </a>{' '}
              from the address on the account and we will action it.
            </>,
            'You can opt out of website analytics using your browser’s do-not-track or content-blocking settings.',
          ]}
        />
      </Section>

      <Section title="Security">
        <p>
          Passwords are hashed with bcrypt before they are stored, so they
          cannot be read back — not by us and not by anyone who obtained the
          database. All traffic between your device and our servers uses HTTPS.
        </p>
        <p>
          No service can promise it will never be breached. If a breach ever
          affects your account, we will tell you.
        </p>
      </Section>

      <Section title="Children">
        <p>
          LastFootball is not directed at children under 13, and we do not
          knowingly create accounts for them. If you believe a child has created
          an account, contact us and we will remove it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If this policy changes, the date at the top of the page changes with
          it. Where a change materially affects what we collect or who we share
          it with, we will say so in the app and on the site rather than relying
          on you to notice.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy, or about your data, go to{' '}
          <a
            href={`mailto:${CONTACT}`}
            className="text-primary hover:underline"
          >
            {CONTACT}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
