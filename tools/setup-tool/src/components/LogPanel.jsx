import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';

export default function LogPanel({ logs = [], onClear, maxHeight = '200px', className = '' }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className={`relative ${className}`}>
      {onClear && (
        <button
          onClick={onClear}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-400 z-10"
          title="Clear log"
        >
          <Trash2 size={13} />
        </button>
      )}
      <div
        className="selectable bg-gray-950 border border-gray-800 rounded p-3 font-mono text-xs text-green-400 overflow-y-auto"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <p className="text-gray-700">No output yet...</p>
        ) : (
          logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap leading-5">{line}</div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
