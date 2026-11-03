// src/features/calendar/ProjectCalendarModal.tsx
// Project Calendar & Master Work Orders Hub:
// 1. Interactive Monthly/Weekly Calendar for all projects (Upcoming, Ongoing, Completed)
// 2. Comprehensive Master Work Orders List with multi-criteria filters & status actions
// 3. System-wide pipeline & delivery health metrics

import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/Modal';
import { Project, WorkOrder, Client, ScopePackage, UserRole } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { formatHours, formatUSD, formatBDT } from '../../lib/formatting/currency';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  FileCheck,
  Search,
  Filter,
  Layers,
  ArrowRight,
  DollarSign,
  AlertCircle,
  Building2,
  TrendingUp,
  ExternalLink
} from 'lucide-react';

interface ProjectCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  clients: Client[];
  workOrders: WorkOrder[];
  packages: ScopePackage[];
  onSelectProject: (projectId: string) => void;
  onUpdateWorkOrderStatus?: (woId: string, status: any) => void;
}

export const ProjectCalendarModal: React.FC<ProjectCalendarModalProps> = ({
  isOpen,
  onClose,
  projects,
  clients,
  workOrders,
  packages,
  onSelectProject,
  onUpdateWorkOrderStatus,
}) => {
  const { canViewMoney } = useAuth();

  // Active view: 'calendar' | 'work-orders' | 'metrics'
  const [activeTab, setActiveTab] = useState<'calendar' | 'work-orders' | 'metrics'>('calendar');

  // Calendar navigation state (Year and Month)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week'>('month');

  // Work Orders List filters
  const [woSearch, setWoSearch] = useState('');
  const [woStatusFilter, setWoStatusFilter] = useState<string>('all');
  const [woClientFilter, setWoClientFilter] = useState<string>('all');

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build grid of days for current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dateKey: string;
    }> = [];

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, d);
      const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: dateObj,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        dateKey,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: dateObj,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        dateKey,
      });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: dateObj,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        dateKey,
      });
    }

    return days;
  }, [year, month]);

  // Map projects to dates
  const projectDateMap = useMemo(() => {
    const map: Record<string, Project[]> = {};

    projects.forEach((proj) => {
      // If project has created_at or start_date, map it
      const startStr = proj.start_date || proj.created_at;
      if (!startStr) return;
      const key = startStr.substring(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(proj);
    });

    return map;
  }, [projects]);

  // Map work orders to dates (generated_at or delivered_at)
  const workOrderDateMap = useMemo(() => {
    const map: Record<string, WorkOrder[]> = {};

    workOrders.forEach((wo) => {
      const dateStr = wo.delivered_at || wo.generated_at;
      if (!dateStr) return;
      const key = dateStr.substring(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(wo);
    });

    return map;
  }, [workOrders]);

  // Filtered work orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const proj = projects.find((p) => p.id === wo.project_id);
      const client = proj ? clients.find((c) => c.id === proj.client_id) : null;

      // Status filter
      if (woStatusFilter !== 'all' && wo.status !== woStatusFilter) return false;

      // Client filter
      if (woClientFilter !== 'all' && proj?.client_id !== woClientFilter) return false;

      // Search query
      if (woSearch.trim()) {
        const query = woSearch.toLowerCase();
        const matchesNo = wo.work_order_number.toLowerCase().includes(query);
        const matchesProj = proj?.name.toLowerCase().includes(query);
        const matchesClient = client?.name.toLowerCase().includes(query);
        if (!matchesNo && !matchesProj && !matchesClient) return false;
      }

      return true;
    });
  }, [workOrders, projects, clients, woStatusFilter, woClientFilter, woSearch]);

  // System-wide KPI metrics
  const totalWOHours = useMemo(() => {
    return workOrders.reduce((sum, wo) => sum + (wo.hours_snapshot || 0), 0);
  }, [workOrders]);

  const totalWOUsd = useMemo(() => {
    return workOrders.reduce((sum, wo) => sum + (wo.total_usd_snapshot || 0), 0);
  }, [workOrders]);

  const totalWOBdt = useMemo(() => {
    return workOrders.reduce((sum, wo) => sum + (wo.total_bdt_snapshot || 0), 0);
  }, [workOrders]);

  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const completedProjectsCount = projects.filter((p) => p.status === 'completed').length;
  const deliveredWOCount = workOrders.filter((w) => w.status === 'delivered' || w.status === 'completed').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Projects Calendar & Master Work Orders Hub"
      subtitle="Cross-project schedules, delivery milestones, and global operations tracking"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Top Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
              <span>Project Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('work-orders')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'work-orders'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>All Work Orders</span>
              <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 rounded-full font-mono text-[10px]">
                {workOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'metrics'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Pipeline & Metrics</span>
            </button>
          </div>

          {/* Quick Metrics Chips */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              {activeProjectsCount} Active
            </span>
            <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
              {deliveredWOCount} Delivered
            </span>
            <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {formatHours(totalWOHours)} Total
            </span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: PROJECT CALENDAR                                             */}
        {/* =================================================================== */}
        {activeTab === 'calendar' && (
          <div className="space-y-3">
            {/* Calendar Controls & Month Switcher */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {monthNames[month]} {year}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="px-2 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Status Legend */}
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Active Project</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Work Order</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span>Completed</span>
                </span>
              </div>
            </div>

            {/* Calendar Day Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 py-1">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {calendarDays.map((day, idx) => {
                const dayProjects = projectDateMap[day.dateKey] || [];
                const dayWorkOrders = workOrderDateMap[day.dateKey] || [];

                return (
                  <div
                    key={idx}
                    className={`min-h-[85px] sm:min-h-[95px] p-1.5 rounded-lg border transition flex flex-col justify-between ${
                      day.isToday
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-600/80 shadow-xs'
                        : day.isCurrentMonth
                        ? 'bg-white dark:bg-slate-950/80 border-slate-200/80 dark:border-slate-800/60'
                        : 'bg-slate-50/50 dark:bg-slate-950/30 border-transparent text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-bold ${
                          day.isToday
                            ? 'w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]'
                            : day.isCurrentMonth
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                    </div>

                    {/* Day Events / Chips */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {/* Projects on this date */}
                      {dayProjects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onSelectProject(p.id);
                            onClose();
                          }}
                          className={`w-full text-left truncate px-1.5 py-0.5 rounded text-[10px] font-semibold transition border flex items-center gap-1 ${
                            p.status === 'completed'
                              ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                          }`}
                          title={`Click to open ${p.name}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.status === 'completed' ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}

                      {/* Work orders on this date */}
                      {dayWorkOrders.map((wo) => {
                        const proj = projects.find((pr) => pr.id === wo.project_id);
                        return (
                          <button
                            key={wo.id}
                            type="button"
                            onClick={() => {
                              onSelectProject(wo.project_id);
                              onClose();
                            }}
                            className="w-full text-left truncate px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition border bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100 flex items-center gap-1"
                            title={`Work Order ${wo.work_order_number} (${formatHours(wo.hours_snapshot)})`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="truncate">{wo.work_order_number}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: ALL WORK ORDERS MASTER TABLE                                 */}
        {/* =================================================================== */}
        {activeTab === 'work-orders' && (
          <div className="space-y-3">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                {/* Search query */}
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={woSearch}
                    onChange={(e) => setWoSearch(e.target.value)}
                    placeholder="Search WO #, project, client..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Status selector */}
                <select
                  value={woStatusFilter}
                  onChange={(e) => setWoStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="in_progress">In Progress</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                </select>

                {/* Client selector */}
                <select
                  value={woClientFilter}
                  onChange={(e) => setWoClientFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="all">All Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Showing {filteredWorkOrders.length} of {workOrders.length}
              </div>
            </div>

            {/* Master Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950/60 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">WO Number</th>
                      <th className="py-2.5 px-3">Project & Client</th>
                      <th className="py-2.5 px-3">Scope Package</th>
                      <th className="py-2.5 px-3 text-right">Hours</th>
                      {canViewMoney && <th className="py-2.5 px-3 text-right">Commercial Value</th>}
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Generated</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredWorkOrders.length === 0 ? (
                      <tr>
                        <td colSpan={canViewMoney ? 8 : 7} className="py-8 text-center text-slate-400">
                          No work orders match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredWorkOrders.map((wo) => {
                        const proj = projects.find((p) => p.id === wo.project_id);
                        const client = proj ? clients.find((c) => c.id === proj.client_id) : null;
                        const pkg = packages.find((pk) => pk.id === wo.scope_package_id);

                        return (
                          <tr key={wo.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {wo.work_order_number}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{proj?.name || 'Unknown'}</div>
                              <div className="text-[11px] text-slate-500">{client?.name || 'Unassigned'}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {pkg?.title || 'Scope Package'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-teal-400">
                              {formatHours(wo.hours_snapshot)}
                            </td>
                            {canViewMoney && (
                              <td className="py-2.5 px-3 text-right font-mono">
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {wo.total_usd_snapshot != null ? formatUSD(wo.total_usd_snapshot) : '—'}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {wo.total_bdt_snapshot != null ? formatBDT(wo.total_bdt_snapshot) : '—'}
                                </div>
                              </td>
                            )}
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                wo.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : wo.status === 'delivered'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  wo.status === 'completed' ? 'bg-emerald-500' : wo.status === 'delivered' ? 'bg-blue-500' : 'bg-amber-500'
                                }`} />
                                <span>{wo.status.replace('_', ' ')}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                              {new Date(wo.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {onUpdateWorkOrderStatus && wo.status === 'delivered' && (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateWorkOrderStatus(wo.id, 'completed')}
                                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] transition shadow-xs"
                                    title="Mark work order as completed"
                                  >
                                    Complete
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectProject(wo.project_id);
                                    onClose();
                                  }}
                                  className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title="Go to project workspace"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
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
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: PIPELINE & METRICS OVERVIEW                                  */}
        {/* =================================================================== */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="text-[11px] uppercase font-bold text-emerald-800 dark:text-emerald-400">Total Active Projects</div>
                <div className="text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-200 mt-1">{activeProjectsCount}</div>
                <div className="text-[11px] text-slate-500 mt-1">Across all client companies</div>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="text-[11px] uppercase font-bold text-blue-800 dark:text-blue-400">Total Authorized Work Orders</div>
                <div className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-200 mt-1">{workOrders.length}</div>
                <div className="text-[11px] text-slate-500 mt-1">{deliveredWOCount} delivered or completed</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[11px] uppercase font-bold text-slate-600 dark:text-slate-400">Total Billable Hours</div>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{formatHours(totalWOHours)}</div>
                {canViewMoney && (
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    {formatUSD(totalWOUsd)} &bull; {formatBDT(totalWOBdt)}
                  </div>
                )}
              </div>
            </div>

            {/* Project Status Breakdown */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950/60 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Project Distribution Status
              </h4>
              <div className="space-y-2">
                {projects.map((p) => {
                  const client = clients.find((c) => c.id === p.client_id);
                  const pWos = workOrders.filter((w) => w.project_id === p.id);
                  const pHours = pWos.reduce((s, w) => s + w.hours_snapshot, 0);

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        onSelectProject(p.id);
                        onClose();
                      }}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 hover:border-emerald-400 dark:hover:border-emerald-600/80 transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{p.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            p.status === 'completed'
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Client: {client?.name || 'Unassigned'} &bull; {pWos.length} Work Orders
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono text-xs font-bold text-emerald-700 dark:text-teal-400">
                          {formatHours(pHours)}
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
