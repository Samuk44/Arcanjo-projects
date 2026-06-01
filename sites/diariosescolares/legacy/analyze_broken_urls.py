from pathlib import Path
import re, unicodedata

root = Path('.').resolve()
html_files = list(root.rglob('*.html'))
pattern = re.compile(r'\b(?:href|src)\s*=\s*"([^"]+)"')


def normalize(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.lower()

all_files = [f for f in root.rglob('*') if f.is_file()]
file_map = {}
for f in all_files:
    file_map.setdefault(normalize(str(f.relative_to(root))), []).append(f)
    file_map.setdefault(normalize(f.name), []).append(f)

broken = []
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
        if referenced.exists():
            continue
        broken.append((html, target, t))

print('broken count', len(broken))
for html, target, t in broken[:200]:
    candidates = file_map.get(normalize(t), [])
    if not candidates:
        candidates = file_map.get(normalize(Path(t).name), [])
    best = None
    if len(candidates) == 1:
        best = candidates[0]
    elif candidates:
        candidates_sorted = sorted(
            candidates,
            key=lambda p: (
                (('backup-html' in str(p).lower()) or ('%appdata%' in str(p).lower()) or ('node_modules' in str(p).lower())),
                len(str(p.relative_to(root)).split('\\'))
            )
        )
        best = candidates_sorted[0]
    print(str(html.relative_to(root)), '->', target, '=>', t, 'candidates', len(candidates), 'best', best.relative_to(root) if best else None)
