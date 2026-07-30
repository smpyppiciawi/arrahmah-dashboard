import React from 'react';
import { base44 } from '@/api/base44Client';
import { MessageCircle } from 'lucide-react';

export default function WaAssistantLink({ agentName, className = '' }) {
  const url = base44.agents.getWhatsAppConnectURL(agentName);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`block bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-4 text-white shadow-sm hover:shadow-md transition-all ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">Asisten WhatsApp</p>
          <p className="text-white/80 text-xs mt-0.5">Tanya data sekolah via chat</p>
        </div>
      </div>
    </a>
  );
}