import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, icon: Icon, gradient, onClick, subtitle, alert }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className={`relative cursor-pointer rounded-2xl p-3 md:p-4 bg-gradient-to-br ${gradient} text-white shadow-lg overflow-hidden transition-shadow hover:shadow-xl`}
    >
      {alert > 0 && (
        <div className="absolute top-2 right-2 min-w-5 h-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold animate-pulse">
          {alert}
        </div>
      )}
      <Icon className="w-5 h-5 md:w-6 md:h-6 opacity-80 mb-2" />
      <p className="text-lg md:text-2xl font-bold leading-tight">{value}</p>
      <p className="text-[10px] md:text-xs opacity-80 mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] opacity-60 mt-0.5">{subtitle}</p>}
    </motion.div>
  );
}