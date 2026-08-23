from pathlib import Path

INDEX = Path('index.html')
WIDGET = Path('pmfme-dashboard-home-widget.html')
MARKER = '<!-- PMFME_OFFICIAL_DASHBOARD_HOME -->'

html = INDEX.read_text(encoding='utf-8')
widget = WIDGET.read_text(encoding='utf-8')

if '</main>' not in html.lower():
    raise SystemExit('Could not find closing </main> tag in index.html')

idx = html.lower().rfind('</main>')
if MARKER in html:
    # The dashboard is the final block inside <main>. Replace that block so every
    # data synchronization also refreshes the SEO-readable homepage snapshot.
    start = html.index(MARKER)
    html = html[:start] + MARKER + '\n' + widget + '\n' + html[idx:]
    print('Refreshed synchronized PMFME Gujarat dashboard widget on homepage.')
else:
    insert = '\n' + MARKER + '\n' + widget + '\n'
    html = html[:idx] + insert + html[idx:]
    print('Installed synchronized PMFME Gujarat dashboard widget on homepage.')

INDEX.write_text(html, encoding='utf-8')
