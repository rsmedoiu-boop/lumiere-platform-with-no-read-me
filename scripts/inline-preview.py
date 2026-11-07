import re, base64, sys, pathlib

MEDIA_MIME = {'webp':'image/webp','png':'image/png','jpg':'image/jpeg','mp4':'video/mp4','svg':'image/svg+xml'}
def inline_media(html, public_dir):
    import base64, pathlib, re
    def rep(m):
        attr, path = m.group(1), m.group(2)
        f = pathlib.Path(public_dir) / path.lstrip('/')
        ext = path.rsplit('.', 1)[-1]
        return f'{attr}="data:{MEDIA_MIME[ext]};base64,{base64.b64encode(f.read_bytes()).decode()}"'
    return re.sub(r'(src|poster)="(/media/[^"]+)"', rep, html)
out = pathlib.Path(sys.argv[1]); src = out / sys.argv[2]; dest = pathlib.Path(sys.argv[3])
html = src.read_text()
from urllib.parse import unquote
def asset(p): return (out / unquote(p).lstrip("/")).read_bytes()
mime = {'woff2':'font/woff2','woff':'font/woff','svg':'image/svg+xml','png':'image/png','jpg':'image/jpeg','webp':'image/webp'}
import posixpath
def css_inline(css, base):
    # Drop non-Latin font subsets to keep the page small.
    css = re.sub(r'@font-face\s*\{[^}]*(?:cyrillic|greek|vietnamese)[^}]*\}', '', css)
    def rep(m):
        u = m.group(1).strip('\'"')
        if u.startswith('data:') or u.startswith('http') or u.startswith('#'): return m.group(0)
        path = u.split('?')[0].split('#')[0]
        full = path if path.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(base), path))
        ext = path.rsplit('.',1)[-1]
        return f"url(data:{mime.get(ext,'application/octet-stream')};base64,{base64.b64encode(asset(full)).decode()})"
    return re.sub(r'url\(([^)]+)\)', rep, css)
# stylesheets
def style_rep(m):
    href = m.group(1)
    return '<style>' + css_inline(asset(href).decode(), href) + '</style>'
html = re.sub(r'<link rel="stylesheet" href="(/_next/[^"]+)"[^>]*/?>', style_rep, html)
# drop preloads
html = re.sub(r'<link rel="(?:preload|modulepreload)"[^>]*/?>', '', html)
# scripts
def script_rep(m):
    js = asset(m.group(1)).decode().replace('</script', '<\\/script').replace('\ufffd', '\\ufffd')
    return '<script>' + js + '</script>'
html = re.sub(r'<script src="(/_next/[^"]+)"[^>]*></script>', script_rep, html)
html = inline_media(html, out)
dest.write_text(html)
left = re.findall(r'(?:src|href)="(/_next/[^"]+)"', html)
print('bytes', len(html), 'remaining /_next refs:', left[:5])
