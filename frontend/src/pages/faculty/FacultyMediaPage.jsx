import React from 'react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { FACULTY_NAV } from './FacultyDashboard';
import MediaSection from '../media/MediaSection';

export default function FacultyMediaPage() {
  return (
    <DashboardLayout navItems={FACULTY_NAV} role="faculty">
      <MediaSection />
    </DashboardLayout>
  );
}
