import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, TrendingDown, Users, BookOpen, Wallet, MessageCircle, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AlertPanel({ alerts, onDismiss, onViewDetail, onWhatsApp }) {
  const getAlertIcon = (type) => {
    const icons = {
      pelanggaran: AlertTriangle,
      nilai: TrendingDown,
      absensi: Users,
      keuangan: Wallet,
      materi: BookOpen,
      default: Bell
    };
    return icons[type] || icons.default;
  };

  const getAlertColor = (severity) => {
    const colors = {
      critical: 'bg-red-500 border-red-600',
      warning: 'bg-amber-500 border-amber-600',
      info: 'bg-blue-500 border-blue-600'
    };
    return colors[severity] || colors.info;
  };

  const getBadgeColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-700',
      warning: 'bg-amber-100 text-amber-700',
      info: 'bg-blue-100 text-blue-700'
    };
    return colors[severity] || colors.info;
  };

  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-emerald-50">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-emerald-700 font-medium">Tidak ada peringatan</p>
          <p className="text-emerald-600 text-sm">Semua data dalam kondisi normal</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2 bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-t-xl">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="w-5 h-5" />
          Pusat Notifikasi & Peringatan
          <Badge className="bg-white/20 text-white ml-auto">{alerts.length} Alert</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {alerts.map((alert, idx) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <motion.div
                key={alert.id || idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`flex items-start gap-3 p-4 border-b border-l-4 ${getAlertColor(alert.severity)} hover:bg-slate-50 transition-colors`}
              >
                <div className={`p-2 rounded-full ${getBadgeColor(alert.severity)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getBadgeColor(alert.severity)}>{alert.category}</Badge>
                    <span className="text-xs text-slate-400">{alert.time}</span>
                  </div>
                  <p className="font-medium text-slate-800 text-sm">{alert.title}</p>
                  <p className="text-xs text-slate-500 truncate">{alert.message}</p>
                  {alert.person && (
                    <p className="text-xs text-slate-600 mt-1">
                      👤 {alert.person} {alert.kelas && `- ${alert.kelas}`}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {alert.phone && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600" onClick={() => onWhatsApp(alert.phone, alert.message)}>
                      <MessageCircle className="w-3 h-3" />
                    </Button>
                  )}
                  {alert.detailLink && (
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onViewDetail(alert)}>
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400" onClick={() => onDismiss(alert.id)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}