import { useState, useRef } from 'react'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, string | null> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setPreview(URL.createObjectURL(selected))
      setResult(null)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('http://localhost:8000/upload/', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setResult(data.extracted_data)
    } catch {
      setError('Failed to connect to backend.')
    } finally {
      setLoading(false)
    }
  }

  const fieldLabels: Record<string, string> = {
    date: 'Date',
    subject: 'Subject',
    summary: 'Summary',
    department: 'Department',
    sender_name: 'Sender Name',
    sender_contact: 'Sender Contact',
    receiver: 'Receiver',
    reference_number: 'Reference Number',
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#121414', color: '#e2e2e2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <svg style={{ color: '#a3c9ff', margin: '0 auto 12px' }} fill="none" height="36" width="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 3V21H19V8L14 3H5Z" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2"/>
          <path d="M14 3V8H19" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2"/>
          <line stroke="currentColor" strokeWidth="2" x1="4" x2="20" y1="14" y2="14"/>
        </svg>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '28px', fontWeight: 600, margin: '0 0 4px' }}>MCL PATR</h1>
        <p style={{ color: '#8b919d', margin: 0, fontSize: '14px' }}>Document Digitization System</p>
      </div>

      {/* Upload Card */}
      <div style={{ background: '#1a1c1c', border: '1px solid #414751', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

        {/* Viewfinder */}
        <div
          onClick={() => inputRef.current?.click()}
          style={{ width: '100%', aspectRatio: '3/4', background: '#0c0f0f', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #414751', overflow: 'hidden', position: 'relative' }}
        >
          {preview ? (
            <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#8b919d' }}>
              {/* Corner brackets */}
              {['tl','tr','bl','br'].map(c => (
                <div key={c} style={{ position: 'absolute', width: '16px', height: '16px', borderColor: '#1a6fbf', ...(c === 'tl' ? { top: 8, left: 8, borderTop: '2px solid', borderLeft: '2px solid' } : c === 'tr' ? { top: 8, right: 8, borderTop: '2px solid', borderRight: '2px solid' } : c === 'bl' ? { bottom: 8, left: 8, borderBottom: '2px solid', borderLeft: '2px solid' } : { bottom: 8, right: 8, borderBottom: '2px solid', borderRight: '2px solid' }) }} />
              ))}
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#8b919d" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p style={{ fontSize: '13px', margin: 0 }}>Tap to select document</p>
            </div>
          )}

          {/* Scan line animation when loading */}
          {loading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
              <div style={{ width: '60%', height: '2px', background: '#a3c9ff', boxShadow: '0 0 8px rgba(163,201,255,0.8)', animation: 'scan 1.5s ease-in-out infinite alternate' }} />
              <p style={{ color: '#a3c9ff', fontSize: '13px', margin: 0 }}>Processing...</p>
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{ width: '100%', background: loading ? '#0f3d6e' : '#1a6fbf', color: '#fff', border: 'none', borderRadius: '999px', padding: '16px', fontSize: '16px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 500, cursor: file && !loading ? 'pointer' : 'not-allowed', opacity: file && !loading ? 1 : 0.6, transition: 'all 0.2s' }}
        >
          {loading ? 'Scanning...' : 'Scan Document'}
        </button>
      </div>

      {error && <p style={{ color: '#ffb4ab', marginTop: '16px', fontSize: '14px' }}>{error}</p>}

      {/* Results Card */}
      {result && (
        <div style={{ marginTop: '24px', width: '100%', maxWidth: '400px', background: '#1a1c1c', border: '1px solid #414751', borderRadius: '16px', padding: '24px' }}>
          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', letterSpacing: '0.1em', color: '#8b919d', textTransform: 'uppercase', marginBottom: '16px', marginTop: 0 }}>Extracted Data</p>
          {Object.entries(result).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #2a2c2d' }}>
              <p style={{ color: '#8b919d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>{fieldLabels[key] ?? key}</p>
              <p style={{ color: value ? '#e2e2e2' : '#414751', margin: 0, fontSize: '15px' }}>{value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes scan {
          from { transform: translateY(-60px); opacity: 0.4; }
          to { transform: translateY(60px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default App