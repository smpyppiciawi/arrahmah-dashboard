import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

const COLOR_MAP = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-500/40',
  teal: 'from-teal-500 to-teal-600 shadow-teal-500/40',
  indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/40',
  purple: 'from-purple-500 to-purple-600 shadow-purple-500/40',
  amber: 'from-amber-500 to-amber-600 shadow-amber-500/40',
  green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/40',
  rose: 'from-rose-500 to-rose-600 shadow-rose-500/40',
};

export default function FloatingAddButton({ onClick, label = "Tambah Data", color = "blue", icon = Plus }) {
  const Icon = icon;
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 px-5 h-14 rounded-2xl bg-gradient-to-r ${COLOR_MAP[color] || COLOR_MAP.blue} text-white shadow-xl font-medium text-sm transition-all`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </motion.button>
  );
}