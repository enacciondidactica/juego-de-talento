import React from 'react';

export const BackgroundOrbs: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Top Left BancoSol Purple Glow #60309B */}
      <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-[#60309B]/25 rounded-full blur-[130px] animate-pulse" style={{ animationDuration: '8s' }} />
      
      {/* Bottom Right BancoSol Orange Accent Glow #FF7D00 */}
      <div className="absolute -bottom-[10%] -right-[10%] w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] bg-[#FF7D00]/15 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s' }} />
      
      {/* Center Deep Purple Ambient Glow */}
      <div className="absolute top-[35%] right-[10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-[#401C68]/30 rounded-full blur-[120px]" />
    </div>
  );
};
