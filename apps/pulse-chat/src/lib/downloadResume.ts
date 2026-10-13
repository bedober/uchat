import type { Resume } from '../components/ResumeView';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const range = (s: string, e: string) => [s, e || (s ? 'Present' : '')].filter(Boolean).join(' – ');

export function downloadResume(name: string, email: string | undefined, r: Resume) {
  const contact = [r.location, email, r.website.replace(/^https?:\/\//, '')].filter(Boolean).map(esc).join(' · ');
  const exp = r.experience.map((e) => `<div class="item"><div class="row"><b>${esc(e.title)}</b><span>${esc(range(e.start, e.end))}</span></div>
    ${e.org ? `<div class="sub">${esc(e.org)}</div>` : ''}${e.description ? `<p>${esc(e.description)}</p>` : ''}</div>`).join('');
  const edu = r.education.map((e) => `<div class="item"><div class="row"><b>${esc(e.school)}</b><span>${esc(range(e.start, e.end))}</span></div>
    ${e.degree ? `<div class="sub">${esc(e.degree)}</div>` : ''}</div>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)} – Resume</title><style>
    @page{size:A4;margin:18mm}body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;max-width:760px;margin:24px auto;padding:0 16px;line-height:1.45}
    h1{font-size:28px;margin:0}.head{font-size:15px;margin:2px 0}.contact{color:#555;font-size:13px}
    h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin:22px 0 8px;color:#333}
    .item{margin-bottom:10px;break-inside:avoid}.row{display:flex;justify-content:space-between;gap:12px}.row span{color:#666;font-size:13px;white-space:nowrap}
    .sub{font-style:italic;font-size:14px}p{margin:4px 0;white-space:pre-wrap;font-size:14px}
  </style></head><body>
    <h1>${esc(name)}</h1>${r.headline ? `<div class="head">${esc(r.headline)}</div>` : ''}<div class="contact">${contact}</div>
    ${r.about ? `<h2>Profile</h2><p>${esc(r.about)}</p>` : ''}
    ${exp ? `<h2>Experience</h2>${exp}` : ''}${edu ? `<h2>Education</h2>${edu}` : ''}
    ${r.skills.length ? `<h2>Skills</h2><p>${r.skills.map(esc).join(' · ')}</p>` : ''}
    <script>window.onload=()=>{window.print()}</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
