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
/** Plain-text blocks from a README: intro paragraphs, then the sections that
 * describe what the project is and how far it has come. Build steps, ROM
 * hashes, and licensing are left to the repository. Each block is a paragraph
 * or a `- ` bullet, ready to be escaped for markdown. */
export function readmeSummary(markdown, limit = 1700) {
  const stripped = markdown.replace(/\r\n?/g, '\n').replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(?:img|picture|video|source|br)\b[^>]*>/gi, '').replace(/<\/?(?:p|div|table|tr|td|th|tbody|thead|details|summary|sub|sup|b|i|em|strong|a|center|h[1-6]|span)\b[^>]*>/gi, '')
    .replace(/!\[[^\]]*\]\([^)]*\)|!\[[^\]]*\]\[[^\]]*\]/g, '');
  const sections = [];
  let current = { heading: '', level: 0, lines: [] };
  for (const line of stripped.split('\n')) {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) { sections.push(current); current = { heading: heading[2], level: heading[1].length, lines: [] }; }
    else current.lines.push(line);
  }
  sections.push(current);
  const text = value => value.replace(/\[([^\]]*)\]\([^)]*\)|\[([^\]]*)\]\[[^\]]*\]/g, (_, a, b) => a ?? b ?? '').replace(/[*_`~]+/g, '').replace(/\s+/g, ' ').trim();
  const blocks = (lines, max) => {
    const out = [];
    let paragraph = [];
    const flush = () => { const value = text(paragraph.join(' ')); if (value && value.length >= 40 && /[.!?:]$/.test(value) && !/^\|/.test(value)) out.push(value); paragraph = []; };
    let inBullet = false;
    for (const line of lines) {
      const bullet = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.+)/);
      if (bullet) { flush(); const value = text(bullet[1]); inBullet = Boolean(value); if (value) out.push(`- ${value}`); }
      else if (!line.trim() || /^\s*(?:\||>|<)/.test(line)) { flush(); inBullet = false; }
      else if (inBullet) out[out.length - 1] += ` ${text(line)}`; // a wrapped list item
      else paragraph.push(line.trim());
    }
    flush();
    return out.slice(0, max);
  };
  const intro = sections.filter(s => s.level <= 1).flatMap(s => blocks(s.lines, 3)).filter(b => !b.startsWith('- ')).slice(0, 3);
  const keep = /\b(about|overview|introduction|features|status|progress|what works|working|highlights|current state|roadmap|goals|compatib|known (?:issues|limitations))/i;
  const skip = /\b(build|install|requirement|rom|usage|running|licen[cs]e|credits?|contribut|donat|support|faq|troubleshoot|download)/i;
  const extra = sections.filter(s => s.level >= 2 && keep.test(s.heading) && !skip.test(s.heading)).slice(0, 2).flatMap(s => blocks(s.lines, 6));
  const out = [];
  let size = 0;
  for (const block of [...intro, ...extra]) {
    const value = block.slice(0, 600);
    // A pointer to another README section has nothing to point at here.
    if (out.includes(value) || (value.length < 160 && /\b(?:described|listed|documented|detailed|see)\b.*\b(?:under|below|above|section)\b/i.test(value))) continue;
    if (size + value.length > limit) break;
    out.push(value); size += value.length;
  }
  return out;
}
