import React from 'react';

export const BackgroundOrbs: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Top Left Indigo Glow */}
      <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-indigo-600/25 rounded-full blur-[130px] animate-pulse" style={{ animationDuration: '8s' }} />
      
      {/* Bottom Right Orange Glow */}
      <div className="absolute -bottom-[10%] -right-[10%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] bg-orange-600/20 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s' }} />
      
      {/* Center Right Purple Accent Glow */}
      <div className="absolute top-[25%] right-[5%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-purple-600/20 rounded-full blur-[110px]" />
      
      {/* Subtle Cyan Particle Accent */}
      <div className="absolute bottom-[20%] left-[10%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-cyan-600/15 rounded-full blur-[100px]" />
    </div>
  );
};
