'use client';

import React, { useState } from 'react';
import { IconAlertOctagon, IconAnimatedArrow, IconCheck, IconLayers } from './icons';

interface ProductDemoSectionProps {
  onRunScenario: () => void;
  onRunStressTest?: () => void;
  isSimulating: boolean;
}

export function ProductDemoSection({
  onRunScenario,
  onRunStressTest,
  isSimulating,
}: ProductDemoSectionProps) {
  const [selectedScenario, setSelectedScenario] = useState<'BENCHMARK' | 'STRESS_TEST'>('BENCHMARK');

  return (
    <div className="border border-gray-300 bg-white p-6 my-4 shadow-none">
      {/* Scenario Tabs */}
      <div className="flex border-b border-gray-300 mb-6 bg-gray-50 text-xs font-mono">
        <button
          onClick={() => setSelectedScenario('BENCHMARK')}
          className={`px-4 py-2.5 font-bold border-r border-gray-300 flex items-center space-x-2 ${
            selectedScenario === 'BENCHMARK'
              ? 'bg-white text-gray-900 border-b-2 border-b-gray-900'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span>Scenario 1: Benchmark Leave &amp; Local Repair</span>
          <span className="text-[10px] bg-blue-100 text-blue-900 px-1 py-0.2 font-mono">E01 Day 12</span>
        </button>

        <button
          onClick={() => setSelectedScenario('STRESS_TEST')}
          className={`px-4 py-2.5 font-bold border-r border-gray-300 flex items-center space-x-2 ${
            selectedScenario === 'STRESS_TEST'
              ? 'bg-white text-gray-900 border-b-2 border-b-gray-900'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span>Scenario 2: Pod Stress-Test &amp; Cross-Pod Borrowing</span>
          <span className="text-[10px] bg-amber-100 text-amber-900 px-1 py-0.2 font-mono">Multi-Leave</span>
        </button>
      </div>

      {selectedScenario === 'BENCHMARK' ? (
        <div>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 inline-block mb-2 font-mono">
                Datastraw Benchmark Scenario
              </span>
              <h2 className="text-xl font-black tracking-tight text-gray-900 font-sans">
                DYNAMIC LEAVE &amp; LOCAL REPAIR SIMULATION
              </h2>
              <p className="text-xs text-gray-700 mt-1 max-w-3xl leading-relaxed">
                It is not a random recalculation, it is localized constraint repair. When employee E01 (handling all Brand A processes) requests leave on Day 12, the system isolates the 2 critical coverage gaps and repairs the schedule locally without wiping the rest of the month.
              </p>
            </div>

            <div className="shrink-0">
              <button
                onClick={onRunScenario}
                disabled={isSimulating}
                className="group px-4 py-2.5 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 flex items-center space-x-2 rounded-none disabled:opacity-50 font-mono"
              >
                <span>{isSimulating ? 'Processing Reassignment...' : 'Run Benchmark Scenario'}</span>
                <IconAnimatedArrow className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Steps in a Horizontal Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
            <div className="p-3 bg-gray-50 border border-gray-300">
              <div className="text-[10px] font-mono text-gray-500 font-bold uppercase mb-1">
                Step 01 - Primary Ownership
              </div>
              <div className="text-xs font-bold text-gray-900">E01 Assigned to Brand A</div>
              <p className="text-[11px] text-gray-600 mt-1">
                Rahul Sharma (E01) manages CS (365d), ACC, and NDR (365d) as the dedicated single-resource owner.
              </p>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-300">
              <div className="text-[10px] font-mono text-gray-500 font-bold uppercase mb-1">
                Step 02 - Availability Shock
              </div>
              <div className="text-xs font-bold text-gray-900">E01 Approved Leave on Day 12</div>
              <p className="text-[11px] text-gray-600 mt-1">
                Rahul submits approved personal leave. Working status on Day 12 flips to APPROVED LEAVE.
              </p>
            </div>

            <div className="p-3 bg-rose-50/50 border border-rose-300">
              <div className="text-[10px] font-mono text-rose-700 font-bold uppercase mb-1 flex items-center space-x-1">
                <IconAlertOctagon className="w-3 h-3 text-rose-600" />
                <span>Step 03 - Gap Detection</span>
              </div>
              <div className="text-xs font-bold text-rose-900">Critical Coverage Gaps</div>
              <p className="text-[11px] text-rose-700 mt-1">
                Brand A CS: 0/1 staff. Brand A NDR: 0/1 staff. Publication strictly blocked until resolved.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/50 border border-emerald-300">
              <div className="text-[10px] font-mono text-emerald-700 font-bold uppercase mb-1 flex items-center space-x-1">
                <IconCheck className="w-3 h-3 text-emerald-600" />
                <span>Step 04 - One-Click Resolution</span>
              </div>
              <div className="text-xs font-bold text-emerald-900">Reassign Backup E09</div>
              <p className="text-[11px] text-emerald-800 mt-1">
                Engine matches E09 (Pooja Iyer), qualified in CS/NDR and available on Day 12. Local slot override logged.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 inline-block mb-2 font-mono">
                Catastrophic Availability Stress Test
              </span>
              <h2 className="text-xl font-black tracking-tight text-gray-900 font-sans">
                SIMULTANEOUS MULTI-RESOURCE LEAVES &amp; CROSS-POD BORROWING
              </h2>
              <p className="text-xs text-gray-700 mt-1 max-w-3xl leading-relaxed">
                When three dedicated account owners in Pod Alpha (E01, E02, E08) all request simultaneous leaves on Day 16, Pod Alpha&apos;s two internal floaters (E09, E10) are exhausted. The solver triggers cross-pod escalation to borrow floater E19 from Pod Beta without human friction.
              </p>
            </div>

            <div className="shrink-0">
              <button
                onClick={onRunStressTest}
                disabled={isSimulating}
                className="group px-4 py-2.5 bg-amber-700 text-white text-xs font-bold uppercase tracking-wider hover:bg-amber-800 flex items-center space-x-2 rounded-none disabled:opacity-50 font-mono"
              >
                <span>{isSimulating ? 'Simulating Multi-Shock...' : 'Execute Stress Test'}</span>
                <IconLayers className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3 Stress Test Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
            <div className="p-3 bg-gray-50 border border-gray-300">
              <div className="text-[10px] font-mono text-gray-500 font-bold uppercase mb-1">
                Stage 1: Triple Outage Shock
              </div>
              <div className="text-xs font-bold text-gray-900">E01, E02, E08 Simultaneous Leave</div>
              <p className="text-[11px] text-gray-600 mt-1">
                Brand A (E01), Brand B (E02), and Brand E (E08) all lose primary coverage on Day 16. Total required: 3 floaters.
              </p>
            </div>

            <div className="p-3 bg-amber-50/50 border border-amber-300">
              <div className="text-[10px] font-mono text-amber-800 font-bold uppercase mb-1">
                Stage 2: Pod Floater Exhaustion
              </div>
              <div className="text-xs font-bold text-amber-900">E09 &amp; E10 Deployed (100% Capacity)</div>
              <p className="text-[11px] text-amber-700 mt-1">
                E09 covers Brand A, E10 covers Brand B. Pod Alpha reserve pool hits 0. Brand E remains at 0/1.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/50 border border-emerald-300">
              <div className="text-[10px] font-mono text-emerald-800 font-bold uppercase mb-1">
                Stage 3: Cross-Pod Escalation
              </div>
              <div className="text-xs font-bold text-emerald-900">Borrow E19 from Pod Beta</div>
              <p className="text-[11px] text-emerald-700 mt-1">
                Solver searches Pod Beta reserve, identifies qualified floater E19, and assigns cross-pod coverage for Brand E.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
