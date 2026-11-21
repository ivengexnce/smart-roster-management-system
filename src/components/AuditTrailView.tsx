import React from 'react';
import { AuditLog } from '@/types';
import { IconFileText } from './icons';

interface AuditTrailViewProps {
  logs: AuditLog[];
}

export function AuditTrailView({ logs }: AuditTrailViewProps) {
  return (
    <div className="border border-gray-300 bg-white p-6">
      <div className="flex items-center space-x-2 pb-3 border-b border-gray-300 mb-4">
        <IconFileText className="w-5 h-5 text-gray-800" />
        <div>
          <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">
            Immutable Audit Trail &amp; Schedule Revision History
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Every roster generation, backup reassignment, and leave approval is recorded with non-repudiation.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
              <th className="p-2.5 w-44 font-sans font-bold">Timestamp</th>
              <th className="p-2.5 w-32 font-sans font-bold">Action</th>
              <th className="p-2.5 w-40 font-sans font-bold">Actor</th>
              <th className="p-2.5 w-28 font-sans font-bold">Role</th>
              <th className="p-2.5 font-sans font-bold">Audit Details &amp; Operational Rationale</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400 font-sans">
                  No schedule changes logged yet. Generate a roster or apply a backup reassignment to see audit records.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-2.5 text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-2.5">
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 border border-gray-300 text-[10px] font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-2.5 text-gray-900 font-semibold">{log.userName}</td>
                  <td className="p-2.5 text-gray-600 text-[11px]">{log.userRole}</td>
                  <td className="p-2.5 text-gray-800">{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
