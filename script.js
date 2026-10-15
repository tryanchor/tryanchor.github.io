// Anchor website: scroll reveals, the hero screenshot's tilt, the benchmark race, counters, the FAQ,
// and download buttons that always point at the newest installer for the visitor's PC.
// Every movement goes through an easing curve or a spring; nothing moves at a constant speed.
const REPO = 'realhenners/anchor-releases';
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = {
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
};
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// ---------- reveal on scroll ----------
const seen = new IntersectionObserver((items) => {
  for (const item of items) {
    if (!item.isIntersecting) continue;
    item.target.classList.add('in');
    seen.unobserve(item.target);
  }
}, { rootMargin: '0px 0px -8% 0px' });
$$('.reveal').forEach((el) => seen.observe(el));

// ---------- the hero screenshot straightens up as it scrolls into view ----------
const shot = $('[data-tilt]');
function tilt() {
  const top = shot.getBoundingClientRect().top;
  // fully tilted when the screenshot sits low on screen, flat once it reaches a third of the way up
  const k = ease.inOutCubic(clamp((innerHeight * 0.95 - top) / (innerHeight * 0.6)));
  shot.style.transform = `rotateX(${(1 - k) * 26}deg) scale(${0.9 + k * 0.1})`;
}
if (!calm) {
  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      tilt();
    });
  }, { passive: true });
  tilt();
}

// ---------- the race: measured times, played back in real time ----------
// bench-results.json, ZIP archives, best of three runs, milliseconds: Anchor, WinRAR, 7-Zip
const SETS = {
  small: { times: [2549, 5251, 5870], caption: 'A ZIP with 4,000 small files, played back in real time.' },
  mod: { times: [610, 1460, 1020], caption: 'A game mod pack: 603 files, 200 MB, played back in real time.' },
  large: { times: [406, 583, 354], caption: 'One 200 MB file: every tool waits on decompression, and 7-Zip is a little quicker here.' },
};
const race = $('[data-race]');
const lanes = $$('.lane', race);
let raceRun = 0;
function runRace(name) {
  const { times, caption } = SETS[name];
  $('[data-race-caption]').textContent = caption;
  const run = ++raceRun;
  const longest = Math.max(...times);
  const start = performance.now() + 250;
  lanes.forEach((lane) => $('.time', lane).classList.remove('done'));
  const frame = (now) => {
    if (run !== raceRun) return;
    const elapsed = calm ? Infinity : now - start;
    lanes.forEach((lane, i) => {
      const total = times[i];
      // bars on an ease-in-out that lands exactly on the measured time; the clocks are real time
      const k = elapsed <= 0 ? 0 : ease.inOutSine(clamp(elapsed / total));
      $('.fill', lane).style.width = `${(k * 100 * total) / longest}%`;
      $('.time', lane).textContent = `${(clamp(elapsed, 0, total) / 1000).toFixed(2)} s`;
      if (elapsed >= total) $('.time', lane).classList.add('done');
    });
    if (elapsed < longest) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
let current = 'small';
new IntersectionObserver((items, observer) => {
  if (!items[0].isIntersecting) return;
  observer.disconnect();
  runRace(current);
}, { threshold: 0.6 }).observe(race);
$$('[data-set]').forEach((tab) =>
  tab.addEventListener('click', () => {
    $$('[data-set]').forEach((other) => other.setAttribute('aria-selected', String(other === tab)));
    current = tab.dataset.set;
    runRace(current);
  })
);
$('[data-race-replay]').addEventListener('click', () => runRace(current));

// ---------- counters ease up to their value ----------
const counted = new IntersectionObserver((items) => {
  for (const item of items) {
    if (!item.isIntersecting) continue;
    counted.unobserve(item.target);
    const el = item.target;
    const target = Number(el.dataset.count);
    const decimals = el.dataset.decimals === undefined ? 1 : Number(el.dataset.decimals);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const step = (now) => {
      const k = calm ? 1 : ease.outExpo(clamp((now - start) / 1600));
      el.textContent = `${(target * k).toFixed(decimals)}${suffix}`;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}, { threshold: 0.8 });
$$('[data-count]').forEach((el) => counted.observe(el));

// ---------- all the numbers ----------
const NUMBERS = [
  ['4,000 small files', [['ZIP', 2549, 5870, 5251], ['7Z', 2355, 5776, null], ['RAR', 2556, 5121, 3751], ['TAR.GZ', 2166, 5777, 10851], ['TAR.ZST', 3327, 6486, 10948]]],
  ['Mod pack, 603 files, 200 MB', [['ZIP', 610, 1020, 1460], ['7Z', 687, 1078, 11692], ['RAR', 671, 1033, 961], ['TAR.GZ', 539, 1203, 2406], ['TAR.ZST', 663, 1191, 1809]]],
  ['8 large files, 320 MB', [['ZIP', 325, 515, 879], ['7Z', 402, 318, 827], ['RAR', 374, 275, 260], ['TAR.GZ', 640, 827, 1204], ['TAR.ZST', 260, 434, 320]]],
  ['1 large file, 200 MB', [['ZIP', 406, 354, 583], ['7Z', 312, 244, 335], ['RAR', 641, 566, 326], ['TAR.GZ', 448, 550, 759], ['TAR.ZST', 205, 298, 238]]],
];
const seconds = (ms) => (ms === null ? 'over 2 min' : `${(ms / 1000).toFixed(2)} s`);
$('[data-numbers]').innerHTML = `<thead><tr><th>Archive</th><th>Anchor</th><th>7-Zip 26.04</th><th>WinRAR 7.23</th></tr></thead><tbody>${NUMBERS.flatMap(([set, rows]) =>
  rows.map(([format, ...times]) => {
    const best = Math.min(...times.filter((t) => t !== null));
    return `<tr><td>${set} · ${format}</td>${times.map((t) => `<td>${t === best ? `<b>${seconds(t)}</b>` : seconds(t)}</td>`).join('')}</tr>`;
  })
).join('')}</tbody>`;

// ---------- FAQ answers open and close on an eased height ----------
$$('details').forEach((details) => {
  const summary = $('summary', details);
  const body = summary.nextElementSibling;
  summary.addEventListener('click', (event) => {
    if (calm) return;
    event.preventDefault();
    const opening = !details.open;
    if (opening) details.open = true;
    const full = body.scrollHeight;
    const animation = body.animate(
      [{ height: `${opening ? 0 : full}px`, opacity: opening ? 0 : 1 }, { height: `${opening ? full : 0}px`, opacity: opening ? 1 : 0 }],
      { duration: opening ? 520 : 360, easing: opening ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'cubic-bezier(0.65, 0, 0.35, 1)' }
    );
    animation.onfinish = () => {
      if (!opening) details.open = false;
    };
  });
});

// ---------- downloads: the newest release, the right installer for this PC ----------
const size = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
async function architecture() {
  // Chromium browsers say whether the PC is ARM; others are almost always x64
  try {
    const { architecture: arch } = await navigator.userAgentData.getHighEntropyValues(['architecture']);
    return arch === 'arm' ? 'arm64' : 'x64';
  } catch {
    return 'x64';
  }
}
async function downloads() {
  const windows = /Windows/i.test(navigator.userAgent) && !/Windows Phone/i.test(navigator.userAgent);
  if (!windows) $('[data-platform-note]').hidden = false;
  let release;
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
    if (!response.ok) throw new Error(response.status);
    release = await response.json();
  } catch {
    return; // the buttons keep pointing at the latest release page
  }
  const version = release.tag_name.replace(/^v/, '');
  const builds = {
    x64: release.assets.find((a) => /Setup-[\d.]+\.exe$/.test(a.name)),
    arm64: release.assets.find((a) => /-arm64\.exe$/.test(a.name)),
  };
  // the release notes list each installer's SHA-256 and its VirusTotal scan
  const sha = (name) => (release.body.match(new RegExp(`${name.replace(/\./g, '\\.')} \\| \`([0-9a-f]{64})\``)) || [])[1];
  let arch = await architecture();
  const point = () => {
    const build = builds[arch] || builds.x64;
    if (!build) return;
    $$('[data-download]').forEach((a) => {
      a.href = build.browser_download_url;
      a.removeAttribute('target');
    });
    $$('[data-download-meta]').forEach((p) => (p.textContent = `Version ${version} · ${arch === 'arm64' ? 'ARM64' : 'x64'} · ${size(build.size)} · Windows 10 and 11`));
    const other = arch === 'arm64' ? 'x64' : 'ARM64';
    const switcher = $('[data-arch-switch]');
    switcher.hidden = !builds.arm64 || !windows;
    switcher.textContent = `Need the ${other} version?`;
  };
  $('[data-arch-switch]').addEventListener('click', () => {
    arch = arch === 'arm64' ? 'x64' : 'arm64';
    point();
  });
  point();
  // the full list with checksums
  $('[data-version]').textContent = `· version ${version}`;
  // built with DOM methods: names and links come from the GitHub API
  const make = (tag, className, text, href) => Object.assign(document.createElement(tag), { className, textContent: text }, href ? { href } : {});
  $('[data-file-list]').replaceChildren(...Object.entries(builds)
    .filter(([, build]) => build)
    .map(([name, build]) => {
      const row = make('div', 'file');
      row.append(make('a', 'name', build.name, build.browser_download_url), make('span', 'size', `${name === 'arm64' ? 'ARM64' : 'x64'} · ${size(build.size)}`));
      const hash = sha(build.name);
      if (hash) row.append(make('span', 'sha', `SHA-256 ${hash}`), make('a', 'vt', 'VirusTotal scan ↗', `https://www.virustotal.com/gui/file/${hash}`));
      return row;
    }));
  $('[data-files]').hidden = false;
  seen.observe($('[data-files]'));
}
downloads();
