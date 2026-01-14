/**
 * Log Detail Modal Component - shows full log details
 */

function LogDetailModal({ log, onClose }) {
  if (!log) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <h3 className="font-bold text-lg mb-4">Log Details</h3>
        <pre className="log-details bg-base-200 p-4 rounded-lg overflow-auto max-h-96">
          {JSON.stringify(log, null, 2)}
        </pre>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={handleCopy}>
            Copy
          </button>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
}

window.LogDetailModal = LogDetailModal;
