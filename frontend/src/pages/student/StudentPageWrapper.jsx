import React from 'react';
import StudentPortalLayout from '../../components/student/StudentPortalLayout';

export default function StudentPageWrapper({ children }) {
  return <StudentPortalLayout>{children}</StudentPortalLayout>;
}
