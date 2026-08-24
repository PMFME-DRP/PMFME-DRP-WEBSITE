const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SOURCE_URL = 'https://pmfme.mofpi.gov.in/sitesubsite/#/state/gujarat';
const OUT = path.join(process.cwd(), 'data', 'pmfme-gujarat-dashboard.json');

function numberFrom(value) {
  if (!value) return null;
  const m = String(value).replace(/,/g, '').match(/\d+/);
  return m ? Number(m[0]) : null;
}

function sectionTotal(text, label) {
  const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(([^)]+)\\)', 'i');
  const m = text.match(re);
  return m ? numberFrom(m[1]) : null;
}

function yearRows(text, startLabel, nextLabels) {
  const start = text.toLowerCase().indexOf(startLabel.toLowerCase());
  if (start < 0) return [];
  const tail = text.slice(start);
  let end = tail.length;
  for (const label of nextLabels) {
    const i = tail.toLowerCase().indexOf(label.toLowerCase(), startLabel.length);
    if (i > 0) end = Math.min(end, i);
  }
  const block = tail.slice(0, end);
  const rows = [];
  for (const line of block.split(/\n+/)) {
    const m = line.trim().match(/^(20\d{2}-\d{2})\s+(\d[\d,]*)$/);
    if (m) rows.push({ year: m[1], value: Number(m[2].replace(/,/g, '')) });
  }
  return rows;
}

function topFive(text, label) {
  const start = text.toLowerCase().indexOf(label.toLowerCase());
  if (start < 0) return [];
  const block = text.slice(start, start + 500);
  const rows = [];
  for (const line of block.split(/\n+/)) {
    const m = line.trim().match(/^(.+?)\s+(\d[\d,]*)$/);
    if (!m) continue;
    const name = m[1].trim();
    if (/^(Top 5|Applications|Loan|ODOP|Non ODOP|Website|Government|Helpline)/i.test(name)) continue;
    rows.push({ name, value: Number(m[2].replace(/,/g, '')) });
    if (rows.length === 5) break;
  }
  return rows;
}

async function loadDashboard(page) {
  const attempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      console.log(`Dashboard fetch attempt ${attempt}/${attempts}`);
      await page.goto(SOURCE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });

      // The source is an SPA; wait for actual dashboard content rather than
      // relying on one exact heading/capitalization.
      await page.waitForFunction(() => {
        const text = document.body?.innerText || '';
        return /Applications Submitted/i.test(text) &&
               /Loan Sanctioned/i.test(text);
      }, { timeout: 120000 });

      // Give charts/tables time to finish rendering before reading the DOM.
      await page.waitForTimeout(7000);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt < attempts) await page.waitForTimeout(5000);
    }
  }

  throw lastError;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  try {
    await loadDashboard(page);

    const rawText = await page.locator('body').innerText();
    const data = {
      sourceUrl: SOURCE_URL,
      syncedAt: new Date().toISOString(),
      sourceAttribution: 'Website Content Managed by Ministry of Food Processing Industries, Government of India. Designed, Developed and Hosted by National Informatics Centre (NIC).',
      helpline: '+91-8168001500',
      title: 'PMFME Gujarat Dashboard',
      totals: {
        applicationsSubmitted: sectionTotal(rawText, 'Applications Submitted'),
        loanSanctioned: sectionTotal(rawText, 'Loan Sanctioned'),
        loanDisbursed: sectionTotal(rawText, 'Loan Disbursed'),
        applicationsForwardedToBank: sectionTotal(rawText, 'Applications Forwarded To Bank'),
        odopApplications: sectionTotal(rawText, 'ODOP Applications'),
        nonOdopApplications: sectionTotal(rawText, 'Non ODOP Applications')
      },
      yearly: {
        applicationsSubmitted: yearRows(rawText, 'Applications Submitted', ['Loan Sanctioned']),
        loanSanctioned: yearRows(rawText, 'Loan Sanctioned', ['Loan Disbursed']),
        loanDisbursed: yearRows(rawText, 'Loan Disbursed', ['Applications submitted in last seven days']),
        applicationsForwardedToBank: yearRows(rawText, 'Applications Forwarded To Bank', ['ODOP Applications']),
        odopApplications: yearRows(rawText, 'ODOP Applications', ['Non ODOP Applications']),
        nonOdopApplications: yearRows(rawText, 'Non ODOP Applications', ['Top 5 Performing DLCs'])
      },
      topPerformers: {
        dlcs: topFive(rawText, 'Top 5 Performing DLCs'),
        districts: topFive(rawText, 'Top 5 Performing Districts'),
        drps: topFive(rawText, 'Top 5 Performing DRPs')
      },
      rawText
    };

    const populatedTotals = Object.values(data.totals).filter(value => value !== null).length;
    if (populatedTotals < 2) {
      throw new Error('Dashboard loaded but expected KPI totals were not detected; refusing to overwrite existing data.');
    }

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify({ syncedAt: data.syncedAt, totals: data.totals }, null, 2));
  } finally {
    await browser.close();
  }
})();
