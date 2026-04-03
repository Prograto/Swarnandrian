import React from 'react';
import StudentNavbar from './StudentNavbar';

export default function StudentPortalLayout({ children, className = '' }) {
  return (
    <div className={`min-h-screen bg-surface text-primary ${className}`}>
      <StudentNavbar />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
    </div>
  );
}