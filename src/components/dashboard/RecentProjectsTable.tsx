"use client";

interface Project {
  id: string;
  name: string;
  type: string;
  scale: string;
  date: string;
}

interface RecentProjectsTableProps {
  projects: Project[];
}

export function RecentProjectsTable({ projects }: RecentProjectsTableProps) {
  if (!projects || projects.length === 0) {
    return (
      <div className="bg-slate-900/50 rounded-2xl p-8 border border-white/[0.08] backdrop-blur-xl flex justify-center items-center h-48">
        <p className="text-slate-400">No recent projects found.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-white/[0.08] backdrop-blur-xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/[0.08]">
        <h2 className="text-lg font-semibold text-white">Recently Planned Projects</h2>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Recently Planned Projects Table">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-4 font-medium">Project Name</th>
              <th scope="col" className="px-6 py-4 font-medium">Type</th>
              <th scope="col" className="px-6 py-4 font-medium">Scale/Budget</th>
              <th scope="col" className="px-6 py-4 font-medium">Date Planned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 font-medium text-white">{project.name}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-md bg-white/[0.05] text-cyan-300 border border-white/[0.1]">
                    {project.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-300">{project.scale}</td>
                <td className="px-6 py-4 text-slate-400">{project.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
