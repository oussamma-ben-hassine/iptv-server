import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  Users,
  Eye,
  Zap,
  StopCircle,
  Infinity as InfinityIcon,
  HelpCircle,
  Film,
  Sparkles,
  Loader2,
  Globe,
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sources' | 'channels' | 'movies' | 'shares' | 'epg'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>({
    activeCount: 0,
    totalSessionsAllTime: 0,
    estimatedBandwidthMbps: '0.0',
    topChannels: [],
    activeSessions: [],
  });
  const [channels, setChannels] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Multi-selection states
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([]);

  // Search & Filter inside Share Creation/Edition
  const [shareSearch, setShareSearch] = useState('');
  const [shareCategoryFilter, setShareCategoryFilter] = useState('');

  // Movie Filter & Form
  const [movieSearch, setMovieSearch] = useState('');
  const [movieGenreFilter, setMovieGenreFilter] = useState('');
  const [showAddMovieModal, setShowAddMovieModal] = useState(false);
  const [newMovie, setNewMovie] = useState({
    title: '',
    streamUrl: '',
    posterUrl: '',
    year: new Date().getFullYear(),
    rating: 7.5,
    genre: 'Action',
    durationMin: 110,
    plot: '',
    director: '',
    container: 'mp4',
  });

  // AI Assistant States (LiteLLM)
  const [showAiMovieModal, setShowAiMovieModal] = useState(false);
  const [aiMovieInput, setAiMovieInput] = useState('');
  const [aiMovieLoading, setAiMovieLoading] = useState(false);

  const [showAiChannelModal, setShowAiChannelModal] = useState(false);
  const [aiChannelInput, setAiChannelInput] = useState('');
  const [aiChannelLoading, setAiChannelLoading] = useState(false);

  // Video File Upload States
  const [showUploadMovieModal, setShowUploadMovieModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileDetails, setUploadedFileDetails] = useState<any>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals & form state
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', type: 'HLS', channelId: '', priority: 1 });
  
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', slug: '', logoUrl: '', categoryId: '', country: 'TN' });
  
  const [showAddShareModal, setShowAddShareModal] = useState(false);
  const [newShare, setNewShare] = useState({ name: '', maxSessions: 2, isUnlimited: false, channelIds: [] as string[] });

  const [showEditShareModal, setShowEditShareModal] = useState(false);
  const [editingShare, setEditingShare] = useState<{
    id: string;
    name: string;
    maxSessions: number;
    isUnlimited: boolean;
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
      const [statsRes, chRes, srcRes, shRes, catRes, analyticsRes, moviesRes] = await Promise.all([
        axios.get('/api/v1/admin/dashboard').catch(() => ({ data: null })),
        axios.get('/api/v1/admin/channels').catch(() => ({ data: [] })),
        axios.get('/api/v1/sources').catch(() => ({ data: [] })),
        axios.get('/api/v1/admin/shares').catch(() => ({ data: [] })),
        axios.get('/api/v1/categories').catch(() => ({ data: [] })),
        axios.get('/api/v1/admin/analytics').catch(() => ({ data: null })),
        axios.get('/api/v1/admin/movies').catch(() => ({ data: [] })),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (chRes.data) setChannels(chRes.data);
      if (srcRes.data) setSources(srcRes.data);
      if (shRes.data) setShares(shRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (analyticsRes.data) setAnalytics(analyticsRes.data);
      if (moviesRes.data) setMovies(moviesRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/admin/movies', newMovie);
      setShowAddMovieModal(false);
      setNewMovie({
        title: '',
        streamUrl: '',
        posterUrl: '',
        year: new Date().getFullYear(),
        rating: 7.5,
        genre: 'Action',
        durationMin: 110,
        plot: '',
        director: '',
        container: 'mp4',
      });
      loadData();
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleDeleteMovie = async (id: string, title: string) => {
    if (!confirm(`Supprimer définitivement le film "${title}" du catalogue VOD ?`)) return;
    try {
      await axios.delete(`/api/v1/admin/movies/${id}`);
      setSelectedMovieIds((prev) => prev.filter((i) => i !== id));
      loadData();
    } catch (e: any) {
      alert(`Erreur de suppression: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleBulkDeleteMovies = async () => {
    if (selectedMovieIds.length === 0) return;
    if (!confirm(`Supprimer définitivement les ${selectedMovieIds.length} films sélectionnés ?`)) return;
    try {
      await axios.post('/api/v1/admin/movies/bulk-delete', { ids: selectedMovieIds });
      setSelectedMovieIds([]);
      loadData();
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.message || e.message}`);
    }
  };

  // --- Video File Upload Handler ---
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadRes = await axios.post('/api/v1/admin/movies/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      if (uploadRes.data?.streamUrl) {
        setUploadedFileDetails(uploadRes.data);

        // Nettoyer le nom du fichier pour interroger l'IA LiteLLM (ex: Inception.2010.1080p.mkv -> Inception)
        const cleanName = file.name
          .replace(/\.(mp4|mkv|avi|mov|ts|m3u8)$/i, '')
          .replace(/[\._\-]/g, ' ')
          .replace(/\b(1080p|720p|4k|2160p|bluray|web-dl|x264|x265|hevc|dvdrip|french|vostfr|multi)\b/gi, '')
          .trim();

        // Tenter d'enrichir automatiquement la fiche via LiteLLM
        try {
          const aiRes = await axios.post('/api/v1/ai/parse-movie', { input: cleanName || file.name });
          if (aiRes.data) {
            setNewMovie({
              title: aiRes.data.title || cleanName,
              streamUrl: uploadRes.data.streamUrl,
              posterUrl: aiRes.data.posterUrl || '',
              year: aiRes.data.year || new Date().getFullYear(),
              rating: aiRes.data.rating || 7.5,
              genre: aiRes.data.genre || 'Action',
              durationMin: aiRes.data.durationMin || 110,
              plot: aiRes.data.plot || '',
              director: aiRes.data.director || '',
              container: uploadRes.data.container || 'mp4',
            });
          }
        } catch {
          // Si l'IA échoue, renseigner le nom brut
          setNewMovie((prev) => ({
            ...prev,
            title: cleanName || file.name,
            streamUrl: uploadRes.data.streamUrl,
            container: uploadRes.data.container || 'mp4',
          }));
        }

        setShowUploadMovieModal(false);
        setShowAddMovieModal(true);
      }
    } catch (err: any) {
      alert(`Erreur d'upload: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
    }
  };

  // --- AI LiteLLM Handlers ---
  const handleAiParseMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMovieInput.trim()) return;
    setAiMovieLoading(true);
    try {
      const res = await axios.post('/api/v1/ai/parse-movie', { input: aiMovieInput });
      if (res.data) {
        setNewMovie({
          title: res.data.title || '',
          streamUrl: res.data.streamUrl || '',
          posterUrl: res.data.posterUrl || '',
          year: res.data.year || new Date().getFullYear(),
          rating: res.data.rating || 7.5,
          genre: res.data.genre || 'Action',
          durationMin: res.data.durationMin || 110,
          plot: res.data.plot || '',
          director: res.data.director || '',
          container: 'mp4',
        });
        setShowAiMovieModal(false);
        setAiMovieInput('');
        setShowAddMovieModal(true);
      }
    } catch (err: any) {
      alert(`Erreur IA LiteLLM: ${err.response?.data?.message || err.message}`);
    } finally {
      setAiMovieLoading(false);
    }
  };

  const handleAiParseChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiChannelInput.trim()) return;
    setAiChannelLoading(true);
    try {
      const res = await axios.post('/api/v1/ai/parse-channel', { input: aiChannelInput });
      if (res.data) {
        // Chercher ou assigner la catégorie
        let matchedCatId = '';
        if (res.data.category && categories.length > 0) {
          const found = categories.find((c) => c.name.toLowerCase().includes(res.data.category.toLowerCase()));
          if (found) matchedCatId = found.id;
          else matchedCatId = categories[0].id;
        }

        const slugBase = (res.data.name || 'ch').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        setNewChannel({
          name: res.data.name || '',
          slug: `${slugBase}-${Date.now().toString(36)}`,
          logoUrl: res.data.logoUrl || '',
          categoryId: matchedCatId,
          country: res.data.country || 'TN',
        });

        if (res.data.streamUrl) {
          setNewSource((prev) => ({
            ...prev,
            name: `${res.data.name} (Source Principale)`,
            url: res.data.streamUrl,
          }));
        }

        setShowAiChannelModal(false);
        setAiChannelInput('');
        setShowAddChannelModal(true);
      }
    } catch (err: any) {
      alert(`Erreur IA LiteLLM: ${err.response?.data?.message || err.message}`);
    } finally {
      setAiChannelLoading(false);
    }
  };

  // Rafraîchissement automatique des stats temps réel toutes les 5 secondes sur l'onglet dashboard
  useEffect(() => {
    if (!user || activeTab !== 'dashboard') return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get('/api/v1/admin/analytics');
        if (res.data) setAnalytics(res.data);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [user, activeTab]);

  const handleTerminateSession = async (sessionId: string, channelName: string) => {
    if (!confirm(`Couper immédiatement la session de streaming sur "${channelName}" ?`)) return;
    try {
      await axios.delete(`/api/v1/admin/sessions/${sessionId}`);
      const res = await axios.get('/api/v1/admin/analytics');
      if (res.data) setAnalytics(res.data);
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.message || e.message}`);
    }
  };

  const channelMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of channels) map.set(c.id, c);
    return map;
  }, [channels]);

  const filteredShareChannels = useMemo(() => {
    return channels.filter((ch) => {
      const matchesSearch =
        !shareSearch.trim() ||
        ch.name.toLowerCase().includes(shareSearch.toLowerCase()) ||
        (ch.category?.name && ch.category.name.toLowerCase().includes(shareSearch.toLowerCase()));
      const matchesCategory =
        !shareCategoryFilter || ch.categoryId === shareCategoryFilter || ch.category?.name === shareCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [channels, shareSearch, shareCategoryFilter]);

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
    if (
      !confirm(
        `Supprimer définitivement la source "${name}" ?\nSi la chaîne associée ne possède plus d'autre flux, elle sera également retirée du catalogue.`
      )
    )
      return;
    try {
      await axios.delete(`/api/v1/sources/${id}`);
      setSelectedSourceIds((prev) => prev.filter((i) => i !== id));
      loadData();
    } catch (e: any) {
      alert(`Erreur de suppression: ${e.response?.data?.message || e.message}`);
    }
  };

  // --- Multi-Selection Sources ---
  const handleToggleSelectSource = (id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllSources = () => {
    if (selectedSourceIds.length === sources.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(sources.map((s) => s.id));
    }
  };

  const handleBulkDeleteSources = async () => {
    if (selectedSourceIds.length === 0) return;
    if (
      !confirm(
        `Supprimer définitivement les ${selectedSourceIds.length} sources sélectionnées ?\nLes chaînes associées devenues sans sources seront automatiquement supprimées du catalogue.`
      )
    )
      return;
    try {
      const res = await axios.post('/api/v1/sources/bulk-delete', { ids: selectedSourceIds });
      alert(`${res.data.deletedCount} source(s) supprimée(s). Le catalogue a été actualisé.`);
      setSelectedSourceIds([]);
      loadData();
    } catch (e: any) {
      alert(`Erreur de suppression groupée: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleBulkCheckSources = async () => {
    if (selectedSourceIds.length === 0) return;
    try {
      for (const id of selectedSourceIds) {
        await axios.post(`/api/v1/sources/${id}/check`).catch(() => {});
      }
      alert(`Test de connectivité terminé pour les ${selectedSourceIds.length} sources.`);
      loadData();
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
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
      setSelectedChannelIds((prev) => prev.filter((i) => i !== id));
      loadData();
    } catch (e: any) {
      alert(`Erreur de suppression: ${e.response?.data?.message || e.message}`);
    }
  };

  // --- Multi-Selection Channels ---
  const handleToggleSelectChannel = (id: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllChannels = () => {
    if (selectedChannelIds.length === channels.length) {
      setSelectedChannelIds([]);
    } else {
      setSelectedChannelIds(channels.map((c) => c.id));
    }
  };

  const handleBulkDeleteChannels = async () => {
    if (selectedChannelIds.length === 0) return;
    if (
      !confirm(
        `Supprimer définitivement les ${selectedChannelIds.length} chaînes sélectionnées et leurs flux associés ?`
      )
    )
      return;
    try {
      const res = await axios.post('/api/v1/admin/channels/bulk-delete', { ids: selectedChannelIds });
      alert(`${res.data.deletedCount} chaîne(s) supprimée(s) du catalogue.`);
      setSelectedChannelIds([]);
      loadData();
    } catch (e: any) {
      alert(`Erreur de suppression: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleCleanupOrphans = async () => {
    try {
      const res = await axios.post('/api/v1/admin/channels/cleanup-orphans');
      alert(`Nettoyage réussi : ${res.data.cleanedCount} chaîne(s) orpheline(s) sans flux ont été supprimées.`);
      loadData();
    } catch (e: any) {
      alert(`Erreur de nettoyage: ${e.response?.data?.message || e.message}`);
    }
  };

  // --- Shares Handlers & Reordering ---
  const toggleShareChannel = (channelId: string, isEditing: boolean) => {
    if (isEditing) {
      if (!editingShare) return;
      const exists = editingShare.channelIds.includes(channelId);
      const next = exists
        ? editingShare.channelIds.filter((id) => id !== channelId)
        : [...editingShare.channelIds, channelId];
      setEditingShare({ ...editingShare, channelIds: next });
    } else {
      const exists = newShare.channelIds.includes(channelId);
      const next = exists
        ? newShare.channelIds.filter((id) => id !== channelId)
        : [...newShare.channelIds, channelId];
      setNewShare({ ...newShare, channelIds: next });
    }
  };

  const selectFilteredChannels = (isEditing: boolean) => {
    const idsToAdd = filteredShareChannels.map((c) => c.id);
    if (isEditing) {
      if (!editingShare) return;
      const combined = Array.from(new Set([...editingShare.channelIds, ...idsToAdd]));
      setEditingShare({ ...editingShare, channelIds: combined });
    } else {
      const combined = Array.from(new Set([...newShare.channelIds, ...idsToAdd]));
      setNewShare({ ...newShare, channelIds: combined });
    }
  };

  const moveChannelUp = (index: number, isEditing: boolean) => {
    if (index <= 0) return;
    if (isEditing) {
      if (!editingShare) return;
      const ids = [...editingShare.channelIds];
      const temp = ids[index - 1];
      ids[index - 1] = ids[index];
      ids[index] = temp;
      setEditingShare({ ...editingShare, channelIds: ids });
    } else {
      const ids = [...newShare.channelIds];
      const temp = ids[index - 1];
      ids[index - 1] = ids[index];
      ids[index] = temp;
      setNewShare({ ...newShare, channelIds: ids });
    }
  };

  const moveChannelDown = (index: number, isEditing: boolean) => {
    if (isEditing) {
      if (!editingShare || index >= editingShare.channelIds.length - 1) return;
      const ids = [...editingShare.channelIds];
      const temp = ids[index + 1];
      ids[index + 1] = ids[index];
      ids[index] = temp;
      setEditingShare({ ...editingShare, channelIds: ids });
    } else {
      if (index >= newShare.channelIds.length - 1) return;
      const ids = [...newShare.channelIds];
      const temp = ids[index + 1];
      ids[index + 1] = ids[index];
      ids[index] = temp;
      setNewShare({ ...newShare, channelIds: ids });
    }
  };

  const moveChannelToTop = (index: number, isEditing: boolean) => {
    if (index <= 0) return;
    if (isEditing) {
      if (!editingShare) return;
      const ids = [...editingShare.channelIds];
      const [item] = ids.splice(index, 1);
      ids.unshift(item);
      setEditingShare({ ...editingShare, channelIds: ids });
    } else {
      const ids = [...newShare.channelIds];
      const [item] = ids.splice(index, 1);
      ids.unshift(item);
      setNewShare({ ...newShare, channelIds: ids });
    }
  };

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/admin/shares', {
        name: newShare.name,
        maxSessions: newShare.isUnlimited ? 0 : newShare.maxSessions,
        channelIds: newShare.channelIds,
      });
      setShowAddShareModal(false);
      setNewShare({ name: '', maxSessions: 2, isUnlimited: false, channelIds: [] });
      setShareSearch('');
      setShareCategoryFilter('');
      loadData();
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleOpenEditShare = (sh: any) => {
    const existingIds = (sh.allowedChannels || []).map((item: any) => item.channelId || item.channel?.id || item.id);
    const isUnlimited = (sh.maxSessions ?? 2) <= 0;
    setEditingShare({
      id: sh.id,
      name: sh.name,
      maxSessions: isUnlimited ? 2 : sh.maxSessions,
      isUnlimited,
      isActive: sh.isActive ?? true,
      channelIds: existingIds,
    });
    setShareSearch('');
    setShareCategoryFilter('');
    setShowEditShareModal(true);
  };

  const handleUpdateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShare) return;
    try {
      await axios.put(`/api/v1/admin/shares/${editingShare.id}`, {
        name: editingShare.name,
        maxSessions: editingShare.isUnlimited ? 0 : editingShare.maxSessions,
        isActive: editingShare.isActive,
        channelIds: editingShare.channelIds,
      });
      setShowEditShareModal(false);
      setEditingShare(null);
      setShareSearch('');
      setShareCategoryFilter('');
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
              { id: 'movies', label: 'Films & VOD', icon: Film },
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
              {activeTab === 'movies' && 'Catalogue Films & VOD'}
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
            {/* Primary Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Spectateurs en Direct</div>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-white flex items-baseline gap-2">
                  <span>{analytics?.activeCount ?? 0}</span>
                  <span className="text-xs font-normal text-emerald-400">en temps réel</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bande Passante Direct</div>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold text-amber-400 flex items-baseline gap-1.5">
                  <span>{analytics?.estimatedBandwidthMbps ?? '0.0'}</span>
                  <span className="text-xs font-normal text-slate-400">Mbps</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chaînes Actives</div>
                  <Tv className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-400">{stats?.channelsCount || channels.length}</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accès M3U Configurés</div>
                  <Share2 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-extrabold text-blue-400">{stats?.sharesCount || shares.length}</div>
              </div>
            </div>

            {/* Real-time Streaming Table (Who is watching what) */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Eye className="w-5 h-5 text-emerald-400" />
                  Spectateurs en Direct (Temps Réel)
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {analytics?.activeSessions?.length || 0} actif(s)
                  </span>
                </h3>
                <span className="text-xs text-slate-500">Mise à jour toutes les 5s</span>
              </div>

              {(!analytics?.activeSessions || analytics.activeSessions.length === 0) ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Aucun spectateur en direct pour le moment.<br />
                  <span className="text-slate-600">Dès qu'un lecteur externe ou navigateur lit un flux, il s'affiche ici avec son adresse IP, la chaîne regardée et la durée.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Accès / Utilisateur</th>
                        <th className="py-3 px-4 font-semibold">Chaîne en direct</th>
                        <th className="py-3 px-4 font-semibold">Adresse IP</th>
                        <th className="py-3 px-4 font-semibold">Lecteur / Appareil</th>
                        <th className="py-3 px-4 font-semibold">Dernier Ping</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {analytics.activeSessions.map((s: any) => {
                        const secondsAgo = Math.max(0, Math.floor((Date.now() - new Date(s.lastPingAt).getTime()) / 1000));
                        return (
                          <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-blue-400" />
                                <span>{s.share?.name || 'Accès Inconnu'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {s.channel?.logoUrl && (
                                  <img src={s.channel.logoUrl} alt="" className="w-5 h-5 rounded object-contain bg-slate-950" />
                                )}
                                <span className="font-medium text-emerald-300">{s.channel?.name || 'Chaîne'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">{s.clientIp}</td>
                            <td className="py-3 px-4 max-w-xs truncate text-slate-400" title={s.userAgent}>
                              {s.userAgent?.length > 40 ? s.userAgent.substring(0, 40) + '...' : s.userAgent}
                            </td>
                            <td className="py-3 px-4 text-emerald-400 font-medium">
                              il y a {secondsAgo}s
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleTerminateSession(s.id, s.channel?.name || 'Chaîne')}
                                className="py-1 px-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                                title="Couper immédiatement ce flux"
                              >
                                <StopCircle className="w-3.5 h-3.5" /> Couper la session
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Channels */}
            {analytics?.topChannels && analytics.topChannels.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  Chaînes les Plus Regardées en ce Moment
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {analytics.topChannels.map((tc: any, idx: number) => (
                    <div key={tc.channelId} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-xs font-bold text-amber-400 flex items-center justify-center border border-slate-800">
                          #{idx + 1}
                        </span>
                        {tc.logoUrl && (
                          <img src={tc.logoUrl} alt="" className="w-5 h-5 rounded object-contain bg-slate-900" />
                        )}
                        <span className="font-medium text-xs text-white">{tc.name}</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        {tc.count} spectateur{tc.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
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
                {sources.length > 0 && (
                  <button
                    onClick={handleToggleSelectAllSources}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                  >
                    {selectedSourceIds.length === sources.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-400">
                Total : <strong className="text-slate-200">{sources.length}</strong> sources
              </div>
            </div>

            {/* Multi-selection Action Bar */}
            {selectedSourceIds.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2 text-sm text-emerald-300 font-semibold">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>{selectedSourceIds.length} source(s) sélectionnée(s) sur {sources.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkCheckSources}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Tester ({selectedSourceIds.length})
                  </button>
                  <button
                    onClick={handleBulkDeleteSources}
                    className="py-1.5 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer la sélection ({selectedSourceIds.length})
                  </button>
                  <button
                    onClick={() => setSelectedSourceIds([])}
                    className="py-1.5 px-3 rounded-lg text-slate-400 hover:text-white text-xs"
                  >
                    Désélectionner
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={sources.length > 0 && selectedSourceIds.length === sources.length}
                        onChange={handleToggleSelectAllSources}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        title="Tout sélectionner / désélectionner"
                      />
                    </th>
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
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Aucune source configurée. Cliquez sur "Ajouter une source" ou "Importer M3U".
                      </td>
                    </tr>
                  ) : (
                    sources.map((src) => {
                      const isSelected = selectedSourceIds.includes(src.id);
                      return (
                        <tr key={src.id} className={`hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-emerald-500/5' : ''}`}>
                          <td className="p-4 w-10">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectSource(src.id)}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
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
                                title="Supprimer la source (actualise le catalogue)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CHANNELS */}
        {activeTab === 'channels' && (() => {
          const orphanChannels = channels.filter((c) => !c.sources || c.sources.length === 0);
          return (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowAddChannelModal(true)}
                    className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/10"
                  >
                    <Plus className="w-4 h-4" /> Nouvelle Chaîne
                  </button>
                  <button
                    onClick={() => {
                      setAiChannelInput('');
                      setShowAiChannelModal(true);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                    title="Ajouter automatiquement une chaîne par son nom grâce à LiteLLM"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" /> Assistant IA (LiteLLM)
                  </button>
                  {channels.length > 0 && (
                    <button
                      onClick={handleToggleSelectAllChannels}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                    >
                      {selectedChannelIds.length === channels.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                    </button>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  Total : <strong className="text-slate-200">{channels.length}</strong> chaînes configurées
                </div>
              </div>

              {/* Orphan Channels Warning Banner */}
              {orphanChannels.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-amber-300">
                    <strong>{orphanChannels.length} chaîne(s) orpheline(s)</strong> sans aucune source vidéo détectée(s) dans le catalogue.
                  </div>
                  <button
                    onClick={handleCleanupOrphans}
                    className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs transition-all shadow-md"
                  >
                    Nettoyer ces {orphanChannels.length} chaînes orphelines
                  </button>
                </div>
              )}

              {/* Batch Action Bar */}
              {selectedChannelIds.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2 text-sm text-emerald-300 font-semibold">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <span>{selectedChannelIds.length} chaîne(s) sélectionnée(s) sur {channels.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkDeleteChannels}
                      className="py-1.5 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer la sélection ({selectedChannelIds.length})
                    </button>
                    <button
                      onClick={() => setSelectedChannelIds([])}
                      className="py-1.5 px-3 rounded-lg text-slate-400 hover:text-white text-xs"
                    >
                      Désélectionner
                    </button>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {channels.map((ch) => {
                  const isSelected = selectedChannelIds.includes(ch.id);
                  const hasSources = ch.sources && ch.sources.length > 0;
                  return (
                    <div
                      key={ch.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-900 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectChannel(ch.id)}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer shrink-0 mt-0.5"
                            />
                            {ch.logoUrl ? (
                              <img src={ch.logoUrl} alt={ch.name} className="w-10 h-10 object-contain rounded-lg bg-slate-950 p-1 border border-slate-800 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-bold shrink-0">
                                {ch.name[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-white text-base leading-snug">{ch.name}</div>
                              <div className="text-xs text-slate-400">{ch.category?.name || 'Général'} • {ch.country}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteChannel(ch.id, ch.name)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                            title="Supprimer la chaîne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-slate-400 mb-4 pl-7">
                          Sources associées :{' '}
                          <span className={`font-semibold ${hasSources ? 'text-slate-200' : 'text-amber-400'}`}>
                            {ch.sources?.length || 0} {!hasSources && '(Orpheline)'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${ch.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
                          {ch.isActive ? 'Active' : 'Désactivée'}
                        </span>
                        {hasSources ? (
                          <button
                            onClick={() => setTestPlayerUrl(`/api/v1/stream/${ch.id}/live.m3u8?token=admin_preview`)}
                            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold"
                          >
                            <Play className="w-3.5 h-3.5" /> Lire le flux
                          </button>
                        ) : (
                          <span className="text-slate-500 italic">Aucun flux</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* TAB: FILMS & VOD */}
        {activeTab === 'movies' && (() => {
          const filteredMovies = movies.filter((m) => {
            const matchesSearch =
              !movieSearch.trim() ||
              m.title.toLowerCase().includes(movieSearch.toLowerCase()) ||
              (m.genre && m.genre.toLowerCase().includes(movieSearch.toLowerCase())) ||
              (m.director && m.director.toLowerCase().includes(movieSearch.toLowerCase()));
            const matchesGenre = !movieGenreFilter || m.genre === movieGenreFilter;
            return matchesSearch && matchesGenre;
          });

          const uniqueGenres = Array.from(new Set(movies.map((m) => m.genre).filter(Boolean)));

          return (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowAddMovieModal(true)}
                    className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/10"
                  >
                    <Plus className="w-4 h-4" /> Ajouter manuellement
                  </button>
                  <button
                    onClick={() => {
                      setAiMovieInput('');
                      setShowAiMovieModal(true);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                    title="Ajouter un film par nom ou par URL grâce à l'IA LiteLLM"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" /> Ajouter par IA (Nom ou URL)
                  </button>
                  <button
                    onClick={() => setShowUploadMovieModal(true)}
                    className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                    title="Téléverser directement un fichier vidéo MP4 ou MKV"
                  >
                    <UploadCloud className="w-4 h-4" /> Uploader un fichier vidéo
                  </button>
                  {movies.length > 0 && (
                    <button
                      onClick={() => {
                        if (selectedMovieIds.length === movies.length) setSelectedMovieIds([]);
                        else setSelectedMovieIds(movies.map((m) => m.id));
                      }}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                    >
                      {selectedMovieIds.length === movies.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-400">
                  Total : <strong className="text-slate-200">{movies.length}</strong> film(s)
                </div>
              </div>

              {/* Multi-selection Action Bar for Movies */}
              {selectedMovieIds.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2 text-sm text-emerald-300 font-semibold">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <span>{selectedMovieIds.length} film(s) sélectionné(s) sur {movies.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkDeleteMovies}
                      className="py-1.5 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer la sélection ({selectedMovieIds.length})
                    </button>
                    <button
                      onClick={() => setSelectedMovieIds([])}
                      className="py-1.5 px-3 rounded-lg text-slate-400 hover:text-white text-xs"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Rechercher par titre, genre ou réalisateur..."
                    value={movieSearch}
                    onChange={(e) => setMovieSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="w-full sm:w-64">
                  <select
                    value={movieGenreFilter}
                    onChange={(e) => setMovieGenreFilter(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Tous les genres ({movies.length})</option>
                    {uniqueGenres.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid of Movies */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredMovies.map((m) => {
                  const isSelected = selectedMovieIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      className={`group relative rounded-2xl border overflow-hidden flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Poster */}
                      <div className="aspect-[2/3] bg-slate-950 relative overflow-hidden flex items-center justify-center">
                        {m.posterUrl ? (
                          <img
                            src={m.posterUrl}
                            alt={m.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <Film className="w-12 h-12 text-slate-700" />
                        )}
                        <div className="absolute top-2 left-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedMovieIds((prev) =>
                                prev.includes(m.id) ? prev.filter((i) => i !== m.id) : [...prev, m.id]
                              );
                            }}
                            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                          />
                        </div>
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-bold text-amber-400">
                            ★ {m.rating || '7.5'}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => setTestPlayerUrl(m.streamUrl)}
                            className="p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-lg transition-transform hover:scale-110"
                            title="Regarder / Tester la vidéo"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-white text-xs truncate" title={m.title}>
                            {m.title}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
                            <span>{m.genre || 'Action'}</span>
                            <span>{m.year || 2024}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 mt-2 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 uppercase font-mono text-[9px]">{m.container || 'mp4'}</span>
                          <button
                            onClick={() => handleDeleteMovie(m.id, m.title)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredMovies.length === 0 && (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Aucun film correspondant. Cliquez sur « Ajouter un film / VOD » pour enrichir votre catalogue cinéma.
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 4: SHARES & M3U */}
        {activeTab === 'shares' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setShareSearch('');
                  setShareCategoryFilter('');
                  setShowAddShareModal(true);
                }}
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
                        <div className="flex items-center gap-1.5">
                          <span>Sessions max simultanées :</span>
                          {sh.maxSessions <= 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] border border-emerald-500/20">
                              <InfinityIcon className="w-3.5 h-3.5" /> Illimitées (aucun quota)
                            </span>
                          ) : (
                            <strong className="text-slate-200">{sh.maxSessions} écran(s)</strong>
                          )}
                        </div>
                        <div>
                          Chaînes autorisées : <strong className="text-slate-200">{sh.allowedChannels?.length || 0}</strong> / {channels.length}
                        </div>
                      </div>

                      {sh.isActive && (
                        <div className="space-y-2">
                          <div>
                            <div className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-between">
                              <span>Playlist M3U Standard :</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
                              <span className="truncate mr-2">{m3uUrl}</span>
                              <button
                                onClick={() => copyToClipboard(m3uUrl)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
                                title="Copier le lien M3U"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-between">
                              <span>Connecteur API (TV Player / Application externe) :</span>
                              <span className="text-[10px] text-emerald-400 font-normal">Recommandé</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono text-emerald-400">
                              <span className="truncate mr-2">{window.location.origin}/api/v1/channels?token={sh.token}</span>
                              <button
                                onClick={() => copyToClipboard(`${window.location.origin}/api/v1/channels?token=${sh.token}`)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
                                title="Copier l'URL d'API pour TV Player"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
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

      {/* Modal: Créer Partage M3U (Avec Recherche, Filtre Catégorie et Réordonnancement) */}
      {showAddShareModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-4xl w-full shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-white text-lg">Créer un Accès de Partage M3U</h3>
                <p className="text-xs text-slate-400">Recherchez, filtrez par catégorie et organisez l'ordre précis des chaînes dans le flux M3U.</p>
              </div>
              <button onClick={() => setShowAddShareModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShare} className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Nom de l'accès</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mon Salon TV"
                    value={newShare.name}
                    onChange={(e) => setNewShare({ ...newShare, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 text-xs">Connexions simultanées</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-emerald-400 font-semibold">
                      <input
                        type="checkbox"
                        checked={newShare.isUnlimited}
                        onChange={(e) => setNewShare({ ...newShare, isUnlimited: e.target.checked })}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <InfinityIcon className="w-3.5 h-3.5" />
                      <span>Illimité (sans quota)</span>
                    </label>
                  </div>
                  {newShare.isUnlimited ? (
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 font-medium flex items-center gap-2">
                      <InfinityIcon className="w-4 h-4 text-emerald-400" />
                      <span>Connexions simultanées infinies autorisées</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newShare.maxSessions}
                      onChange={(e) => setNewShare({ ...newShare, maxSessions: parseInt(e.target.value) || 2 })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
              </div>

              {/* Visual Dual-Column Channel Builder */}
              <div className="grid md:grid-cols-2 gap-4 flex-1 min-h-0 pt-1">
                {/* Left: Catalogue with Search & Category Filter */}
                <div className="flex flex-col border border-slate-800 rounded-xl bg-slate-950 p-3 space-y-3 min-h-[300px]">
                  <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>1. Catalogue des Chaînes</span>
                    <span className="text-slate-500">{filteredShareChannels.length} trouvée(s)</span>
                  </div>

                  {/* Search and Category Filter */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Rechercher par nom..."
                        value={shareSearch}
                        onChange={(e) => setShareSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={shareCategoryFilter}
                        onChange={(e) => setShareCategoryFilter(e.target.value)}
                        className="flex-1 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Toutes les catégories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => selectFilteredChannels(false)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold shrink-0"
                        title="Ajouter toutes les chaînes visibles"
                      >
                        + Tout ajouter
                      </button>
                    </div>
                  </div>

                  {/* Scrollable list */}
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-56 md:max-h-72">
                    {filteredShareChannels.map((ch) => {
                      const isChecked = newShare.channelIds.includes(ch.id);
                      return (
                        <div
                          key={ch.id}
                          onClick={() => toggleShareChannel(ch.id, false)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                            isChecked
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                              : 'hover:bg-slate-900 border border-transparent text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-slate-700 text-emerald-500 pointer-events-none"
                            />
                            {ch.logoUrl && (
                              <img src={ch.logoUrl} alt="" className="w-5 h-5 rounded object-contain bg-slate-900 shrink-0" />
                            )}
                            <span className="font-medium truncate">{ch.name}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 shrink-0 ml-2">
                            {ch.category?.name || 'Général'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Selected Channels & Order */}
                <div className="flex flex-col border border-slate-800 rounded-xl bg-slate-950 p-3 space-y-3 min-h-[300px]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      2. Ordre dans la Playlist M3U ({newShare.channelIds.length})
                    </span>
                    {newShare.channelIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewShare({ ...newShare, channelIds: [] })}
                        className="text-red-400 hover:underline text-[11px]"
                      >
                        Tout retirer
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Les chaînes seront générées dans ce classement exact. Utilisez ▲ ▼ pour réordonner.
                  </p>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-56 md:max-h-72">
                    {newShare.channelIds.length === 0 ? (
                      <div className="p-8 text-center text-slate-600 text-xs">
                        Aucune chaîne sélectionnée.<br />
                        <span className="text-slate-500 text-[11px]">Si aucune chaîne n'est choisie, toutes les chaînes actives seront incluses par défaut.</span>
                      </div>
                    ) : (
                      newShare.channelIds.map((id, index) => {
                        const ch = channelMap.get(id);
                        if (!ch) return null;
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                          >
                            <div className="flex items-center gap-2 truncate mr-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-emerald-400 flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              {ch.logoUrl && (
                                <img src={ch.logoUrl} alt="" className="w-5 h-5 rounded object-contain bg-slate-950 shrink-0" />
                              )}
                              <span className="font-medium truncate">{ch.name}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={(e) => { e.stopPropagation(); moveChannelToTop(index, false); }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30 disabled:pointer-events-none"
                                title="Mettre en 1ère position"
                              >
                                <ArrowUpToLine className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={(e) => { e.stopPropagation(); moveChannelUp(index, false); }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30 disabled:pointer-events-none"
                                title="Monter"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === newShare.channelIds.length - 1}
                                onClick={(e) => { e.stopPropagation(); moveChannelDown(index, false); }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30 disabled:pointer-events-none"
                                title="Descendre"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleShareChannel(id, false); }}
                                className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 ml-1"
                                title="Retirer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddShareModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950 text-xs shadow-lg shadow-emerald-500/10"
                >
                  Générer le Partage ({newShare.channelIds.length} chaînes)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Modifier Partage M3U (Avec Recherche, Filtre Catégorie et Réordonnancement) */}
      {showEditShareModal && editingShare && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-4xl w-full shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-white text-lg">Modifier l'Accès de Partage M3U</h3>
                <p className="text-xs text-slate-400">Réorganisez l'ordre des chaînes ou modifiez les accès accordés.</p>
              </div>
              <button
                onClick={() => {
                  setShowEditShareModal(false);
                  setEditingShare(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateShare} className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Nom de l'accès</label>
                  <input
                    type="text"
                    required
                    value={editingShare.name}
                    onChange={(e) => setEditingShare({ ...editingShare, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 text-xs">Connexions simultanées</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-emerald-400 font-semibold">
                      <input
                        type="checkbox"
                        checked={editingShare.isUnlimited}
                        onChange={(e) => setEditingShare({ ...editingShare, isUnlimited: e.target.checked })}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <InfinityIcon className="w-3.5 h-3.5" />
                      <span>Illimité</span>
                    </label>
                  </div>
                  {editingShare.isUnlimited ? (
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 font-medium flex items-center gap-2">
                      <InfinityIcon className="w-4 h-4 text-emerald-400" />
                      <span>Connexions simultanées illimitées</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingShare.maxSessions}
                      onChange={(e) => setEditingShare({ ...editingShare, maxSessions: parseInt(e.target.value) || 2 })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                    <input
                      type="checkbox"
                      checked={editingShare.isActive}
                      onChange={(e) => setEditingShare({ ...editingShare, isActive: e.target.checked })}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Accès actif (décocher pour suspendre)</span>
                  </label>
                </div>
              </div>

              {/* Visual Dual-Column Channel Builder */}
              <div className="grid md:grid-cols-2 gap-4 flex-1 min-h-0 pt-1">
                {/* Left: Catalogue with Search & Category Filter */}
                <div className="flex flex-col border border-slate-800 rounded-xl bg-slate-950 p-3 space-y-3 min-h-[300px]">
                  <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>1. Catalogue des Chaînes</span>
                    <span className="text-slate-500">{filteredShareChannels.length} trouvée(s)</span>
                  </div>

                  {/* Search and Category Filter */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Rechercher par nom..."
                        value={shareSearch}
                        onChange={(e) => setShareSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={shareCategoryFilter}
                        onChange={(e) => setShareCategoryFilter(e.target.value)}
                        className="flex-1 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Toutes les catégories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => selectFilteredChannels(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold shrink-0"
                        title="Ajouter toutes les chaînes visibles"
                      >
                        + Tout ajouter
                      </button>
                    </div>
                  </div>

                  {/* Scrollable list */}
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-56 md:max-h-72">
                    {filteredShareChannels.map((ch) => {
                      const isChecked = editingShare.channelIds.includes(ch.id);
                      return (
                        <div
                          key={ch.id}
                          onClick={() => toggleShareChannel(ch.id, true)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                            isChecked
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                              : 'hover:bg-slate-900 border border-transparent text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-slate-700 text-emerald-500 pointer-events-none"
                            />
                            {ch.logoUrl && (
                              <img src={ch.logoUrl} alt="" className="w-5 h-5 rounded object-contain bg-slate-900 shrink-0" />
                            )}
                            <span className="font-medium truncate">{ch.name}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 shrink-0 ml-2">
                            {ch.category?.name || 'Général'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Selected Channels & Order */}
                <div className="flex flex-col border border-slate-800 rounded-xl bg-slate-950 p-3 space-y-3 min-h-[300px]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      2. Ordre dans la Playlist M3U ({editingShare.channelIds.length})
                    </span>
                    {editingShare.channelIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setEditingShare({ ...editingShare, channelIds: [] })}
                        className="text-red-400 hover:underline text-[11px]"
                      >
                        Tout retirer
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Les chaînes seront générées dans ce classement exact. Utilisez ▲ ▼ pour réordonner.
                  </p>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-56 md:max-h-72">
                    {editingShare.channelIds.length === 0 ? (
                      <div className="p-8 text-center text-slate-600 text-xs">
                        Aucune chaîne sélectionnée.<br />
                        <span className="text-slate-500 text-[11px]">Si aucune chaîne n'est choisie, toutes les chaînes actives seront incluses par défaut.</span>
                      </div>
                    ) : (
                      editingShare.channelIds.map((id, index) => {
                        const ch = channelMap.get(id);
                        if (!ch) return null;
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                          >
                            <div className="flex items-center gap-2 truncate mr-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-emerald-400 flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              {ch.logoUrl && (
                                <img src={ch.logoUrl} alt="" className="w-5 h-5 rounded object-contain bg-slate-950 shrink-0" />
                              )}
                              <span className="font-medium truncate">{ch.name}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={(e) => { e.stopPropagation(); moveChannelToTop(index, true); }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30 disabled:pointer-events-none"
                                title="Mettre en 1ère position"
                              >
                                <ArrowUpToLine className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={(e) => { e.stopPropagation(); moveChannelUp(index, true); }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30 disabled:pointer-events-none"
                                title="Monter"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === editingShare.channelIds.length - 1}
                                onClick={(e) => { e.stopPropagation(); moveChannelDown(index, true); }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30 disabled:pointer-events-none"
                                title="Descendre"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleShareChannel(id, true); }}
                                className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 ml-1"
                                title="Retirer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditShareModal(false);
                    setEditingShare(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950 text-xs shadow-lg shadow-emerald-500/10"
                >
                  Enregistrer les modifications ({editingShare.channelIds.length} chaînes)
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

      {/* Modal: Ajouter Film / VOD */}
      {showAddMovieModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Film className="w-5 h-5 text-emerald-400" /> Ajouter un Film / VOD
              </h3>
              <button
                onClick={() => setShowAddMovieModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovie} className="space-y-3.5 overflow-y-auto pr-1 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Titre du film *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Interstellar, Inception, Dune..."
                  value={newMovie.title}
                  onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">URL directe de la vidéo (MP4, MKV ou HLS) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://.../video.mp4 ou .m3u8"
                  value={newMovie.streamUrl}
                  onChange={(e) => setNewMovie({ ...newMovie, streamUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">URL de la jaquette / Affiche (Poster)</label>
                <input
                  type="url"
                  placeholder="https://image.tmdb.org/t/p/w500/... ou lien direct"
                  value={newMovie.posterUrl}
                  onChange={(e) => setNewMovie({ ...newMovie, posterUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Année</label>
                  <input
                    type="number"
                    value={newMovie.year}
                    onChange={(e) => setNewMovie({ ...newMovie, year: parseInt(e.target.value) || 2024 })}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Note (sur 10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={newMovie.rating}
                    onChange={(e) => setNewMovie({ ...newMovie, rating: parseFloat(e.target.value) || 7.5 })}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Genre</label>
                  <select
                    value={newMovie.genre}
                    onChange={(e) => setNewMovie({ ...newMovie, genre: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="Action">Action</option>
                    <option value="Aventure">Aventure</option>
                    <option value="Comédie">Comédie</option>
                    <option value="Drame">Drame</option>
                    <option value="Science-Fiction">Science-Fiction</option>
                    <option value="Horreur">Horreur</option>
                    <option value="Animation">Animation</option>
                    <option value="Documentaire">Documentaire</option>
                    <option value="Thriller">Thriller</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Synopsis / Résumé</label>
                <textarea
                  rows={2}
                  placeholder="Court résumé de l'histoire..."
                  value={newMovie.plot}
                  onChange={(e) => setNewMovie({ ...newMovie, plot: e.target.value })}
                  className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMovieModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950 text-xs shadow-lg shadow-emerald-500/10"
                >
                  Ajouter au catalogue VOD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assistant IA Film (LiteLLM) */}
      {showAiMovieModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Assistant IA Film & VOD</h3>
                  <p className="text-[11px] text-purple-300 font-medium">Propulsé par LiteLLM (ai.oussamma.tn)</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiMovieModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAiParseMovie} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                  Nom du film OU URL d'une page web :
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Inception, Gladiator 2 ou https://..."
                  value={aiMovieInput}
                  onChange={(e) => setAiMovieInput(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  💡 <strong>Comment ça marche ?</strong> L'IA extrait automatiquement l'affiche officielle HD, l'année, le genre, la note et le résumé complet, puis pré-remplit la fiche pour vous.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={aiMovieLoading}
                  onClick={() => setShowAiMovieModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={aiMovieLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  {aiMovieLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Analyse IA en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" /> Analyser & Pré-remplir
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assistant IA Chaîne TV (LiteLLM) */}
      {showAiChannelModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Assistant IA Chaîne TV</h3>
                  <p className="text-[11px] text-purple-300 font-medium">Propulsé par LiteLLM (ai.oussamma.tn)</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiChannelModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAiParseChannel} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                  Nom de la chaîne OU URL du flux :
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TF1, BeIN Sports 1, El Watania 1..."
                  value={aiChannelInput}
                  onChange={(e) => setAiChannelInput(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  💡 <strong>Détection intelligente :</strong> L'IA détecte le logo officiel haute définition, le code EPG XMLTV, la catégorie et le pays.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={aiChannelLoading}
                  onClick={() => setShowAiChannelModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={aiChannelLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  {aiChannelLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Analyse IA en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" /> Identifier la chaîne
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload de fichier vidéo VOD */}
      {showUploadMovieModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Téléverser un fichier VOD / Film</h3>
                  <p className="text-[11px] text-blue-300 font-medium">Stockage persistant & Streaming HTTP Range</p>
                </div>
              </div>
              <button
                disabled={isUploading}
                onClick={() => setShowUploadMovieModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="file"
              ref={videoFileInputRef}
              accept="video/*,.mp4,.mkv,.avi,.mov"
              onChange={handleVideoFileUpload}
              className="hidden"
            />

            {isUploading ? (
              <div className="py-8 px-4 text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                  <UploadCloud className="w-8 h-8 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                </div>

                <div>
                  <h4 className="text-white font-semibold text-sm">Téléversement du fichier en cours...</h4>
                  <p className="text-slate-400 text-xs mt-1">Veuillez ne pas fermer cette fenêtre</p>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress ?? 0}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>Progression</span>
                  <span className="font-bold text-blue-400">{uploadProgress ?? 0}%</span>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  💡 Dès la fin du téléversement, LiteLLM tentera de préremplir l'affiche et les infos du film.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  onClick={() => videoFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-blue-500/50 bg-slate-950/50 hover:bg-slate-900/60 rounded-xl p-8 text-center cursor-pointer transition-all group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 group-hover:bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3 transition-all">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <h4 className="text-white font-semibold text-sm group-hover:text-blue-300 transition-colors">
                    Cliquez pour choisir une vidéo
                  </h4>
                  <p className="text-slate-400 text-xs mt-1">
                    Formats supportés : <span className="text-slate-300 font-medium">MP4, MKV, AVI, MOV</span>
                  </p>
                  <p className="text-slate-500 text-[11px] mt-2">
                    Jusqu'à 10 Go par fichier
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5 text-purple-200">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Auto-complétion intelligente par IA :
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Le nom de fichier sera nettoyé et analysé par l'IA LiteLLM (ai.oussamma.tn) pour trouver automatiquement le titre, l'affiche officielle, l'année, la durée et le synopsis !
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowUploadMovieModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    <UploadCloud className="w-4 h-4" /> Parcourir les fichiers
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
