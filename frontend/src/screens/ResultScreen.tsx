interface ResultScreenProps {
  data: Record<string, string | null>
  error?: string
  onProcessAnother?: () => void
}

const FIELD_LABELS: Record<string, string> = {
  date: 'Date',
  subject: 'Subject',
  summary: 'Summary',
  department: 'Department',
  sender_name: 'Sender',
  sender_contact: 'Contact',
  receiver: 'Receiver',
  reference_number: 'Ref No',
}

export default function ResultScreen({ data, error, onProcessAnother }: ResultScreenProps) {
  // Extract text if it's there (assuming backend might pass raw text as 'text' or something similar)
  const rawOcr = data.text || "No raw text available";
  
  // Filter out text from main grid display
  const displayData = Object.entries(data).filter(([key]) => key !== 'text');

  return (
    <div className="result-shell">
      <div className="screen-head">
        <div>
          <p className="eyebrow">DOCUMENT REVIEW</p>
          <h1>SUBMISSION RESULT</h1>
        </div>
        <span className="status">{error ? "ERROR" : "EXTRACTED"}</span>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <div className="result-grid">
        {displayData.map(([key, value]) => {
          const isSubject = key === 'subject' || key === 'summary';
          return (
            <div key={key} className={`result-field ${isSubject ? 'subject' : ''}`}>
              <span className="result-label">{FIELD_LABELS[key] ?? key}</span>
              <span className="result-value">{value ?? '—'}</span>
            </div>
          );
        })}
      </div>

      <details className="ocr">
        <summary>RAW OCR PREVIEW (MISTRAL MD)</summary>
        <div className="ocr-body">{rawOcr}</div>
      </details>

      <div className="result-actions">
        <button className="btn btn-primary" data-od-id="save-archive" onClick={onProcessAnother}>
          PROCESS ANOTHER
        </button>
        <button className="btn btn-secondary" data-od-id="resync">RESYNC</button>
        <button className="btn btn-secondary" data-od-id="report-pdf">REPORT PDF</button>
      </div>
    </div>
  )
}