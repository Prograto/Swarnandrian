import React from 'react';
import StudentNavbar from './StudentNavbar';

export default function StudentPortalLayout({ children, className = '' }) {
  return (
    <div className={`min-h-screen overflow-x-hidden bg-surface text-primary ${className}`}>
      <StudentNavbar />
      <main className="min-h-[calc(100vh-4rem)] pr-4 sm:pr-6 lg:pr-8">{children}</main>
    </div>
  );
}