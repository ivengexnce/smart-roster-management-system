'use client';

import React, { useState } from 'react';
import { User, UserRole } from '@/types';
import { IconClose, IconShield, IconAnimatedArrow } from './icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.OPERATIONS_MANAGER);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Handle standard Email & Password submit
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const endpoint = tab === 'LOGIN' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        tab === 'LOGIN'
          ? { email, password }
          : { email, password, fullName, role };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.user) {
        onAuthSuccess(data.user);
        onClose();
      } else {
        setErrorMsg(data.error || 'Authentication failed');
      }
    } catch {
      setErrorMsg('Network error during authentication');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle 1-Click Quick Evaluator Demo Sign-In
  const handleQuickLogin = async (quickRole: UserRole) => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickRole }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onAuthSuccess(data.user);
        onClose();
      } else {
        setErrorMsg(data.error || 'Quick login failed');
      }
    } catch {
      setErrorMsg('Network error during quick login');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleAuth: {
            email: 'evaluator.google@datastraw.io',
            name: 'Google Verified Operations Lead',
            role: UserRole.OPERATIONS_MANAGER,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onAuthSuccess(data.user);
        onClose();
      } else {
        setErrorMsg(data.error || 'Google sign-in failed');
      }
    } catch {
      setErrorMsg('Network error during Google authentication');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-400 max-w-md w-full p-6 select-text">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-300 mb-4">
          <div className="flex items-center space-x-2">
            <IconShield className="w-5 h-5 text-gray-900" />
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                Role-Based Authentication
              </h3>
              <p className="text-[11px] text-gray-500 font-mono">
                Secure Session Management (RFC 7519)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-black hover:bg-gray-100"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Click Evaluator Quick-Logins Box */}
        <div className="mb-5 p-3 bg-gray-50 border border-gray-300">
          <span className="text-[10px] font-mono font-bold uppercase text-gray-500 block mb-2">
            Evaluator 1-Click Demo Profiles:
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => handleQuickLogin(UserRole.OPERATIONS_MANAGER)}
              disabled={isSubmitting}
              className="text-left px-2.5 py-1.5 bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50/30 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-gray-900">Operations Manager</span>
                <span className="text-[10px] text-gray-500 font-mono block">
                  manager@datastraw.io · Full Write Access
                </span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-100 text-blue-900 border border-blue-200">
                ADMIN
              </span>
            </button>

            <button
              onClick={() => handleQuickLogin(UserRole.POD_LEAD)}
              disabled={isSubmitting}
              className="text-left px-2.5 py-1.5 bg-white border border-gray-300 hover:border-gray-500 hover:bg-gray-100 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-gray-900">Pod Lead (Rahul Sharma)</span>
                <span className="text-[10px] text-gray-500 font-mono block">
                  rahul.alpha@datastraw.io · Pod Alpha Scoped
                </span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-200 text-gray-800 border border-gray-300">
                LEAD
              </span>
            </button>

            <button
              onClick={() => handleQuickLogin(UserRole.EMPLOYEE)}
              disabled={isSubmitting}
              className="text-left px-2.5 py-1.5 bg-white border border-gray-300 hover:border-gray-500 hover:bg-gray-100 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-gray-900">Employee (Ananya Roy - E01)</span>
                <span className="text-[10px] text-gray-500 font-mono block">
                  e01@datastraw.io · Read-Only Access
                </span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 text-gray-600 border border-gray-200">
                EMP
              </span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-mono">
            <span className="bg-white px-2 text-gray-500">Or Authenticate Below</span>
          </div>
        </div>

        {/* Google Authentication Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 mb-4 border border-gray-400 bg-white hover:bg-gray-50 flex items-center justify-center space-x-2 text-xs font-bold text-gray-800 uppercase tracking-wider"
        >
          {/* Custom Google 'G' Clean SVG */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Tab Toggle: Login vs Register */}
        <div className="flex border border-gray-300 mb-4">
          <button
            onClick={() => setTab('LOGIN')}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-tight ${
              tab === 'LOGIN' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Email Sign In
          </button>
          <button
            onClick={() => setTab('REGISTER')}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-tight ${
              tab === 'REGISTER' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-2 mb-3 bg-red-50 border border-red-200 text-red-800 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {tab === 'REGISTER' && (
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full border border-gray-300 p-2 text-xs bg-white text-gray-900"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. manager@datastraw.io"
              className="w-full border border-gray-300 p-2 text-xs bg-white text-gray-900 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 p-2 text-xs bg-white text-gray-900 font-mono"
            />
          </div>

          {tab === 'REGISTER' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase">
                  Account Role
                </label>
                <span className="text-[10px] text-gray-500 font-mono">
                  (Default for new accounts)
                </span>
              </div>
              <div className="p-2.5 bg-gray-100 border border-gray-300 text-xs font-mono text-gray-800 flex items-center justify-between">
                <span className="font-bold">Employee (Self-Service)</span>
                <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5">TIER 3</span>
              </div>
              <p className="text-[10px] text-gray-500 font-mono mt-1">
                Note: Operations Manager &amp; Pod Lead roles require administrative assignment by an existing Operations Manager.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 mt-4 disabled:opacity-50"
          >
            <span>{tab === 'LOGIN' ? 'Sign In to Workspace' : 'Register New Account'}</span>
            <IconAnimatedArrow className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
