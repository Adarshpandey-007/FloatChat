"use client";
import { useEffect, useState, useMemo } from 'react';
import AdminStatCard from '@/components/admin/AdminStatCard';

interface HealthResp { 
  status: string; 
  timestamp: string; 
  uptimeSeconds?: number;
  env?: {
    hasLLM: boolean;
    realProfileSource: string;
  };
}

interface RealFloatsResp { files: { id: string }[]; count: number; dataDir: string | null; warning?: string | null }
interface RealProfilesIndex { floats: string[]; total: number; cacheDir: string }

function useFetch<T>(url: string | null, deps: any[] = []): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true); setError(null);
    fetch(url).then(r => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    }).then(j => { if (!cancelled) setData(j as T); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error };
}

export default function AdminDashboardPage() {
  const { data: health, loading: healthLoading, error: healthError } = useFetch<HealthResp>('/api/health', []);
  const { data: realFloats, loading: floatsLoading } = useFetch<RealFloatsResp>('/api/real/floats', []);
  const { data: realProfilesIdx, loading: profilesLoading } = useFetch<RealProfilesIndex>('/api/real/profiles', []);

  const floatsCount = realFloats?.count ?? 0;
  const profilesCount = realProfilesIdx?.total ?? 0;

  const hasLLM = health?.env?.hasLLM ?? false;
  const realProfileSource = health?.env?.realProfileSource ?? 'cache';

  const statusHealth: 'ok' | 'warn' | 'error' = healthError ? 'error' : (health?.status === 'ok' ? 'ok' : 'warn');
  const statusRealData: 'ok' | 'warn' | 'error' = (floatsCount > 0 || profilesCount > 0) ? 'ok' : 'warn';

  const envFlags = useMemo(() => ([
    { key: 'REAL_PROFILE_SOURCE', value: realProfileSource },
    { key: 'GROQ_API_KEY', value: hasLLM ? '[set]' : '[unset]' },
    { key: 'ARGO_DATA_DIR', value: realFloats?.dataDir ?? '[unset]' },
    { key: 'PROFILE_CACHE_DIR', value: realProfilesIdx?.cacheDir ?? '[unset]' }
  ]), [realProfileSource, hasLLM, realFloats?.dataDir, realProfilesIdx?.cacheDir]);

  return (
    <main id="main" className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900 text-ocean-50 pb-24">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden="true" />
        <div className="max-w-7xl mx-auto px-6 pt-16">
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-floatchat-gradientFrom to-floatchat-gradientTo">Admin Dashboard</h1>
            <p className="mt-2 text-ocean-200 max-w-2xl">Internal operational view. <span className="text-amber-300 font-medium">Do not expose publicly</span> until authentication & logging are enabled.</p>
          </header>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 mb-12">
            <AdminStatCard
              title="Health"
              value={health?.status || '—'}
              subtitle={health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : ''}
              status={statusHealth}
              loading={healthLoading}
              error={healthError}
            />
            <AdminStatCard
              title="Floats Discovered"
              value={floatsCount}
              subtitle={realFloats?.warning || realFloats?.dataDir || ''}
              status={statusRealData}
              loading={floatsLoading}
            />
            <AdminStatCard
              title="Profile Caches"
              value={profilesCount}
              subtitle={realProfilesIdx?.cacheDir || ''}
              status={profilesCount > 0 ? 'ok' : 'warn'}
              loading={profilesLoading}
            />
            <AdminStatCard
              title="LLM Integration"
              value={hasLLM ? 'Enabled' : 'Disabled'}
              subtitle={hasLLM ? 'Groq LPU (gpt-oss-120b)' : 'No API key'}
              status={hasLLM ? 'ok' : 'warn'}
              loading={healthLoading}
            />
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Environment Flags</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {envFlags.map(f => (
                <div key={f.key} className="rounded-xl p-4 bg-white/10 border border-white/10">
                  <div className="text-xs uppercase tracking-wide text-ocean-300 mb-1">{f.key}</div>
                  <div className="font-medium text-ocean-50 break-all">{f.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-xl font-semibold mb-3">Data Discovery (Sample)</h2>
            <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
              <h3 className="text-sm font-semibold text-ocean-200 mb-2">Float IDs</h3>
              <div className="flex flex-wrap gap-2">
                {(realFloats?.files?.slice(0, 12) || []).map(f => (
                  <span key={f.id} className="px-2 py-1 rounded-md text-xs bg-white/10 border border-white/10">{f.id}</span>
                ))}
                {floatsLoading && <span className="text-xs text-ocean-300 animate-pulse">Loading...</span>}
                {(!floatsLoading && floatsCount === 0) && <span className="text-xs text-amber-300">None</span>}
              </div>
            </div>
          </section>

          <section className="mb-24">
            <h2 className="text-xl font-semibold mb-3">Next Operational Enhancements</h2>
            <ul className="space-y-2 text-sm text-ocean-200 list-disc pl-5">
              <li>Add authentication gate (`ENABLE_ADMIN` + token header)</li>
              <li>Integrate Sentry or structured logger for recent error list</li>
              <li>Expose query latency / token usage metrics</li>
              <li>DB connectivity + migration status card</li>
              <li>Ingestion re-scan trigger (post-auth)</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
