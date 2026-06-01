from pathlib import Path
import re
import unicodedata

root = Path('.').resolve()
ignore_dirs = ['node_modules', '%appdata%', 'backup-html']

pattern = re.compile(r'\b(?P<attr>href|src)\s*=\s*"(?P<value>[^"]+)"')


def normalize(s: str) -> str:
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.lower()


def is_ignored(path: Path) -> bool:
    sp = str(path).lower().replace('\\', '/')
    return any(seg in sp for seg in ignore_dirs)


def resolve_target(base: Path, target: str) -> Path:
    return (base / target).resolve()


all_files = [p for p in root.rglob('*') if p.is_file()]
file_by_norm = {}
for f in all_files:
    if is_ignored(f):
        continue
    rel = str(f.relative_to(root))
    file_by_norm.setdefault(normalize(rel), []).append(f)
    file_by_norm.setdefault(normalize(f.name), []).append(f)

html_files = [p for p in all_files if p.suffix.lower() == '.html']
changed_files = []
fixable = 0
unfixable = 0

for html in sorted(html_files):
    text = html.read_text(encoding='utf-8', errors='ignore')
    new_text = text
    fixes = []
    for match in pattern.finditer(text):
        value = match.group('value')
        if value.startswith(('http://', 'https://', '#', 'mailto:', 'tel:', 'javascript:')):
            continue
        if value.startswith('data:'):
            continue
        t = value.split('#', 1)[0].split('?', 1)[0]
        if t == '':
            continue
        if t.startswith('/'):
            # absolute paths are not resolved in this script
            continue
        target_path = resolve_target(html.parent, t)
        if target_path.exists():
            continue
        query_fragment = value[len(t):]
        candidates = file_by_norm.get(normalize(t), [])
        if not candidates:
            candidates = file_by_norm.get(normalize(Path(t).name), [])
        candidates = [c for c in candidates if not is_ignored(c)]
        if not candidates:
            unfixable += 1
            continue
        best = None
        if len(candidates) == 1:
            best = candidates[0]
        else:
            # prefer same top-level directory or same folder, then shorter path
            top_folder = html.relative_to(root).parts[0] if len(html.relative_to(root).parts) > 1 else ''
            same_dir = [c for c in candidates if top_folder and str(c.relative_to(root)).split('/') and str(c.relative_to(root)).split('/')[0] == top_folder]
            if len(same_dir) == 1:
                best = same_dir[0]
            elif len(same_dir) > 1:
                best = sorted(same_dir, key=lambda p: len(str(p.relative_to(root)).split('/')))[0]
            else:
                best = sorted(candidates, key=lambda p: len(str(p.relative_to(root)).split('/')))[0]
        if best is None:
            unfixable += 1
            continue
        try:
            relpath = Path(best).relative_to(html.parent).as_posix()
        except ValueError:
            import os
            relpath = os.path.relpath(str(best), start=str(html.parent)).replace('\\', '/')
        replacement = relpath + query_fragment
        if replacement != value:
            fixes.append((value, replacement, html, best))
    if fixes:
        contents = new_text
        for old, new, _, _ in fixes:
            contents = contents.replace(f'"{old}"', f'"{new}"')
        if contents != text:
            html.write_text(contents, encoding='utf-8')
            changed_files.append((html, fixes))
            fixable += len(fixes)

print('fixed files', len(changed_files), 'fixes', fixable, 'unfixable', unfixable)
for html, fixes in changed_files[:100]:
    print(str(html.relative_to(root)))
    for old, new, _, best in fixes:
        print('  ', old, '=>', new, '=>', str(best.relative_to(root)))
