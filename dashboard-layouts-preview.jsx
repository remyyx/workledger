import { useState } from "react";
import {
  LayoutGrid, Columns, Layers, Monitor,
  DollarSign, FileText, Lock, Award, Plus, Wallet,
  Trophy, ArrowUpRight, ArrowDownLeft, Clock,
  ChevronRight, Bell, Search, BarChart3, Activity
} from "lucide-react";

// Shared mock data
const stats = [
  { label: "Total Earned", value: "$12,450", icon: DollarSign, change: "+12%", color: "text-green-400" },
  { label: "Active Contracts", value: "3", icon: FileText, change: "+1", color: "text-blue-400" },
  { label: "Escrow Held", value: "$4,200", icon: Lock, change: "", color: "text-yellow-400" },
  { label: "PoW NFTs", value: "7", icon: Award, change: "+2", color: "text-purple-400" },
];

const contracts = [
  { title: "E-commerce Redesign", client: "TechCorp", amount: "$3,500", status: "active", progress: 65 },
  { title: "API Integration", client: "DataFlow Inc", amount: "$2,100", status: "funded", progress: 20 },
  { title: "Brand Identity", client: "StartupXYZ", amount: "$1,800", status: "active", progress: 90 },
  { title: "Mobile App MVP", client: "HealthTech", amount: "$5,000", status: "draft", progress: 0 },
  { title: "SEO Audit", client: "GrowthCo", amount: "$800", status: "completed", progress: 100 },
];

const transactions = [
  { type: "in", label: "Payment from TechCorp", amount: "+$1,750", time: "2h ago" },
  { type: "out", label: "Escrow funded", amount: "-$2,100", time: "1d ago" },
  { type: "in", label: "Milestone released", amount: "+$900", time: "3d ago" },
  { type: "in", label: "Payment from StartupXYZ", amount: "+$600", time: "5d ago" },
];

const nfts = [
  { title: "E-commerce Redesign", type: "Proof of Work", rating: 5, date: "Feb 2026" },
  { title: "API Integration v2", type: "License", rating: 4, date: "Jan 2026" },
  { title: "Brand Package", type: "Proof of Work", rating: 5, date: "Dec 2025" },
];

const statusColors = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  funded: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  completed: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

// Mini sidebar shared by all layouts
function MiniSidebar() {
  return (
    <div className="w-16 bg-gray-900/80 border-r border-gray-700/50 flex flex-col items-center py-4 gap-4 shrink-0">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/25">W</div>
      <div className="w-8 h-px bg-gray-700/50" />
      {[LayoutGrid, FileText, Wallet, Award, BarChart3].map((Icon, i) => (
        <div key={i} className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all ${i === 0 ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}>
          <Icon size={18} />
        </div>
      ))}
    </div>
  );
}

// =============================================
// LAYOUT 1: BENTO GRID
// =============================================
function BentoGrid() {
  return (
    <div className="flex h-full">
      <MiniSidebar />
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400"><Search size={16} /></div>
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 relative"><Bell size={16} /><span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full" /></div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-4 grid-rows-[auto_auto_auto] gap-3">
          {/* Stats row - 4 equal cards */}
          {stats.map((s, i) => (
            <div key={i} className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</span>
                <s.icon size={16} className={s.color} />
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              {s.change && <span className="text-xs text-green-400">{s.change}</span>}
            </div>
          ))}

          {/* Main content - 3 cols: contracts */}
          <div className="col-span-3 row-span-2 bg-gray-800/60 border border-gray-700/40 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Active Contracts</h2>
              <button className="text-xs text-blue-400 hover:text-blue-300">View all</button>
            </div>
            <div className="space-y-3">
              {contracts.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/40 hover:bg-gray-900/60 transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{c.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[c.status]}`}>{c.status}</span>
                    </div>
                    <span className="text-xs text-gray-500">{c.client}</span>
                  </div>
                  <div className="w-24">
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${c.progress}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white w-16 text-right">{c.amount}</span>
                  <ChevronRight size={14} className="text-gray-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Side - transactions (tall card) */}
          <div className="col-span-1 row-span-1 bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Recent</h3>
            <div className="space-y-3">
              {transactions.slice(0, 3).map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${t.type === 'in' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {t.type === 'in' ? <ArrowDownLeft size={12} className="text-green-400" /> : <ArrowUpRight size={12} className="text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-300 truncate">{t.label}</div>
                    <div className="text-[10px] text-gray-600">{t.time}</div>
                  </div>
                  <span className={`text-xs font-medium ${t.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>{t.amount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Side - NFTs */}
          <div className="col-span-1 row-span-1 bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">NFTs</h3>
            <div className="space-y-2">
              {nfts.slice(0, 2).map((n, i) => (
                <div key={i} className="p-2 rounded-lg bg-gray-900/40">
                  <div className="text-xs font-medium text-white truncate">{n.title}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-purple-400">{n.type}</span>
                    <span className="text-[10px] text-yellow-400">{"★".repeat(n.rating)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// LAYOUT 2: KANBAN COLUMNS
// =============================================
function KanbanColumns() {
  const stages = [
    { label: "Draft", color: "gray", items: contracts.filter(c => c.status === "draft") },
    { label: "Funded", color: "blue", items: contracts.filter(c => c.status === "funded") },
    { label: "Active", color: "green", items: contracts.filter(c => c.status === "active") },
    { label: "Completed", color: "purple", items: contracts.filter(c => c.status === "completed") },
  ];
  const colorMap = { gray: "border-gray-500/30 bg-gray-500/10 text-gray-400", blue: "border-blue-500/30 bg-blue-500/10 text-blue-400", green: "border-green-500/30 bg-green-500/10 text-green-400", purple: "border-purple-500/30 bg-purple-500/10 text-purple-400" };
  const dotMap = { gray: "bg-gray-500", blue: "bg-blue-500", green: "bg-green-500", purple: "bg-purple-500" };

  return (
    <div className="flex h-full">
      <MiniSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with stats */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <div className="flex items-center gap-3">
              <button className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={12} /> New Contract</button>
            </div>
          </div>
          <div className="flex gap-3">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-800/40 border border-gray-700/30 rounded-lg px-4 py-2.5 flex-1">
                <s.icon size={16} className={s.color} />
                <div>
                  <div className="text-lg font-bold text-white leading-tight">{s.value}</div>
                  <div className="text-[10px] text-gray-500 uppercase">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kanban columns */}
        <div className="flex-1 flex gap-3 p-4 overflow-x-auto">
          {stages.map((stage, i) => (
            <div key={i} className="flex-1 min-w-[200px] flex flex-col">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={`w-2 h-2 rounded-full ${dotMap[stage.color]}`} />
                <span className="text-sm font-semibold text-gray-300">{stage.label}</span>
                <span className="text-xs text-gray-600 ml-auto">{stage.items.length}</span>
              </div>
              <div className="flex-1 space-y-2">
                {stage.items.map((c, j) => (
                  <div key={j} className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 hover:border-blue-500/30 transition-all cursor-pointer">
                    <h4 className="text-sm font-medium text-white mb-1">{c.title}</h4>
                    <p className="text-xs text-gray-500 mb-3">{c.client}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{c.amount}</span>
                      {c.progress > 0 && c.progress < 100 && (
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${c.progress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {stage.items.length === 0 && (
                  <div className="border border-dashed border-gray-700/40 rounded-xl p-6 text-center">
                    <p className="text-xs text-gray-600">No contracts</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================
// LAYOUT 3: FULL-WIDTH STACKED
// =============================================
function FullWidthStacked() {
  return (
    <div className="flex h-full">
      <MiniSidebar />
      <div className="flex-1 overflow-y-auto">
        {/* Hero stats banner */}
        <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/10 to-transparent border-b border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Testnet</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">{s.label}</div>
                {s.change && <span className="text-xs text-green-400">{s.change} this month</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Active Contracts - full width table */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Active Contracts</h2>
            <button className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={12} /> New Contract</button>
          </div>
          <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-4 px-5 py-2.5 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700/30">
              <span>Project</span><span>Client</span><span>Amount</span><span>Progress</span><span>Status</span>
            </div>
            {contracts.map((c, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3.5 items-center border-b border-gray-700/20 last:border-0 hover:bg-gray-700/20 transition-all cursor-pointer">
                <span className="text-sm font-medium text-white">{c.title}</span>
                <span className="text-sm text-gray-400">{c.client}</span>
                <span className="text-sm font-semibold text-white">{c.amount}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${c.progress}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8">{c.progress}%</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border text-center ${statusColors[c.status]}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Two columns: Transactions + NFTs */}
        <div className="grid grid-cols-2 gap-0">
          <div className="p-6 border-r border-gray-700/50">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
            <div className="space-y-3">
              {transactions.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/40 border border-gray-700/30 rounded-xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'in' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {t.type === 'in' ? <ArrowDownLeft size={14} className="text-green-400" /> : <ArrowUpRight size={14} className="text-red-400" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-300">{t.label}</span>
                    <div className="text-xs text-gray-600">{t.time}</div>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>{t.amount}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">NFT Portfolio</h2>
            <div className="space-y-3">
              {nfts.map((n, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/40 border border-gray-700/30 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Trophy size={16} className="text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white">{n.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-purple-400">{n.type}</span>
                      <span className="text-xs text-yellow-400">{"★".repeat(n.rating)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{n.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// LAYOUT 4: COMMAND CENTER
// =============================================
function CommandCenter() {
  return (
    <div className="flex h-full">
      <MiniSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Compact top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700/50 bg-gray-900/40">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-white">WORKLEDGER</h1>
            <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded">TESTNET</span>
          </div>
          <div className="flex items-center gap-2">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/40 rounded text-xs">
                <s.icon size={12} className={s.color} />
                <span className="text-white font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main content area - 3 columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Contracts */}
          <div className="w-72 border-r border-gray-700/50 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700/30 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contracts</span>
              <Plus size={14} className="text-blue-400 cursor-pointer" />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {contracts.map((c, i) => (
                <div key={i} className={`p-3 rounded-lg cursor-pointer transition-all ${i === 0 ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-gray-800/40 border border-transparent'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{c.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColors[c.status]}`}>{c.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{c.client}</span>
                    <span className="text-xs font-semibold text-gray-300">{c.amount}</span>
                  </div>
                  {c.progress > 0 && (
                    <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${c.progress}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Center - Main focus area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-700/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">E-commerce Redesign</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-green-500/20 text-green-400 border-green-500/30">active</span>
              </div>
              <span className="text-xs text-gray-500">TechCorp &middot; $3,500 &middot; 65% complete</span>
            </div>
            <div className="flex-1 p-5 overflow-y-auto">
              {/* Milestones */}
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Milestones</h3>
              <div className="space-y-2 mb-6">
                {["Wireframes & UX", "Frontend Build", "Backend Integration", "QA & Launch"].map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/40 border border-gray-700/30 rounded-lg">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 2 ? 'bg-green-500/20 text-green-400' : i === 2 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-500'}`}>
                      {i < 2 ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm flex-1 ${i < 2 ? 'text-gray-500 line-through' : 'text-white'}`}>{m}</span>
                    <span className="text-xs text-gray-500">{i < 2 ? 'Released' : i === 2 ? 'In progress' : 'Pending'}</span>
                    <span className="text-xs font-semibold text-white">$875</span>
                  </div>
                ))}
              </div>

              {/* Activity */}
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Activity</h3>
              <div className="space-y-2">
                {["Milestone 2 payment released", "Deliverable submitted for review", "Contract funded by TechCorp", "Contract created"].map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    <span className="text-xs text-gray-400 flex-1">{a}</span>
                    <span className="text-[10px] text-gray-600">{i === 0 ? '2h ago' : i === 1 ? '1d ago' : i === 2 ? '5d ago' : '1w ago'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel - Activity feed + NFTs */}
          <div className="w-64 border-l border-gray-700/50 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700/30">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Wallet</span>
            </div>
            <div className="p-4 border-b border-gray-700/30">
              <div className="bg-gradient-to-br from-blue-600/30 to-purple-600/20 border border-blue-500/20 rounded-xl p-4 mb-3">
                <div className="text-xs text-gray-400 mb-1">Balance</div>
                <div className="text-xl font-bold text-white">$8,250</div>
                <div className="text-xs text-gray-400 mt-1">rN7f...x4Kp</div>
              </div>
              <div className="space-y-2">
                {transactions.slice(0, 3).map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${t.type === 'in' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {t.type === 'in' ? <ArrowDownLeft size={10} className="text-green-400" /> : <ArrowUpRight size={10} className="text-red-400" />}
                    </div>
                    <span className="text-xs text-gray-400 flex-1 truncate">{t.label}</span>
                    <span className={`text-xs font-medium ${t.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>{t.amount}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 border-b border-gray-700/30">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">NFTs</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {nfts.map((n, i) => (
                <div key={i} className="p-2.5 bg-gray-800/40 border border-gray-700/30 rounded-lg">
                  <div className="text-xs font-medium text-white">{n.title}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-purple-400">{n.type}</span>
                    <span className="text-[10px] text-yellow-400">{"★".repeat(n.rating)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MAIN: Tab switcher
// =============================================
const layouts = [
  { name: "Bento Grid", icon: LayoutGrid, desc: "Magazine-style mixed cards", component: BentoGrid },
  { name: "Kanban", icon: Columns, desc: "Stage-based columns", component: KanbanColumns },
  { name: "Full-Width", icon: Layers, desc: "Wide horizontal sections", component: FullWidthStacked },
  { name: "Command Center", icon: Monitor, desc: "Dense trading terminal", component: CommandCenter },
];

export default function DashboardLayoutPreview() {
  const [active, setActive] = useState(0);
  const ActiveLayout = layouts[active].component;

  return (
    <div className="w-full h-screen flex flex-col" style={{ background: '#0A0F1C', color: '#e5e7eb', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Layout selector */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-700/50 bg-gray-900/60">
        <span className="text-sm font-semibold text-gray-400 mr-2">Layout:</span>
        {layouts.map((l, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              i === active
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <l.icon size={16} />
            <span className="font-medium">{l.name}</span>
          </button>
        ))}
      </div>

      {/* Active layout */}
      <div className="flex-1 overflow-hidden">
        <ActiveLayout />
      </div>
    </div>
  );
}