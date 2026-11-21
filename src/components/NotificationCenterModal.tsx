'use client';

/**
 * In-App Operational Notification Center Modal
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 */

import React, { useState } from 'react';
import { InAppNotification } from '@/types';
import { IconAlertOctagon, IconAlertTriangle, IconCheck, IconClose } from './icons';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export function NotificationCenterModal({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
}: NotificationCenterModalProps) {
  const [filter, setFilter] = useState<'ALL' | 'ALERT' | 'WARNING' | 'INFO'>('ALL');

  if (!isOpen) return null;

  const filteredNotifs = filter === 'ALL'
    ? notifications
    : notifications.filter((n) => n.category === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end font-sans">
      <div className="bg-white border-l border-gray-400 w-full max-w-md h-full flex flex-col shadow-none rounded-none overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase bg-gray-900 text-white px-1.5 py-0.2">
                Alerts &amp; Events
              </span>
              <span className="text-xs font-mono text-gray-500">{notifications.length} Total</span>
            </div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight mt-1">
              OPERATIONAL NOTIFICATION CENTER
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 border border-gray-300 text-gray-700"
            title="Close"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls & Filters */}
        <div className="p-3 bg-white border-b border-gray-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex space-x-1">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-2 py-0.5 border text-xs font-bold ${
                  filter === 'ALL' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('ALERT')}
                className={`px-2 py-0.5 border text-xs font-bold ${
                  filter === 'ALERT' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Gaps
              </button>
              <button
                onClick={() => setFilter('WARNING')}
                className={`px-2 py-0.5 border text-xs font-bold ${
                  filter === 'WARNING' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Warnings
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-[11px] text-blue-700 hover:underline font-bold"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClearAll}
                className="text-[11px] text-gray-500 hover:text-rose-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Notification Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-200 p-2 space-y-1">
          {filteredNotifs.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 font-mono">
              No notifications to display in this view.
            </div>
          ) : (
            filteredNotifs.map((n) => {
              const isAlert = n.category === 'ALERT';
              const isWarning = n.category === 'WARNING';
              const isSuccess = n.category === 'SUCCESS';

              return (
                <div
                  key={n.id}
                  className={`p-3 border transition-colors ${
                    !n.read ? 'bg-blue-50/40 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-1 py-0.2 border ${
                          isAlert
                            ? 'bg-red-50 text-red-900 border-red-300'
                            : isWarning
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : isSuccess
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : 'bg-blue-50 text-blue-900 border-blue-300'
                        }`}
                      >
                        {n.category}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" title="Unread" />
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-gray-900 mt-1">{n.title}</h3>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-300 text-right">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white border border-gray-400 text-xs font-bold uppercase text-gray-800 hover:bg-gray-100"
          >
            Close Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
