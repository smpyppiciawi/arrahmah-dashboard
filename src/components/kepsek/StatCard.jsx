import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, icon: Icon, gradient, onClick, subtitle, alert }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative cursor-pointer rounded-3xl p-3 md:p-4 bg-gradient-to-br ${gradient} text-white shadow-xl shadow-black/10 overflow-hidden transition-all hover:shadow-2xl hover:shadow-black/20`}
    >
      {/* Decorative blurred circle for depth */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      {alert > 0 && (
        <div className="absolute top-2.5 right-2.5 min-w-5 h-5 px-1.5 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center text-[10px] font-bold text-white z-10">
          {alert}
        </div>
      )}
      <div className="relative">
        <Icon className="w-5 h-5 md:w-6 md:h-6 opacity-90 mb-2" />
        <p className="text-lg md:text-2xl font-bold leading-tight">{value}</p>
        <p className="text-[10px] md:text-xs opacity-80 mt-0.5">{label}</p>
        {subtitle && <p className="text-[9px] md:text-[10px] opacity-60 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </motion.div>
  );
}