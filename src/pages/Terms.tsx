import { usePageMeta } from "../hooks/usePageMeta";

export default function Terms() {
  usePageMeta({ title: "Terms of Service", description: "Street Insights terms of service. Read the terms governing your use of the stock sentiment analysis platform." });
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Legal</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-4 text-sm text-gray-500">Last updated: October 1, 2026</p>

      <div className="mt-12 space-y-8 text-gray-700 leading-relaxed">
        <p>These Terms of Service ("Terms") govern your access to and use of the website and services operated by Boxford Partners LLC DBA Street Insights ("Street Insights," "we," "us," or "our"), including getstreetinsights.com and the Street Insights stock sentiment analysis platform. By accessing or using our services, you agree to these Terms.</p>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Services</h2>
          <p>Street Insights provides a stock sentiment analysis platform that aggregates and analyzes market commentary from financial media sources, including but not limited to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>AI-powered sentiment scoring of financial commentary</li>
            <li>Source credibility tracking and leaderboards</li>
            <li>Watchlist management and alert notifications</li>
            <li>Prediction tracking and accuracy measurement</li>
            <li>Market signal aggregation and analysis</li>
          </ul>
          <p className="mt-3">We reserve the right to modify, suspend, or discontinue any service at any time with reasonable notice.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Not Financial Advice</h2>
          <p>Street Insights provides market sentiment analysis for informational and educational purposes only. Nothing on our platform constitutes investment advice, financial advice, trading advice, or any other sort of advice. You should not treat any of the platform's content as such. We do not recommend that any financial instrument should be bought, sold, or held by you. Do your own due diligence and consult your financial advisor before making any investment decisions.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Accounts</h2>
          <p>You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorized use. We may suspend or terminate accounts that violate these Terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
          <p>You agree to use our services only for lawful purposes. You may not:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Violate any applicable laws or regulations</li>
            <li>Use automated systems to scrape or extract data from our platform</li>
            <li>Redistribute, resell, or commercially exploit our analysis without written consent</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with the operation of our infrastructure or other users' experience</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Payments and Subscriptions</h2>
          <p>Paid services are billed according to the plan selected at the time of subscription. All fees are non-refundable except as required by law. Subscriptions renew automatically unless canceled before the end of the billing period. We reserve the right to change pricing with 30 days' notice to existing subscribers.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
          <p>All content, software, analysis outputs, and materials on our platform are owned by or licensed to Boxford Partners LLC. Nothing in these Terms grants you any right to use our trademarks, logos, or proprietary materials without prior written consent. You retain ownership of any personal watchlist configurations you create within the platform.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Disclaimer of Warranties</h2>
          <p>Our services are provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement. We do not warrant the accuracy, completeness, or timeliness of any sentiment analysis, predictions, or other outputs. Market data and analysis may contain errors or delays.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, Boxford Partners LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use our services. In no event shall we be liable for any investment losses or financial damages resulting from reliance on our platform's analysis. Our total liability for any claim shall not exceed the amount you paid us in the three months preceding the claim.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Indemnification</h2>
          <p>You agree to indemnify and hold harmless Boxford Partners LLC and its officers, directors, employees, and agents from any claims, damages, or expenses (including reasonable attorney's fees) arising from your violation of these Terms, your misuse of our services, or any investment decisions you make based on information obtained through our platform.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Governing Law</h2>
          <p>These Terms are governed by the laws of the Commonwealth of Massachusetts, without regard to its conflict of law provisions. Any disputes shall be resolved exclusively in the state or federal courts located in Suffolk County, Massachusetts.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Changes to These Terms</h2>
          <p>We may revise these Terms at any time. Material changes will be communicated by updating the "Last updated" date. Continued use of our services after changes take effect constitutes your acceptance of the revised Terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Contact</h2>
          <p>Questions about these Terms:</p>
          <p className="mt-2">
            Street Insights / Boxford Partners LLC<br />
            <a href="mailto:hello@boxfordpartners.com" className="text-blue-600 hover:underline">hello@boxfordpartners.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
