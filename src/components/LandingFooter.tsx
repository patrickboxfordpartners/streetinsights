import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

const C = {
  canvas: '#080a0d',
  surface: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.07)',
  text: 'rgba(255,255,255,0.88)',
  muted: 'rgba(255,255,255,0.40)',
  faint: 'rgba(255,255,255,0.18)',
  amber: '#e8a84a',
  amberDim: 'rgba(232,168,74,0.12)',
} as const;

const colLabel = (text: string) => (
  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.faint, marginBottom: 16 }}>{text}</p>
);

function ColLink({ href, label, external = false, active = false, isRoute = false }: { href: string; label: string; external?: boolean; active?: boolean; isRoute?: boolean }) {
  const styles: React.CSSProperties = {
    fontSize: 13, color: active ? C.amber : C.muted, textDecoration: 'none',
    display: 'block', marginBottom: 10, fontWeight: active ? 500 : 400,
  };
  if (isRoute) {
    return (
      <Link to={href} style={styles}
        onMouseEnter={e => (e.currentTarget.style.color = active ? C.amber : 'rgba(255,255,255,0.85)')}
        onMouseLeave={e => (e.currentTarget.style.color = active ? C.amber : C.muted)}
      >{label}</Link>
    );
  }
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      style={styles}
      onMouseEnter={e => (e.currentTarget.style.color = active ? C.amber : 'rgba(255,255,255,0.85)')}
      onMouseLeave={e => (e.currentTarget.style.color = active ? C.amber : C.muted)}
    >{label}</a>
  );
}

export default function LandingFooter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  async function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    await new Promise(r => setTimeout(r, 600));
    setStatus('done');
    setEmail('');
    setTimeout(() => setStatus('idle'), 3000);
  }

  return (
    <footer style={{ background: C.canvas, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '40px 48px' }}>

          {/* Brand + newsletter */}
          <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
            <a href="https://www.boxfordpartners.com" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'baseline', marginBottom: 12, textDecoration: 'none' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.01em' }}>BOXFORD</span>
              <span style={{ fontSize: 13, fontWeight: 300, color: C.muted, letterSpacing: '0.01em' }}>partners</span>
            </a>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, maxWidth: 260, marginBottom: 20 }}>
              Product studio for service and B2B companies. Street Insights is one of our tools.
            </p>

            <p style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 8 }}>Weekly product insights</p>
            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: 8, maxWidth: 320 }}>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={status !== 'idle'}
                style={{
                  flex: 1, minWidth: 0, background: C.surface,
                  border: `1px solid ${C.border}`, borderRadius: 4,
                  padding: '8px 12px', fontSize: 13, color: C.text,
                  fontFamily: "'Geist', system-ui, sans-serif",
                  outline: 'none', transition: 'border-color 0.12s ease',
                }}
                onFocus={e => (e.target.style.borderColor = C.amber)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
              <button
                type="submit" disabled={status !== 'idle'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                  background: status === 'done' ? C.amberDim : C.amber,
                  color: status === 'done' ? C.amber : '#0a0700',
                  border: 'none', borderRadius: 4, padding: '8px 14px',
                  fontSize: 13, fontWeight: 600,
                  fontFamily: "'Geist', system-ui, sans-serif",
                  cursor: status !== 'idle' ? 'default' : 'pointer',
                  opacity: status === 'loading' ? 0.6 : 1,
                  transition: 'background 0.15s ease, opacity 0.15s ease',
                }}
                onMouseEnter={e => { if (status === 'idle') (e.currentTarget as HTMLButtonElement).style.background = '#f0b455'; }}
                onMouseLeave={e => { if (status === 'idle') (e.currentTarget as HTMLButtonElement).style.background = C.amber; }}
              >
                {status === 'loading' ? '...' : status === 'done' ? 'Subscribed' : (
                  <>Subscribe <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></>
                )}
              </button>
            </form>
            <p style={{ marginTop: 8, fontSize: 11, color: C.faint }}>No spam. Unsubscribe anytime.</p>
          </div>

          {/* Products */}
          <div>
            {colLabel('Products')}
            <ColLink href="https://reviewsniper.app/" label="reviewSNIPER" external />
            <ColLink href="https://gravitasindex.com/" label="Gravitas Index" external />
            <ColLink href="https://getstreetinsights.com/" label="Street Insights" active />
            <ColLink href="https://www.boxfordpartners.com/labs" label="All products" external />
          </div>

          {/* Resources */}
          <div>
            {colLabel('Resources')}
            <ColLink href="/blog" label="Blog" isRoute />
            <ColLink href="/faq" label="FAQ" isRoute />
            <ColLink href="/pricing" label="Pricing" isRoute />
          </div>

          {/* Company */}
          <div>
            {colLabel('Company')}
            <ColLink href="https://www.boxfordpartners.com/about" label="About" external />
            <ColLink href="https://www.boxfordpartners.com/services" label="Services" external />
            <ColLink href="https://www.boxfordpartners.com/academy" label="Academy" external />
            <ColLink href="mailto:hello@getstreetinsights.com" label="Contact" />
          </div>

          {/* Legal */}
          <div>
            {colLabel('Legal')}
            <ColLink href="/privacy" label="Privacy" isRoute />
            <ColLink href="/terms" label="Terms" isRoute />
            <ColLink href="https://www.boxfordpartners.com/acceptable-use" label="Acceptable use" external />
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          marginTop: 48, paddingTop: 20, paddingBottom: 24,
          borderTop: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <p style={{ fontSize: 11, color: C.faint }}>
            &copy; {new Date().getFullYear()} Boxford Partners LLC. Street Insights is not financial advice.
          </p>
          <a href="https://www.linkedin.com/company/boxfordpartners" target="_blank" rel="noopener noreferrer"
            aria-label="Boxford Partners on LinkedIn"
            style={{ color: C.faint, textDecoration: 'none', transition: 'color 0.12s ease' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.muted)}
            onMouseLeave={e => (e.currentTarget.style.color = C.faint)}
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
