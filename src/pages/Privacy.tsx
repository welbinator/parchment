import PublicNav from '@/components/PublicNav';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold font-display mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: April 3, 2026</p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Overview</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Parchment is a personal note-taking app. We take privacy seriously and collect only what is necessary to provide the service. This policy covers both the Parchment web app at theparchment.app and the Parchment Chrome Extension.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Information We Collect</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li><strong className="text-foreground">Account information:</strong> Email address and display name when you sign up.</li>
            <li><strong className="text-foreground">Content you create:</strong> Collections, pages, and blocks you write in Parchment. This data is stored on our servers and is only accessible to you.</li>
            <li><strong className="text-foreground">API keys:</strong> If you generate API keys, those keys are stored securely and are associated with your account.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Chrome Extension</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            The Parchment Chrome Extension stores the following data locally on your device using Chrome's built-in storage:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li><strong className="text-foreground">Your Parchment API key:</strong> Stored locally on your device. Used only to send content to your own Parchment account. Never sent to our servers.</li>
            <li><strong className="text-foreground">Optional AI provider settings:</strong> If you configure an AI provider (OpenAI or Anthropic), your AI API key is stored locally on your device and is only used to make requests to that provider on your behalf.</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            The extension reads the content of the current tab only when you explicitly click the Save button. It does not track your browsing history, run in the background, or collect any data about your browsing activity.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">How We Use Your Information</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>To provide and operate the Parchment service</li>
            <li>To authenticate your account</li>
            <li>To store and retrieve your notes and collections</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            We do not sell your data. We do not share your data with third parties except as required to operate the service (e.g. our hosting provider).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Data Storage</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Parchment is self-hosted on a dedicated server. Your data is not stored with third-party cloud database providers. Backups are stored securely on the same server.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Data Deletion</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You can delete your account and all associated data at any time by contacting us at the email below. We will permanently delete your data within 30 days of your request.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Questions about this policy? Email us at{' '}
            <a href="mailto:james.welbes@gmail.com" className="text-primary underline">james.welbes@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
