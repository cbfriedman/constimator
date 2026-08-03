import { LegalPageLayout } from "@/components/legal/legal-page-layout"

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="August 3, 2026">
      <p>
        This Privacy Policy describes how Constimator (&quot;we,&quot; &quot;us,&quot; or
        &quot;our&quot;) collects, uses, and shares information when you use our
        construction estimating platform (the &quot;Service&quot;). It&apos;s written to
        describe what actually happens with your data, in plain language —
        see our <a href="/terms">Terms of Service</a> for the rest of the
        legal terms governing your use of the Service.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We collect:</p>
      <ul>
        <li>
          <strong>Account information</strong> — your name, email address,
          and organization membership, managed through our authentication
          provider (Supabase Auth). If you sign up with Google, we receive
          the basic profile information Google shares for authentication.
        </li>
        <li>
          <strong>Uploaded documents</strong> — the plan sets,
          specifications, addenda, and official bid forms (PDFs) you or
          your teammates upload.
        </li>
        <li>
          <strong>Bid and estimate data</strong> — the official bid form&apos;s
          line items as entered (by you or extracted by our AI pipeline),
          your own estimate quantities and pricing, and the reconciliation
          results comparing the two.
        </li>
        <li>
          <strong>Company defaults</strong> — labor and equipment rates and
          markup you configure for your organization.
        </li>
        <li>
          <strong>AI processing records</strong> — for documents submitted
          for AI extraction: the extracted results, any error messages, and
          a log of token usage per call (this log is counts and estimated
          cost only — it does not contain your document content).
        </li>
        <li>
          <strong>Payment information</strong> — handled entirely by
          Stripe, our payment processor. We do not receive or store your
          full card number; we retain only what Stripe provides for
          billing purposes (like subscription status and invoice history).
        </li>
        <li>
          <strong>Usage and diagnostic data</strong> — standard technical
          logs (timestamps, error messages, request metadata) generated as
          you use the Service, used for security, debugging, and
          reliability.
        </li>
        <li>
          <strong>Product analytics</strong> — which pages you visit and
          when you complete core actions (like creating a project,
          uploading a document, or running a reconciliation), so we can
          understand how the Service is actually used and prioritize what
          to build next. This is tied to your account, not to your
          uploaded document content or bid/estimate data.
        </li>
      </ul>

      <h2>2. How We Use Information</h2>
      <p>We use the information above to:</p>
      <ul>
        <li>Provide the Service — store your projects, run AI extraction, compute reconciliation results, and generate reports;</li>
        <li>Operate your subscription and process payments;</li>
        <li>Communicate with you about your account, invites, and material changes to the Service or these policies;</li>
        <li>Monitor, secure, and improve the reliability of the Service (error tracking, abuse prevention, uptime monitoring); and</li>
        <li>Comply with legal obligations.</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your information, and we do{" "}
        <strong>not</strong> use your uploaded documents or bid/estimate
        data to train AI models — ours or a third party&apos;s.
      </p>

      <h2>3. AI Processing</h2>
      <p>
        When you submit a document for AI extraction, its contents
        (rendered as images of each page) are sent to our AI provider,
        currently <strong>Anthropic</strong>, to extract structured line
        items and quantities. Anthropic processes this content to return
        the extraction result to us; see{" "}
        <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer">
          Anthropic&apos;s privacy policy
        </a>{" "}
        for how they handle data submitted through their API. We do not
        send your account credentials, payment information, or company
        rate data to Anthropic — only the document content necessary for
        extraction.
      </p>

      <h2>4. Who We Share Information With</h2>
      <p>
        We share information only with the service providers necessary to
        run Constimator, each acting on our behalf and bound by their own
        confidentiality and data-protection obligations:
      </p>
      <ul>
        <li><strong>Supabase</strong> — database, file storage, and authentication.</li>
        <li><strong>Anthropic</strong> — AI-based document extraction (Section 3).</li>
        <li><strong>Stripe</strong> — subscription billing and payment processing.</li>
        <li><strong>Railway</strong> — hosts the background worker that processes uploaded documents.</li>
        <li><strong>Sentry</strong> — error tracking, so we can find and fix bugs.</li>
        <li><strong>Upstash</strong> — rate limiting, to prevent abuse of AI processing.</li>
        <li><strong>Vercel Analytics</strong> and <strong>PostHog</strong> — product usage analytics (Section 1).</li>
      </ul>
      <p>
        We don&apos;t share your information with anyone else except: with
        your direction or consent, to comply with a legal obligation (like
        a valid subpoena), to protect the rights or safety of Constimator
        or our users, or as part of a merger, acquisition, or sale of
        assets (in which case we&apos;d require the successor to honor this
        Policy for information collected before the transfer).
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We keep your data for as long as your account is active, so your
        projects, bids, and estimates stay available the way you&apos;d expect
        from anything you haven&apos;t deleted yourself. When you delete a
        project or document, it&apos;s removed from primary storage
        immediately, though it may persist briefly in encrypted, automated
        backups before being fully purged.
      </p>
      <p>
        After you close your account or request deletion (Section 6), we
        delete your documents, bid data, estimates, and account information
        within 30 days, subject to that same backup-purge window. We may
        retain aggregate, de-identified usage data that doesn&apos;t identify
        you or your organization for longer, for our own product analytics.
      </p>

      <h2>6. Your Rights and Choices</h2>
      <p>
        You can access and correct most of your information directly in
        the app. To request a copy of your data, correct something you
        can&apos;t fix yourself, or delete your account or specific
        projects/documents, email us at{" "}
        <strong>[support/legal contact email — confirm before publishing]</strong>{" "}
        with your organization name and account email. We&apos;ll confirm your
        request and complete it within 30 days. Depending on where you
        live, you may have additional rights under local law (for example,
        the right to know what categories of information we&apos;ve collected,
        or to opt out of certain uses) — contact us at the address above to
        exercise them.
      </p>

      <h2>7. Data Security</h2>
      <p>
        We use industry-standard measures to protect your information,
        including encryption in transit, database-level access controls
        that isolate each organization&apos;s data from every other
        organization&apos;s, and restricted access to production systems. No
        method of storage or transmission is 100% secure, and we can&apos;t
        guarantee absolute security.
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use cookies required to keep you signed in and to remember basic
        preferences. We don&apos;t use cookies for third-party advertising or
        cross-site tracking.
      </p>

      <h2>9. Children&apos;s Privacy</h2>
      <p>
        Constimator is a business tool intended for construction industry
        professionals and isn&apos;t directed at children. We don&apos;t knowingly
        collect information from anyone under 18.
      </p>

      <h2>10. International Users</h2>
      <p>
        Constimator is operated from and primarily intended for use in the
        United States. If you access the Service from outside the United
        States, your information will be transferred to and processed in
        the United States, where privacy laws may differ from those in your
        jurisdiction.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. If we make
        material changes, we&apos;ll provide notice (for example, by email or
        an in-app notice) before the changes take effect.
      </p>

      <h2>12. Contact Us</h2>
      <p>
        Questions about this Policy or how we handle your data? Contact us
        at <strong>[support/legal contact email — confirm before publishing]</strong>.
      </p>
    </LegalPageLayout>
  )
}
