from pathlib import Path

INDEX = Path('index.html')
WIDGET = Path('pmfme-dashboard-home-widget.html')
MARKER = '<!-- PMFME_OFFICIAL_DASHBOARD_HOME -->'

html = INDEX.read_text(encoding='utf-8')
widget = WIDGET.read_text(encoding='utf-8')

if MARKER in html:
    print('Homepage dashboard widget already installed.')
    raise SystemExit(0)

if '</main>' not in html.lower():
    raise SystemExit('Could not find closing </main> tag in index.html')

# Insert the official dashboard widget immediately before the homepage main element closes.
insert = '\n' + MARKER + '\n' + widget + '\n'
idx = html.lower().rfind('</main>')
html = html[:idx] + insert + html[idx:]
INDEX.write_text(html, encoding='utf-8')
print('Installed synchronized PMFME Gujarat dashboard widget on homepage.')
