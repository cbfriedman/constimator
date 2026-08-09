import { LegalPageLayout } from "@/components/legal/legal-page-layout"

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="August 2, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of
        Constimator (&quot;Constimator,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), a web-based
        construction estimating platform operated by{" "}
        <strong>[legal entity name and state of incorporation — confirm before publishing]</strong>.
        By creating an account or otherwise using Constimator, you agree to
        be bound by these Terms. If you are using Constimator on behalf of
        a company or other organization, you represent that you have the
        authority to bind that organization to these Terms, and
        &quot;you&quot; refers to both you and that organization.
      </p>
      <p>
        If you do not agree to these Terms, do not use Constimator.
      </p>

      <h2>1. What Constimator Does</h2>
      <p>
        Constimator helps construction contractors prepare bids. You upload
        bid documents (plans, specifications, addenda, and the official bid
        form); our AI reads the official bid form and extracts its line
        items and quantities. You build your own estimate — your own
        quantities, unit prices, and markup — in a manual workspace.
        Constimator then reconciles your estimate against the official bid
        form and flags discrepancies: missing items, quantity mismatches,
        unit mismatches.
      </p>
      <p>
        Constimator does <strong>not</strong> measure quantities off
        drawings or perform automated takeoff. Every quantity in your
        estimate is one you entered or confirmed. See Section 6 for
        important limitations on the AI-assisted parts of the Service.
      </p>

      <h2>2. Eligibility and Accounts</h2>
      <p>
        You must be at least 18 years old and able to form a binding
        contract to use Constimator. You&apos;re responsible for the accuracy of
        the information you provide when creating an account and for
        keeping your login credentials confidential. You&apos;re responsible
        for all activity that happens under your account, including
        actions taken by teammates you invite.
      </p>
      <p>
        An organization&apos;s admin can invite teammates by email and assign
        them a role (admin, estimator, project manager, or viewer). Each
        person may belong to one organization at a time.
      </p>

      <h2>3. Subscriptions, Free Trial, and Billing</h2>
      <p>
        Constimator is billed per seat (per user in your organization) on a
        subscription basis, processed through Stripe. New organizations get
        a free trial period; if you don&apos;t subscribe before the trial ends,
        access to the estimating workspace, document processing, and
        reconciliation is paused until you do (your account, project list,
        and previously entered data aren&apos;t deleted).
      </p>
      <p>
        Subscriptions renew automatically at the then-current rate until
        canceled. You can cancel or manage your subscription at any time
        through the billing portal in your account. Except where required
        by law, fees are non-refundable, including for partial billing
        periods.
      </p>
      <p>
        We may change our pricing. If we do, we&apos;ll provide notice before
        the change takes effect on your next billing cycle.
      </p>

      <h2>4. Your Content</h2>
      <p>
        &quot;Your Content&quot; means the documents you upload (plans, specs,
        addenda, official bid forms) and the data you or your teammates
        enter (quantities, prices, notes, and anything else you put into
        the estimate workspace). You retain all ownership rights in Your
        Content.
      </p>
      <p>
        You grant us a limited license to host, store, process, and
        display Your Content solely to provide and improve the Service to
        you — including sending it to the AI providers described in
        Section 6 for extraction. We don&apos;t use Your Content to train AI
        models, ours or a third party&apos;s, and we don&apos;t sell it.
      </p>
      <p>
        You&apos;re responsible for Your Content and for having the rights
        necessary to upload it — including, where a bid document contains
        another party&apos;s confidential or proprietary information (e.g. an
        awarding agency&apos;s bid package), any rights or permissions that
        require.
      </p>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Upload content you don&apos;t have the right to upload, or that infringes someone else&apos;s rights;</li>
        <li>Use the Service to violate any law or regulation;</li>
        <li>Attempt to access another organization&apos;s data, accounts, or projects without authorization;</li>
        <li>
          Probe, scan, or test the vulnerability of the Service, or attempt
          to bypass rate limits, spend caps, or other technical
          restrictions, except as part of an authorized security disclosure
          you&apos;ve coordinated with us in advance;
        </li>
        <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service, except where the law gives you that right despite this restriction;</li>
        <li>Resell, sublicense, or provide the Service to third parties as your own offering; or</li>
        <li>Use automated means to access the Service outside of the interfaces and rate limits we provide.</li>
      </ul>

      <h2>6. AI-Assisted Processing — Please Read Carefully</h2>
      <p>
        Constimator uses a third-party AI model (currently provided by
        Anthropic) to read uploaded bid documents and extract line items,
        quantities, and other structured data from the official bid form.
        This extraction is provided as a convenience and a starting point —
        it is <strong>not guaranteed to be accurate or complete</strong>.
      </p>
      <p>
        <strong>
          You are solely responsible for reviewing, verifying, and
          correcting any AI-extracted data before relying on it — and
          solely responsible for the quantities, prices, and numbers in
          your final estimate and bid submission, regardless of their
          source.
        </strong>{" "}
        Reconciliation results (flagged discrepancies) are generated by
        comparing data you&apos;ve entered against the official bid form using
        deterministic logic, not AI, but the underlying comparison is only
        as good as the data on both sides of it. Constimator is a tool to
        help you catch errors before you bid — it does not replace your own
        professional judgment, your own quantity takeoffs, or your
        obligation to submit a responsive, accurate bid.
      </p>
      <p>
        We are not liable for losses arising from inaccurate AI extraction,
        missed discrepancies, or any decision you make in reliance on
        output from the Service. See Section 9 (Disclaimers) and Section 10
        (Limitation of Liability).
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        Constimator and its underlying software, design, and branding are
        owned by us or our licensors and protected by intellectual property
        laws. These Terms don&apos;t grant you any rights to our trademarks,
        logos, or brand features. Subject to these Terms, we grant you a
        limited, non-exclusive, non-transferable license to access and use
        the Service for your organization&apos;s own construction estimating
        purposes.
      </p>

      <h2>8. Third-Party Services</h2>
      <p>
        The Service relies on third-party infrastructure and service
        providers to operate — including hosting, database, and
        authentication (Supabase), AI processing (Anthropic), payment
        processing (Stripe), and background job processing (Railway). Your
        use of the Service is also subject to those providers&apos; own terms
        where you interact with them directly (for example, Stripe&apos;s
        terms govern your payment method on file). See our{" "}
        <a href="/privacy">Privacy Policy</a> for more detail on how data
        moves through these providers.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT
        WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY,
        INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS
        FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT
        THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR
        THAT ANY AI-EXTRACTED DATA, RECONCILIATION RESULT, OR OTHER OUTPUT
        WILL BE ACCURATE, COMPLETE, OR SUITABLE FOR YOUR PURPOSES.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR SUPPLIERS WILL
        NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
        OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR
        BUSINESS OPPORTUNITY — INCLUDING LOSSES ARISING FROM AN INACCURATE
        OR UNSUCCESSFUL BID — ARISING OUT OF OR RELATED TO YOUR USE OF THE
        SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH
        DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR
        RELATED TO THESE TERMS OR THE SERVICE WILL NOT EXCEED THE AMOUNT
        YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE CLAIM AROSE.
      </p>
      <p>
        Some jurisdictions don&apos;t allow the exclusion or limitation of
        certain damages, so some of the above limitations may not apply to
        you.
      </p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold us harmless from any
        claim, loss, liability, or expense (including reasonable
        attorneys&apos; fees) arising from Your Content, your use of the
        Service in violation of these Terms, or your violation of any law
        or third party&apos;s rights.
      </p>

      <h2>12. Termination</h2>
      <p>
        You may stop using the Service and cancel your subscription at any
        time. We may suspend or terminate your access if you materially
        breach these Terms and don&apos;t cure the breach within a reasonable
        time after notice, or immediately if necessary to protect the
        Service or other users. Upon termination, your right to use the
        Service ends; see our{" "}
        <a href="/privacy">Privacy Policy</a> and our{" "}
        data retention practices for what happens to Your Content after
        termination.
      </p>

      <h2>13. Governing Law and Disputes</h2>
      <p>
        These Terms are governed by the laws of{" "}
        <strong>[state/jurisdiction — confirm before publishing]</strong>,
        without regard to conflict-of-law principles. Any dispute arising
        from these Terms or the Service will be resolved in the state or
        federal courts located in{" "}
        <strong>[county/jurisdiction — confirm before publishing]</strong>,
        and you consent to personal jurisdiction there.
      </p>

      <h2>14. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. If we make material
        changes, we&apos;ll provide notice (for example, by email or an
        in-app notice) before the changes take effect. Continuing to use
        the Service after changes take effect means you accept the updated
        Terms.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these Terms? Contact us at{" "}
        <strong>support@constimator.com</strong>.
      </p>
    </LegalPageLayout>
  )
}
