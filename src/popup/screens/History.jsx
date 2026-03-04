import { useState, useEffect } from 'react';
import { getHistory, deleteHistoryEntry } from '../../storage/storage';
import { generatePDF } from '../../pdf/pdfGenerator';

export default function History() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this history entry?')) return;
    const updated = await deleteHistoryEntry(id);
    setHistory(updated);
  }

  function handleDownload(entry) {
    const safeName = (entry.jobTitle || 'resume').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    generatePDF(entry.resumeJson, `${safeName}_tailored.pdf`);
  }

  if (history.length === 0) {
    return (
      <div>
        <h2 className="screen-title">History</h2>
        <div className="empty-state">
          <div style={{ fontSize: 32 }}>🗂️</div>
          <p>No generated resumes yet.</p>
          <p>Generated resumes will appear here after you save them.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="screen-title">History</h2>
      {history.map((entry) => (
        <HistoryCard
          key={entry.id}
          entry={entry}
          onDownload={() => handleDownload(entry)}
          onDelete={() => handleDelete(entry.id)}
        />
      ))}
    </div>
  );
}

function HistoryCard({ entry, onDownload, onDelete }) {
  const date = entry.generatedAt
    ? new Date(entry.generatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{entry.jobTitle || 'Unknown Job'}</div>
          {entry.company && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.company}</div>
          )}
          {date && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{date}</div>
          )}
        </div>
        <div className="btn-row">
          <button
            className="btn btn-primary"
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={onDownload}
          >
            ⬇ PDF
          </button>
          <button
            className="btn btn-danger"
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={onDelete}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
