import Image from "next/image"
import Link from "next/link"
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  Play,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  TriangleAlert,
  Zap,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import styles from "@/components/home/landing.module.css"

const features = [
  {
    icon: FileText,
    title: "Upload Bid Docs",
    subtitle: "PDF, plans, specs",
    tone: "purple",
    href: "#how-it-works",
  },
  {
    icon: Search,
    title: "AI Analysis",
    subtitle: "Line-by-line check",
    tone: "blue",
    href: "#what-it-does",
  },
  {
    icon: TriangleAlert,
    title: "Find Missing Items",
    subtitle: "Catch costly errors",
    tone: "orange",
    href: "#reconciliation",
  },
  {
    icon: BarChart3,
    title: "Win More Bids",
    subtitle: "Bid with confidence",
    tone: "green",
    href: "#results",
  },
]
const benefits = [
  { icon: Zap, title: "Save Time", subtitle: "Automate the review process" },
  { icon: ShieldCheck, title: "Reduce Risk", subtitle: "Catch errors early" },
  { icon: Target, title: "Win More Projects", subtitle: "Bid with confidence" },
  {
    icon: TrendingUp,
    title: "Data-Driven Decisions",
    subtitle: "Turn information into profit",
  },
]

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.stage}>
        <div className={styles.marketingPanel}>
          <div className={styles.photo} aria-hidden="true">
            <Image
              src="/images/construction-sunset.webp"
              alt=""
              fill
              preload
              sizes="100vw"
            />
          </div>
          <SiteHeader />
          <div className={styles.panelContent}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>
                <span />
                Built for public works contractors
              </div>
              <h1 id="hero-title" className={styles.title}>
                Turn complex
                <br />
                bid documents
                <br />
                into <span>winning results.</span>
              </h1>
              <p className={styles.description}>
                Constimator reconciles your estimate against the official bid
                form, line by line — catching missing items, quantity busts, and
                unit mismatches before you bid.
              </p>
              <div className={styles.actions}>
                <Link href="/sign-up" className={styles.primaryButton}>
                  Try it free for 30 days{" "}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link href="/demo-guide" className={styles.demoButton}>
                  <Play size={15} aria-hidden="true" /> Explore the demo
                </Link>
              </div>
              <p className={styles.trialNote}>
                <Check size={13} aria-hidden="true" /> No credit card required{" "}
                <span>·</span> 30 days free
              </p>
              <div className={styles.riskNote} aria-hidden="true">
                Less Risk.
                <br />
                <span>More Wins.</span>
                <svg viewBox="0 0 180 20">
                  <path d="M3 16Q82 0 176 4L31 17 159 1" />
                </svg>
              </div>
            </div>
            <div className={styles.featureGrid}>
              {features.map(({ icon: Icon, ...feature }) => (
                <a
                  href={feature.href}
                  key={feature.title}
                  className={styles.featureCard}
                >
                  <span
                    className={`${styles.featureIcon} ${styles[feature.tone]}`}
                  >
                    <Icon size={24} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <strong>{feature.title}</strong>
                  <span>{feature.subtitle}</span>
                </a>
              ))}
            </div>
            <div className={styles.trust}>
              <p>Built by a contractor. For contractors who build America.</p>
              <dl className={styles.trustGrid}>
                <div>
                  <dt>30 days</dt>
                  <dd>Free to try</dd>
                </div>
                <div>
                  <dt>Line by line</dt>
                  <dd>Check every bid item</dd>
                </div>
                <div>
                  <dt>Your tools</dt>
                  <dd>Keep your workflow</dd>
                </div>
                <div>
                  <dt>One place</dt>
                  <dd>All your bid documents</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        <ul className={styles.benefits}>
          {benefits.map(({ icon: Icon, title, subtitle }) => (
            <li key={title}>
              <span className={styles.benefitIcon}>
                <Icon size={32} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
              </div>
            </li>
          ))}
        </ul>
        <a href="#reconciliation" className={styles.scrollHint}>
          A better bid starts here <ArrowDown size={13} aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
