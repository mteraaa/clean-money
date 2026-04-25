"use client";

type Log = {
  id: number | string;
  description: string;
  logged_at: string;
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ActivityLogTable({ logs }: { logs: Log[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm font-lexend">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#E5E7EB] text-gray-700">
            <th className="text-left px-6 py-3 font-bold">Description</th>
            <th className="text-left px-4 py-3 font-bold w-32">Time</th>
            <th className="text-left px-4 py-3 font-bold w-44">Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center py-10 text-gray-400">
                No activity recorded yet.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-gray-900">{log.description}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatTime(log.logged_at)}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(log.logged_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
