import { useState, useEffect } from "react";

interface UnsplashPhoto {
  url: string;
  photographer: string;
  photographerUrl: string;
}

const CACHE_KEY = "unsplash_login_photo";
const CACHE_TTL = 24 * 60 * 60 * 1000;
const FALLBACK: UnsplashPhoto = {
  url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
  photographer: "Jasper Boer",
  photographerUrl: "https://unsplash.com/@jasperboer",
};

export function useUnsplashPhoto(): UnsplashPhoto {
  const [photo, setPhoto] = useState<UnsplashPhoto>(FALLBACK);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) { setPhoto(data); return; }
      }
    } catch {}

    const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (!key) return;

    fetch("https://api.unsplash.com/photos/random?query=nature+landscape&orientation=landscape", {
      headers: { Authorization: `Client-ID ${key}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const p: UnsplashPhoto = {
          url: d.urls.regular,
          photographer: d.user.name,
          photographerUrl: d.user.links.html + "?utm_source=boxford&utm_medium=referral",
        };
        setPhoto(p);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: p, ts: Date.now() }));
        fetch(d.links.download_location + "?client_id=" + key);
      })
      .catch(() => {});
  }, []);

  return photo;
}
