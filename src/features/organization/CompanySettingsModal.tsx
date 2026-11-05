// src/features/organization/CompanySettingsModal.tsx
// Modal dialog for Super Admin and Admin to customize their Company Name & Branding

import React, { useState, useEffect } from 'react';
import { useOrganization } from './OrganizationContext';
import { useNotifications } from '../notifications/NotificationContext';
import { Modal } from '../../components/Modal';
import {
  Building2,
  Globe,
  Mail,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings, resetSettings } = useOrganization();
  const { notify } = useNotifications();

  const [formName, setFormName] = useState(settings.companyName);
  const [formTagline, setFormTagline] = useState(settings.tagline);
  const [formWebsite, setFormWebsite] = useState(settings.website);
  const [formEmail, setFormEmail] = useState(settings.contactEmail);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormName(settings.companyName);
      setFormTagline(settings.tagline);
      setFormWebsite(settings.website);
      setFormEmail(settings.contactEmail);
      setIsSaved(false);
    }
  }, [isOpen, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) return;

    updateSettings({
      companyName: cleanName,
      tagline: formTagline.trim(),
      website: formWebsite.trim(),
      contactEmail: formEmail.trim(),
    });

    setIsSaved(true);

    notify({
      title: `🏢 Company Branding Updated`,
      body: `Platform company name set to "${cleanName}". All header branding, estimates, and PDF exports updated.`,
      category: 'system',
    });

    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleReset = () => {
    resetSettings();
    setFormName('Rahman Design');
    setFormTagline('Engineering & Creative Client Delivery');
    setFormWebsite('https://rahmandesign.com');
    setFormEmail('contact@rahmandesign.com');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Company & Branding Setup"
      subtitle="Configure your agency or company name across the Work Management Platform"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Info Banner */}
        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-slate-700 dark:text-slate-300 space-y-1">
          <div className="font-semibold text-emerald-800 dark:text-teal-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>White-Label Organization Identity</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Accelvia is the underlying WMS platform engine. Enter your actual company name below so all client-facing headers, estimates, work orders, and PDF exports feature your own brand.
          </p>
        </div>

        {/* Company Name Field */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
            Company / Organization Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Rahman Design, Acme Agency, Nexus Solutions"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
            />
            <Building2 className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Tagline / Business Subtitle */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Business Tagline / Subtitle <span className="text-slate-500 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={formTagline}
            onChange={(e) => setFormTagline(e.target.value)}
            placeholder="e.g. Design, Engineering & Client Delivery"
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
          />
        </div>

        {/* Website & Contact Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Official Website <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formWebsite}
                onChange={(e) => setFormWebsite(e.target.value)}
                placeholder="https://yourcompany.com"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
              />
              <Globe className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Contact Email <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="contact@yourcompany.com"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
              />
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Branding Preview</span>
            <span className="text-teal-600 dark:text-teal-400 font-mono text-[10px]">Real-Time</span>
          </div>

          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 dark:bg-teal-500 flex items-center justify-center font-bold text-white dark:text-slate-950 text-xs shadow-xs">
              {(formName.trim() || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-xs flex items-center gap-1.5">
                <span>{formName.trim() || 'Your Company Name'}</span>
                <span className="text-[10px] text-emerald-600 dark:text-teal-400 font-mono bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1 rounded font-normal">
                  WMS
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                {formTagline.trim() || 'Powered by Accelvia Work Management Platform'}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
              <span>Save Company Profile</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
