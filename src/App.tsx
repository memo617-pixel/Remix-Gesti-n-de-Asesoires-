/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ReactNode } from 'react';
import { ClipboardList, CheckSquare, GraduationCap, ArrowLeft, LayoutDashboard, UserCheck, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VisitaInforme from './components/VisitaInforme';

import ChecklistTanques from './components/ChecklistTanques';

// Custom Screen IDs
type ScreenId = 'homeScreen' | 'visitaScreen' | 'checklistScreen' | 'capacitacionScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('homeScreen');

  const openScreen = (screenId: ScreenId) => {
    setCurrentScreen(screenId);
  };

  const renderHeader = () => (
    <header className="flex flex-col px-6 py-10 bg-[#fdfcfb] sticky top-0 z-20 border-b border-gray-100 gap-6 shadow-sm">
      <div className="flex justify-between items-start w-full">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#63513d]/60 font-black mb-2">Advisor Platform</span>
          <h1 className="text-4xl font-black text-[#63513d] leading-[0.85] tracking-tighter">
            Professional<br />Agricultural<br />Advisor
          </h1>
        </div>
        <div className="w-36 h-36 flex items-center justify-end">
          <img
            src="/Nestle-Logo.png"
            alt="Nestlé Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML =
                '<span class="text-[#63513d] font-black text-xl tracking-tighter">Nestlé</span>';
            }}
          />
        </div>
      </div>
    </header>
  );

  const renderHomeScreen = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-5 p-6 pb-20"
    >
      <div className="grid grid-cols-1 gap-4">
        <MenuButton 
          icon={<ClipboardList className="w-7 h-7" />} 
          label={`Informe de Visitas
a Finca`} 
          description="0466.VSC.FOR.024"
          onClick={() => openScreen('visitaScreen')} 
          color="from-blue-600 to-blue-400"
          iconColor="text-blue-600"
        />
        <MenuButton 
          icon={<CheckSquare className="w-7 h-7" />} 
          label="Auditoria a Tanques" 
          description="0466.VSC.FOR.023"
          onClick={() => openScreen('checklistScreen')} 
          color="from-emerald-600 to-emerald-400"
          iconColor="text-emerald-600"
        />
        <MenuButton 
          icon={<GraduationCap className="w-7 h-7" />} 
          label="Soporte de Capacitaciones" 
          description="0466.VSC.FOR.059"
          onClick={() => openScreen('capacitacionScreen')} 
          color="from-amber-600 to-amber-400"
          iconColor="text-amber-600"
        />
      </div>

      <div className="mt-8 -mx-6 overflow-hidden rounded-3xl border-2 border-[#63513d]/10 bg-white/50">
        <img
          src="/farm-management-1.png"
          alt="Banner Gestión Asesores (Asegúrate de subir la imagen a /public/farm-management-1.png en GitHub)"
          className="w-full h-auto shadow-md"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    </motion.div>
  );

  const renderDetailScreen = (title: string) => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8 flex flex-col items-center justify-center min-h-[70vh] text-center"
    >
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
        <LayoutDashboard className="w-10 h-10 text-gray-300" />
      </div>
      <h2 className="text-2xl font-black text-[#63513d] mb-2 tracking-tight">{title}</h2>
      <p className="text-gray-400 text-sm mb-10 max-w-[200px]">Esta funcionalidad estará disponible en la próxima actualización.</p>
      
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ y: 2 }}
        onClick={() => openScreen('homeScreen')}
        className="px-10 py-4 bg-[#63513d] text-white rounded-2xl shadow-[0_4px_0_0_#4a2c0b] border-b-4 border-[#4a2c0b] font-bold flex items-center gap-3 transition-all active:border-b-0 active:translate-y-1"
      >
        <ArrowLeft className="w-5 h-5 drop-shadow-sm" />
        Volver al Panel
      </motion.button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#e8e4e0] flex items-center justify-center p-0 sm:p-4">
      {/* Thick Border Container */}
      <div className="w-full min-h-screen bg-white shadow-2xl overflow-hidden border-[8px] sm:border-[12px] border-[#e8e4e0] relative flex flex-col sm:rounded-[3rem]">
        {currentScreen === 'homeScreen' && renderHeader()}
        
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {currentScreen === 'homeScreen' && renderHomeScreen()}
            {currentScreen === 'visitaScreen' && <VisitaInforme onBack={() => openScreen('homeScreen')} />}
            {currentScreen === 'checklistScreen' && <ChecklistTanques onBack={() => openScreen('homeScreen')} />}
            {currentScreen === 'capacitacionScreen' && renderDetailScreen('Soporte de Capacitaciones')}
          </AnimatePresence>
        </main>

        {/* Bottom Navigation Bar (Modern Touch) */}
        <div className="h-20 bg-[#f0edea] backdrop-blur-md border-t border-gray-200 flex items-center justify-center px-6 sticky bottom-0">
          <button onClick={() => openScreen('homeScreen')} className={`p-3 rounded-2xl transition-all ${currentScreen === 'homeScreen' ? 'bg-[#63513d] text-white shadow-lg shadow-[#63513d]/30' : 'text-gray-400'}`}>
            <LayoutDashboard className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface MenuButtonProps {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  color: string;
  iconColor: string;
}

function MenuButton({ icon, label, description, onClick, color, iconColor }: MenuButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ y: 2 }}
      onClick={onClick}
      className="group relative flex flex-row items-center p-5 bg-white rounded-[2rem] border-2 border-gray-200 border-b-4 shadow-[0_4px_0_0_#d1d5db] w-full transition-all hover:shadow-[0_6px_0_0_#9ca3af] hover:border-gray-300 active:shadow-none active:border-b-0 active:translate-y-[4px] text-left overflow-hidden"
    >
      <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-inner ${iconColor} mr-5 shrink-0 group-hover:scale-110 transition-transform drop-shadow-md`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-extrabold text-[#63513d] leading-tight mb-0.5 whitespace-pre-line">
          {label}
        </span>
        <span className="text-xs text-gray-400 font-medium">
          {description}
        </span>
      </div>
      <div className="ml-auto">
        <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#63513d] group-hover:text-white transition-colors`}>
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </div>
      </div>
    </motion.button>
  );
}
