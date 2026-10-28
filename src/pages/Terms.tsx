import { Link } from 'react-router-dom';
import { LegalPage, Section, List } from '@/components/LegalPage';

const CONTACT = '1lastfootball@gmail.com';

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      description="The terms you agree to when using LastFootball's website and app."
      path="/terms"
      updated="28 October 2026"
    >
      <Section title="The short version">
        <p>
          LastFootball shows football scores, fixtures, statistics and news. It
          is free, it is provided as-is, and the match data comes from a
          third-party provider, so it can be wrong or delayed. Do not rely on it
          for anything that matters financially. Be civil in the comments. That
          is most of it; the rest is below.
        </p>
      </Section>

      <Section title="What this covers">
        <p>
          These terms apply to lastfootball.com and to the LastFootball Android
          app, which share one account. By using either, you agree to them. If
          you do not, please do not use the service.
        </p>
        <p>
          LastFootball is operated from Kathmandu, Nepal.
        </p>
      </Section>

      <Section title="Accuracy of match data">
        <p>
          Scores, fixtures, line-ups, statistics and league tables come from a
          third-party football data provider. We pass through what they send.
          That means data can be delayed, incomplete, corrected after the fact,
          or simply wrong, particularly for smaller competitions.
        </p>
        <p className="text-foreground">
          Do not use LastFootball to make betting or financial decisions. We
          make no guarantee that anything shown is accurate or current, and we
          are not liable for losses arising from relying on it.
        </p>
        <p>
          Articles marked as automatically generated match reports are written
          by software from that same match data, without a human reading them
          first.
        </p>
      </Section>

      <Section title="Your account">
        <List
          items={[
            'You are responsible for what happens under your account, and for keeping your password to yourself.',
            'Give an email address you can actually receive mail at — password resets go there.',
            'One person, one account. Do not impersonate someone else.',
            'Tell us if you think someone else has got into your account.',
          ]}
        />
      </Section>

      <Section title="Comments and other things you post">
        <p>
          You keep ownership of what you write. By posting it, you give us
          permission to display it within the service.
        </p>
        <p>Do not post:</p>
        <List
          items={[
            'Abuse, harassment, threats, or attacks on someone’s race, religion, nationality or any similar characteristic.',
            'Spam, advertising, or links to malware or phishing.',
            'Someone else’s personal information.',
            'Anything unlawful where you are, or where we are.',
          ]}
        />
        <p>
          We can remove anything that breaks these rules and suspend accounts
          that keep doing it. We do not pre-moderate, so if you see something
          that should not be there, tell us.
        </p>
      </Section>

      <Section title="Using the service fairly">
        <p>
          You are welcome to read, follow teams and use the app as intended. You
          may not scrape the site or the API in bulk, resell or redistribute the
          match data, attempt to break into accounts or servers, or disrupt the
          service for other people.
        </p>
      </Section>

      <Section title="Who owns what">
        <p>
          The LastFootball name, design, written articles and software are ours.
          Club crests, league logos, competition names and player images belong
          to the clubs, leagues and rights holders they represent, and appear
          here to identify the teams and competitions being reported on.
          Underlying match data belongs to our data provider.
        </p>
        <p>
          If you believe something here infringes your rights, email us and we
          will look at it.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          The service is free and provided as-is. We do not promise it will be
          available without interruption, that features will stay the same, or
          that any particular competition will keep being covered. We may change
          or withdraw parts of it, and we may stop running it altogether.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the extent the law allows, LastFootball is not liable for indirect
          or consequential losses arising from your use of the service,
          including losses from inaccurate or delayed match data. Nothing here
          limits liability that cannot be limited by law.
        </p>
      </Section>

      <Section title="Ending it">
        <p>
          You can stop using LastFootball whenever you like, and ask us to
          delete your account — see the{' '}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{' '}
          for how. We may suspend or close an account that breaks these terms.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          These terms may change. The date at the top of the page changes with
          them, and significant changes will be announced in the app and on the
          site. Continuing to use the service after a change means accepting it.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of Nepal, and the courts of
          Kathmandu have jurisdiction over any dispute arising from them.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Anything about these terms goes to{' '}
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
