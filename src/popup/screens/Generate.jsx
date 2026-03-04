import { useState, useEffect } from 'react';
import { getExperiences, addHistoryEntry } from '../../storage/storage';
import { generatePDF } from '../../pdf/pdfGenerator';
import LoadingSpinner from '../components/LoadingSpinner';

// Generation states
const STATE = {
  IDLE: 'idle',
  FETCHING_JOB: 'fetching_job',
  GENERATING: 'generating',
  DONE: 'done',
  ERROR: 'error',
};

export default function Generate({ onNavigate }) {
  const [genState, setGenState] = useState(STATE.IDLE);
  const [jobData, setJobData] = useState(null);
  const [resumeJson, setResumeJson] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // On mount: try background cache first, then query the active tab's content script directly.
  // The direct query is the reliable path — MV3 service workers lose in-memory state when idle.
  useEffect(() => {
    setGenState(STATE.FETCHING_JOB);

    function queryActiveTab() {
      // lastFocusedWindow: true is required in popups — the popup itself is its own window,
      // so currentWindow: true would query the popup's window (no tabs), not the browser window.
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        const tab = tabs?.[0];
        if (!tab?.id) { setGenState(STATE.IDLE); return; }

        chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_INFO' }, (res) => {
          if (chrome.runtime.lastError || !res?.success) {
            // Content script not running on this tab (e.g. chrome:// page)
            setGenState(STATE.IDLE);
            return;
          }
          if (res.rawText) setJobData(res);
          setGenState(STATE.IDLE);
        });
      });
    }

    // 1. Try background in-memory cache (fast path — works if service worker is still alive)
    chrome.runtime.sendMessage({ type: 'GET_JOB_DATA' }, (res) => {
      if (res?.success && res.jobData?.rawText) {
        setJobData(res.jobData);
        setGenState(STATE.IDLE);
      } else {
        // 2. Fallback: ask the content script on the current tab directly
        queryActiveTab();
      }
    });
  }, []);

  async function handleGenerate() {
    if (!jobData) {
      setError('No job detected on this tab.\n\nMake sure you have the job posting open in the current tab, then close and reopen this popup.');
      return;
    }

    const experiences = await getExperiences();
    if (experiences.length === 0) {
      setError('Your resume database is empty. Add experiences in the My Resume tab first.');
      return;
    }

    setGenState(STATE.GENERATING);
    setError('');
    setResumeJson(null);
    setSaved(false);

    chrome.runtime.sendMessage(
      { type: 'GENERATE_RESUME', payload: { experiences, jobData } },
      async (res) => {
        if (chrome.runtime.lastError) {
          setGenState(STATE.ERROR);
          setError('Extension error: ' + chrome.runtime.lastError.message);
          return;
        }
        if (!res?.success) {
          setGenState(STATE.ERROR);
          setError(res?.error || 'Unknown error from Claude.');
          return;
        }
        setResumeJson(res.resumeJson);
        setGenState(STATE.DONE);
      }
    );
  }

  async function handleSaveToHistory() {
    if (!resumeJson) return;
    await addHistoryEntry({
      jobTitle: jobData?.title || 'Unknown Job',
      company: jobData?.company || '',
      resumeJson,
      rawText: JSON.stringify(resumeJson),
    });
    setSaved(true);
  }

  function handleDownload() {
    if (!resumeJson) return;
    try {
      const safeName = (jobData?.title || 'resume').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      generatePDF(resumeJson, `${safeName}_tailored.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      setError('PDF generation failed: ' + err.message);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (genState === STATE.GENERATING) {
    return <LoadingSpinner message="Claude is crafting your resume…" />;
  }

  return (
    <div>
      <h2 className="screen-title">Generate Resume</h2>

      {/* Job preview */}
      {jobData ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>DETECTED JOB</div>
          <div style={{ fontWeight: 600 }}>{jobData.title || 'Unknown Title'}</div>
          {jobData.company && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{jobData.company}</div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {jobData.url}
          </div>
        </div>
      ) : (
        <div className="alert alert-info">
          No job detected yet. Navigate to a job posting and click{' '}
          <strong>✦ Tailor Resume</strong>, then return here.
        </div>
      )}

      {error && <div className="alert alert-error" style={{ whiteSpace: 'pre-wrap' }}>{error}</div>}

      {/* Generate button */}
      {genState !== STATE.DONE && (
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={genState === STATE.GENERATING}
          style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
        >
          ✦ Generate Tailored Resume
        </button>
      )}

      {/* Result */}
      {genState === STATE.DONE && resumeJson && (
        <div>
          <div className="alert alert-success" style={{ marginBottom: 10 }}>
            Resume generated successfully!
          </div>

          <ResumePreview resumeJson={resumeJson} />

          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleDownload}>
              ⬇ Download PDF
            </button>
            {!saved ? (
              <button className="btn btn-secondary" onClick={handleSaveToHistory}>
                Save to History
              </button>
            ) : (
              <span className="status success">✓ Saved</span>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => {
                setGenState(STATE.IDLE);
                setResumeJson(null);
              }}
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Compact Resume Preview ────────────────────────────────────────────────────

function ResumePreview({ resumeJson }) {
  const { header = {}, experience = [], skills = [], projects = [], education = [] } = resumeJson;

  return (
    <div
      className="card"
      style={{ fontSize: 11, lineHeight: 1.5, maxHeight: 220, overflowY: 'auto' }}
    >
      {header.name && (
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{header.name}</div>
      )}
      {(header.email || header.phone) && (
        <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
          {[header.email, header.phone].filter(Boolean).join(' | ')}
        </div>
      )}

      {experience.length > 0 && (
        <Section title="Experience">
          {experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 600 }}>
                {exp.title} — {exp.company}
              </div>
              {exp.bullets?.slice(0, 2).map((b, j) => (
                <div key={j} style={{ color: 'var(--text-muted)', paddingLeft: 8 }}>
                  • {b}
                </div>
              ))}
            </div>
          ))}
        </Section>
      )}

      {skills.length > 0 && (
        <Section title="Skills">
          <div style={{ color: 'var(--text-muted)' }}>{skills.join(' · ')}</div>
        </Section>
      )}

      {education.length > 0 && (
        <Section title="Education">
          {education.map((edu, i) => (
            <div key={i} style={{ color: 'var(--text-muted)' }}>
              {edu.degree} — {edu.institution} {edu.year && `(${edu.year})`}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderBottom: '1px solid var(--border)',
          paddingBottom: 2,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
