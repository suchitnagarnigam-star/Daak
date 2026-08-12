import "./QueueScreen.css";

export default function QueueScreen() {
  return (
    <div className="queue-screen">
      <header className="queue-header">
        <div>
          <h1>Queue</h1>
          <p>Documents waiting for processing</p>
        </div>
      </header>

      <main className="queue-content">
        <div className="queue-empty-state">
          <span className="material-symbols-outlined">
            sync
          </span>

          <h2>Queue is Empty</h2>

          <p>
            Documents waiting for processing will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}