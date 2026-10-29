// src/features/workspace/LeftPanelClients.tsx
// Left Panel: Searchable Client and Project Directory with role-aware access controls

import React, { useState } from 'react';
import { Client, Project } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { 
  Building2, 
  FolderKanban, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Search, 
  Globe
} from 'lucide-react';

interface LeftPanelClientsProps {
  clients: Client[];
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateClient: (clientData: Partial<Client>) => void;
  onCreateProject: (projectData: Partial<Project>) => void;
}

export const LeftPanelClients: React.FC<LeftPanelClientsProps> = ({
  clients,
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateClient,
  onCreateProject,
}) => {
  const { canViewMoney, isMember } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({
    'client-1': true,
    'client-2': true,
  });

  // Modal states
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientTz, setNewClientTz] = useState('America/New_York');
  const [newClientNotes, setNewClientNotes] = useState('');

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClientId, setNewProjectClientId] = useState(clients[0]?.id || '');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTz, setNewProjectTz] = useState('America/New_York');

  const toggleClient = (clientId: string) => {
    setExpandedClients((prev) => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  // Filter projects by search
  const filteredProjects = projects.filter((p) => {
    // For members, only assigned projects (proj-1 in seed)
    if (isMember && p.id !== 'proj-1') return false;
    return (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description_internal?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleCreateClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    onCreateClient({
      name: newClientName.trim(),
      default_timezone: newClientTz,
      notes_internal: newClientNotes.trim(),
      status: 'active',
    });
    setNewClientName('');
    setNewClientNotes('');
    setIsClientModalOpen(false);
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateProject({
      name: newProjectName.trim(),
      client_id: newProjectClientId,
      description_internal: newProjectDesc.trim(),
      timezone: newProjectTz,
      status: 'active',
    });
    setNewProjectName('');
    setNewProjectDesc('');
    setIsProjectModalOpen(false);
  };

  return (
    <div className="w-80 h-full flex flex-col bg-slate-950 border-r border-slate-800/80 select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/80">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Clients & Projects
          </div>
          <div className="text-[11px] text-slate-500">
            {filteredProjects.length} active workspace{filteredProjects.length !== 1 ? 's' : ''}
          </div>
        </div>

        {canViewMoney && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsClientModalOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-900 transition"
              title="Add Client Company"
            >
              <Building2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition flex items-center gap-1 text-xs px-2"
              title="Create New Project"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Project</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-800/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
          />
        </div>
      </div>

      {/* Client & Project Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {clients.map((client) => {
          const clientProjects = filteredProjects.filter((p) => p.client_id === client.id);
          if (clientProjects.length === 0 && isMember) return null;

          const isExpanded = expandedClients[client.id] ?? true;

          return (
            <div key={client.id} className="rounded-xl border border-slate-800/40 bg-slate-900/30 overflow-hidden">
              {/* Client Accordion Header */}
              <div
                onClick={() => toggleClient(client.id)}
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-900/70 transition group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
                  )}
                  <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-200 truncate">{client.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                  <Globe className="w-3 h-3 text-slate-600" />
                  <span>{client.default_timezone.split('/')[1] || client.default_timezone}</span>
                </div>
              </div>

              {/* Projects List under Client */}
              {isExpanded && (
                <div className="pl-6 pr-2 py-1 space-y-1 border-t border-slate-800/40 bg-slate-950/40">
                  {clientProjects.length === 0 ? (
                    <div className="text-[11px] text-slate-600 py-1.5 pl-2 italic">
                      No active projects
                    </div>
                  ) : (
                    clientProjects.map((proj) => {
                      const isSelected = proj.id === selectedProjectId;
                      return (
                        <div
                          key={proj.id}
                          onClick={() => onSelectProject(proj.id)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition ${
                            isSelected
                              ? 'bg-teal-500/15 border border-teal-500/30 text-teal-200 font-medium'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FolderKanban
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-teal-400' : 'text-slate-500'
                              }`}
                            />
                            <span className="truncate">{proj.name}</span>
                          </div>
                          <StatusBadge status={proj.status} size="sm" />
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Client Creation Modal */}
      <Modal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        title="Add Client Company"
        subtitle="Create an internal record for an enterprise partner"
      >
        <form onSubmit={handleCreateClientSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Company / Client Name</label>
            <input
              type="text"
              required
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="e.g. Acme Global Logistics"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Default IANA Timezone</label>
            <select
              value={newClientTz}
              onChange={(e) => setNewClientTz(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            >
              <option value="America/New_York">America/New_York (US Eastern)</option>
              <option value="America/Chicago">America/Chicago (US Central)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (US Pacific)</option>
              <option value="America/Toronto">America/Toronto (Canada Eastern)</option>
              <option value="Europe/London">Europe/London (UK)</option>
              <option value="Europe/Stockholm">Europe/Stockholm (CET)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
              <option value="Asia/Dhaka">Asia/Dhaka (Bangladesh Standard)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Internal Notes</label>
            <textarea
              rows={3}
              value={newClientNotes}
              onChange={(e) => setNewClientNotes(e.target.value)}
              placeholder="Client commercial terms, contacts, or confidentiality notes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsClientModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
            >
              Save Client
            </button>
          </div>
        </form>
      </Modal>

      {/* Project Creation Modal */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title="Create New Project"
        subtitle="Initialize a primary conversation, scope, and timeline"
      >
        <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
            <input
              type="text"
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Infrastructure Modernization"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Client Company</label>
            <select
              value={newProjectClientId}
              onChange={(e) => setNewProjectClientId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Project Timezone</label>
            <select
              value={newProjectTz}
              onChange={(e) => setNewProjectTz(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            >
              <option value="America/New_York">America/New_York (US Eastern)</option>
              <option value="America/Chicago">America/Chicago (US Central)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (US Pacific)</option>
              <option value="America/Toronto">America/Toronto (Canada Eastern)</option>
              <option value="Europe/London">Europe/London (UK)</option>
              <option value="Europe/Stockholm">Europe/Stockholm (CET)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
              <option value="Asia/Dhaka">Asia/Dhaka (Bangladesh Standard)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Scope & Description</label>
            <textarea
              rows={3}
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="High-level project objectives and technical scope..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
            >
              Initialize Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
