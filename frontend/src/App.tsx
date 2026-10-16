import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Radio,
  Share2,
  Activity,
  Layers,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Shield,
  LogOut,
  RefreshCw,
  UploadCloud,
  Sliders,
  Menu,
  X,
  Trash2,
  Edit,
  CheckSquare,
  Square,
} from 'lucide-react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sources' | 'channels' | 'shares' | 'epg'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals & form state
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', type: 'HLS', channelId: '', priority: 1 });
  
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', slug: '', logoUrl: '', categoryId: '', country: 'TN' });
  
  const [showAddShareModal, setShowAddShareModal] = useState(false);
  const [newShare, setNewShare] = useState({ name: '', maxSessions: 2, channelIds: [] as string[] });

  const [showEditShareModal, setShowEditShareModal] = useState(false);
  const [editingShare, setEditingShare] = useState<{
    id: string;
    name: string;
    maxSessions: number;
    isActive: boolean;
    channelIds: string[];
  } | null>(null);

  const [m3uPreviewModal, setM3uPreviewModal] = useState(false);
  const [m3uRawText, setM3uRawText] = useState('');
  const [m3uParsedItems, setM3uParsedItems] = useState<any[]>([]);
  const [selectedM3uItems, setSelectedM3uItems] = useState<number[]>([]);
  const [testPlayerUrl, setTestPlayerUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get('/api/v1/auth/me');
      if (res.data?.authenticated) {
        setUser(res.data.user);
        loadData();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [statsRes, chRes, srcRes, shRes, catRes] = await Promise.all([
        axios.get('/api/v1/admin/dashboard').catch(() => ({ data: null })),
        axios.get('/api/v1/admin/channels').catch(() => ({ data: [] })),
        axios.get('/api/v1/sources').catch(() => ({ data: [] })),
        axios.get('/api/v1/admin/shares').catch(() => ({ data: [] })),
        axios.get('/api/v1/categories').catch(() => ({ data: [] })),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (chRes.data) setChannels(chRes.data);
      if (srcRes.data) setSources(srcRes.data);
      if (shRes.data) setShares(shRes.data);
      if (catRes.data) setCategories(catRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/v1/auth/login';
  };

  const handleLogout = () => {
    window.location.href = '/api/v1/auth/logout';
  };

  // --- Sources Handlers ---
  const handleCheckSource = async (id: string) => {
    try {
      await axios.post(`/api/v1/sources/${id}/check`);
      loadData();
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/sources', newSource);
      setShowAddSourceModal(false);
      setNewSource({ name: '', url: '', type: 'HLS', channelId: '', priority: 1 });
      loadData();
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleDeleteSource = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement la source "${name}" ?`)) return;
    try {
      await axios.delete(`/api/v1/sources/${id}`);
      loadData();
    } catch (e: any) {
      alert(`Erreur de suppression: ${e.response?.data?.message || e.message}`);
    }
  };

  // --- Channels Handlers ---
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/admin/channels', newChannel);
      setShowAddChannelModal(false);
      setNewChannel({ name: '', slug: '', logoUrl: '', categoryId: '', country: 'TN' });
      loadData();
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    if (!confirm(`Supprimer définitivement la chaîne "${name}" et toutes ses sources associées ?`)) return;
    try {
      await axios.delete(`/api/v1/admin/channels/${id}`);
      loadData();
    } catch (e: any) {
      alert(`Erreur de suppression: ${e.response?.data?.message || e.message}`);
    }
  };

  // --- Shares Handlers ---
  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/admin/shares', newShare);
      setShowAddShareModal(false);
      setNewShare({ name: '', maxSessions: 2, channelIds: [] });
      loadData();
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleOpenEditShare = (sh: any) => {
    const existingIds = (sh.allowedChannels || []).map((item: any) => item.channelId || item.channel?.id || item.id);
    setEditingShare({
      id: sh.id,
      name: sh.name,
      maxSessions: sh.maxSessions || 2,
      isActive: sh.isActive ?? true,
      channelIds: existingIds,
    });
    setShowEditShareModal(true);
  };

  const handleUpdateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShare) return;
    try {
      await axios.put(`/api/v1/admin/shares/${editingShare.id}`, {
        name: editingShare.name,
        maxSessions: editingShare.maxSessions,
        isActive: editingShare.isActive,
        channelIds: editingShare.channelIds,
      });
      setShowEditShareModal(false);
      setEditingShare(null);
      loadData();
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleRevokeShare = async (id: string) => {
    if (!confirm('Révoquer cet accès de streaming immédiatement ?')) return;
    try {
      await axios.post(`/api/v1/admin/shares/${id}/revoke`);
      loadData();
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleDeleteShare = async (id: string, name: string) => {
    if (!confirm(`Supprimer définitivement l'accès de partage M3U "${name}" ?`)) return;
    try {
      await axios.delete(`/api/v1/admin/shares/${id}`);
      loadData();
    } catch (e: any) {
      alert(`Erreur de suppression: ${e.response?.data?.message || e.message}`);
    }
  };

  // --- M3U Import Handlers ---
  const handlePreviewM3U = async () => {
    if (!m3uRawText.trim()) return;
    try {
      const res = await axios.post('/api/v1/sources/m3u/preview', { content: m3uRawText });
      setM3uParsedItems(res.data);
      setSelectedM3uItems(res.data.map((_: any, idx: number) => idx));
    } catch (e: any) {
      alert(`Erreur de parsing M3U: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleConfirmImportM3U = async () => {
    const toImport = m3uParsedItems.filter((_, idx) => selectedM3uItems.includes(idx));
    try {
      const res = await axios.post('/api/v1/sources/m3u/import', { items: toImport });
      alert(`Import terminé avec succès : ${res.data.importedCount} chaînes importées.`);
      setM3uPreviewModal(false);
      setM3uRawText('');
      setM3uParsedItems([]);
      loadData();
    } catch (e: any) {
      alert(`Erreur d'import: ${e.response?.data?.message || e.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Lien copié dans le presse-papier !');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-300">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mr-3" />
        <span className="text-lg">Chargement d'IPTV Server...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 shadow-xl shadow-emerald-500/5">
          <Tv className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3">IPTV Server</h1>
        <p className="text-slate-400 max-w-md mb-8 text-sm sm:text-base">
          Serveur centralisé de gestion de flux vidéo autorisés, transcodage MediaMTX, EPG et distribution de playlists M3U sécurisées.
        </p>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 max-w-sm w-full backdrop-blur-sm">
          <div className="flex items-center gap-3 text-left mb-6 p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
            <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold block text-slate-200">Authentification OIDC Unique</span>
              Connexion sécurisée via le portail SSO officiel.
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            Se connecter avec le SSO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-lg text-white">
          <Tv className="w-6 h-6 text-emerald-500" />
          <span>IPTV Server</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-400 hover:text-white">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-slate-900/70 border-r border-slate-800 flex flex-col justify-between shrink-0 p-4 sticky top-0 h-auto md:h-screen z-40`}
      >
        <div>
          <div className="hidden md:flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800/80">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-white text-base">IPTV Server</div>
              <div className="text-xs text-emerald-400 font-medium">Plateforme Pro</div>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'sources', label: 'Sources Vidéo', icon: Radio },
              { id: 'channels', label: 'Catalogue Chaînes', icon: Tv },
              { id: 'shares', label: 'Partages & M3U', icon: Share2 },
              { id: 'epg', label: 'Guide TV (EPG)', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card */}
        <div className="pt-4 border-t border-slate-800/80 mt-6">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 mb-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="truncate text-xs">
              <div className="font-semibold text-slate-200 truncate">{user.name}</div>
              <div className="text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion SSO
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white capitalize">
              {activeTab === 'dashboard' && 'Vue d\'ensemble'}
              {activeTab === 'sources' && 'Sources de Flux IPTV'}
              {activeTab === 'channels' && 'Gestion des Chaînes & EPG'}
              {activeTab === 'shares' && 'Accès de Distribution & Playlists M3U'}
              {activeTab === 'epg' && 'Guide Électronique des Programmes (EPG)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Plateforme active sur <code className="text-emerald-400">iptv.oussamma.tn</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Chaînes Actives</div>
                <div className="text-3xl font-extrabold text-white">{stats?.channelsCount || channels.length}</div>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sources Connectées</div>
                <div className="text-3xl font-extrabold text-emerald-400">{stats?.sourcesCount || sources.length}</div>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Accès M3U Actifs</div>
                <div className="text-3xl font-extrabold text-blue-400">{stats?.sharesCount || shares.length}</div>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sessions de Lecture</div>
                <div className="text-3xl font-extrabold text-amber-400">{stats?.activeSessionsCount || 0}</div>
              </div>
            </div>

            {/* Quick Status */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                État des Services & Passerelle
              </h3>
              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span>Passerelle HLS Token</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Opérationnelle
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span>Moteur MediaMTX</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Connecté
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span>Authentification SSO OIDC</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> sso-a.oussamma.tn
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SOURCES */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowAddSourceModal(true)}
                className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/10"
              >
                <Plus className="w-4 h-4" /> Ajouter une source
              </button>
              <button
                onClick={() => setM3uPreviewModal(true)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 transition-all"
              >
                <UploadCloud className="w-4 h-4" /> Importer Playlist M3U
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Nom de la source</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Chaîne Associée</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Aucune source configurée. Cliquez sur "Ajouter une source" ou "Importer M3U".
                      </td>
                    </tr>
                  ) : (
                    sources.map((src) => (
                      <tr key={src.id} className="hover:bg-slate-800/30">
                        <td className="p-4 font-semibold text-white">
                          <div>{src.name}</div>
                          <div className="text-xs text-slate-500 font-mono truncate max-w-xs">{src.url}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono font-medium">
                            {src.type}
                          </span>
                        </td>
                        <td className="p-4">{src.channel?.name || <span className="text-slate-500">—</span>}</td>
                        <td className="p-4">
                          {src.status === 'ONLINE' ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                              <CheckCircle className="w-4 h-4" /> En ligne
                            </span>
                          ) : src.status === 'OFFLINE' ? (
                            <span className="inline-flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                              <XCircle className="w-4 h-4" /> Hors ligne
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">Non vérifié</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleCheckSource(src.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                              title="Tester la connectivité"
                            >
                              Tester
                            </button>
                            <button
                              onClick={() => handleDeleteSource(src.id, src.name)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                              title="Supprimer la source"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CHANNELS */}
        {activeTab === 'channels' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowAddChannelModal(true)}
                className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/10"
              >
                <Plus className="w-4 h-4" /> Nouvelle Chaîne
              </button>
              <div className="text-xs text-slate-400">
                Total : <strong className="text-slate-200">{channels.length}</strong> chaînes configurées
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((ch) => (
                <div key={ch.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {ch.logoUrl ? (
                          <img src={ch.logoUrl} alt={ch.name} className="w-10 h-10 object-contain rounded-lg bg-slate-950 p-1 border border-slate-800" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                            {ch.name[0]}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white text-base">{ch.name}</div>
                          <div className="text-xs text-slate-400">{ch.category?.name || 'Général'} • {ch.country}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteChannel(ch.id, ch.name)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                        title="Supprimer la chaîne"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-slate-400 mb-4">
                      Sources associées : <span className="font-semibold text-slate-200">{ch.sources?.length || 0}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${ch.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
                      {ch.isActive ? 'Active' : 'Désactivée'}
                    </span>
                    <button
                      onClick={() => setTestPlayerUrl(`/api/v1/stream/${ch.id}/live.m3u8?token=admin_preview`)}
                      className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      <Play className="w-3.5 h-3.5" /> Lire le flux
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SHARES & M3U */}
        {activeTab === 'shares' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowAddShareModal(true)}
                className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/10"
              >
                <Plus className="w-4 h-4" /> Créer un accès de partage M3U
              </button>
              <div className="text-xs text-slate-400">
                Total : <strong className="text-slate-200">{shares.length}</strong> partages
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {shares.map((sh) => {
                const m3uUrl = `${window.location.origin}/api/v1/playlists/${sh.token}.m3u`;
                return (
                  <div key={sh.id} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-white text-base">{sh.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${sh.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
                            {sh.isActive ? 'Actif' : 'Révoqué'}
                          </span>
                          <button
                            onClick={() => handleOpenEditShare(sh)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Modifier ce partage"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteShare(sh.id, sh.name)}
                            className="p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                            title="Supprimer ce partage"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 mb-4">
                        <div>Sessions max simultanées : <strong className="text-slate-200">{sh.maxSessions}</strong></div>
                        <div>
                          Chaînes autorisées : <strong className="text-slate-200">{sh.allowedChannels?.length || 0}</strong> / {channels.length}
                        </div>
                      </div>

                      {sh.isActive && (
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
                          <span className="truncate mr-2">{m3uUrl}</span>
                          <button
                            onClick={() => copyToClipboard(m3uUrl)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
                            title="Copier le lien M3U"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between mt-4">
                      <a
                        href={m3uUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Télécharger M3U
                      </a>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleOpenEditShare(sh)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          Modifier
                        </button>
                        {sh.isActive && (
                          <button
                            onClick={() => handleRevokeShare(sh.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-semibold"
                          >
                            Révoquer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: EPG */}
        {activeTab === 'epg' && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-lg">Guide Électronique des Programmes (XMLTV)</h3>
            <p className="text-slate-400 text-sm">
              L'URL XMLTV ci-dessous est compatible avec tous les lecteurs IPTV (TiviMate, IPTV Smarters, VLC, Kodi, etc.).
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono text-emerald-400">
              <span>{window.location.origin}/api/v1/epg</span>
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/api/v1/epg`)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Player de flux en direct */}
      {testPlayerUrl && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" /> Prévisualisation du Flux en Direct
              </h3>
              <button
                onClick={() => setTestPlayerUrl(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
              <video
                ref={videoRef}
                src={testPlayerUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Votre navigateur ne prend pas en charge la balise vidéo.
              </video>
            </div>

            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span className="font-mono truncate max-w-md">{window.location.origin}{testPlayerUrl}</span>
              <button
                onClick={() => copyToClipboard(`${window.location.origin}${testPlayerUrl}`)}
                className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Copy className="w-3.5 h-3.5" /> Copier l'URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajouter Source */}
      {showAddSourceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-white text-lg mb-4">Ajouter une Source Vidéo</h3>
            <form onSubmit={handleCreateSource} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Nom descriptif</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Al Jazeera HLS Principal"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">URL du Flux (HLS / M3U8 / RTSP)</label>
                <input
                  type="url"
                  required
                  placeholder="https://.../stream.m3u8"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Associer à une Chaîne</label>
                <select
                  value={newSource.channelId}
                  onChange={(e) => setNewSource({ ...newSource, channelId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Sélectionner une chaîne (Optionnel)</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSourceModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajouter Chaîne */}
      {showAddChannelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-white text-lg mb-4">Créer une Chaîne</h3>
            <form onSubmit={handleCreateChannel} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Nom de la Chaîne</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Watania 1 HD"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">URL du Logo (Image)</label>
                <input
                  type="url"
                  placeholder="https://.../logo.png"
                  value={newChannel.logoUrl}
                  onChange={(e) => setNewChannel({ ...newChannel, logoUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddChannelModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Créer Partage */}
      {showAddShareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-white text-lg mb-4">Créer un Accès de Partage M3U</h3>
            <form onSubmit={handleCreateShare} className="space-y-4 text-xs sm:text-sm flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-slate-400 mb-1">Nom de l'accès (Ex: Salon TV, Chambre IPTV)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mon Salon TV"
                  value={newShare.name}
                  onChange={(e) => setNewShare({ ...newShare, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Nombre maximal d'écrans simultanés</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newShare.maxSessions}
                  onChange={(e) => setNewShare({ ...newShare, maxSessions: parseInt(e.target.value) || 2 })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">
                    Attribuer des chaînes ({newShare.channelIds.length}/{channels.length})
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNewShare({ ...newShare, channelIds: channels.map((c) => c.id) })}
                      className="text-emerald-400 hover:underline"
                    >
                      Tout sélectionner
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setNewShare({ ...newShare, channelIds: [] })}
                      className="text-slate-400 hover:underline"
                    >
                      Désélectionner
                    </button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  {channels.map((ch) => (
                    <label key={ch.id} className="flex items-center gap-2 text-xs text-slate-300 hover:bg-slate-900 p-1.5 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newShare.channelIds.includes(ch.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewShare({ ...newShare, channelIds: [...newShare.channelIds, ch.id] });
                          } else {
                            setNewShare({ ...newShare, channelIds: newShare.channelIds.filter((id) => id !== ch.id) });
                          }
                        }}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="truncate">{ch.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddShareModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950"
                >
                  Générer le Partage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Modifier Partage */}
      {showEditShareModal && editingShare && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-white text-lg mb-4">Modifier l'Accès de Partage M3U</h3>
            <form onSubmit={handleUpdateShare} className="space-y-4 text-xs sm:text-sm flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-slate-400 mb-1">Nom de l'accès</label>
                <input
                  type="text"
                  required
                  value={editingShare.name}
                  onChange={(e) => setEditingShare({ ...editingShare, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Nombre maximal d'écrans simultanés</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editingShare.maxSessions}
                  onChange={(e) => setEditingShare({ ...editingShare, maxSessions: parseInt(e.target.value) || 2 })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingShare.isActive}
                    onChange={(e) => setEditingShare({ ...editingShare, isActive: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Accès actif (décocher pour suspendre)</span>
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">
                    Attribuer des chaînes ({editingShare.channelIds.length}/{channels.length})
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditingShare({ ...editingShare, channelIds: channels.map((c) => c.id) })}
                      className="text-emerald-400 hover:underline"
                    >
                      Tout sélectionner
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setEditingShare({ ...editingShare, channelIds: [] })}
                      className="text-slate-400 hover:underline"
                    >
                      Désélectionner
                    </button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  {channels.map((ch) => (
                    <label key={ch.id} className="flex items-center gap-2 text-xs text-slate-300 hover:bg-slate-900 p-1.5 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingShare.channelIds.includes(ch.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingShare({ ...editingShare, channelIds: [...editingShare.channelIds, ch.id] });
                          } else {
                            setEditingShare({ ...editingShare, channelIds: editingShare.channelIds.filter((id) => id !== ch.id) });
                          }
                        }}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="truncate">{ch.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditShareModal(false);
                    setEditingShare(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Import M3U */}
      {m3uPreviewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl flex flex-col max-h-[85vh]">
            <h3 className="font-bold text-white text-lg mb-2">Importer une Playlist M3U</h3>
            <p className="text-slate-400 text-xs mb-4">
              Collez le contenu d'un fichier M3U/M3U8 pour prévisualiser et importer les chaînes autorisées.
            </p>

            {m3uParsedItems.length === 0 ? (
              <div className="space-y-4">
                <textarea
                  rows={8}
                  placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-id='aljazeera' group-title='News',Al Jazeera&#10;https://.../stream.m3u8"
                  value={m3uRawText}
                  onChange={(e) => setM3uRawText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                ></textarea>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setM3uPreviewModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={handlePreviewM3U}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs"
                  >
                    Prévisualiser les flux
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="text-xs text-slate-300 font-semibold">
                  {m3uParsedItems.length} chaînes détectées ({selectedM3uItems.length} sélectionnées)
                </div>
                <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 p-2 space-y-1">
                  {m3uParsedItems.map((item, idx) => (
                    <label key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-slate-900 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedM3uItems.includes(idx)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedM3uItems([...selectedM3uItems, idx]);
                          else setSelectedM3uItems(selectedM3uItems.filter((i) => i !== idx));
                        }}
                        className="rounded border-slate-700 text-emerald-500"
                      />
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-slate-500 truncate max-w-xs">{item.url}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setM3uParsedItems([])}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImportM3U}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs"
                  >
                    Confirmer l'import ({selectedM3uItems.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
