import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, DollarSign, Trash2, Key, RefreshCw, Plus } from 'lucide-react';

const BACKEND_URL = import.meta.env.PROD ? "https://monad-b768.onrender.com" : "";

export default function AdminApp() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fundInputs, setFundInputs] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
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
        alert(data.error || "Authentication failed");
        setIsAuthenticated(false);
      }
    } catch (e) {
      alert("Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const fundUser = async (username) => {
    const amount = fundInputs[username];
    if (!amount || isNaN(amount)) return alert("Invalid amount");

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: password, username, amount })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully set balance to $${data.newBalance}`);
        setFundInputs(prev => ({ ...prev, [username]: "" }));
        fetchUsers(); // refresh
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Failed to fund user");
    }
  };

  const deleteUser = async (username) => {
    if (!confirm(`Are you sure you want to delete ${username}?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: password, username })
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Failed to delete user");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
              <ShieldCheck className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-2 text-center brand-text bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">Admin Gateway</h2>
          <p className="text-center text-zinc-400 mb-8">Access restricted to authorized personnel.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                placeholder="Admin Master Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors backdrop-blur-md"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 py-3 rounded-xl font-medium transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 border border-red-500/50 text-white">
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Key className="w-5 h-5" /> Authenticate</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

      <header className="max-w-5xl mx-auto flex items-center justify-between mb-8 bg-zinc-900/60 backdrop-blur-lg border border-white/5 p-6 rounded-2xl relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <ShieldCheck className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold brand-text bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">System Administrator</h1>
            <p className="text-zinc-400 text-sm">Full control over users and balances</p>
          </div>
        </div>
        <button onClick={fetchUsers} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors border border-zinc-700">
          <RefreshCw className={`w-5 h-5 text-zinc-300 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="max-w-5xl mx-auto space-y-6 relative z-10">
        <div className="bg-zinc-900/60 backdrop-blur-lg border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold brand-text text-white">User Database</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/80 border-b border-white/5 text-zinc-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Username</th>
                  <th className="p-4 font-medium">Wallet Address</th>
                  <th className="p-4 font-medium text-right">Balance</th>
                  <th className="p-4 font-medium text-right">Locked (Offline)</th>
                  <th className="p-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-zinc-500">No users found.</td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.username} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-medium text-white flex items-center gap-2">
                        {user.username}
                        {user.role === 'admin' && <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">ADMIN</span>}
                      </td>
                      <td className="p-4 font-mono text-xs text-zinc-400 max-w-[150px] truncate" title={user.address}>
                        {user.address}
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-400">
                        ${user.balance.toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-bold text-amber-400">
                        ${user.locked.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-3">
                          <div className="flex items-center gap-1 bg-zinc-950/80 rounded-lg p-1 border border-zinc-800">
                            <input 
                              type="number" 
                              placeholder="Set $..."
                              value={fundInputs[user.username] || ""}
                              onChange={(e) => setFundInputs(prev => ({...prev, [user.username]: e.target.value}))}
                              className="w-20 bg-transparent text-sm px-2 py-1 text-white focus:outline-none"
                            />
                            <button 
                              onClick={() => fundUser(user.username)}
                              className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 p-1.5 rounded transition-colors"
                              title="Set Balance"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          </div>
                          {user.role !== 'admin' && (
                            <button 
                              onClick={() => deleteUser(user.username)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
