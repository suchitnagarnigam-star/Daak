interface DockNavigationProps {
  currentTab: string
  onTabChange: (tab: string) => void
}

export default function DockNavigation({ currentTab, onTabChange }: DockNavigationProps) {
  return (
    <nav className="dock" data-od-id="bottom-navigation" aria-label="Primary navigation">
      {/* Home is merged with Scan in the new flow, but we can keep the tab for now or map it to scan */}
      <button 
        className={`dock-item ${currentTab === 'home' ? 'active' : ''}`} 
        onClick={() => onTabChange('home')}
      >
        <span className="dock-icon">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 21v-6h6v6" />
          </svg>
        </span>
        HOME
      </button>
      
      <button 
        className={`dock-item ${currentTab === 'scan' || currentTab === 'processing' || currentTab === 'result' ? 'active' : ''}`} 
        onClick={() => {
          if (currentTab === 'scan') {
            window.dispatchEvent(new Event('trigger-camera-capture'));
          } else {
            onTabChange('scan');
          }
        }}
      >
        <span className="dock-icon">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 12h10M12 7v10" />
          </svg>
        </span>
        SCAN
      </button>

      <button 
        className={`dock-item ${currentTab === 'history' ? 'active' : ''}`} 
        onClick={() => onTabChange('history')}
      >
        <span className="dock-icon">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
          </svg>
        </span>
        HISTORY
      </button>
    </nav>
  )
}
