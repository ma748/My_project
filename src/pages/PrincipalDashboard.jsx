import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Home, UserPlus, Users, Settings, LogOut, Menu, X, Bell } from 'lucide-react';
import HomeView from './dashboard/HomeView';
import AddMembersView from './dashboard/AddMembersView';
import ViewStudentsView from './dashboard/ViewStudentsView';
import ManageUsersView from './dashboard/ManageUsersView';
import { ThemeToggle } from '../components/ThemeToggle';
import { clearSessionStorage } from '../utils/authStorage';
import './PrincipalDashboard.css';

export default function PrincipalDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'home';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (id) => {
    setActiveTab(id);
    setSearchParams({ tab: id });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login/principal');
    }
  }, [navigate]);

  const handleLogout = () => {
    clearSessionStorage();
    navigate('/login/principal');
  };

  const navItems = [
    { id: 'home', label: 'Home Page', icon: <Home size={20} /> },
    { id: 'add-members', label: 'Add Login Members', icon: <UserPlus size={20} /> },
    { id: 'view-students', label: 'View Student Details', icon: <Users size={20} /> },
    { id: 'manage-users', label: 'Manage Login Module', icon: <Settings size={20} /> }
  ];

  return (
    <div className="admin-layout animate-fade-in">
      
      {/* Sidebar */}
      <aside className={`admin-sidebar glass-panel ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <Building2Icon />
          {isSidebarOpen && <h2>GECM Portal</h2>}
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button 
              key={item.id} 
              className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleTabChange(item.id)}
            >
              {item.icon}
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-btn logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Top Header */}
        <header className="admin-topbar glass-panel">
          <button className="toggle-sidebar-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="topbar-right">
            <ThemeToggle />
            <button className="icon-btn"><Bell size={20} /></button>
            <div className="user-profile">
              <div className="avatar">P</div>
              <span>Principal Admin</span>
            </div>
          </div>
        </header>

        {/* Dynamic Views */}
        <main className="admin-content-view">
          {activeTab === 'home' && <HomeView />}
          {activeTab === 'add-members' && <AddMembersView />}
          {activeTab === 'view-students' && <ViewStudentsView />}
          {activeTab === 'manage-users' && <ManageUsersView />}
        </main>
      </div>

    </div>
  );
}

function Building2Icon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  );
}
