import React from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatCard({ title, value, subtitle, icon: Icon, color = "blue", trend, trendUp }) {
  const colorVariants = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    red: "bg-red-50 text-red-600 border-red-100",
    yellow: "bg-amber-50 text-amber-600 border-amber-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
  };

  const iconBg = {
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    red: "bg-red-500",
    yellow: "bg-amber-500",
    purple: "bg-purple-500",
    teal: "bg-teal-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`p-5 border ${colorVariants[color]} hover:shadow-lg transition-all duration-300`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center mt-2 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
                <span>{trend}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={`p-3 rounded-xl ${iconBg[color]} shadow-lg`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}