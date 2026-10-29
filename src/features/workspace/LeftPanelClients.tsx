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
  Globe,
  User,
  AlertCircle,
  X
} from 'lucide-react';

interface LeftPanelClientsProps {
  clients: Client[];
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateClient: (clientData: Partial<Client>) => void;
  onCreateProject: (projectData: Partial<Project>) => void;
  onCloseMobileDrawer?: () => void;
}

export const LeftPanelClients: React.FC<LeftPanelClientsProps> = ({
  clients,
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateClient,
  onCreateProject,
  onCloseMobileDrawer,
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

  // Primary Contact states
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactTitle, setNewContactTitle] = useState('VP Engineering');
  const [newContactPhone, setNewContactPhone] = useState('');

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClientId, setNewProjectClientId] = useState(clients[0]?.id || '');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTz, setNewProjectTz] = useState(clients[0]?.default_timezone || 'America/New_York');

  const toggleClient = (clientId: string) => {
    setExpandedClients((prev) => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const handleOpenProjectModalForClient = (clientId: string) => {
    setNewProjectClientId(clientId);
    const target = clients.find((c) => c.id === clientId);
    if (target) {
      setNewProjectTz(target.default_timezone);
    }
    setIsProjectModalOpen(true);
  };

  const handleClientSelectionChange = (clientId: string) => {
    setNewProjectClientId(clientId);
    const target = clients.find((c) => c.id === clientId);
    if (target) {
      setNewProjectTz(target.default_timezone);
    }
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

    const contacts = newContactName.trim()
      ? [
          {
            id: `contact-${Date.now()}`,
            client_id: `client-${Date.now()}`,
            name: newContactName.trim(),
            email: newContactEmail.trim(),
            job_title: newContactTitle.trim() || 'Primary Contact',
            phone: newContactPhone.trim() || undefined,
            is_primary: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
      : [];

    onCreateClient({
      name: newClientName.trim(),
      default_timezone: newClientTz,
      notes_internal: newClientNotes.trim(),
      status: 'active',
      contacts,
    });

    setNewClientName('');
    setNewClientNotes('');
    setNewContactName('');
    setNewContactEmail('');
    setNewContactPhone('');
    setIsClientModalOpen(false);
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectClientId) return;
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
    <div className="w-full lg:w-60 xl:w-64 2xl:w-80 h-full flex flex-col bg-white dark:bg-slate-950 lg:border-r border-slate-200 dark:border-slate-800/80 select-none shrink-0 min-w-0 text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Clients & Projects
          </div>
          <div className="text-[11px] text-slate-500">
            {filteredProjects.length} active workspace{filteredProjects.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {canViewMoney && (
            <>
              <button
                onClick={() => setIsClientModalOpen(true)}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-teal-300 hover:bg-slate-200 dark:hover:bg-slate-900 transition"
                title="Add Client Company"
              >
                <Building2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:border-transparent dark:bg-teal-500/10 dark:text-teal-400 dark:hover:bg-teal-500/20 transition flex items-center gap-1 text-xs px-2 font-medium"
                title="Create New Project"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Project</span>
              </button>
            </>
          )}
          {onCloseMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900 transition ml-1"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500/50"
          />
        </div>
      </div>

      {/* Client & Project Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {clients.length === 0 && (
          <div className="text-center py-16 px-4 text-slate-500 space-y-2.5">
            <Building2 className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-700" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Clean Slate Ready</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              No clients or projects found. Use the buttons above to create your first client company and project.
            </p>
          </div>
        )}
        {clients.map((client) => {
          const clientProjects = filteredProjects.filter((p) => p.client_id === client.id);
          if (clientProjects.length === 0 && isMember) return null;

          const isExpanded = expandedClients[client.id] ?? true;

          return (
            <div key={client.id} className="rounded-xl border border-slate-200 dark:border-slate-800/40 bg-slate-50/60 dark:bg-slate-900/30 overflow-hidden shadow-xs">
              {/* Client Accordion Header */}
              <div
                onClick={() => toggleClient(client.id)}
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-900/70 transition group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
                  )}
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-teal-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{client.name}</div>
                    {client.contacts && client.contacts.length > 0 && (
                      <div className="text-[10px] text-slate-500 truncate">
                        {client.contacts[0].name} {client.contacts[0].email ? `• ${client.contacts[0].email}` : ''}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                  <Globe className="w-3 h-3 text-slate-600" />
                  <span>{client.default_timezone.split('/')[1] || client.default_timezone}</span>
                  {canViewMoney && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProjectModalForClient(client.id);
                      }}
                      className="p-1 rounded bg-slate-200 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-teal-300 ml-1 transition"
                      title={`Assign new project to ${client.name}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Projects List under Client */}
              {isExpanded && (
                <div className="pl-6 pr-2 py-1 space-y-1 border-t border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-950/40">
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
                          onClick={() => {
                            onSelectProject(proj.id);
                            if (onCloseMobileDrawer) onCloseMobileDrawer();
                          }}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-teal-500/15 border border-emerald-300 dark:border-teal-500/30 text-emerald-900 dark:text-teal-200 font-semibold shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FolderKanban
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-emerald-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'
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
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Default IANA Timezone</label>
            <select
              value={newClientTz}
              onChange={(e) => setNewClientTz(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
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

          {/* Primary Contact Person Details */}
          <div className="border border-slate-800/80 rounded-lg p-3 bg-slate-950/70 space-y-3">
            <div className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-400" />
              <span>Primary Client Contact Person (Optional)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="e.g. Robert Vance"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Business Email</label>
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="e.g. robert@client.com"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Job Title</label>
                <input
                  type="text"
                  value={newContactTitle}
                  onChange={(e) => setNewContactTitle(e.target.value)}
                  placeholder="e.g. VP Engineering"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Internal Notes & Commercial Terms</label>
            <textarea
              rows={2}
              value={newClientNotes}
              onChange={(e) => setNewClientNotes(e.target.value)}
              placeholder="Commercial terms, billing preferences, or background..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsClientModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 font-semibold text-xs transition shadow-md shadow-emerald-600/20 dark:shadow-teal-950"
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
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
            />
          </div>

          {clients.length === 0 ? (
            <div className="bg-amber-950/40 border border-amber-800 p-3 rounded-lg text-amber-200 text-xs space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>No Client Companies Available</span>
              </div>
              <p className="text-[11px] text-slate-300">
                A project must be assigned to a Client Company profile. Please create a Client Company profile first.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsProjectModalOpen(false);
                  setIsClientModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition"
              >
                + Create Client Company Profile First
              </button>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Assign Client & Company Profile
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsProjectModalOpen(false);
                    setIsClientModalOpen(true);
                  }}
                  className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                >
                  + Add New Client
                </button>
              </div>
              <select
                required
                value={newProjectClientId}
                onChange={(e) => handleClientSelectionChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
              >
                <option value="" disabled>-- Select Client Company --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.default_timezone})
                  </option>
                ))}
              </select>

              {/* Show selected client contact preview */}
              {(() => {
                const selectedClient = clients.find((c) => c.id === newProjectClientId);
                if (selectedClient?.contacts && selectedClient.contacts.length > 0) {
                  return (
                    <div className="text-[11px] text-slate-300 mt-1.5 flex items-center gap-1.5 bg-slate-900/80 p-2 rounded border border-slate-800">
                      <User className="w-3.5 h-3.5 text-teal-400" />
                      <span>
                        Assigned Contact: <strong className="text-slate-100">{selectedClient.contacts[0].name}</strong> ({selectedClient.contacts[0].email})
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Project Timezone</label>
            <select
              value={newProjectTz}
              onChange={(e) => setNewProjectTz(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
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
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 font-semibold text-xs transition shadow-md shadow-emerald-600/20 dark:shadow-teal-950"
            >
              Initialize Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
