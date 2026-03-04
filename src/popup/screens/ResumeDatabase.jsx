import { useState, useEffect } from 'react';
import { getExperiences, saveExperience, deleteExperience } from '../../storage/storage';

// ── Type config ───────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  profile:    { label: 'Profile',         color: '#ec4899', emoji: '👤' },
  education:  { label: 'Education',       color: '#22c55e', emoji: '🎓' },
  experience: { label: 'Work Experience', color: '#3b82f6', emoji: '💼' },
  project:    { label: 'Projects',        color: '#a855f7', emoji: '🔧' },
  leadership: { label: 'Leadership',      color: '#f59e0b', emoji: '👥' },
  skills:     { label: 'Skills',          color: '#06b6d4', emoji: '⚡' },
};

const BLANK = {
  profile: {
    type: 'profile', fullName: '', email: '', phone: '', linkedin: '', github: '',
  },
  experience: {
    type: 'experience', position: '', company: '', location: '',
    startDate: '', endDate: '', isPresent: false, skills: [], achievements: [],
  },
  education: {
    type: 'education', school: '', location: '', degreeType: 'B.S.',
    majors: [], minors: [], startYear: '', gradYear: '', isExpected: false,
  },
  project: {
    type: 'project', name: '', startDate: '', endDate: '', isOngoing: false, bullets: [],
  },
  leadership: {
    type: 'leadership', orgName: '', position: '', startDate: '', endDate: '',
    isPresent: false, location: '', bullets: [],
  },
  skills: {
    type: 'skills', technical: [], frameworks: [], databases: [], devTools: [], productSkills: [],
  },
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResumeDatabase() {
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null); // null = list view, object = form view
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [flash, setFlash] = useState('');

  useEffect(() => { getExperiences().then(setEntries); }, []);

  function handleAdd(type) {
    setShowAddMenu(false);
    // Singletons: profile and skills — edit existing if present
    if (type === 'profile' || type === 'skills') {
      const existing = entries.find(e => e.type === type);
      if (existing) { setEditing({ ...existing }); return; }
    }
    setEditing({ ...BLANK[type] });
  }

  async function handleSave(entry) {
    try {
      const updated = await saveExperience(entry);
      setEntries(updated);
      setEditing(null);
      showFlash('Saved!');
    } catch (err) {
      showFlash('Error: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this entry?')) return;
    setEntries(await deleteExperience(id));
  }

  function showFlash(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 2000);
  }

  if (editing !== null) {
    return <EntryForm entry={editing} onSave={handleSave} onCancel={() => setEditing(null)} />;
  }

  const byType = (type) => entries.filter(e => e.type === type);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 className="screen-title" style={{ margin: 0 }}>My Resume</h2>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-primary" onClick={() => setShowAddMenu(v => !v)}>
            + Add
          </button>
          {showAddMenu && (
            <AddTypeMenu onSelect={handleAdd} onClose={() => setShowAddMenu(false)} />
          )}
        </div>
      </div>

      {flash && <p className="status success">{flash}</p>}

      {/* Sections — rendered in order */}
      {Object.keys(TYPE_CONFIG).map(type => (
        <TypeSection
          key={type}
          type={type}
          entries={byType(type)}
          onEdit={e => setEditing({ ...e })}
          onDelete={handleDelete}
          onAdd={() => handleAdd(type)}
        />
      ))}

      {entries.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 32 }}>📄</div>
          <p>Your resume database is empty.</p>
          <p>Click + Add to get started.</p>
        </div>
      )}
    </div>
  );
}

// ── Add Type Menu ─────────────────────────────────────────────────────────────

function AddTypeMenu({ onSelect }) {
  return (
    <div style={{
      position: 'absolute', right: 0, top: 'calc(100% + 4px)',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, overflow: 'hidden', zIndex: 100, minWidth: 170,
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          style={{
            display: 'block', width: '100%', padding: '9px 14px',
            background: 'none', border: 'none', textAlign: 'left',
            color: 'var(--text)', cursor: 'pointer', fontSize: 12,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          {cfg.emoji}&nbsp; {cfg.label}
        </button>
      ))}
    </div>
  );
}

// ── Type Section ──────────────────────────────────────────────────────────────

function TypeSection({ type, entries, onEdit, onDelete, onAdd }) {
  const cfg = TYPE_CONFIG[type];
  if (entries.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {cfg.label}
        </span>
        {type !== 'skills' && type !== 'profile' && (
          <button
            onClick={onAdd}
            style={{ fontSize: 10.5, padding: '2px 8px', background: 'none', border: `1px solid ${cfg.color}`, color: cfg.color, borderRadius: 10, cursor: 'pointer' }}
          >
            + Add
          </button>
        )}
      </div>
      {entries.map(e => (
        <EntryCard
          key={e.id}
          entry={e}
          color={cfg.color}
          onEdit={() => onEdit(e)}
          onDelete={() => onDelete(e.id)}
        />
      ))}
    </div>
  );
}

// ── Entry Card ────────────────────────────────────────────────────────────────

function EntryCard({ entry, color, onEdit, onDelete }) {
  const { type } = entry;
  let primary = '', secondary = '', meta = '', chips = [];

  if (type === 'profile') {
    primary = entry.fullName || '(No name set)';
    secondary = entry.email || '';
    meta = [entry.phone, entry.linkedin].filter(Boolean).join(' · ');
  } else if (type === 'experience') {
    primary = entry.position || entry.title || '(Untitled)';
    secondary = entry.company || '';
    const endLabel = entry.isPresent ? 'Present' : entry.endDate;
    meta = [entry.location, [entry.startDate, endLabel].filter(Boolean).join(' – ')].filter(Boolean).join(' · ');
    chips = (entry.skills || []).slice(0, 4);
  } else if (type === 'education') {
    primary = entry.school || '(Untitled)';
    secondary = [entry.degreeType, ...(entry.majors || [])].filter(Boolean).join(' in ');
    const gradLabel = entry.isExpected ? `Expected ${entry.gradYear}` : entry.gradYear;
    meta = [entry.location, [entry.startYear, gradLabel].filter(Boolean).join(' – ')].filter(Boolean).join(' · ');
    chips = (entry.minors || []).map(m => `Minor: ${m}`);
  } else if (type === 'project') {
    primary = entry.name || '(Untitled)';
    const endLabel = entry.isOngoing ? 'Ongoing' : entry.endDate;
    meta = [entry.startDate, endLabel].filter(Boolean).join(' – ');
  } else if (type === 'leadership') {
    primary = entry.position || '(Untitled)';
    secondary = entry.orgName || '';
    const endLabel = entry.isPresent ? 'Present' : entry.endDate;
    meta = [entry.location, [entry.startDate, endLabel].filter(Boolean).join(' – ')].filter(Boolean).join(' · ');
  } else if (type === 'skills') {
    primary = 'Skills';
    const keys = ['technical', 'frameworks', 'databases', 'devTools', 'productSkills'];
    const total = keys.reduce((sum, k) => sum + (entry[k] || []).length, 0);
    const cats = keys.filter(k => (entry[k] || []).length > 0).length;
    secondary = `${total} skills · ${cats} categories`;
  }

  return (
    <div className="card" style={{ padding: '9px 12px', marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
            <strong style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {primary}
            </strong>
          </div>
          {secondary && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, paddingLeft: 11 }}>{secondary}</div>}
          {meta && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, paddingLeft: 11 }}>{meta}</div>}
          {chips.length > 0 && (
            <div style={{ marginTop: 5, paddingLeft: 11 }}>
              {chips.map(c => <span key={c} className="chip">{c}</span>)}
              {type === 'experience' && (entry.skills || []).length > 4 && (
                <span className="chip">+{(entry.skills || []).length - 4}</span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={onEdit}>Edit</button>
          {type !== 'skills' && type !== 'profile' && (
            <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={onDelete}>✕</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Entry Form (dispatches to type-specific sub-form) ─────────────────────────

function EntryForm({ entry, onSave, onCancel }) {
  const [form, setForm] = useState({ ...entry });
  const cfg = TYPE_CONFIG[entry.type] || {};

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ paddingBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 className="screen-title" style={{ margin: 0, color: cfg.color }}>
          {cfg.emoji} {entry.id ? 'Edit' : 'Add'} {cfg.label}
        </h2>
        <button type="button" className="btn btn-secondary" style={{ padding: '3px 10px' }} onClick={onCancel}>
          Cancel
        </button>
      </div>

      {entry.type === 'profile'    && <ProfileForm    form={form} set={set} />}
      {entry.type === 'experience' && <ExperienceForm form={form} set={set} />}
      {entry.type === 'education'  && <EducationForm  form={form} set={set} />}
      {entry.type === 'project'    && <ProjectForm    form={form} set={set} />}
      {entry.type === 'leadership' && <LeadershipForm form={form} set={set} />}
      {entry.type === 'skills'     && <SkillsForm     form={form} set={set} />}

      <div className="btn-row" style={{ marginTop: 14 }}>
        <button type="submit" className="btn btn-primary">Save</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ── Shared Field Helpers ──────────────────────────────────────────────────────

function F({ label, children }) {
  return <div className="form-group"><label>{label}</label>{children}</div>;
}

function TI({ value, onChange, placeholder, required, disabled }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
    />
  );
}

// Comma-separated string[] field
function TagField({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={(value || []).join(', ')}
      onChange={e => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
      placeholder={placeholder}
    />
  );
}

// One-bullet-per-line string[] field
function BulletsField({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={(value || []).join('\n')}
      onChange={e => onChange(e.target.value.split('\n').map(s => s.trimStart()).filter(Boolean))}
      placeholder={placeholder || 'One bullet per line'}
      rows={rows}
    />
  );
}

function Check({ label, checked, onChange }) {
  return (
    <div className="form-group">
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'none', letterSpacing: 0 }}>
        <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
        {label}
      </label>
    </div>
  );
}

function DatePair({ startVal, endVal, onStart, onEnd, endDisabled }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <F label="Start (YYYY-MM)">
        <TI value={startVal} onChange={onStart} placeholder="2022-06" />
      </F>
      <F label="End (YYYY-MM)">
        <TI value={endDisabled ? '' : endVal} onChange={onEnd} placeholder="2024-05" disabled={endDisabled} />
      </F>
    </div>
  );
}

// ── Type-Specific Sub-Forms ───────────────────────────────────────────────────

function ProfileForm({ form, set }) {
  return (
    <>
      <F label="Full Name *">
        <TI value={form.fullName} onChange={v => set('fullName', v)} placeholder="Jane Smith" required />
      </F>
      <F label="Email *">
        <TI value={form.email} onChange={v => set('email', v)} placeholder="jane@example.com" required />
      </F>
      <F label="Phone">
        <TI value={form.phone} onChange={v => set('phone', v)} placeholder="(415) 555-0123" />
      </F>
      <F label="LinkedIn (URL or handle)">
        <TI value={form.linkedin} onChange={v => set('linkedin', v)} placeholder="linkedin.com/in/janesmith" />
      </F>
      <F label="GitHub (URL or handle)">
        <TI value={form.github} onChange={v => set('github', v)} placeholder="github.com/janesmith" />
      </F>
    </>
  );
}

function ExperienceForm({ form, set }) {
  return (
    <>
      <F label="Position / Title *">
        <TI value={form.position} onChange={v => set('position', v)} placeholder="Software Engineer Intern" required />
      </F>
      <F label="Company *">
        <TI value={form.company} onChange={v => set('company', v)} placeholder="Acme Corp" required />
      </F>
      <F label="Location">
        <TI value={form.location} onChange={v => set('location', v)} placeholder="San Francisco, CA" />
      </F>
      <DatePair
        startVal={form.startDate} endVal={form.endDate}
        onStart={v => set('startDate', v)} onEnd={v => set('endDate', v)}
        endDisabled={form.isPresent}
      />
      <Check label="Currently in this role" checked={form.isPresent} onChange={v => set('isPresent', v)} />
      <F label="Skills used (comma-separated)">
        <TagField value={form.skills} onChange={v => set('skills', v)} placeholder="React, TypeScript, Python, SQL" />
      </F>
      <F label="Achievements (one bullet per line)">
        <BulletsField
          value={form.achievements}
          onChange={v => set('achievements', v)}
          placeholder={"Led migration to microservices, cutting deploy time 60%\nBuilt real-time dashboard used by 200+ analysts daily"}
          rows={5}
        />
      </F>
    </>
  );
}

function EducationForm({ form, set }) {
  return (
    <>
      <F label="School / University *">
        <TI value={form.school} onChange={v => set('school', v)} placeholder="Stanford University" required />
      </F>
      <F label="Location">
        <TI value={form.location} onChange={v => set('location', v)} placeholder="Stanford, CA" />
      </F>
      <F label="Degree Type">
        <select value={form.degreeType || 'B.S.'} onChange={e => set('degreeType', e.target.value)}>
          {['B.S.', 'B.A.', 'M.S.', 'M.A.', 'M.B.A.', 'Ph.D.', "Associate's", 'Other'].map(d => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </F>
      <F label="Major(s) (comma-separated)">
        <TagField value={form.majors} onChange={v => set('majors', v)} placeholder="Computer Science" />
      </F>
      <F label="Minor(s) (comma-separated, optional)">
        <TagField value={form.minors} onChange={v => set('minors', v)} placeholder="Statistics, Music" />
      </F>
      <div style={{ display: 'flex', gap: 8 }}>
        <F label="Start Year">
          <TI value={form.startYear} onChange={v => set('startYear', v)} placeholder="2021" />
        </F>
        <F label="Grad Year">
          <TI value={form.gradYear} onChange={v => set('gradYear', v)} placeholder="2025" />
        </F>
      </div>
      <Check label="Expected graduation (not yet graduated)" checked={form.isExpected} onChange={v => set('isExpected', v)} />
    </>
  );
}

function ProjectForm({ form, set }) {
  return (
    <>
      <F label="Project Name *">
        <TI value={form.name} onChange={v => set('name', v)} placeholder="ResumeTailor AI" required />
      </F>
      <DatePair
        startVal={form.startDate} endVal={form.endDate}
        onStart={v => set('startDate', v)} onEnd={v => set('endDate', v)}
        endDisabled={form.isOngoing}
      />
      <Check label="Ongoing / in progress" checked={form.isOngoing} onChange={v => set('isOngoing', v)} />
      <F label="Description & Bullets (one per line)">
        <BulletsField
          value={form.bullets}
          onChange={v => set('bullets', v)}
          placeholder={"Chrome Extension for AI-tailored resume generation using Claude\nBuilt React popup, background service worker, jsPDF renderer"}
          rows={5}
        />
      </F>
    </>
  );
}

function LeadershipForm({ form, set }) {
  return (
    <>
      <F label="Organization Name *">
        <TI value={form.orgName} onChange={v => set('orgName', v)} placeholder="CS Club" required />
      </F>
      <F label="Position / Role *">
        <TI value={form.position} onChange={v => set('position', v)} placeholder="President" required />
      </F>
      <F label="Location (optional)">
        <TI value={form.location} onChange={v => set('location', v)} placeholder="Stanford, CA" />
      </F>
      <DatePair
        startVal={form.startDate} endVal={form.endDate}
        onStart={v => set('startDate', v)} onEnd={v => set('endDate', v)}
        endDisabled={form.isPresent}
      />
      <Check label="Currently in this role" checked={form.isPresent} onChange={v => set('isPresent', v)} />
      <F label="Description & Achievements (one bullet per line)">
        <BulletsField
          value={form.bullets}
          onChange={v => set('bullets', v)}
          placeholder={"Led team of 15 to organize 3 hackathons, reaching 500+ students\nGrew membership 40% year-over-year"}
          rows={4}
        />
      </F>
    </>
  );
}

function SkillsForm({ form, set }) {
  const categories = [
    { key: 'technical',     label: 'Technical Skills',       placeholder: 'Python, JavaScript, Swift, SQL, Java' },
    { key: 'frameworks',    label: 'Frameworks & Libraries', placeholder: 'React, Node.js, FastAPI, SwiftUI, PyTorch' },
    { key: 'databases',     label: 'Databases & Systems',    placeholder: 'PostgreSQL, MongoDB, Redis, S3, Snowflake' },
    { key: 'devTools',      label: 'Developer & Data Tools', placeholder: 'Docker, GitHub Actions, Figma, Tableau, Jupyter' },
    { key: 'productSkills', label: 'Product & Business',     placeholder: 'Product roadmapping, A/B testing, SQL analytics, Agile' },
  ];

  return (
    <>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        Comma-separate each field. Claude will select the most relevant subset for each role.
      </p>
      {categories.map(cat => (
        <F key={cat.key} label={cat.label}>
          <TagField value={form[cat.key]} onChange={v => set(cat.key, v)} placeholder={cat.placeholder} />
        </F>
      ))}
    </>
  );
}
