#!/usr/bin/env python3
"""Standard-library-only build. Rebuild index.html after editing src/config.js."""
from pathlib import Path
import json
root = Path(__file__).resolve().parent
page = (root/'src/page.html').read_text(encoding='utf-8')
for token, name in [('CSS','style.css'),('CONFIG','config.js'),('ENGINE','engine.js'),('AUDIO','audio.js'),('QA','qa.js'),('APP','app.js')]:
    page = page.replace('/*__'+token+'__*/', (root/'src'/name).read_text(encoding='utf-8'))
art = {p.stem:p.read_text(encoding='utf-8') for p in sorted((root/'assets').glob('*.svg')) if p.stem != 'logo'}
page = page.replace('/*__ART__*/', 'window.LUMI_ART = '+json.dumps(art,ensure_ascii=False)+';')
(root/'index.html').write_text(page, encoding='utf-8')
print('Built index.html:',len(page.encode('utf-8')),'bytes; all runtime assets embedded.')
