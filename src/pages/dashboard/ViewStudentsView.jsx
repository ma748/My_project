import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Search, Filter, GraduationCap, Eye, Download, RotateCcw, X, Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import StudentDetailsModal from './StudentDetailsModal';

export default function ViewStudentsView() {
  const [searchParams] = useSearchParams();
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [admissionType, setAdmissionType] = useState('Regular');
  
  const defaultFilters = {
    year: searchParams.get('year') || 'All',
    branch: 'All',
    semester: 'All',
    section: 'All',
    gender: 'All',
    category: 'All',
    admissionQuota: 'All',
    feeStatus: 'All',
    studentStatus: 'All',
    income: 'All',
    snqQuota: 'All'
  };

  const [filters, setFilters] = useState(defaultFilters);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const removeSingleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: 'All' }));
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilters({
      year: 'All',
      branch: 'All',
      semester: 'All',
      section: 'All',
      gender: 'All',
      category: 'All',
      admissionQuota: 'All',
      feeStatus: 'All',
      studentStatus: 'All',
      income: 'All',
      snqQuota: 'All'
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim() !== '') count++;
    Object.values(filters).forEach(val => {
      if (val !== 'All') count++;
    });
    return count;
  }, [searchTerm, filters]);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/students`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: searchTerm, ...filters, admissionType }
        });
        setStudents(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    const timeout = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(timeout);
    
  }, [searchTerm, filters, admissionType, token]);

  const exportToCSV = () => {
    if (students.length === 0) return;
    
    const headers = [
      'Student ID', 
      'Full Name', 
      'Branch', 
      'Study Year', 
      'Semester',
      'Section',
      'Admission Quota',
      'Category',
      'Gender',
      'Student Status', 
      'Fee Status',
      'Email', 
      'Phone'
    ];
    
    const csvRows = students.map(student => {
      const sId = student.studentId || student.id || (student._id && student._id.slice(-6).toUpperCase());
      const sName = student.personalDetails?.studentName || student.name || 'N/A';
      const sCourse = student.academicDetails?.branch || student.course || student.branch || 'N/A';
      const sYear = student.currentStudyYear || student.academicDetails?.year || student.year || 1;
      const sSem = student.semester || student.academicDetails?.semester || 'N/A';
      const sSec = student.section || 'A';
      const sQuota = student.admissionQuota || 'CET';
      const sCat = student.personalDetails?.category || 'General';
      const sGender = student.personalDetails?.gender || 'N/A';
      const sStatus = student.studentStatus || student.admissionStatus?.state || student.status || 'Active';
      const feeCleared = student.feeStatus?.currentYear === 'Completed' || student.feePaid || student.academicDetails?.feeCollected > 0;
      const sFee = feeCleared ? 'Cleared' : 'Pending';
      const email = student.contactDetails?.email || 'N/A';
      const phone = student.contactDetails?.studentContact || 'N/A';
      
      return [sId, sName, sCourse, `Year ${sYear}`, `Sem ${sSem}`, sSec, sQuota, sCat, sGender, sStatus, sFee, email, phone]
        .map(val => `"${String(val).replace(/"/g, '""')}"`)
        .join(',');
    });
    
    const csvContent = [headers.map(h => `"${h}"`).join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `student_records_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="view-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Student Details & Records</h2>
            <span style={{ 
              padding: '0.2rem 0.65rem', 
              borderRadius: '20px', 
              fontSize: '0.75rem', 
              fontWeight: '600', 
              background: 'rgba(139, 92, 246, 0.15)', 
              color: 'var(--color-principal, #8b5cf6)',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              Office Staff View
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Multi-field filtering and detailed record management for college administration.
          </p>
          <div role="radiogroup" aria-label="Admission type" style={{ display: 'flex', gap: '0.6rem', marginTop: '0.9rem' }}>
            {[{ value: 'Regular', label: 'Regular' }, { value: 'Lateral Entry', label: 'Lateral' }].map(option => (
              <label
                key={option.value}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '8px',
                  border: `1px solid ${admissionType === option.value ? 'rgba(59, 130, 246, 0.5)' : 'var(--glass-border)'}`,
                  background: admissionType === option.value ? 'rgba(59, 130, 246, 0.14)' : 'var(--soft-bg, rgba(0,0,0,0.2))',
                  color: admissionType === option.value ? 'var(--text-main)' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="admissionType"
                  value={option.value}
                  checked={admissionType === option.value}
                  onChange={() => setAdmissionType(option.value)}
                  style={{ accentColor: 'var(--accent-primary)', margin: 0 }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {activeFilterCount > 0 && (
            <button 
              onClick={clearAllFilters}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.4rem',
                padding: '0.65rem 1.1rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444', 
                border: '1px solid rgba(239, 68, 68, 0.25)', 
                borderRadius: '10px', 
                fontSize: '0.85rem',
                fontWeight: '500', 
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={15} /> Clear All ({activeFilterCount})
            </button>
          )}

          <button 
            onClick={exportToCSV}
            disabled={students.length === 0}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.65rem 1.25rem', 
              background: 'var(--color-primary, #3b82f6)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '10px', 
              fontWeight: '500', 
              fontSize: '0.85rem',
              cursor: students.length === 0 ? 'not-allowed' : 'pointer', 
              opacity: students.length === 0 ? 0.5 : 1, 
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
            }}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Filter & Search Control Panel */}
      <div className="glass-panel" style={{ 
        padding: '1.25rem', 
        borderRadius: '16px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem',
        border: '1px solid var(--glass-border)'
      }}>
        
        {/* Top Row: Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search by Student ID, USN, Name, CET No, Aadhaar, Email, or Phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.8rem 2.8rem 0.8rem 2.8rem', 
              background: 'var(--soft-bg, rgba(0,0,0,0.25))', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '10px', 
              color: 'var(--text-main, white)', 
              fontSize: '0.9rem',
              outline: 'none' 
            }} 
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={{ 
                position: 'absolute', 
                right: '1rem', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-secondary)',
                cursor: 'pointer' 
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Selection Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', 
          gap: '0.85rem',
          width: '100%'
        }}>
          
          {/* Branch Filter */}
          {userRole !== 'HOD' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch / Dept</label>
              <select name="branch" value={filters.branch} onChange={handleFilterChange} style={selectStyle}>
                <option value="All" style={optionStyle}>All Branches</option>
                <option value="CSE" style={optionStyle}>CSE (Computer Science)</option>
                <option value="ECE" style={optionStyle}>ECE (Electronics & Comm)</option>
                <option value="ME" style={optionStyle}>ME (Mechanical)</option>
                <option value="Civil" style={optionStyle}>Civil Engineering</option>
                <option value="EEE" style={optionStyle}>EEE (Electrical & Electronics)</option>
                <option value="AI & DS" style={optionStyle}>AI & DS (AI & Data Science)</option>
                <option value="ISE" style={optionStyle}>ISE (Information Science)</option>
              </select>
            </div>
          )}

          {/* Academic Year */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Study Year</label>
            <select name="year" value={filters.year} onChange={handleFilterChange} style={selectStyle}>
              <option value="All" style={optionStyle}>All Years</option>
              <option value="1" style={optionStyle}>1st Year</option>
              <option value="2" style={optionStyle}>2nd Year</option>
              <option value="3" style={optionStyle}>3rd Year</option>
              <option value="4" style={optionStyle}>4th Year</option>
            </select>
          </div>

          {/* Semester */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Semester</label>
            <select name="semester" value={filters.semester} onChange={handleFilterChange} style={selectStyle}>
              <option value="All" style={optionStyle}>All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s} style={optionStyle}>Semester {s}</option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section</label>
            <select name="section" value={filters.section} onChange={handleFilterChange} style={selectStyle}>
              <option value="All" style={optionStyle}>All Sections</option>
              <option value="A" style={optionStyle}>Section A</option>
              <option value="B" style={optionStyle}>Section B</option>
              <option value="C" style={optionStyle}>Section C</option>
              <option value="D" style={optionStyle}>Section D</option>
            </select>
          </div>

          {/* Admission Quota */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quota</label>
            <select name="admissionQuota" value={filters.admissionQuota} onChange={handleFilterChange} style={selectStyle}>
              <option value="All" style={optionStyle}>All Quotas</option>
              <option value="CET" style={optionStyle}>CET Quota</option>
              <option value="KEA-Regular" style={optionStyle}>KEA-Regular</option>
              <option value="Principal" style={optionStyle}>Principal</option>
              <option value="SNQ" style={optionStyle}>SNQ Quota</option>
              <option value="KEA-SNQ" style={optionStyle}>KEA-SNQ</option>
              <option value="Other" style={optionStyle}>Other</option>
            </select>
          </div>

          {/* Gender */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</label>
            <select name="gender" value={filters.gender} onChange={handleFilterChange} style={selectStyle}>
              <option value="All" style={optionStyle}>All Genders</option>
              <option value="Male" style={optionStyle}>Male</option>
              <option value="Female" style={optionStyle}>Female</option>
              <option value="Other" style={optionStyle}>Other</option>
            </select>
          </div>

          {/* Category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
            <select name="category" value={filters.category} onChange={handleFilterChange} style={selectStyle}>
              <option value="All" style={optionStyle}>All Categories</option>
              <option value="General" style={optionStyle}>General (GM)</option>
              <option value="OBC" style={optionStyle}>OBC</option>
              <option value="SC/ST" style={optionStyle}>SC / ST</option>
              <option value="CAT-1" style={optionStyle}>CAT-1</option>
              <option value="2A" style={optionStyle}>2A</option>
              <option value="2B" style={optionStyle}>2B</option>
              <option value="3A" style={optionStyle}>3A</option>
              <option value="3B" style={optionStyle}>3B</option>
            </select>
          </div>

          {/* Fee Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fee Status</label>
            <select name="feeStatus" value={filters.feeStatus} onChange={handleFilterChange} style={selectStyle}>
              <option value="All" style={optionStyle}>All Fee Status</option>
              <option value="Paid" style={optionStyle}>Cleared (Paid)</option>
              <option value="Unpaid" style={optionStyle}>Pending (Unpaid)</option>
            </select>
          </div>

          {/* Student Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Status</label>
            <select name="studentStatus" value={filters.studentStatus} onChange={handleFilterChange} style={selectStyle}>
              <option value="All" style={optionStyle}>All Statuses</option>
              <option value="Active" style={optionStyle}>Active</option>
              <option value="Applicant" style={optionStyle}>Applicant</option>
              <option value="On Hold" style={optionStyle}>On Hold</option>
              <option value="Graduated" style={optionStyle}>Graduated</option>
              <option value="Rejected" style={optionStyle}>Rejected</option>
            </select>
          </div>

          {/* Income Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Income</label>
            <select name="income" value={filters.income} onChange={handleFilterChange} style={selectStyle}>
              <option value="All" style={optionStyle}>All Incomes</option>
              <option value="< 1L" style={optionStyle}>&lt; 1 Lakh</option>
              <option value="1L-5L" style={optionStyle}>1 - 5 Lakhs</option>
              <option value="> 5L" style={optionStyle}>&gt; 5 Lakhs</option>
            </select>
          </div>

          {/* SNQ Quota */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SNQ Quota</label>
            <select name="snqQuota" value={filters.snqQuota} onChange={handleFilterChange} style={selectStyle}>
              <option value="All" style={optionStyle}>SNQ Quota (All)</option>
              <option value="Yes" style={optionStyle}>Yes</option>
              <option value="No" style={optionStyle}>No</option>
            </select>
          </div>

        </div>

        {/* Active Filter Chips Bar */}
        {activeFilterCount > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            flexWrap: 'wrap', 
            paddingTop: '0.75rem', 
            borderTop: '1px dashed var(--glass-border)' 
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Active Filters:</span>
            
            {searchTerm && (
              <FilterChip label={`Search: "${searchTerm}"`} onRemove={() => setSearchTerm('')} />
            )}
            
            {Object.entries(filters).map(([key, val]) => {
              if (val === 'All') return null;
              const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              return (
                <FilterChip 
                  key={key} 
                  label={`${formattedKey}: ${val}`} 
                  onRemove={() => removeSingleFilter(key)} 
                />
              );
            })}
          </div>
        )}

      </div>

      {/* Results Summary Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.25rem' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={16} />
          <span>Showing <strong style={{ color: 'var(--text-main, white)' }}>{students.length}</strong> student records</span>
        </div>
      </div>

      {/* Student Table */}
      <div className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
            <thead style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)' }}>
              <tr>
                <th style={thStyle}>Student ID / USN</th>
                <th style={thStyle}>Full Name</th>
                <th style={thStyle}>Branch & Year</th>
                <th style={thStyle}>Quota / Cat</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Fee Status</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No student records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                students.map(student => {
                  const sId = student.studentId || student.id || (student._id && student._id.slice(-6).toUpperCase());
                  const sName = student.personalDetails ? student.personalDetails.studentName : student.name;
                  const sCourse = student.academicDetails ? student.academicDetails.branch : student.course;
                  const sYear = student.currentStudyYear || student.academicDetails?.year || student.year || '1';
                  const sSem = student.semester || student.academicDetails?.semester;
                  const sStatus = student.studentStatus || student.status || 'Active';
                  const sFeePaid = student.feeStatus?.currentYear === 'Completed' || student.feePaid || (student.academicDetails?.feeCollected > 0);
                  const sQuota = student.admissionQuota || 'CET';
                  const sCat = student.personalDetails?.category || 'General';

                  return (
                    <tr key={student._id || student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}>
                      
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--color-student, #6366f1)', fontSize: '0.9rem' }}>
                        {sId}
                      </td>
                      
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            background: 'rgba(139, 92, 246, 0.15)', 
                            color: '#8b5cf6',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <GraduationCap size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: '500', color: 'var(--text-main, white)', fontSize: '0.95rem' }}>{sName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{student.contactDetails?.email || student.email || ''}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main, white)', fontWeight: '500' }}>{sCourse}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Year {sYear} {sSem ? `(Sem ${sSem})` : ''} {student.section ? `• Sec ${student.section}` : ''}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-main, white)' }}>{sQuota}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cat: {sCat}</div>
                      </td>
                      
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '20px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          background: sStatus === 'Active' ? 'rgba(16, 185, 129, 0.15)' : sStatus === 'Applicant' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                          color: sStatus === 'Active' ? '#10b981' : sStatus === 'Applicant' ? '#3b82f6' : '#ef4444',
                          border: `1px solid ${sStatus === 'Active' ? 'rgba(16, 185, 129, 0.3)' : sStatus === 'Applicant' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}>
                          {sStatus}
                        </span>
                      </td>
                      
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '20px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          background: sFeePaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
                          color: sFeePaid ? '#10b981' : '#f59e0b',
                          border: `1px solid ${sFeePaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                        }}>
                          {sFeePaid ? 'Cleared' : 'Pending'}
                        </span>
                      </td>
                      
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                        <button 
                          onClick={() => setSelectedStudent(student)}
                          style={{ 
                            padding: '0.5rem', 
                            background: 'rgba(255,255,255,0.08)', 
                            border: '1px solid var(--glass-border)', 
                            borderRadius: '8px', 
                            color: 'var(--text-main, white)', 
                            cursor: 'pointer', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            transition: 'all 0.2s' 
                          }}
                          title="View Complete Profile & Details"
                        >
                          <Eye size={18} />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Student Details Modal */}
      {selectedStudent && (
        <StudentDetailsModal 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
          onStatusUpdated={() => {
            const fetchStudents = async () => {
              setLoading(true);
              try {
                const res = await axios.get(`/api/students`, {
                  headers: { Authorization: `Bearer ${token}` },
                  params: { search: searchTerm, ...filters }
                });
                setStudents(res.data);
                const updatedTarget = res.data.find(s => s._id === selectedStudent._id);
                if(updatedTarget) setSelectedStudent(updatedTarget);
              } catch (err) {
                console.error('Failed to refresh students:', err);
              } finally { setLoading(false); }
            };
            fetchStudents();
          }}
        />
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '0.35rem', 
      padding: '0.2rem 0.6rem', 
      background: 'rgba(139, 92, 246, 0.12)', 
      color: 'var(--text-main, white)', 
      border: '1px solid rgba(139, 92, 246, 0.25)', 
      borderRadius: '6px', 
      fontSize: '0.78rem' 
    }}>
      {label}
      <button 
        onClick={onRemove}
        style={{ 
          background: 'transparent', 
          border: 'none', 
          color: 'var(--text-secondary)', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center',
          padding: 0
        }}
      >
        <X size={12} />
      </button>
    </span>
  );
}

const selectStyle = {
  padding: '0.55rem 0.75rem',
  background: 'var(--soft-bg, rgba(0,0,0,0.25))',
  border: '1px solid var(--glass-border)',
  borderRadius: '8px',
  color: 'var(--text-main, white)',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%'
};

const optionStyle = {
  background: '#0f172a',
  color: '#ffffff'
};

const thStyle = {
  padding: '1rem 1.5rem',
  fontWeight: '600',
  color: 'var(--text-secondary)',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};
