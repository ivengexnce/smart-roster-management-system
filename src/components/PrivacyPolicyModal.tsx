import React from 'react';
import { IconShield, IconClose } from './icons';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-400 max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-300 mb-4">
          <div className="flex items-center space-x-2">
            <IconShield className="w-5 h-5 text-gray-800" />
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-tight">
              Privacy Policy &amp; Operational Data Governance
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-black hover:bg-gray-100"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-gray-700 space-y-4 leading-relaxed">
          <section>
            <h4 className="font-bold text-gray-900 uppercase mb-1">1. Scope of Data Processing</h4>
            <p>
              The Smart Roster Management System processes employee identification codes, assigned pod structures,
              brand alignments, process qualifications, and scheduled availability exclusively to calculate optimal
              operational staffing rosters.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-900 uppercase mb-1">2. Role-Based Data Isolation (RBAC)</h4>
            <p>
              Access to personnel records and schedule modification controls is restricted by authenticated user roles:
            </p>
            <p className="mt-1 pl-3 border-l-2 border-gray-300">
              - Operations Managers maintain global schedule authorization.<br />
              - Pod Leads can only view and suggest modifications for their designated operational pod.<br />
              - Employees can only view their own shifts and personal leave records.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-900 uppercase mb-1">3. Immutable Audit Trails</h4>
            <p>
              To ensure organizational transparency and prevent non-repudiation, all roster publications, manual slot
              overrides, leave approvals, and backup reassignments are recorded in an append-only audit log capturing
              the timestamp, acting user ID, and operational rationale.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-900 uppercase mb-1">4. Retention and Storage</h4>
            <p>
              All roster metadata and scheduling states are maintained securely with cryptographic session verification.
              No personnel contact information or schedule records are shared with third-party advertising or marketing services.
            </p>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold hover:bg-black uppercase tracking-wider"
          >
            Close Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}
