import { useEffect, useState } from 'react';

interface HistoryItem {
  id: string;
  created_at: string;
  llm_result: Record<string, string | null>;
  ocr_text: string;
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
        const res = await fetch(`${apiUrl}/history/`);
        if (!res.ok) throw new Error("Failed to load history");
        const data = await res.json();
        setHistory(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistory();
  }, []);

  const formatDate = (isoString: string) => {
    if (!isoString) return 'UNKNOWN DATE';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }).toUpperCase().replace(',', ' —');
    } catch {
      return isoString;
    }
  };

  const getCardType = (item: HistoryItem) => {
    const dept = item.llm_result.department;
    if (!dept) return "DOCUMENT";
    if (dept.toLowerCase().includes("complaint") || dept.toLowerCase().includes("b&r") || dept.toLowerCase().includes("health")) return "COMPLAINT CARD";
    return "DOCUMENT";
  };

  return (
    <>
      <div className="screen-head">
        <div>
          <p className="eyebrow">ARCHIVED DOCUMENTS</p>
          <h1>SCAN HISTORY</h1>
        </div>
        <span className="num subtle">{history.length} ENTRIES</span>
      </div>
      
      {loading && <p>Loading history...</p>}
      {error && <p style={{color: 'var(--danger)'}}>Error: {error}</p>}
      
      {!loading && !error && history.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', 
          justifyContent: 'center', minHeight: '40vh', color: 'var(--muted)',
          textAlign: 'center', gap: '16px'
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5">
            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
          </svg>
          <div>
            <p style={{margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--fg-2)'}}>Nothing to show here</p>
            <p style={{margin: '8px 0 0', fontSize: '14px'}}>Processed documents will appear in your archive.</p>
          </div>
        </div>
      )}

      <div className="history-grid" id="history-grid">
        {history.map((item) => (
          <article key={item.id} className="history-card">
            <div className="card-type">{getCardType(item)}</div>
            <div className="card-time">{formatDate(item.created_at)}</div>
            
            <div className="card-field">
              <label>SUBJECT</label>
              <span className="card-subject" style={{marginTop: '4px'}}>{item.llm_result.subject || '—'}</span>
            </div>
            
            <div className="card-field">
              <label>SENDER</label>
              <span>{item.llm_result.sender_name || '—'}</span>
            </div>
            
            <button 
              className="btn btn-secondary" 
              style={{marginTop: '20px', width: '100%', fontSize: '12px'}}
              onClick={() => setSelectedItem(item)}
            >
              VIEW MORE
            </button>
          </article>
        ))}
      </div>

      {/* Modal for View More */}
      {selectedItem && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50, 
          background: 'color-mix(in oklab, var(--bg) 80%, transparent)',
          backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{
            background: 'var(--bg)', flex: 1, margin: '40px auto 120px', 
            maxWidth: '800px', width: 'calc(100% - 40px)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: 'var(--elev-raised)'
          }}>
            <div style={{
              padding: '20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h2 style={{margin: 0, fontSize: '18px'}}>Document Details</h2>
              <button 
                onClick={() => setSelectedItem(null)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--fg)',
                  cursor: 'pointer', padding: '4px'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div style={{padding: '20px', overflowY: 'auto', flex: 1}}>
              <div className="result-grid" style={{marginTop: 0}}>
                {Object.entries(selectedItem.llm_result).filter(([k]) => k !== 'text').map(([key, value]) => {
                  const isSubject = key === 'subject' || key === 'summary';
                  return (
                    <div key={key} className={`result-field ${isSubject ? 'subject' : ''}`}>
                      <span className="result-label">{key.replace('_', ' ').toUpperCase()}</span>
                      <span className="result-value">{value ?? '—'}</span>
                    </div>
                  );
                })}
              </div>

              <details className="ocr" style={{marginTop: '24px'}}>
                <summary>RAW OCR PREVIEW (MISTRAL MD)</summary>
                <div className="ocr-body">{selectedItem.ocr_text}</div>
              </details>
            </div>
          </div>
        </div>
      )}
    </>
  );
}