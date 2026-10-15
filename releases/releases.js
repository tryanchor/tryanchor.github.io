// The releases page: every release from the GitHub API, newest first, with its notes and installers.
// Uses $, $$, seen, size and REPO from ../script.js.
const list = $('[data-releases]');

// Release notes are Markdown: everything is escaped first, then only bold, code, links, headings and
// lists are turned back into HTML, so nothing in a release body can inject markup.
const escape = (text) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inline = (text) =>
  escape(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
function markdown(body) {
  // the checksums are shown with each download instead
  const lines = body.split('### Checksums')[0].split(/\r?\n/);
  const html = [];
  let listOpen = false;
  for (const line of lines) {
    const item = /^\s*[-*] (.*)/.exec(line);
    if (item) {
      if (!listOpen) html.push('<ul>');
      listOpen = true;
      html.push(`<li>${inline(item[1])}</li>`);
      continue;
    }
    if (listOpen) html.push('</ul>');
    listOpen = false;
    const heading = /^#{1,6} (.*)/.exec(line);
    if (heading) html.push(`<h3>${inline(heading[1])}</h3>`);
    else if (line.trim()) html.push(`<p>${inline(line)}</p>`);
  }
  if (listOpen) html.push('</ul>');
  return html.join('');
}

const element = (tag, className, text, href) => Object.assign(document.createElement(tag), { className }, text ? { textContent: text } : {}, href ? { href } : {});
const date = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function card(release, latest) {
  const article = element('article', 'release card reveal');
  const header = element('header');
  header.append(element('h2', '', `Anchor ${release.tag_name.replace(/^v/, '')}`));
  if (latest) header.append(element('span', 'badge', 'Latest'));
  const time = element('time', '', date(release.published_at));
  time.dateTime = release.published_at;
  header.append(time);
  const notes = element('div', 'notes');
  notes.innerHTML = markdown(release.body || '');
  article.append(header, notes);

  // Windows first, then the AppImages and .deb packages, x64 before ARM64 (KINDS in ../script.js)
  const installers = KINDS.map((kind) => [kind, release.assets.find((a) => kind.test.test(a.name))]).filter(([, asset]) => asset);
  if (installers.length) {
    const assets = element('div', 'assets');
    for (const [kind, asset] of installers) {
      const row = element('div', 'asset');
      const button = element('a', `btn btn-small${latest && kind.key === 'windows-x64' ? ' btn-primary' : ''}`, `${kind.label} · ${size(asset.size)}`, asset.browser_download_url);
      row.append(button);
      const hash = checksum(release.body || '', asset.name);
      if (hash && (release.body || '').includes(`virustotal.com/gui/file/${hash}`)) row.append(element('a', 'vt', 'VirusTotal scan ↗', `https://www.virustotal.com/gui/file/${hash}`));
      if (hash) row.append(element('span', 'sha', `SHA-256 ${hash}`));
      assets.append(row);
    }
    article.append(assets);
  }
  return article;
}

(async () => {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`);
    if (!response.ok) throw new Error(response.status);
    const releases = (await response.json()).filter((r) => !r.draft && !r.prerelease);
    list.replaceChildren(...releases.map((release, i) => card(release, i === 0)));
    $$('.release', list).forEach((el, i) => {
      el.style.setProperty('--d', Math.min(i, 4));
      seen.observe(el);
    });
  } catch (error) {
    console.error(error);
    // GitHub limits how often one visitor can ask; the full list is always on GitHub itself
    const fallback = element('p', 'loading');
    fallback.append('Couldn\'t load the releases right now. ', element('a', '', 'See them on GitHub', `https://github.com/${REPO}/releases`), '.');
    list.replaceChildren(fallback);
  }
})();
