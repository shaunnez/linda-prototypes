"""Build a GitHub Pages copy of the prototypes into ./_site.

The source uses site-absolute paths (/shared/..., /v1/...) so it runs from a
local web root. Pages serves the project under /<repo>/, so prefix those paths.
"""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '_site')
BASE = '/' + (sys.argv[1] if len(sys.argv) > 1 else os.environ.get('PAGES_BASE', 'linda-prototypes')).strip('/')
SKIP_DIRS = {'.git', '.github', '.claude', 'scripts', '_site', 'node_modules'}
TEXT_EXT = {'.html', '.js', '.css', '.json', '.webmanifest', '.svg'}
PATTERN = re.compile(r'(?<=[\"\'`(=\s,])/(shared|v1|v2|v3)/')

shutil.rmtree(OUT, ignore_errors=True)
count = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    rel = os.path.relpath(dirpath, ROOT)
    os.makedirs(os.path.join(OUT, rel), exist_ok=True)
    for name in filenames:
        if name.endswith('.md') or name == '.DS_Store':
            continue
        src, dst = os.path.join(dirpath, name), os.path.join(OUT, rel, name)
        if os.path.splitext(name)[1] in TEXT_EXT:
            with open(src, encoding='utf-8') as f:
                text, n = PATTERN.subn(BASE + r'/\1/', f.read())
            count += n
            with open(dst, 'w', encoding='utf-8') as f:
                f.write(text)
        else:
            shutil.copy2(src, dst)
open(os.path.join(OUT, '.nojekyll'), 'w').close()
print(f'Built {OUT} with base {BASE} ({count} paths rewritten)')
