import type { CSSProperties } from "react";
import { LandingNav } from "../components/LandingNav";
import LandingFooter from "../components/LandingFooter";
import { usePageMeta } from "../hooks/usePageMeta";

const C = {
  canvas: "#080a0d",
  surface: "rgba(232,168,74,0.08)",
  border: "rgba(255,255,255,0.07)",
  text: "rgba(255,255,255,0.88)",
  muted: "rgba(255,255,255,0.55)",
  faint: "rgba(255,255,255,0.40)",
  amber: "#e8a84a",
} as const;

export default function Terms() {
  usePageMeta({
    title: "Terms of Service (Draft)",
    description: "Draft terms of service for Street Insights, pending legal review by Boxford Partners LLC. Not yet in effect.",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.canvas,
        color: C.text,
        fontFamily: "'Geist', system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <LandingNav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "96px 24px 80px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.amber, marginBottom: 12 }}>
          Legal
        </p>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.025em", color: "#fff", margin: 0 }}>
          Terms of Service
        </h1>
        <p style={{ marginTop: 12, fontSize: 14, color: C.faint }}>Draft prepared October 12, 2026</p>

        <aside
          style={{
            marginTop: 28,
            padding: "16px 18px",
            background: C.surface,
            border: `1px solid ${C.amber}`,
            borderRadius: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.amber }}>
            Draft for legal review
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.6, color: C.text }}>
            This is a working draft for Boxford Partners LLC counsel. It is not in effect, it has not been approved by the owner, and using the site does not mean you agree to it. Do not treat this page as the company&apos;s terms of service until counsel reviews it and the owner publishes a final version.
          </p>
        </aside>

        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 32, fontSize: 16, lineHeight: 1.7, color: C.muted }}>
          <p>
            This draft describes proposed terms for the website and services operated by Boxford Partners LLC DBA Street Insights (&quot;Street Insights,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), including getstreetinsights.com and the Street Insights stock sentiment analysis platform.
          </p>

          <section>
            <h2 style={heading}>1. Services</h2>
            <p>Street Insights provides a stock sentiment analysis platform that aggregates and analyzes market commentary from financial media sources, including but not limited to:</p>
            <ul style={list}>
              <li>AI-powered sentiment scoring of financial commentary</li>
              <li>Source credibility tracking and leaderboards</li>
              <li>Watchlist management and alert notifications</li>
              <li>Prediction tracking and accuracy measurement</li>
              <li>Market signal aggregation and analysis</li>
            </ul>
            <p style={{ marginTop: 12 }}>We reserve the right to modify, suspend, or discontinue any service at any time with reasonable notice.</p>
          </section>

          <section>
            <h2 style={heading}>2. Not Financial Advice</h2>
            <p>Street Insights provides market sentiment analysis for informational and educational purposes only. Nothing on our platform constitutes investment advice, financial advice, trading advice, or any other sort of advice. You should not treat any of the platform&apos;s content as such. We do not recommend that any financial instrument should be bought, sold, or held by you. Do your own due diligence and consult your financial advisor before making any investment decisions.</p>
          </section>

          <section>
            <h2 style={heading}>3. Accounts</h2>
            <p>You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorized use. We may suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 style={heading}>4. Acceptable Use</h2>
            <p>You agree to use our services only for lawful purposes. You may not:</p>
            <ul style={list}>
              <li>Violate any applicable laws or regulations</li>
              <li>Use automated systems to scrape or extract data from our platform</li>
              <li>Redistribute, resell, or commercially exploit our analysis without written consent</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the operation of our infrastructure or other users&apos; experience</li>
            </ul>
          </section>

          <section>
            <h2 style={heading}>5. Payments and Subscriptions</h2>
            <p>Paid services are billed according to the plan selected at the time of subscription. All fees are non-refundable except as required by law. Subscriptions renew automatically unless canceled before the end of the billing period. We reserve the right to change pricing with 30 days&apos; notice to existing subscribers.</p>
          </section>

          <section>
            <h2 style={heading}>6. Intellectual Property</h2>
            <p>All content, software, analysis outputs, and materials on our platform are owned by or licensed to Boxford Partners LLC. Nothing in these terms grants you any right to use our trademarks, logos, or proprietary materials without prior written consent. You retain ownership of any personal watchlist configurations you create within the platform.</p>
          </section>

          <section>
            <h2 style={heading}>7. Disclaimer of Warranties</h2>
            <p>Our services are provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement. We do not warrant the accuracy, completeness, or timeliness of any sentiment analysis, predictions, or other outputs. Market data and analysis may contain errors or delays.</p>
          </section>

          <section>
            <h2 style={heading}>8. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, Boxford Partners LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use our services. In no event shall we be liable for any investment losses or financial damages resulting from reliance on our platform&apos;s analysis. Our total liability for any claim shall not exceed the amount you paid us in the three months preceding the claim.</p>
          </section>

          <section>
            <h2 style={heading}>9. Indemnification</h2>
            <p>You agree to indemnify and hold harmless Boxford Partners LLC and its officers, directors, employees, and agents from any claims, damages, or expenses (including reasonable attorney&apos;s fees) arising from your violation of these terms, your misuse of our services, or any investment decisions you make based on information obtained through our platform.</p>
          </section>

          <section>
            <h2 style={heading}>10. Governing Law</h2>
            <p>These terms are governed by the laws of the Commonwealth of Massachusetts, without regard to its conflict of law provisions. Any disputes shall be resolved exclusively in the state or federal courts located in Suffolk County, Massachusetts.</p>
          </section>

          <section>
            <h2 style={heading}>11. Changes to These Terms</h2>
            <p>We may revise these terms at any time. Material changes will be communicated by updating the published date on this page. Continued use of our services after a final version takes effect constitutes acceptance of the revised terms.</p>
          </section>

          <section>
            <h2 style={heading}>12. Contact</h2>
            <p>Questions about this draft:</p>
            <p style={{ marginTop: 8 }}>
              Street Insights / Boxford Partners LLC<br />
              <a href="mailto:hello@boxfordpartners.com" style={{ color: "#60a5fa" }}>hello@boxfordpartners.com</a>
            </p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

const heading: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "#fff",
  margin: "0 0 12px",
};

const list: CSSProperties = {
  margin: "8px 0 0",
  paddingLeft: 20,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
