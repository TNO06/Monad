import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Users, 
  DollarSign, 
  Trash2, 
  Key, 
  RefreshCw, 
  ArrowLeft, 
  Search, 
  AlertCircle,
  Eye,
  EyeOff,
  Coins,
  Lock
} from 'lucide-react';
import Footer from './components/Footer';

const BACKEND_URL = import.meta.env.PROD ? "https://monad-b768.onrender.com" : "";

export default function AdminApp() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fundInputs, setFundInputs] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  const fetchUsers = async () => {
    setLoading(true);
    setStatusMessage({ text: "", type: "" });
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: password })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setIsAuthenticated(true);
      } else {
        setStatusMessage({ text: data.error || "Authentication failed", type: "error" });
        setIsAuthenticated(false);
      }
    } catch {
      setStatusMessage({ text: "Failed to connect to backend server", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const fundUser = async (username, explicitAmount = null) => {
    const amount = explicitAmount !== null ? explicitAmount : fundInputs[username];
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setStatusMessage({ text: "Please enter a valid amount to fund", type: "error" });
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: password, username, amount })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: `Funded ${username} balance to $${data.newBalance}`, type: "success" });
        setFundInputs(prev => ({ ...prev, [username]: "" }));
        fetchUsers();
      } else {
        setStatusMessage({ text: data.error, type: "error" });
      }
    } catch {
      setStatusMessage({ text: "Failed to fund user", type: "error" });
    }
  };

  const deleteUser = async (username) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${username}"?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: password, username })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: `User ${username} deleted successfully`, type: "success" });
        fetchUsers();
      } else {
        setStatusMessage({ text: data.error, type: "error" });
      }
    } catch {
      setStatusMessage({ text: "Failed to delete user", type: "error" });
    }
  };

  // Filtered users by search
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.address && u.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Compute metrics
  const totalBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalLocked = users.reduce((acc, u) => acc + (u.locked || 0), 0);

  // 1. Unauthenticated Admin Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-[#070709] text-zinc-100 selection:bg-purple-500/30">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] rounded-full bg-red-500/10 blur-[160px]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
        </div>

        {/* Minimal header with return link */}
        <header className="w-full border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl px-6 py-4 flex items-center justify-between relative z-10">
          <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Monad Pay</span>
          </Link>
          <span className="text-[11px] font-mono text-zinc-500">Gateway Status: Restricted</span>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          <div className="max-w-md w-full glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden border-white/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"></div>

            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-red-500/20 text-red-400">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-white">
                Admin Gateway
              </h2>
              <p className="text-zinc-400 text-xs mt-1">
                Restricted protocol management plane
              </p>
            </div>

            {statusMessage.text && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Admin Master Key</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter admin password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 py-3.5 rounded-xl font-semibold text-sm text-white transition-all shadow-lg shadow-red-950/40 border border-red-500/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Authenticate as Administrator"}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/5 text-center text-[11px] text-zinc-500">
              Default password for hackathon environment: <code className="text-zinc-400 font-mono">monadadmin</code>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard
  return (
    <div className="min-h-screen flex flex-col bg-[#070709] text-zinc-100 selection:bg-purple-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[20%] w-[600px] h-[600px] rounded-full bg-red-500/5 blur-[160px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[150px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
      </div>

      {/* Admin Header */}
      <header className="w-full border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-colors" title="Back to Home">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-red-400" />
              <span className="font-bold font-['Outfit'] text-white text-base">System Administrator</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={fetchUsers} 
              disabled={loading}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors border border-white/10 text-zinc-300"
              title="Refresh User Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 relative z-10 space-y-6">
        
        {/* Status Toast */}
        {statusMessage.text && (
          <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage({ text: "", type: "" })} className="text-zinc-500 hover:text-zinc-300 ml-2">Dismiss</button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-3xl border-white/10">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Registered Accounts
            </span>
            <div className="text-3xl font-extrabold font-['Outfit'] text-white">
              {users.length}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Total active wallets in registry</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl border-white/10">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mb-2">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              On-Chain Balances
            </span>
            <div className="text-3xl font-extrabold font-['Outfit'] text-emerald-400">
              ${totalBalance.toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Total available online funds</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl border-white/10">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mb-2">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Offline Allowances
            </span>
            <div className="text-3xl font-extrabold font-['Outfit'] text-amber-400">
              ${totalLocked.toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Total locked in offline vaults</div>
          </div>
        </div>

        {/* User Database Panel */}
        <section className="glass-panel rounded-3xl border-white/10 overflow-hidden shadow-2xl">
          
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold font-['Outfit'] text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Wallet Registry & Allowance Control
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Fund balances, adjust allowances, or manage registered accounts.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search user or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-950/90 border-b border-white/5 text-zinc-400 font-mono uppercase tracking-wider text-[11px]">
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">Monad Wallet Address</th>
                  <th className="p-4 font-semibold text-right">Online Balance</th>
                  <th className="p-4 font-semibold text-right">Offline Vault</th>
                  <th className="p-4 font-semibold text-center">Fund Account</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-zinc-500">
                      No matching users found in database.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.username} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-semibold text-white flex items-center gap-2">
                        <span>{user.username}</span>
                        {user.role === 'admin' && (
                          <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                            ADMIN
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-mono text-[11px] text-zinc-400 max-w-[180px] truncate" title={user.address}>
                        {user.address}
                      </td>

                      <td className="p-4 text-right font-bold text-emerald-400 font-mono text-sm">
                        ${Number(user.balance || 0).toFixed(2)}
                      </td>

                      <td className="p-4 text-right font-bold text-amber-400 font-mono text-sm">
                        ${Number(user.locked || 0).toFixed(2)}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex items-center bg-zinc-950/80 rounded-xl border border-white/10 px-2 py-1">
                            <span className="text-zinc-500 mr-1">$</span>
                            <input 
                              type="number" 
                              placeholder="Amount" 
                              value={fundInputs[user.username] || ""}
                              onChange={(e) => setFundInputs(prev => ({ ...prev, [user.username]: e.target.value }))}
                              className="w-16 bg-transparent text-white text-xs focus:outline-none"
                            />
                            <button
                              onClick={() => fundUser(user.username)}
                              className="p-1 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 transition-colors ml-1"
                              title="Set Balance"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick presets */}
                          <div className="hidden sm:flex items-center gap-1">
                            {[50, 100].map(amt => (
                              <button
                                key={amt}
                                onClick={() => fundUser(user.username, amt)}
                                className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-white border border-white/5 transition-colors"
                              >
                                +${amt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        {user.role !== 'admin' ? (
                          <button
                            onClick={() => deleteUser(user.username)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-[10px] font-mono">Protected</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
