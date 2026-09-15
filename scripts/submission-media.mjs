// Only these public hosts may be fetched by the submission service. Redirects
// are never followed, and no site credentials accompany public media requests.
export function mediaUrl(value, base) {
  try {
    const u = new URL(value, base);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    if (u.hostname === 'github.com' && /^\/[^/]+\/[^/]+\/blob\//.test(u.pathname)) {
      u.hostname = 'raw.githubusercontent.com'; u.pathname = u.pathname.replace('/blob/', '/'); u.search = '';
    }
    if (u.hostname === 'gitlab.com') {
      u.pathname = u.pathname.replace('/-/blob/', '/-/raw/');
      if (!u.pathname.includes('/-/raw/')) return null;
    } else if (u.hostname === 'github.com') {
      if (!u.pathname.startsWith('/user-attachments/assets/')) return null;
    } else if (!['raw.githubusercontent.com', 'user-images.githubusercontent.com', 'cdn.discordapp.com', 'media.discordapp.net'].includes(u.hostname)) return null;
    if (['cdn.discordapp.com', 'media.discordapp.net'].includes(u.hostname) && !u.pathname.startsWith('/attachments/')) return null;
    u.hash = '';
    return u.href.length <= 1500 ? u.href : null;
  } catch { return null; }
}
export function readmeImages(markdown, base) {
  const text = markdown.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '');
  const found = [];
  const refs = new Map([...text.matchAll(/^\s*\[([^\]]+)\]:\s*<?([^\s>]+)>?/gm)].map(m => [m[1].toLowerCase(), m[2]]));
  const add = (src, alt = '') => {
    if (/badge|shield|build status|workflow|coverage|license|discord|sponsor/i.test(`${src} ${alt}`)) return;
    const url = mediaUrl(src.replace(/&amp;/g, '&'), base);
    if (url && !found.some(i => i.url === url)) found.push({ url, alt: alt.slice(0, 150) });
  };
  for (const m of text.matchAll(/!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^\n]*?["'])?\s*\)|!\[([^\]]*)\]\[([^\]]*)\]|<img\b[^>]*>/gi)) {
    if (m[0].startsWith('<')) {
      const src = m[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
      if (src) add(src, m[0].match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1]);
    } else if (m[4] !== undefined) { const src = refs.get((m[5] || m[4]).toLowerCase()); if (src) add(src, m[4]); }
    else add(m[2] || m[3], m[1]);
  }
  return found.slice(0, 12);
}
export function messageImages(text, attachments = []) {
  const found = [];
  for (const line of text.split('\n')) for (const m of line.matchAll(/https:\/\/[^\s<>]+/g)) {
    const url = mediaUrl(m[0].replace(/[),.!?]+$/, ''));
    if (url) found.push({ url, alt: /\b(banner|cover)\b/i.test(line) ? 'Project banner' : 'Project screenshot' });
  }
  for (const item of attachments) {
    const url = mediaUrl(item.url);
    if (url && (/^image\//.test(item.contentType || '') || /\.(png|jpe?g|webp|gif)$/i.test(item.name || ''))) found.push({ url, alt: /banner|cover/i.test(item.name || '') ? 'Project banner' : 'Project screenshot' });
  }
  return found.filter((item, index) => found.findIndex(i => i.url === item.url) === index).slice(0, 8);
}
