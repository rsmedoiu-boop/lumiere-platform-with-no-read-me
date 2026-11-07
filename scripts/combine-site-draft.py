import re, base64, posixpath, pathlib
from urllib.parse import unquote
out = pathlib.Path('/tmp/site/out')
DEMO = 'https://claude.ai/artifact/XkfsNrHBDrXXnSe1fwBbqE'
def asset(p): return (out / unquote(p).lstrip('/')).read_bytes()
mime = {'woff2':'font/woff2','woff':'font/woff','svg':'image/svg+xml','png':'image/png'}
def css_inline(css, base):
    css = re.sub(r'@font-face\s*\{[^}]*(?:cyrillic|greek|vietnamese)[^}]*\}', '', css)
    def rep(m):
        u = m.group(1).strip('\'"')
        if u.startswith(('data:', 'http', '#')): return m.group(0)
        path = u.split('?')[0].split('#')[0]
        full = path if path.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(base), path))
        return f"url(data:{mime.get(path.rsplit('.',1)[-1],'application/octet-stream')};base64,{base64.b64encode(asset(full)).decode()})"
    return re.sub(r'url\(([^)]+)\)', rep, css)

pages = {}  # id -> (title, body)
css_hrefs = []
for f in sorted(out.rglob('*.html')):
    rel = f.relative_to(out).as_posix()
    if rel in ('404.html', '_not-found.html'): continue
    pid = 'home' if rel == 'index.html' else rel[:-5].replace('/', '-')
    html = f.read_text()
    for h in re.findall(r'<link rel="stylesheet" href="(/_next/[^"]+)"', html):
        if h not in css_hrefs: css_hrefs.append(h)
    title = re.search(r'<title>(.*?)</title>', html).group(1)
    body = re.search(r'<body[^>]*>(.*)</body>', html, re.S).group(1)
    body = re.sub(r'<script\b[^>]*>.*?</script>', '', body, flags=re.S)
    body = re.sub(r'<link [^>]*>', '', body)
    pages[pid] = (title, body)

def route(href):
    path = href.split('#')[0].split('?')[0].rstrip('/') or '/'
    if path.startswith('/e/'): return DEMO
    if path.startswith(('/dashboard', '/admin')): return '#login'
    pid = 'home' if path == '/' else path.lstrip('/').replace('/', '-')
    return f'#{pid}' if pid in pages else '#home'

def fix_links(body):
    body = re.sub(r'href="(/[^"]*)"', lambda m: f'href="{route(m.group(1))}"' + (' target="_blank" rel="noopener"' if m.group(1).startswith('/e/') else ''), body)
    return body

css = ''.join(css_inline(asset(h).decode(), h) for h in css_hrefs)
sections = []
for pid, (title, body) in pages.items():
    t = title.replace('"', '&quot;')
    sections.append(f'<div class="draft-page flex min-h-full flex-col" data-page="{pid}" data-title="{t}" hidden>{fix_links(body)}</div>')

script = r"""
(function () {
  var pages = Array.prototype.slice.call(document.querySelectorAll('.draft-page'));
  function show() {
    var id = (location.hash || '#home').slice(1);
    var target = pages.find(function (p) { return p.dataset.page === id; }) || pages.find(function (p) { return p.dataset.page === 'home'; });
    pages.forEach(function (p) { p.hidden = p !== target; });
    document.title = target.dataset.title;
    window.scrollTo(0, 0);
    closeMenu();
  }
  // Mobile menu (the live site uses React; this draft is static HTML).
  var menu;
  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button[aria-controls="mobile-menu"]');
    if (btn) {
      if (menu) { closeMenu(); btn.textContent = 'Menu'; btn.setAttribute('aria-expanded', 'false'); return; }
      var header = btn.closest('header');
      var links = header.querySelectorAll('nav[aria-label="Main"] a');
      menu = document.createElement('nav');
      menu.className = 'absolute inset-x-0 top-16 border-b border-line bg-paper px-5 pb-6 pt-2 shadow-sm';
      var html = '<ul class="grid gap-1">';
      Array.prototype.forEach.call(links, function (a) { html += '<li><a class="block py-3 font-display text-2xl" href="' + a.getAttribute('href') + '">' + a.textContent + '</a></li>'; });
      html += '<li><a class="block py-3 font-display text-2xl" href="#login">Sign in</a></li></ul>';
      menu.innerHTML = html;
      header.appendChild(menu);
      btn.textContent = 'Close'; btn.setAttribute('aria-expanded', 'true');
    }
    var cookie = e.target.closest('footer button');
    if (cookie && cookie.textContent.indexOf('Cookie') === 0) { e.preventDefault(); document.getElementById('draft-cookie').hidden = false; }
    var close = e.target.closest('[data-cookie-close]');
    if (close) document.getElementById('draft-cookie').hidden = true;
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target, note = form.querySelector('.draft-note');
    if (!note) { note = document.createElement('p'); note.className = 'draft-note border-l-2 border-foil bg-paper px-3 py-2 text-sm'; form.prepend(note); }
    note.textContent = 'Design draft: accounts are not connected in this preview.';
  });
  window.addEventListener('hashchange', show);
  show();
})();
"""

cookie = '''<section id="draft-cookie" hidden role="dialog" aria-labelledby="cookie-title" class="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl border border-line bg-paper p-5 md:p-6 shadow-[0_12px_40px_-20px_rgba(28,34,56,0.45)] md:inset-x-auto md:right-6 md:bottom-6">
<h2 id="cookie-title" class="text-xl md:text-2xl">Cookies on this site</h2>
<p class="mt-2 text-sm text-ink-soft">We use essential cookies to keep you signed in and keep the site secure. With your permission we'd also measure visits anonymously to improve our designs.</p>
<label class="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked disabled class="mt-1"><span><span class="font-medium">Essential</span>, always on: sign-in, security, your cookie choice.</span></label>
<label class="mt-2 flex items-start gap-3 text-sm"><input type="checkbox" class="mt-1"><span><span class="font-medium">Analytics</span>, optional: anonymous visit counts.</span></label>
<div class="mt-4 flex flex-wrap gap-2"><button class="btn btn-quiet" data-cookie-close>Essential only</button><button class="btn btn-quiet" data-cookie-close>Save choices</button><button class="btn btn-primary" data-cookie-close>Accept all</button></div>
</section>'''

doc = f'''<!DOCTYPE html>
<html lang="en-GB" class="h-full"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maison Lumière — website draft</title><meta name="robots" content="noindex">
<style>{css}</style></head>
<body class="flex min-h-full flex-col">{''.join(sections)}{cookie}<script>{script}</script></body></html>'''
pathlib.Path('/home/claude/site-draft').mkdir(exist_ok=True)
pathlib.Path('/home/claude/site-draft/index.html').write_text(doc)
print('pages', len(pages), list(pages)[:25]); print('bytes', len(doc), 'U+FFFD', doc.count('�'))
left = re.findall(r'(?:src|href)="(/[^"]*)"', doc); print('unrewritten local links:', left[:10])
