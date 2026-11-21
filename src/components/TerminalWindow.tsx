'use client';

import React from 'react';
import { IconTerminal } from './icons';

export interface TerminalLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
}

interface TerminalWindowProps {
  logs: TerminalLog[];
  onClear: () => void;
}

export function TerminalWindow({ logs, onClear }: TerminalWindowProps) {
  return (
    <div className="border border-gray-300 bg-white rounded-none p-0 overflow-hidden font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="bg-gray-100 border-b border-gray-300 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <IconTerminal className="w-3.5 h-3.5 text-gray-700" />
          <span className="font-semibold text-gray-800 tracking-tight">
            SOLVER CONSOLE - DETERMINISTIC SCHEDULING TRACE
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-gray-500">{logs.length} events logged</span>
          <button
            onClick={onClear}
            className="text-[11px] text-gray-600 hover:text-black hover:underline"
          >
            Clear Output
          </button>
        </div>
      </div>

      {/* Terminal Console Body */}
      <div className="p-3 bg-white max-h-48 overflow-y-auto space-y-1.5 border-t-0 select-text">
        {logs.length === 0 ? (
          <div className="text-gray-400 py-2">
            &gt; Engine idle. Click &quot;Load Benchmark Data&quot; or &quot;Generate Roster&quot; to begin solver trace.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
              <span className="text-gray-400 select-none">[{log.timestamp}]</span>
              <span
                className={`font-bold select-none px-1 ${
                  log.level === 'ERROR'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : log.level === 'WARN'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : log.level === 'SUCCESS'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                {log.level}
              </span>
              <span className="text-gray-900 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
