import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getPost } from "../data/posts";
import { featuredFaqs } from "../data/faqs";
import { LandingNav } from "../components/LandingNav";
import LandingFooter from "../components/LandingFooter";

const C = {
  canvas: "#080a0d",
  border: "rgba(255,255,255,0.07)",
  text: "#f0f0f0",
  muted: "rgba(255,255,255,0.55)",
  faint: "rgba(255,255,255,0.3)",
  amber: "#e8a84a",
} as const;

const BLOG_BODY_CSS = `
  .blog-body p { margin: 0 0 1.4em; }
  .blog-body h2 {
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #111;
    margin: 2.2em 0 0.75em;
  }
  .blog-body h3 {
    font-size: 16px;
    font-weight: 600;
    color: #222;
    margin: 1.8em 0 0.6em;
  }
  .blog-body ul, .blog-body ol {
    margin: 0 0 1.4em 1.5em;
  }
  .blog-body li { margin-bottom: 0.4em; }
  .blog-body a { color: #b46e10; text-decoration: underline; }
  .blog-body strong { font-weight: 700; color: #111; }
  .blog-body blockquote {
    border-left: 3px solid #e8a84a;
    margin: 1.6em 0;
    padding: 0.5em 0 0.5em 1.2em;
    color: #555;
    font-style: italic;
  }
  .blog-body code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.88em;
    background: #efe9df;
    padding: 2px 5px;
    border-radius: 3px;
    color: #333;
  }
`;

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPost(slug) : undefined;

  useEffect(() => {
    if (!post) return;

    const canonical = post.canonical ?? `https://getstreetinsights.com/blog/${post.slug}`;

    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      author: {
        "@type": "Person",
        name: post.author,
        url: post.authorUrl,
      },
      publisher: {
        "@type": "Organization",
        name: "Street Insights",
        url: "https://getstreetinsights.com",
      },
      url: canonical,
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "article-schema";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById("article-schema");
      if (existing) existing.remove();
    };
  }, [post]);

  if (!post) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.canvas,
          color: C.text,
          fontFamily: "'Geist', system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <p style={{ fontSize: 48, fontWeight: 700, color: C.muted }}>404</p>
        <p style={{ fontSize: 16, color: C.muted }}>Article not found.</p>
        <Link
          to="/blog"
          style={{ fontSize: 14, color: C.amber, textDecoration: "none", marginTop: 8 }}
        >
          &larr; Back to Blog
        </Link>
      </div>
    );
  }

  const canonical = post.canonical ?? `https://getstreetinsights.com/blog/${post.slug}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'Geist', system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{BLOG_BODY_CSS}</style>

      {/* Canonical link */}
      <link rel="canonical" href={canonical} />

      <LandingNav />

      {/* Dark hero section */}
      <section style={{ background: C.canvas, paddingTop: 56 }}>
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            padding: "72px 24px 64px",
            textAlign: "center",
          }}
        >
          {/* Back link */}
          <div style={{ marginBottom: 32 }}>
            <Link
              to="/blog"
              style={{ fontSize: 12, color: C.faint, textDecoration: "none", letterSpacing: "0.03em" }}
              onMouseEnter={e => (e.currentTarget.style.color = C.muted)}
              onMouseLeave={e => (e.currentTarget.style.color = C.faint)}
            >
              &larr; Blog
            </Link>
          </div>

          {/* Category + date pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(232,168,74,0.1)",
              border: "1px solid rgba(232,168,74,0.2)",
              borderRadius: 100,
              padding: "5px 14px",
              marginBottom: 28,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: C.amber,
              }}
            >
              {post.category}
            </span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(232,168,74,0.5)" }} />
            <span style={{ fontSize: 11, color: "rgba(232,168,74,0.7)", letterSpacing: "0.03em" }}>
              {post.date}
            </span>
          </div>

          {/* ALL-CAPS title */}
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 52px)",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              color: "#fff",
              lineHeight: 1.1,
              marginBottom: 32,
            }}
          >
            {post.title}
          </h1>

          {/* Author byline */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <a
              href={post.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
            >
              {post.author}
            </a>
            <span style={{ fontSize: 12, color: C.faint }}>·</span>
            <span style={{ fontSize: 13, color: C.faint }}>{post.date}</span>
            <span style={{ fontSize: 12, color: C.faint }}>·</span>
            <span style={{ fontSize: 13, color: C.faint }}>{post.readTime}</span>
          </div>
        </div>
      </section>

      {/* Direct Answer section */}
      <section style={{ background: "#ffffff" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "52px 24px 48px" }}>
          <div
            style={{
              borderLeft: `4px solid ${C.amber}`,
              paddingLeft: 20,
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: C.amber,
                marginBottom: 10,
              }}
            >
              Direct Answer
            </div>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.7,
                color: "#222",
                margin: 0,
              }}
            >
              {post.description}
            </p>
          </div>
        </div>
      </section>

      {/* Article body */}
      <section style={{ background: "#faf7f2" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "52px 24px 80px" }}>
          <div
            className="blog-body"
            style={{ fontSize: 16, lineHeight: 1.8, color: "#333" }}
            dangerouslySetInnerHTML={{ __html: post.body }}
          />
        </div>
      </section>

      {/* FAQ section */}
      <section style={{ background: C.canvas, padding: "80px 24px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "clamp(20px, 2.8vw, 28px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#fff",
              marginBottom: 40,
            }}
          >
            Frequently Asked Questions
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {featuredFaqs.map((faq, i) => (
              <details key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <summary
                  style={{
                    padding: "18px 0",
                    cursor: "pointer",
                    listStyle: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {faq.question}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M3 5l4 4 4-4" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div style={{ paddingBottom: 18, fontSize: 14, lineHeight: 1.75, color: C.muted }}>
                  {faq.answer}
                </div>
              </details>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}` }} />
          </div>
        </div>
      </section>

      {/* Bottom CTA block */}
      <section style={{ background: C.canvas, textAlign: "center", padding: "80px 24px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.amber,
              marginBottom: 20,
            }}
          >
            Street Insights
          </div>
          <h2
            style={{
              fontSize: "clamp(22px, 4vw, 38px)",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              color: "#fff",
              lineHeight: 1.1,
              marginBottom: 18,
            }}
          >
            Ready to See the Signal Before It Moves?
          </h2>
          <p
            style={{
              fontSize: 15,
              color: C.muted,
              lineHeight: 1.65,
              marginBottom: 36,
              maxWidth: 440,
              margin: "0 auto 36px",
            }}
          >
            Social sentiment tracking across Reddit, forums, and social platforms. Credibility-ranked signals for retail investors.
          </p>
          <Link
            to="/sign-up"
            style={{
              display: "inline-block",
              padding: "13px 32px",
              background: C.amber,
              color: "#0a0700",
              borderRadius: 4,
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
