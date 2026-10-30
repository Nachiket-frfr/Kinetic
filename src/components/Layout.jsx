import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';

export default function Layout({ children }) {
  useEffect(() => {
    // Single schematic accent color (Hevy Electric Blue #158FF2)
    document.documentElement.setAttribute('data-theme', 'hevy');
    localStorage.removeItem('replog-theme');
  }, []);

  return (
    <div className="os-layout" data-theme="hevy">
      {/* Precision Top OS Bar */}
      <header className="os-topbar">
        <div className="os-topbar-inner">
          <div className="os-logo">
            <span className="os-dot" />
            <span className="os-brand-text">
              KINETIC <span className="os-sub-text">FITNESS OS</span>
            </span>
          </div>

          <div className="os-top-controls">
            <div className="os-top-status">
              <span className="status-dot" />
              <span className="status-label">ACTIVE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="os-main">
        {children}
      </main>

      <Navbar />
    </div>
  );
}
