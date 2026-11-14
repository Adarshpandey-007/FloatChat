"use client";
import { useEffect, useState } from 'react';
import { TableSkeleton } from '../ui/Skeleton';

interface ProfileRow { id: string; cycle: number; timestamp: string; lat: number; lon: number; meanTemp?: number; meanSalinity?: number; }

export function TablePanel() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const exportToCsv = () => {
    if (rows.length === 0) return;
    const headers = ['Profile', 'Cycle', 'Date (UTC)', 'Lat', 'Lon', 'Mean Temp', 'Mean Sal'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [
        r.id,
        r.cycle,
        new Date(r.timestamp).toISOString().slice(0,19).replace('T',' '),
        r.lat.toFixed(2),
        r.lon.toFixed(2),
        r.meanTemp?.toFixed(2) || '',
        r.meanSalinity?.toFixed(2) || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'argo_profiles.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/profiles', { signal: controller.signal })
      .then(r => {
        if (!r.ok) {
          throw new Error(`Failed to load profiles (${r.status})`);
        }
        return r.json();
      })
      .then(data => {
        const mapped: ProfileRow[] = (data.profiles || []).map((p: any) => ({
          id: p.id,
          cycle: p.cycle ?? 0,
          timestamp: p.timestamp,
          lat: p.lat,
          lon: p.lon,
          meanTemp: p.stats?.meanTemp,
          meanSalinity: p.stats?.meanSalinity
        }));
        setRows(mapped);
        setError(null);
      })
      .catch((e: any) => {
        if (e?.name === 'AbortError') return;
        setError('Could not load profile table data.');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  if (loading) {
    return <div className="p-4 h-full"><TableSkeleton rows={15} /></div>;
  }

  if (error) {
    return <div className="p-4 h-full overflow-auto text-sm text-red-700">{error}</div>;
  }

  if (rows.length === 0) {
    return <div className="p-4 h-full overflow-auto text-sm text-floatchat-ink/70">No profile summaries available.</div>;
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-sm font-semibold text-floatchat-ink">Profile Summaries</h3>
        <button 
          onClick={exportToCsv}
          className="text-xs bg-floatchat-accent text-white px-3 py-1.5 rounded hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-floatchat-accent transition-all shadow-sm"
        >
          Export CSV
        </button>
      </div>
      <div className="flex-1 overflow-auto" tabIndex={0} role="region" aria-label="Profile Summaries Table">
        <table className="w-full text-xs">
          <thead className="bg-floatchat-subtle text-floatchat-ink sticky top-0">
          <tr>
            <th scope="col" className="text-left p-2">Profile</th>
            <th scope="col" className="text-left p-2">Cycle</th>
            <th scope="col" className="text-left p-2">Date (UTC)</th>
            <th scope="col" className="text-left p-2">Lat</th>
            <th scope="col" className="text-left p-2">Lon</th>
            <th scope="col" className="text-left p-2">Mean Temp</th>
            <th scope="col" className="text-left p-2">Mean Sal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b hover:bg-floatchat-subtle/40">
              <td className="p-2 font-mono">{r.id}</td>
              <td className="p-2">{r.cycle}</td>
              <td className="p-2">{new Date(r.timestamp).toISOString().slice(0,19).replace('T',' ')}</td>
              <td className="p-2">{r.lat.toFixed(2)}</td>
              <td className="p-2">{r.lon.toFixed(2)}</td>
              <td className="p-2">{r.meanTemp?.toFixed(2)}</td>
              <td className="p-2">{r.meanSalinity?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
