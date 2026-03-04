import { useState, useEffect } from 'react';
import { getExperiences, getHistory } from '../../storage/storage';

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({ experiences: 0, generated: 0 });
  const [jobData, setJobData] = useState(null);

  useEffect(() => {
    // Load stats from storage
    Promise.all([getExperiences(), getHistory()]).then(([exps, hist]) => {
      setStats({ experiences: exps.length, generated: hist.length });
    });

    // Query the active tab's content script directly (lastFocusedWindow, not currentWindow)
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_INFO' }, (res) => {
        if (chrome.runtime.lastError || !res?.success) return;
        if (res.rawText) setJobData(res);
      });
    });
  }, []);

  return (
    <div>
      <h2 className="screen-title">ResumeTailor AI</h2>

      {/* Active job banner */}
      {jobData && (
        <div className="alert alert-info" style={{ marginBottom: 12 }}>
          <strong>Job detected:</strong> {jobData.title}
          <br />
          <button
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={() => onNavigate('generate')}
          >
            Generate Resume →
          </button>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <StatCard
          label="Experiences"
          value={stats.experiences}
          onClick={() => onNavigate('database')}
        />
        <StatCard
          label="Generated"
          value={stats.generated}
          onClick={() => onNavigate('history')}
        />
      </div>

      {/* Quick actions */}
      <div className="card">
        <p style={{ fontWeight: 600, marginBottom: 10 }}>Quick Actions</p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => onNavigate('generate')}>
            ✦ Generate Resume
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('database')}>
            + Add Experience
          </button>
        </div>
      </div>

      {/* Getting started */}
      {stats.experiences === 0 && (
        <div className="card" style={{ marginTop: 10 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>Getting Started</p>
          <ol style={{ paddingLeft: 16, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            <li>
              Add your experiences in{' '}
              <span
                style={{ color: 'var(--blue)', cursor: 'pointer' }}
                onClick={() => onNavigate('database')}
              >
                My Resume
              </span>
            </li>
            <li>Navigate to a job posting and click ✦ Tailor Resume</li>
            <li>Open this popup and click Generate Resume</li>
            <li>Download your tailored PDF</li>
          </ol>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, onClick }) {
  return (
    <div
      className="card"
      style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}
      onClick={onClick}
    >
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
