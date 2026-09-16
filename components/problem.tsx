import { ArrowDown, Ruler, Scale, Tag } from "lucide-react"

import styles from "@/components/home/problem.module.css"

// The three ways a good estimator loses a public-works bid. These are the
// same three the paragraph used to list in one sentence; they're pulled out
// into a list because they're the section's argument and were getting lost
// mid-paragraph. The wording is unchanged.
const failureModes = [
  { icon: Tag, text: "A bid item you priced as incidental" },
  { icon: Scale, text: "A quantity that doesn't match the bid form" },
  { icon: Ruler, text: "A unit you read wrong" },
] as const

export function Problem() {
  return (
    <section className={styles.section} aria-labelledby="problem-title">
      <div className={styles.atmosphere} aria-hidden="true" />

      <div className={styles.inner}>
        <div>
          <p className={styles.eyebrow}>
            <span />
            Why good bids lose
          </p>
          <h2 id="problem-title" className={styles.title}>
            One missed item can lose a job you{" "}
            <span>should have won.</span>
          </h2>
          <p className={styles.lead}>
            Public works is won by fractions of a percent. Any one of these can
            make your bid non-responsive or blow your margin:
          </p>
          <ul className={styles.modes}>
            {failureModes.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span>
                  <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <p className={styles.after}>
            And it&apos;s all buried in hundreds of pages of specs and a bid
            form you&apos;re reconciling by hand, under deadline.
          </p>
        </div>

        {/* $124,700 is not a made-up industry average. It is 2,150 LF x $58.00,
            the exact value of the one bid item missing from the sample estimate
            on this page — see lib/estimate-data.ts and the annotation in
            <ReconciliationShowcase />. If that sample data changes, change this
            card: the amount, the 6.7%, the meter width, and the source line. */}
        <aside className={styles.card} aria-label="The cost of one missed bid item">
          <span className={styles.chip}>Missing from estimate</span>
          <p className={styles.amount}>$124,700</p>
          <p className={styles.detail}>
            The single bid item left out of the estimate in the sample project
            below — 6.7% of a $1.85M job, and enough to make the bid
            non-responsive on its own.
          </p>
          <div className={styles.meter} aria-hidden="true">
            <span style={{ width: "6.7%" }} />
          </div>
          <p className={styles.meterLabel}>
            <span>
              <strong>6.7%</strong> of the engineer&apos;s estimate
            </span>
            <span>$1,850,000 job</span>
          </p>
          <p className={styles.source}>
            Minor Concrete (Curb &amp; Gutter) · <code>2,150 LF × $58.00</code> ·
            Shasta County sample project
          </p>
        </aside>
      </div>

      <div className={styles.bridge}>
        <a href="#reconciliation">
          Constimator does that reconciliation for you.
          <span>
            <ArrowDown size={15} strokeWidth={2.2} aria-hidden="true" />
          </span>
        </a>
      </div>
    </section>
  )
}
