import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Database, Server, Cpu, Globe, FileCheck } from 'lucide-react';

export const DocsModal = ({ onClose }) => {
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeTab, setActiveTab] = useState('powershell');

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const psDbCommands = `# 1. Open Windows PowerShell:
cd database

# Import primary MySQL schema into XAMPP:
& "C:\\xampp\\mysql\\bin\\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS civicpulse_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
& "C:\\xampp\\mysql\\bin\\mysql.exe" -u root civicpulse_db < schema.sql

# Load development seed data:
& "C:\\xampp\\mysql\\bin\\mysql.exe" -u root civicpulse_db < seed-dev.sql

# Verify setup:
& "C:\\xampp\\mysql\\bin\\mysql.exe" -u root civicpulse_db -e "SHOW TABLES; SELECT role, count(*) FROM users GROUP BY role;"`;

  const psBackendCommands = `# In a new Windows PowerShell terminal:
cd backend
npm install
Copy-Item .env.example .env

# Start Node.js Express server on port 5000:
npm run dev`;

  const psPythonCommands = `# In a new Windows PowerShell terminal:
cd python-service
python -m venv venv
.\\venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env

# Run FastAPI Uvicorn service on port 8000:
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`;

  const psFrontendCommands = `# In a new Windows PowerShell terminal:
cd frontend
npm install
Copy-Item .env.example .env
npm run dev`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                CivicPulse Hub Setup Guide & Specifications
              </h2>
              <p className="text-xs text-slate-500">
                Exact Windows PowerShell commands & four-tier architecture specification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('powershell')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'powershell'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Windows PowerShell Commands
          </button>
          <button
            onClick={() => setActiveTab('spec')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'spec'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            Core Lifecycle & Rules
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'tests'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Acceptance Criteria (AT01–AT12)
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {activeTab === 'powershell' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>Step 1: Database Setup (MySQL via XAMPP)</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(psDbCommands, 'db')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {copiedKey === 'db' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'db' ? 'Copied!' : 'Copy Commands'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {psDbCommands}
                </pre>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Server className="w-4 h-4 text-emerald-600" />
                    <span>Step 2: Express Backend Server (Port 5000)</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(psBackendCommands, 'backend')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {copiedKey === 'backend' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'backend' ? 'Copied!' : 'Copy Commands'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {psBackendCommands}
                </pre>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Cpu className="w-4 h-4 text-purple-600" />
                    <span>Step 3: Python FastAPI Analytics (Port 8000)</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(psPythonCommands, 'python')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {copiedKey === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'python' ? 'Copied!' : 'Copy Commands'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {psPythonCommands}
                </pre>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Globe className="w-4 h-4 text-cyan-600" />
                    <span>Step 4: React + Vite Frontend Client (Port 5173)</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(psFrontendCommands, 'frontend')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {copiedKey === 'frontend' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'frontend' ? 'Copied!' : 'Copy Commands'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {psFrontendCommands}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'spec' && (
            <div className="space-y-4 leading-relaxed">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
                <h3 className="font-bold text-sm mb-1">State Transition Lifecycle (Section 6.9 & F06)</h3>
                <p>
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">
                    PENDING → ASSIGNED → RESOLVED
                  </code>
                </p>
                <p className="mt-2 text-xs">
                  <strong>Reopening Logic:</strong> When a citizen provides feedback with a rating
                  of 1 or 2 stars, the complaint is automatically reset to{' '}
                  <span className="font-bold">PENDING</span> status for administrative intervention.
                  Previous officer resolution notes, evidence photos, and audit log history are
                  strictly preserved in the database.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-slate-900 mb-1">Role Hierarchy & RBAC</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                    <li><strong>CITIZEN:</strong> File grievances, pick GIS map pins, submit before-photos, rate outcomes.</li>
                    <li><strong>OFFICER:</strong> View department queue, update officer priority, submit resolution notes and after-photos.</li>
                    <li><strong>ADMIN:</strong> Triage complaints, assign officers, establish deadlines, export XLSX reports.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-slate-900 mb-1">Upload & Security Standards</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                    <li>Max file size: <strong>5 MB</strong> per evidence image.</li>
                    <li>Supported formats: <strong>JPEG, PNG, WebP</strong>.</li>
                    <li>Server-generated file names (UUID/timestamp based).</li>
                    <li>EXIF metadata stripped from public assets.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                All 12 Acceptance Criteria defined in Section 16 have been implemented and verified:
              </p>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {[
                  { id: 'AT01', name: 'Registration & OTP', desc: 'Valid OTP activates account; expired OTP rejected' },
                  { id: 'AT02', name: 'Login & Roles', desc: 'RBAC enforced on all routes; JWT session validated' },
                  { id: 'AT03', name: 'Create Complaint', desc: 'Saves as PENDING with owner mapping and before-photo' },
                  { id: 'AT04', name: 'Admin Assignment', desc: 'Assigns officer, sets priority & deadline, status ASSIGNED' },
                  { id: 'AT05', name: 'Officer Resolution', desc: 'Only assigned officer resolves with notes & after-photo' },
                  { id: 'AT06', name: 'Feedback Rating 1–2', desc: 'Automatic reopening to PENDING; preserves history cycle' },
                  { id: 'AT07', name: 'Feedback Rating 3–5', desc: 'Preserves RESOLVED status and finalizes resolution' },
                  { id: 'AT08', name: 'Authorization Guard', desc: 'Citizen cannot access other citizen private history' },
                  { id: 'AT09', name: 'Reports Accuracy', desc: 'Workload distribution, daily volume, and status totals' },
                  { id: 'AT10', name: 'Upload Security', desc: '5MB size limits and MIME type enforcement' },
                  { id: 'AT11', name: 'Python Resilience', desc: 'Core grievance flow operational when Python is offline' },
                  { id: 'AT12', name: 'Independent Tests', desc: 'Each module executable with standalone unit tests' },
                ].map((test) => (
                  <div key={test.id} className="p-3 flex items-start gap-3 hover:bg-slate-50 text-xs">
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {test.id}
                    </span>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{test.name}</div>
                      <div className="text-slate-500 text-[11px]">{test.desc}</div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                      VERIFIED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
