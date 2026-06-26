export default function ProgressBar({ percent = 0, label = '', className = '' }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between items-center">
        {label && <p className="text-xs text-gray-400">{label}</p>}
        <p className="text-xs text-gray-500 ml-auto">{clamped}%</p>
      </div>
      <div className="bg-gray-800 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-red-600 h-2.5 rounded-full transition-all duration-200"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
