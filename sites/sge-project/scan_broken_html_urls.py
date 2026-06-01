from pathlib import Path
import re
root = Path('.').resolve()
html_files = list(root.rglob('*.html'))
refs = []
pattern = re.compile(r'\b(?:href|src)\s*=\s*"([^"]+)"')
for html in html_files:
    txt = html.read_text(encoding='utf-8', errors='ignore')
    for m in pattern.finditer(txt):
        target = m.group(1)
        if target.startswith(('http://','https://','#','mailto:','tel:','javascript:')):
            continue
        if target.startswith('data:'):
            continue
        t = target.split('#',1)[0].split('?',1)[0]
        if t.startswith('/'):
            continue
        if t == '':
            continue
        referenced = (html.parent / t).resolve()
        exists = referenced.exists()
        refs.append((str(html.relative_to(root)), target, str(referenced.relative_to(root)) if root in referenced.parents or referenced == root else str(referenced), exists))
broken = [r for r in refs if not r[3]]
print('broken count', len(broken))
for f,t,r,e in broken:
    print(f, '->', t, '=>', r)
