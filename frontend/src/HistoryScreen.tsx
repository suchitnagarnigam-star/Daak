import "./HistoryScreen.css";

export default function HistoryScreen() {
  return (
    <div className="history-screen">

      <main className="history-content">
        <div className="history-empty-state">
          <span className="material-symbols-outlined">
            history
          </span>

          <h2>No Documents Yet</h2>

          <p>
            Processed documents will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}