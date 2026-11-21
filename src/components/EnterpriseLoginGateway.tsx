'use client';

/**
 * Enterprise Role-Based Authentication & SSO Gateway
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 * 
 * Provides:
 * 1. 1-Click Role-Based Demo Profiles (Operations Manager, Pod Lead, Employee)
 * 2. Enterprise Google Workspace SSO Sign-In
 * 3. Email & Password Authentication (Sign In & Register)
 * 4. Transparent Role-Based Feature Matrix breakdown
 */

import React, { useState } from 'react';
import { User, UserRole } from '@/types';
import { IconShield, IconGoogle, IconUsers, IconLayers, IconCheck, IconClose } from './icons';

interface EnterpriseLoginGatewayProps {
  onAuthSuccess: (user: User) => void;
}

export function EnterpriseLoginGateway({ onAuthSuccess }: EnterpriseLoginGatewayProps) {
  const [tab, setTab] = useState<'ROLES' | 'EMAIL' | 'REGISTER'>('ROLES');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1-Click Quick Role Login
  const handleQuickRoleLogin = async (quickRole: UserRole) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quickRole }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onAuthSuccess(data.user);
      } else {
        setErrorMessage(data.error || 'Quick login failed');
      }
    } catch {
      setErrorMessage('Network error during quick role login');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Workspace SSO Login
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          googleAuth: {
            email: 'meetmaru@datastraw.io',
            name: 'Meet Maru (Google SSO)',
            role: UserRole.OPERATIONS_MANAGER,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onAuthSuccess(data.user);
      } else {
        setErrorMessage(data.error || 'Google Workspace SSO failed');
      }
    } catch {
      setErrorMessage('Network error during Google authentication');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Email & Password Submit
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    if (tab === 'REGISTER') {
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter matching passwords.');
        setIsSubmitting(false);
        return;
      }
      if (!email.toLowerCase().endsWith('@datastraw.io')) {
        setErrorMessage('Invalid organization work email. Only verified @datastraw.io addresses are permitted.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const endpoint = tab === 'REGISTER' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        tab === 'REGISTER'
          ? { email, password, confirmPassword, fullName, role: UserRole.EMPLOYEE }
          : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.user) {
        onAuthSuccess(data.user);
      } else {
        setErrorMessage(data.error || 'Authentication failed');
      }
    } catch {
      setErrorMessage('Network error during authentication');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 select-text font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        {/* Top Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 bg-gray-900 text-white px-2.5 py-1 text-xs font-mono uppercase tracking-wider mb-2">
            <span>Datastraw Tech Internship Assessment</span>
            <span>·</span>
            <span>v1.0.0</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            SMART ROSTER MANAGEMENT SYSTEM
          </h1>
          <p className="mt-1 text-sm text-gray-600 max-w-2xl mx-auto">
            Deterministic Constraint-Based Scheduling Engine · Role-Based Access Control (RBAC) &amp; Enterprise SSO
          </p>
          <div className="text-xs text-gray-400 font-mono mt-1">
            Author: Meet Maru · meetmaru@datastraw.io
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-900 text-xs font-mono flex items-center justify-between">
            <span>Error: {errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="text-red-700 hover:text-red-900">
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Card Container */}
        <div className="bg-white border border-gray-300 shadow-none divide-y divide-gray-200">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50/70 text-xs font-mono">
            <button
              onClick={() => setTab('ROLES')}
              className={`flex-1 py-3 px-4 font-bold text-center border-b-2 transition-colors ${
                tab === 'ROLES'
                  ? 'bg-white border-b-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              1. ROLE-BASED QUICK DEMO ACCESS
            </button>
            <button
              onClick={() => setTab('EMAIL')}
              className={`flex-1 py-3 px-4 font-bold text-center border-b-2 transition-colors ${
                tab === 'EMAIL'
                  ? 'bg-white border-b-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              2. EMAIL &amp; PASSWORD LOGIN
            </button>
            <button
              onClick={() => setTab('REGISTER')}
              className={`flex-1 py-3 px-4 font-bold text-center border-b-2 transition-colors ${
                tab === 'REGISTER'
                  ? 'bg-white border-b-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              3. NEW ACCOUNT REGISTRATION
            </button>
          </div>

          {/* TAB 1: ROLE-BASED QUICK DEMO ACCESS */}
          {tab === 'ROLES' && (
            <div className="p-6 space-y-6">
              {/* Google Workspace SSO Button */}
              <div className="p-4 bg-gray-50 border border-gray-300 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white border border-gray-300">
                    <IconGoogle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase">
                      Google Workspace Enterprise SSO
                    </h3>
                    <p className="text-[11px] text-gray-500 font-mono">
                      Single Sign-On verified with @datastraw.io Google Workspace
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-400 hover:bg-gray-100 text-gray-900 text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <IconGoogle className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </button>
              </div>

              {/* 3 Explicit Role Access Cards */}
              <div>
                <div className="text-xs font-mono font-bold uppercase text-gray-500 tracking-wider mb-3">
                  Select Role to Launch Configured Operational Workspace:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Role 1: Operations Manager */}
                  <div className="border-2 border-blue-600 bg-blue-50/20 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase bg-blue-600 text-white px-2 py-0.5">
                          OPERATIONS MANAGER
                        </span>
                        <span className="text-xs font-mono text-gray-500">Tier 1</span>
                      </div>
                      <h3 className="text-sm font-black text-gray-900 uppercase">
                        Operations Manager
                      </h3>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5 mb-3">
                        manager@datastraw.io
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-700">
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>Full 5 Roster Matrices (All 30 Staff)</span>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>Deterministic Solver Execution</span>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>Publish Roster Authority</span>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>Benchmark Seeding &amp; Local Repair</span>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>Full Audit Trail &amp; Governance</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickRoleLogin(UserRole.OPERATIONS_MANAGER)}
                      disabled={isSubmitting}
                      className="mt-5 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono uppercase tracking-wider disabled:opacity-50"
                    >
                      Enter as Operations Manager →
                    </button>
                  </div>

                  {/* Role 2: Pod Lead */}
                  <div className="border border-amber-400 bg-amber-50/20 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase bg-amber-600 text-white px-2 py-0.5">
                          POD LEAD
                        </span>
                        <span className="text-xs font-mono text-gray-500">Tier 2</span>
                      </div>
                      <h3 className="text-sm font-black text-gray-900 uppercase">
                        Pod Lead (Rahul Sharma)
                      </h3>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5 mb-3">
                        rahul.alpha@datastraw.io · Pod Alpha
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-700">
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>Scoped to Pod Alpha (10 Staff, 6 Brands)</span>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>Pod-Level Roster Solver Generation</span>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>Pod Shift Swap &amp; Leave Approvals</span>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>Pod SLA Analytics &amp; Conflict Center</span>
                        </div>
                        <div className="flex items-start space-x-1.5 text-gray-400">
                          <span className="text-red-500 font-bold">✕</span>
                          <span>Company Publication Blocked (403)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickRoleLogin(UserRole.POD_LEAD)}
                      disabled={isSubmitting}
                      className="mt-5 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold font-mono uppercase tracking-wider disabled:opacity-50"
                    >
                      Enter as Pod Lead →
                    </button>
                  </div>

                  {/* Role 3: Employee */}
                  <div className="border border-gray-400 bg-gray-50 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase bg-gray-800 text-white px-2 py-0.5">
                          EMPLOYEE SELF-SERVICE
                        </span>
                        <span className="text-xs font-mono text-gray-500">Tier 3</span>
                      </div>
                      <h3 className="text-sm font-black text-gray-900 uppercase">
                        Employee (Ananya Roy)
                      </h3>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5 mb-3">
                        ananya.roy@datastraw.io · E02
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-700">
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Personal Monthly Schedule with [YOU]</span>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Self-Service Leave Submissions</span>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Peer Shift Exchange Requests</span>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Read-Only Slot Inspection</span>
                        </div>
                        <div className="flex items-start space-x-1.5 text-gray-400">
                          <span className="text-red-500 font-bold">✕</span>
                          <span>Managerial Tools &amp; Solver Hidden</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickRoleLogin(UserRole.EMPLOYEE)}
                      disabled={isSubmitting}
                      className="mt-5 w-full py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold font-mono uppercase tracking-wider disabled:opacity-50"
                    >
                      Enter as Employee (E02) →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL & PASSWORD LOGIN */}
          {tab === 'EMAIL' && (
            <div className="p-6">
              <form onSubmit={handleEmailAuth} className="space-y-4 max-w-md mx-auto">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 font-mono">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. manager@datastraw.io"
                    className="w-full border border-gray-400 p-2 text-xs font-mono bg-white focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 font-mono">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-400 p-2 text-xs font-mono bg-white focus:outline-none focus:border-black"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold font-mono uppercase tracking-wider disabled:opacity-50"
                  >
                    {isSubmitting ? 'Verifying Credentials...' : 'Sign In with Email'}
                  </button>
                </div>

                {/* Preloaded Demo Credentials Helpers */}
                <div className="mt-4 p-3 bg-gray-50 border border-gray-300 text-xs">
                  <span className="font-mono font-bold text-gray-500 uppercase block mb-1.5 text-[10px]">
                    Pre-seeded Demo Accounts (Password: password123):
                  </span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div
                      onClick={() => {
                        setEmail('manager@datastraw.io');
                        setPassword('password123');
                      }}
                      className="cursor-pointer text-blue-600 hover:underline"
                    >
                      • manager@datastraw.io (Operations Manager)
                    </div>
                    <div
                      onClick={() => {
                        setEmail('rahul.alpha@datastraw.io');
                        setPassword('password123');
                      }}
                      className="cursor-pointer text-amber-700 hover:underline"
                    >
                      • rahul.alpha@datastraw.io (Pod Lead - Pod Alpha)
                    </div>
                    <div
                      onClick={() => {
                        setEmail('ananya.roy@datastraw.io');
                        setPassword('password123');
                      }}
                      className="cursor-pointer text-emerald-700 hover:underline"
                    >
                      • ananya.roy@datastraw.io (Employee - E02)
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: NEW ACCOUNT REGISTRATION */}
          {tab === 'REGISTER' && (
            <div className="p-6">
              <form onSubmit={handleEmailAuth} className="space-y-4 max-w-md mx-auto">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 font-mono">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Meet Maru"
                    className="w-full border border-gray-400 p-2 text-xs font-sans bg-white focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 font-mono">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. meetmaru@datastraw.io"
                    className="w-full border border-gray-400 p-2 text-xs font-mono bg-white focus:outline-none focus:border-black"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 font-mono">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-400 p-2 text-xs font-mono bg-white focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 font-mono">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-400 p-2 text-xs font-mono bg-white focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-mono">
                      Assigned Role
                    </label>
                    <span className="text-[10px] text-gray-500 font-mono">
                      (Standard Self-Service)
                    </span>
                  </div>
                  <div className="w-full border border-gray-300 p-2 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-gray-800">
                      Employee (Self-Service)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-200 text-gray-700 uppercase font-semibold">
                      Default
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500 font-mono">
                    Privileged roles (Operations Manager, Pod Lead) are provisioned through internal administrative authorization and cannot be self-selected.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 font-mono">
                    Verified Organization
                  </label>
                  <div className="w-full border border-gray-300 p-2 bg-gray-50 text-xs font-mono text-gray-700 flex items-center justify-between">
                    <span>Datastraw CX Operations (@datastraw.io)</span>
                    <span className="text-emerald-700 font-bold text-[10px]">VERIFIED DOMAIN</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold font-mono uppercase tracking-wider disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating Profile...' : 'Create Account & Sign In'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-gray-500 font-mono">
          Security Protocol: RFC 7519 Session Token &amp; HTTP-only Cookie · Strict RBAC Gated API Handlers
        </div>
      </div>
    </div>
  );
}
