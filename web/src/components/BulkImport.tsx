'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Upload, Download, Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

type ImportResult = {
  success: boolean;
  added?: number;
  added_episodes?: number;
  added_links?: number;
  skipped: number;
  failed: number;
  errors: { row: number; reason: string }[];
};

export default function BulkImport() {
  const [movieFile, setMovieFile] = useState<File | null>(null);
  const [tvFile, setTvFile] = useState<File | null>(null);
  const [tvTmdbId, setTvTmdbId] = useState('');
  const [loading, setLoading] = useState<'movie' | 'tv' | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleImport(type: 'movie' | 'tv') {
    const file = type === 'movie' ? movieFile : tvFile;
    if (!file) return;

    if (type === 'tv' && !tvTmdbId) {
      alert('Please enter a TV TMDB ID');
      return;
    }

    setLoading(type);
    setResult(null);

    try {
      const text = await file.text();
      const endpoint = type === 'movie' 
        ? '/api/admin/import/movie' 
        : `/api/admin/import/tv?tv_tmdb_id=${tvTmdbId}`;
      
      const r = await api<ImportResult>(endpoint, {
        method: 'POST',
        body: text,
      });

      if (r.ok) {
        setResult(r.data);
      } else {
        alert(r.error || 'Import failed');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during import');
    } finally {
      setLoading(null);
    }
  }

  function downloadSample(type: 'movie' | 'tv') {
    const headers = type === 'movie'
      ? 'tmdb_id,title,stream_url,quality,languages,type'
      : 'season_number,episode_number,title,stream_url,quality,languages,type';
    
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_import_sample.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Bulk Import</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Movie Import */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--color-text-dim)]">
              Import Movies (CSV)
            </h3>
            <button
              onClick={() => downloadSample('movie')}
              className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand)] hover:underline flex items-center gap-1"
            >
              <Download size={12} />
              Sample CSV
            </button>
          </div>
          
          <div className="space-y-2">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setMovieFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-[var(--color-text-dim)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-bg)] file:text-white hover:file:bg-white/10 file:transition-all"
            />
            <button
              onClick={() => handleImport('movie')}
              disabled={!movieFile || !!loading}
              className="w-full py-2 bg-white text-black font-bold rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {loading === 'movie' ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              Upload Movies
            </button>
          </div>
        </div>

        {/* TV Import */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--color-text-dim)]">
              Import TV Episodes (CSV)
            </h3>
            <button
              onClick={() => downloadSample('tv')}
              className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand)] hover:underline flex items-center gap-1"
            >
              <Download size={12} />
              Sample CSV
            </button>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              placeholder="TV TMDB ID (Required)"
              value={tvTmdbId}
              onChange={(e) => setTvTmdbId(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)] transition-all"
            />
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setTvFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-[var(--color-text-dim)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-bg)] file:text-white hover:file:bg-white/10 file:transition-all"
            />
            <button
              onClick={() => handleImport('tv')}
              disabled={!tvFile || !tvTmdbId || !!loading}
              className="w-full py-2 bg-white text-black font-bold rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {loading === 'tv' ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              Upload Episodes
            </button>
          </div>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="mt-6 border-t border-[var(--color-border)] pt-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
              <CheckCircle2 size={14} />
              {result.added_links !== undefined 
                ? `${result.added_links} Links (${result.added_episodes} Episodes)` 
                : `${result.added ?? 0} Added`}
            </div>
            <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/20">
              <AlertCircle size={14} />
              {result.skipped} Skipped
            </div>
            <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20">
              <XCircle size={14} />
              {result.failed} Failed
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-red-500/5 rounded-xl border border-red-500/10 overflow-hidden">
              <div className="bg-red-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-500 border-b border-red-500/10">
                Error Details
              </div>
              <div className="max-h-40 overflow-y-auto p-4 space-y-2">
                {result.errors.map((err, idx) => (
                  <div key={idx} className="text-xs text-red-400 flex gap-2">
                    <span className="font-bold whitespace-nowrap">Row {err.row}:</span>
                    <span>{err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
