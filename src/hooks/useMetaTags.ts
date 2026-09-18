import { useEffect } from 'react';

export interface MetaTagOptions {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: 'website' | 'video.movie' | 'video.tv_show' | 'profile';
  siteName?: string;
}

function updateMetaTag(selector: string, attribute: string, content: string) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    const [attrKey, attrVal] = selector.replace(/[\[\]']/g, '').split('=');
    if (attrKey && attrVal) {
      element.setAttribute(attrKey, attrVal);
      document.head.appendChild(element);
    }
  }
  element.setAttribute(attribute, content);
}

export function useMetaTags(options: MetaTagOptions) {
  useEffect(() => {
    const defaultSiteName = 'WATCHD';
    const siteName = options.siteName || defaultSiteName;
    const title = options.title ? `${options.title} | ${siteName}` : `${siteName} - Stream Movies & Series Online in HD`;
    const description =
      options.description ||
      'Stream thousands of trending movies and TV series in HD with instant playback, chronological universes, and subtitles.';
    const image =
      options.image ||
      'https://watch.kingori.co.ke/favicon.svg';
    const currentUrl = options.url || window.location.href;
    const ogType = options.type || 'website';

    // Document Title
    document.title = title;

    // Standard Meta Tags
    updateMetaTag('meta[name="title"]', 'content', title);
    updateMetaTag('meta[name="description"]', 'content', description);

    // OpenGraph Meta Tags (WhatsApp, Telegram, Facebook, iMessage, Discord)
    updateMetaTag('meta[property="og:site_name"]', 'content', siteName);
    updateMetaTag('meta[property="og:title"]', 'content', title);
    updateMetaTag('meta[property="og:description"]', 'content', description);
    updateMetaTag('meta[property="og:image"]', 'content', image);
    updateMetaTag('meta[property="og:image:secure_url"]', 'content', image);
    updateMetaTag('meta[property="og:url"]', 'content', currentUrl);
    updateMetaTag('meta[property="og:type"]', 'content', ogType);

    // Twitter Card Tags
    updateMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image');
    updateMetaTag('meta[name="twitter:title"]', 'content', title);
    updateMetaTag('meta[name="twitter:description"]', 'content', description);
    updateMetaTag('meta[name="twitter:image"]', 'content', image);
    updateMetaTag('meta[name="twitter:url"]', 'content', currentUrl);
  }, [options.title, options.description, options.image, options.url, options.type, options.siteName]);
}

