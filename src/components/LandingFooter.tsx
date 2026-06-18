export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-900 bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 text-center md:grid-cols-4 md:text-left">

          {/* Brand */}
          <div className="md:col-span-1">
            <a href="/" className="inline-block mb-3">
              <span className="text-base font-bold text-slate-300">Street Insights</span>
            </a>
            <a
              href="https://www.boxfordpartners.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-3 py-1.5 mb-4 border border-slate-800 rounded text-[10px] font-semibold text-slate-500 uppercase tracking-widest hover:border-slate-600 hover:text-slate-300 transition-colors"
            >
              A Boxford Partners Company
            </a>
            <p>
              <a href="mailto:hello@getstreetinsights.com" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                hello@getstreetinsights.com
              </a>
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Product
            </h4>
            <ul className="space-y-3 text-sm">
              <li><a href="/" className="text-slate-400 hover:text-slate-100 transition-colors">Dashboard</a></li>
              <li><a href="/#features" className="text-slate-400 hover:text-slate-100 transition-colors">Features</a></li>
              <li><a href="/#pricing" className="text-slate-400 hover:text-slate-100 transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Company
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="https://boxfordpartners.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-100 transition-colors">
                  Boxford Partners
                </a>
              </li>
              <li>
                <a href="mailto:hello@getstreetinsights.com" className="text-slate-400 hover:text-slate-100 transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="https://www.linkedin.com/company/boxfordpartners" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-100 transition-colors">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Legal
            </h4>
            <ul className="space-y-3 text-sm">
              <li><a href="/privacy" className="text-slate-400 hover:text-slate-100 transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="text-slate-400 hover:text-slate-100 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-slate-900 pt-6 flex items-center justify-between">
          <p className="text-xs text-slate-500/50">
            &copy; {new Date().getFullYear()} Boxford Partners LLC DBA STREET INSIGHTS. All rights reserved.
          </p>
          <a
            href="https://www.linkedin.com/company/boxfordpartners"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Boxford Partners on LinkedIn"
            className="text-slate-600 hover:text-slate-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
