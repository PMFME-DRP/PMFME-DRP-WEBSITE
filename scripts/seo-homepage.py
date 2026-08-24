from pathlib import Path
import re

INDEX = Path('index.html')
html = INDEX.read_text(encoding='utf-8')

TITLE = 'PMFME Gujarat | PMFME Scheme, Subsidy & Application Guide'
DESCRIPTION = ('PMFME Gujarat: official scheme information, subsidy and eligibility guidance, '
               'application process, Gujarat district resources, ODOP information and live PMFME dashboard.')
CANONICAL = 'https://www.pmfmegujarat.in/'

html = re.sub(r'<title>.*?</title>', f'<title>{TITLE}</title>', html, count=1, flags=re.I|re.S)
html = re.sub(r'<meta\s+name=["\']description["\']\s+content=["\'][^"\']*["\']\s*/?>',
              f'<meta name="description" content="{DESCRIPTION}">', html, count=1, flags=re.I)

head_marker = '</head>'
if head_marker.lower() not in html.lower():
    raise SystemExit('Could not find closing </head> tag in index.html')

# Remove a previous SEO block so the script remains idempotent.
html = re.sub(r'\n?<!-- PMFME_HOME_SEO_START -->.*?<!-- PMFME_HOME_SEO_END -->\n?', '\n', html, count=1, flags=re.I|re.S)

seo = f'''<!-- PMFME_HOME_SEO_START -->
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta property="og:type" content="website">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{DESCRIPTION}">
<meta property="og:url" content="{CANONICAL}">
<meta property="og:site_name" content="PMFME Gujarat">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{TITLE}">
<meta name="twitter:description" content="{DESCRIPTION}">
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@graph": [
    {{
      "@type": "WebSite",
      "@id": "{CANONICAL}#website",
      "url": "{CANONICAL}",
      "name": "PMFME Gujarat",
      "description": "{DESCRIPTION}",
      "inLanguage": ["en", "gu", "hi"]
    }},
    {{
      "@type": "WebPage",
      "@id": "{CANONICAL}#webpage",
      "url": "{CANONICAL}",
      "name": "{TITLE}",
      "isPartOf": {{"@id": "{CANONICAL}#website"}},
      "description": "{DESCRIPTION}",
      "inLanguage": "en"
    }}
  ]
}}
</script>
<!-- PMFME_HOME_SEO_END -->
'''
idx = html.lower().index(head_marker.lower())
html = html[:idx] + seo + html[idx:]
INDEX.write_text(html, encoding='utf-8')
print('Applied homepage SEO metadata and structured data.')
