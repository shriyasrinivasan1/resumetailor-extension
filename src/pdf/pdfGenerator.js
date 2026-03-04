/**
 * pdfGenerator.js — ATS-friendly single-column PDF resume
 *
 * Font: Times (built-in jsPDF serif — closest to Garamond without custom embedding).
 * Auto-fits to exactly one page using a two-pass approach:
 *   Pass 1 — render at scale=1.0 to measure total content height
 *   Pass 2 — render at scale = available_height / content_height (capped at 1.0)
 *
 * Spec: Letter (8.5×11"), 0.5" top/bottom, 0.6" left/right, single column.
 * Section order: Header → Education → Experience → Projects → Leadership → Technical Skills
 */

import { jsPDF } from 'jspdf';

// ── Page constants ────────────────────────────────────────────────────────────
const PAGE_W = 215.9;  // 8.5"
const PAGE_H = 279.4;  // 11.0"
const MT     = 12.7;   // 0.5" top
const MB     = 12.7;   // 0.5" bottom
const ML     = 15.24;  // 0.6" left
const MR     = 15.24;  // 0.6" right
const CW     = PAGE_W - ML - MR;
const FONT   = 'times';

// ── Date helpers ──────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(str) {
  if (!str) return '';
  const m = String(str).match(/^(\d{4})-(\d{2})$/);
  if (m) return `${MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`;
  return String(str);
}

function dateRange(start, end) {
  return [fmt(start), fmt(end)].filter(Boolean).join(' – ');
}

// ── Degree / major helpers ────────────────────────────────────────────────────
const DEGREE_MAP = {
  'B.S.': 'Bachelor of Science',   'B.A.': 'Bachelor of Arts',
  'M.S.': 'Master of Science',     'M.A.': 'Master of Arts',
  'M.B.A.': 'Master of Business Administration',
  'Ph.D.': 'Doctor of Philosophy', "Associate's": "Associate's Degree",
};
const expandDegree = (d) => DEGREE_MAP[d] || d || '';

function majorLine(edu) {
  const parts = [];
  if (edu.majors?.length) parts.push(`Major${edu.majors.length > 1 ? 's' : ''} in ${edu.majors.join(' and ')}`);
  if (edu.minors?.length) parts.push(`Minor in ${edu.minors.join(', ')}`);
  return parts.join('; ');
}

// ── Main export ───────────────────────────────────────────────────────────────
export function generatePDF(resumeJson, filename = 'tailored-resume.pdf') {
  // Pass 1: measure content height with no page breaks, scale = 1.0
  const measureDoc = new jsPDF({ unit: 'mm', format: [PAGE_W, PAGE_H] });
  const rawEndY = renderAll(measureDoc, resumeJson, 1.0, false);

  // Compute scale factor needed to fit one page (8% safety buffer)
  const available = PAGE_H - MT - MB;
  const contentH  = rawEndY - MT;
  const scale = contentH > available ? (available / contentH) * 0.92 : 1.0;

  // Pass 2: render at final scale with proper page guards
  const doc = new jsPDF({ unit: 'mm', format: [PAGE_W, PAGE_H] });
  renderAll(doc, resumeJson, scale, true);
  doc.save(filename);
}

// ── Core renderer (shared by both passes) ─────────────────────────────────────
function renderAll(doc, resumeJson, scale, addPages) {
  let y = MT;

  const S  = (n) => n * scale;
  const LH = (pt) => S(pt) * 0.35 + S(0.8);

  // ── Guard ──────────────────────────────────────────────────────────────────
  function guard(needed) {
    if (!addPages) return;
    if (y + (needed ?? S(6)) > PAGE_H - MB) { doc.addPage(); y = MT; }
  }

  // ── Write a line (with word-wrap) ──────────────────────────────────────────
  function write(text, { x = ML, size = 10, style = 'normal', center = false } = {}) {
    doc.setFontSize(S(size));
    doc.setFont(FONT, style);
    const wrapped = doc.splitTextToSize(String(text), CW - (x - ML));
    for (const l of wrapped) {
      guard(LH(size) + S(0.3));
      doc.text(l, center ? PAGE_W / 2 : x, y, center ? { align: 'center' } : {});
      y += LH(size);
    }
  }

  // ── Two-column row: styled left + normal right ─────────────────────────────
  function twoCol(left, right, { leftStyle = 'bold', size = 10 } = {}) {
    guard(LH(size) + S(0.5));
    doc.setFontSize(S(size));
    doc.setFont(FONT, leftStyle);
    doc.text(String(left), ML, y);
    doc.setFont(FONT, 'normal');
    const rw = doc.getTextWidth(String(right));
    doc.text(String(right), PAGE_W - MR - rw, y);
    y += LH(size) + S(0.1);
  }

  // ── Section title: ALL CAPS bold + full-width rule ─────────────────────────
  function sectionHead(label) {
    y += S(2);
    guard(S(8));
    doc.setFontSize(S(11));
    doc.setFont(FONT, 'bold');
    doc.text(label.toUpperCase(), ML, y);
    y += S(2);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(ML, y, PAGE_W - MR, y);
    y += S(2);
  }

  // ── Bullet: drawn filled circle + indented text ────────────────────────────
  function bullet(text) {
    doc.setFontSize(S(10));
    doc.setFont(FONT, 'normal');
    const indent = S(4);
    const wrapped = doc.splitTextToSize(String(text), CW - indent);
    for (let i = 0; i < wrapped.length; i++) {
      guard(LH(10) + S(0.2));
      if (i === 0) {
        doc.setFillColor(0, 0, 0);
        doc.circle(ML + S(1.3), y - S(1.2), S(0.55), 'F');
      }
      doc.text(wrapped[i], ML + indent, y);
      y += LH(10) - S(0.1);
    }
    y += S(0.2);
  }

  // ── Destructure ───────────────────────────────────────────────────────────
  const {
    header     = {},
    education  = [],
    experience = [],
    projects   = [],
    leadership = [],
    skills     = {},
  } = resumeJson;

  // ── HEADER ────────────────────────────────────────────────────────────────
  if (header.name) write(header.name, { size: 18, style: 'bold', center: true });

  const contact = [header.phone, header.email, header.linkedin, header.github]
    .filter(Boolean).join(' | ');
  if (contact) write(contact, { size: 9.5, center: true });
  y += S(2);

  // ── EDUCATION ─────────────────────────────────────────────────────────────
  if (education.length) {
    sectionHead('Education');
    for (const edu of education) {
      twoCol(edu.institution || edu.school || '', edu.location || '');
      twoCol(expandDegree(edu.degree), edu.years || edu.year || '', { leftStyle: 'normal' });
      const ml = majorLine(edu);
      if (ml) write(ml);
      y += S(1);
    }
  }

  // ── EXPERIENCE ────────────────────────────────────────────────────────────
  if (experience.length) {
    sectionHead('Experience');
    for (const exp of experience) {
      twoCol(exp.company || '', exp.location || '');
      twoCol(exp.title || exp.position || '',
             dateRange(exp.startDate, exp.endDate), { leftStyle: 'italic' });
      for (const b of exp.bullets || []) bullet(b);
      y += S(1);
    }
  }

  // ── PROJECTS ─────────────────────────────────────────────────────────────
  if (projects.length) {
    sectionHead('Projects');
    for (const proj of projects) {
      const dateStr = fmt(proj.date) || dateRange(proj.startDate, proj.endDate);
      twoCol((proj.name || '').toUpperCase(), dateStr);
      for (const b of proj.bullets || []) bullet(b);
      y += S(1);
    }
  }

  // ── LEADERSHIP ────────────────────────────────────────────────────────────
  if (leadership.length) {
    sectionHead('Leadership');
    for (const lead of leadership) {
      twoCol(lead.org || lead.orgName || '', lead.location || '');
      twoCol(lead.position || '',
             dateRange(lead.startDate, lead.endDate), { leftStyle: 'italic' });
      for (const b of lead.bullets || []) bullet(b);
      y += S(1);
    }
  }

  // ── TECHNICAL SKILLS ─────────────────────────────────────────────────────
  const SKILL_CATS = [
    { key: 'technical',     label: 'Languages:' },
    { key: 'frameworks',    label: 'Frameworks & Libraries:' },
    { key: 'databases',     label: 'Databases & Systems:' },
    { key: 'devTools',      label: 'Developer Tools:' },
    { key: 'productSkills', label: 'Product & Business Skills:' },
  ];

  const skillsIsObj = !Array.isArray(skills);
  const hasSkills = skillsIsObj
    ? SKILL_CATS.some(c => skills[c.key]?.length)
    : skills.length > 0;

  if (hasSkills) {
    sectionHead('Technical Skills');

    if (!skillsIsObj) {
      write(skills.join(', '));
    } else {
      for (const { key, label } of SKILL_CATS) {
        const items = skills[key];
        if (!items?.length) continue;
        guard(S(5));
        doc.setFontSize(S(10));
        doc.setFont(FONT, 'bold');
        doc.text(label, ML, y);
        const lw = doc.getTextWidth(label) + S(1.5);
        doc.setFont(FONT, 'normal');
        const valueLines = doc.splitTextToSize(items.join(', '), CW - lw);
        doc.text(valueLines[0], ML + lw, y);
        y += LH(10);
        for (let i = 1; i < valueLines.length; i++) {
          guard(S(5));
          doc.text(valueLines[i], ML + lw, y);
          y += LH(10);
        }
      }
    }
  }

  return y;
}
