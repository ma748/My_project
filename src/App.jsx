import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { RoleSelection } from './pages/RoleSelection';
import { LoginModule } from './pages/LoginModule';
import PrincipalDashboard from './pages/PrincipalDashboard';
import HodDashboard from './pages/hod/Dashboard';
import HodStudents from './pages/hod/Students';
import HodRequests from './pages/hod/Requests';
import OfficeDashboard from './pages/office/Dashboard';
import AdmissionPortal from './pages/admission/AdmissionPortal';
import StudentDashboard from './pages/student/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import StudentManagement from './pages/office/StudentManagement';
import LateralEntryManagement from './pages/office/LateralEntryManagement';
import AdmissionsSection from './pages/office/AdmissionsSection';
import AdmissionVerification from './pages/office/AdmissionVerification';
import FaceRecognition from './pages/office/FaceRecognition';
import FeeManagement from './pages/office/FeeManagement';
import CategoryCount from './pages/office/CategoryCount';
import Reports from './pages/office/Reports';
import Notifications from './pages/office/Notifications';
import Settings from './pages/office/Settings';
import StudentEditRequests from './pages/office/StudentEditRequests';
import FeeStructure from './pages/FeeStructure';
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  const location = useLocation();
  const hasLocalThemeControl = location.pathname.startsWith('/dashboard/office') || location.pathname.startsWith('/dashboard/principal');

  return (
    <>
      {!hasLocalThemeControl && <ThemeToggle floating />}
      <Routes>
        <Route path="/" element={<RoleSelection />} />
        <Route path="/login/:role" element={<LoginModule />} />
        <Route path="/admission" element={<AdmissionPortal />} />
        
        {/* Principal Dashboard Route */}
        <Route path="/dashboard/principal" element={
          <ProtectedRoute allowedRoles={['Principal', 'principal']}>
            <PrincipalDashboard />
          </ProtectedRoute>
        } />
        
        {/* Office Dashboard Routes */}
        <Route path="/dashboard/office" element={
          <ProtectedRoute allowedRoles={['Staff', 'Office']}>
            <OfficeDashboard />
          </ProtectedRoute>
        }>
          <Route path="students" element={<StudentManagement />} />
          <Route path="lateral-entry" element={<LateralEntryManagement />} />
          <Route path="admissions" element={<AdmissionsSection />} />
          <Route path="admissions/new" element={<AdmissionVerification />} />
          <Route path="admissions/lateral-entry" element={<LateralEntryManagement />} />
          <Route path="facerec" element={<FaceRecognition />} />
          <Route path="fees" element={<FeeManagement />} />
          <Route path="fee-structure" element={<FeeStructure editable />} />
          <Route path="category-count" element={<CategoryCount />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="student-edit-requests" element={<StudentEditRequests />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        <Route path="/dashboard/student" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />
        
        {/* HOD Dashboard Routes */}
        <Route path="/dashboard/hod" element={
          <ProtectedRoute allowedRoles={['HOD', 'hod']}>
            <HodDashboard />
          </ProtectedRoute>
        }>
          <Route path="students" element={<HodStudents />} />
          <Route path="requests" element={<HodRequests />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
