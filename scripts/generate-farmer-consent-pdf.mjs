import { writeFileSync } from 'node:fs';

const blocks = [
  { text: 'FARMER DATA AND PARTICIPATION CONSENT', bold: true, size: 16 },
  { text: 'Please read this agreement, or ask someone you trust to explain it to you, before you decide.' },
  { text: '1. Information collected', bold: true, size: 12 },
  { text: 'I understand that my cooperative and CollabFarm Finance may collect and use my name, contact details, date of birth, National Identification Number (NIN), identity document or photo, membership and farming information, and bank details.' },
  { text: '2. Why it is used', bold: true, size: 12 },
  { text: 'This information is used to register and verify me, manage my cooperative membership, prepare and administer project participation and agreements, keep required records, and arrange payments where applicable.' },
  { text: '3. Who may receive information', bold: true, size: 12 },
  { text: 'My cooperative, authorised CollabFarm Finance staff and reviewers, and service providers helping with identity checks or payments may receive information needed for their work. Investors may see limited project and general farm information. They will not see my NIN, phone number, exact address, or bank details.' },
  { text: '4. My choices and privacy rights', bold: true, size: 12 },
  { text: 'I am choosing to agree freely. I may withdraw my consent or ask to access or correct my information by contacting my cooperative or CollabFarm Finance through the platform privacy contact channels. Withdrawal does not undo processing already carried out and may affect registration, project participation, or payment where the information is needed. I may also raise a privacy concern with the Nigeria Data Protection Commission.' },
  { text: 'My information will be handled under the platform privacy policy and applicable requirements. Consent does not guarantee project funding, profit, or returns.' },
  { text: '5. My agreement', bold: true, size: 12 },
  { text: 'I have read this agreement or had it explained in a language I understand. I had a chance to ask questions. I understand what information is used, why it is used, and who may receive it. I agree to the uses described above.' },
  { text: 'Farmer full name: __________________________________________________________' },
  { text: 'Signature or thumbprint: _________________________________   Date: ______________' },
  { text: 'Cooperative representative: ______________________________   Date: ______________' },
  { text: 'Keep a copy of this agreement. Read the platform Privacy Policy for more information.' },
];

const wrap = (text, width = 92) => {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > width) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
};

const lines = blocks.flatMap((block) => wrap(block.text).map((text, index) => ({
  text, bold: block.bold && index === 0, size: block.size || 10, gap: index === 0 ? 5 : 0,
})));
const pages = [];
let page = [];
let y = 748;
for (const line of lines) {
  const needed = line.size + 4 + line.gap;
  if (y - needed < 48 && page.length) { pages.push(page); page = []; y = 748; }
  page.push({ ...line, y: y - line.gap });
  y -= needed;
}
if (page.length) pages.push(page);

const objects = [];
const add = (value) => { objects.push(value); return objects.length; };
const catalogId = add('');
const pagesId = add('');
const regularFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
const boldFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
const pageIds = [];
for (const pageLines of pages) {
  const stream = pageLines.map((line) => {
    const font = line.bold ? 'F2' : 'F1';
    const text = line.text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
    return `BT /${font} ${line.size} Tf 54 ${line.y} Td (${text}) Tj ET`;
  }).join('\n');
  const streamId = add(`<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`);
  const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
  pageIds.push(pageId);
}
objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

let pdf = '%PDF-1.4\n';
const offsets = [0];
objects.forEach((object, index) => {
  offsets.push(Buffer.byteLength(pdf, 'ascii'));
  pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
});
const xrefOffset = Buffer.byteLength(pdf, 'ascii');
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
writeFileSync(new URL('../public/farmer-consent-agreement.pdf', import.meta.url), Buffer.from(pdf, 'ascii'));
