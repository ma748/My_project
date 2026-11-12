import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, FileSpreadsheet, CheckSquare, Square, RotateCcw, Filter, Check, Bookmark, Sparkles, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const EXPORTABLE_FIELDS = [
  // 1. Identity & Profile
  { key: 'studentId', label: 'USN / Student ID', category: 'Identity', get: (s) => s.studentId || '' },
  { key: 'admissionNumber', label: 'Admission Number', category: 'Identity', get: (s) => s.admissionNumber || '' },
  { key: 'studentName', label: 'Student Full Name', category: 'Identity', get: (s) => s.personalDetails?.studentName || s.name || '' },
  { key: 'gender', label: 'Gender', category: 'Identity', get: (s) => s.personalDetails?.gender || '' },
  { key: 'dob', label: 'Date of Birth', category: 'Identity', get: (s) => s.personalDetails?.dob ? new Date(s.personalDetails.dob).toISOString().split('T')[0] : '' },
  { key: 'bloodGroup', label: 'Blood Group', category: 'Identity', get: (s) => s.personalDetails?.bloodGroup || '' },
  { key: 'religion', label: 'Religion', category: 'Identity', get: (s) => s.personalDetails?.religion || '' },
  { key: 'category', label: 'Category', category: 'Identity', get: (s) => s.personalDetails?.category || '' },
  { key: 'subCaste', label: 'Sub-Caste', category: 'Identity', get: (s) => s.personalDetails?.subCaste || '' },
  { key: 'aadhaarNumber', label: 'Aadhaar Number', category: 'Identity', get: (s) => s.personalDetails?.aadhaarNumber || '' },
  { key: 'physicallyChallenged', label: 'Physically Challenged', category: 'Identity', get: (s) => s.personalDetails?.physicallyChallenged || 'No' },

  // 2. Academics & Admissions
  { key: 'branch', label: 'Branch / Department', category: 'Academics', get: (s) => s.academicDetails?.branch || s.branch || '' },
  { key: 'currentStudyYear', label: 'Study Year', category: 'Academics', get: (s) => s.currentStudyYear || s.academicDetails?.year || 1 },
  { key: 'semester', label: 'Semester', category: 'Academics', get: (s) => s.semester || 1 },
  { key: 'section', label: 'Section', category: 'Academics', get: (s) => s.section || 'A' },
  { key: 'admissionBatch', label: 'Admission Batch', category: 'Academics', get: (s) => s.admissionBatch || '' },
  { key: 'currentAcademicYear', label: 'Academic Year', category: 'Academics', get: (s) => s.currentAcademicYear || '' },
  { key: 'admissionType', label: 'Admission Type (Regular / Lateral)', category: 'Academics', get: (s) => s.admissionType || 'Regular' },
  { key: 'admissionQuota', label: 'Admission Quota (CET / SNQ / etc.)', category: 'Academics', get: (s) => s.admissionQuota || 'CET' },
  { key: 'cetNumber', label: 'CET / DCET Number', category: 'Academics', get: (s) => s.personalDetails?.cetNumber || '' },
  { key: 'cetRank', label: 'CET / DCET Rank', category: 'Academics', get: (s) => s.personalDetails?.cetRank || 0 },
  { key: 'qualifyingExam', label: 'Qualifying Examination (PUC / Diploma)', category: 'Academics', get: (s) => s.academicDetails?.qualifyingExam || '' },
  { key: 'board', label: 'Qualifying Board', category: 'Academics', get: (s) => s.academicDetails?.board || '' },
  { key: 'percentage', label: 'Qualifying Percentage (%)', category: 'Academics', get: (s) => s.academicDetails?.percentage || '' },
  { key: 'diplomaMarks', label: 'Diploma Marks (%)', category: 'Academics', get: (s) => s.academicDetails?.diplomaMarks || '' },

  // 3. Family & Income
  { key: 'fatherName', label: 'Father Name', category: 'Family', get: (s) => s.familyDetails?.fatherName || '' },
  { key: 'motherName', label: 'Mother Name', category: 'Family', get: (s) => s.familyDetails?.motherName || '' },
  { key: 'fatherOccupation', label: 'Father Occupation', category: 'Family', get: (s) => s.familyDetails?.fatherOccupation || '' },
  { key: 'motherOccupation', label: 'Mother Occupation', category: 'Family', get: (s) => s.familyDetails?.motherOccupation || '' },
  { key: 'parentContact', label: 'Parent Contact Number', category: 'Family', get: (s) => s.familyDetails?.parentContact || '' },
  { key: 'annualIncome', label: 'Family Annual Income (₹)', category: 'Family', get: (s) => s.familyDetails?.annualIncome ?? '' },

  // 4. Contact & Address
  { key: 'studentContact', label: 'Student Mobile Number', category: 'Contact', get: (s) => s.contactDetails?.studentContact || '' },
  { key: 'email', label: 'Student Email Address', category: 'Contact', get: (s) => s.contactDetails?.email || s.email || '' },
  { key: 'permanentAddress', label: 'Permanent Address', category: 'Contact', get: (s) => s.contactDetails?.permanentAddress || '' },
  { key: 'correspondenceAddress', label: 'Correspondence Address', category: 'Contact', get: (s) => s.contactDetails?.correspondenceAddress || '' },

  // 5. Hostel, District & Scholarships
  { key: 'stayingAtHostel', label: 'Staying at Hostel', category: 'Hostel & Schemes', get: (s) => s.contactDetails?.stayingAtHostel || 'No' },
  { key: 'stayingInsideDistrict', label: 'Staying Inside Hassan District', category: 'Hostel & Schemes', get: (s) => s.contactDetails?.stayingInsideDistrict || 'No' },
  { key: 'stayingOutsideDistrict', label: 'Staying Outside Hassan District', category: 'Hostel & Schemes', get: (s) => s.contactDetails?.stayingOutsideDistrict || 'No' },
  { key: 'nspReferenceNo', label: 'NSP Reference Number', category: 'Hostel & Schemes', get: (s) => s.contactDetails?.nspReferenceNo || '' },
  { key: 'nspOtrNo', label: 'NSP OTR Number', category: 'Hostel & Schemes', get: (s) => s.contactDetails?.nspOtrNo || '' },
  { key: 'sspOtrNo', label: 'SSP OTR Number', category: 'Hostel & Schemes', get: (s) => s.contactDetails?.sspOtrNo || '' },
  { key: 'ntfNumber', label: 'NTF Number', category: 'Hostel & Schemes', get: (s) => s.contactDetails?.ntfNumber || '' },

  // 6. Fees & Status
  { key: 'totalFee', label: 'Total College Fee (₹)', category: 'Fees & Status', get: (s) => s.feeDetails?.totalFee ?? 85000 },
  { key: 'paidFee', label: 'Paid Fee (₹)', category: 'Fees & Status', get: (s) => s.feeDetails?.paidFee ?? 0 },
  { key: 'pendingFee', label: 'Pending Due Fee (₹)', category: 'Fees & Status', get: (s) => s.feeDetails?.pendingFee ?? 0 },
  { key: 'feeStatus', label: 'Fee Payment Status', category: 'Fees & Status', get: (s) => s.feeStatus?.currentYear || (s.feeDetails?.pendingFee <= 0 ? 'Completed' : 'Pending') },
  { key: 'approvalStatus', label: 'Admission Approval Status', category: 'Fees & Status', get: (s) => s.approvalStatus || 'Approved' },
  { key: 'studentStatus', label: 'Student Enrollment Status', category: 'Fees & Status', get: (s) => s.studentStatus || 'Active' }
];

const PRESET_COLLECTIONS = {
  standard: {
    name: 'Standard Roster',
    icon: '📋',
    keys: ['studentId', 'admissionNumber', 'studentName', 'branch', 'currentStudyYear', 'category', 'studentContact', 'email']
  },
  academic: {
    name: 'Academic & Admissions',
    icon: '🎓',
    keys: ['studentId', 'admissionNumber', 'studentName', 'branch', 'currentStudyYear', 'semester', 'section', 'admissionBatch', 'admissionType', 'admissionQuota', 'qualifyingExam', 'percentage']
  },
  hostel_schemes: {
    name: 'Hostel & Schemes',
    icon: '🏠',
    keys: ['studentId', 'studentName', 'branch', 'currentStudyYear', 'studentContact', 'stayingAtHostel', 'stayingInsideDistrict', 'stayingOutsideDistrict', 'nspReferenceNo', 'nspOtrNo', 'sspOtrNo', 'ntfNumber']
  },
  financial: {
    name: 'Fees & Accounts',
    icon: '💳',
    keys: ['studentId', 'studentName', 'branch', 'parentContact', 'annualIncome', 'totalFee', 'paidFee', 'pendingFee', 'feeStatus']
  },
  all: {
    name: 'All Fields (Full Profile)',
    icon: '🗂️',
    keys: EXPORTABLE_FIELDS.map((f) => f.key)
  }
};

const STORAGE_KEYS = {
  FIELDS: 'gecm_student_export_fields_v1',
  FORMAT: 'gecm_student_export_format_v1',
  RECENT_FILTER: 'gecm_student_recent_filter_pattern_v1'
};

export default function ExportStudentsModal({
  isOpen,
  onClose,
  filteredStudents = [],
  allStudents = [],
  currentFilters = {},
  onApplyFilterPattern
}) {
  const [selectedKeys, setSelectedKeys] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FIELDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* Fallback */ }
    return PRESET_COLLECTIONS.standard.keys;
  });

  const [exportFormat, setExportFormat] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.FORMAT) || 'xlsx';
  });

  const [scope, setScope] = useState('filtered'); // 'filtered' | 'all'
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [exporting, setExporting] = useState(false);

  // Save recent filter pattern whenever modal opens or filters change
  useEffect(() => {
    if (Object.keys(currentFilters).length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.RECENT_FILTER, JSON.stringify(currentFilters));
      } catch { /* Ignore */ }
    }
  }, [currentFilters]);

  // Persist selected field keys
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(selectedKeys));
    } catch { /* Ignore */ }
  }, [selectedKeys]);

  // Persist format
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FORMAT, exportFormat);
    } catch { /* Ignore */ }
  }, [exportFormat]);

  const categories = useMemo(() => {
    const set = new Set(EXPORTABLE_FIELDS.map((f) => f.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredFields = useMemo(() => {
    return EXPORTABLE_FIELDS.filter((f) => {
      const matchCat = selectedCategory === 'All' || f.category === selectedCategory;
      const matchSearch = !fieldSearch || f.label.toLowerCase().includes(fieldSearch.toLowerCase()) || f.key.toLowerCase().includes(fieldSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, fieldSearch]);

  const toggleField = (key) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) {
          toast.error('At least one field must be selected for export.');
          return prev;
        }
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const removeField = (key) => {
    if (selectedKeys.length <= 1) {
      toast.error('At least one field must remain selected.');
      return;
    }
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  };

  const applyPreset = (presetKey) => {
    const preset = PRESET_COLLECTIONS[presetKey];
    if (preset) {
      setSelectedKeys(preset.keys);
      toast.success(`Applied preset: ${preset.name}`);
    }
  };

  const selectAll = () => {
    setSelectedKeys(EXPORTABLE_FIELDS.map((f) => f.key));
  };

  const clearAll = () => {
    // Keep at least studentId
    setSelectedKeys(['studentId', 'studentName']);
  };

  // Recent saved filter pattern
  const savedFilterPattern = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECENT_FILTER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const activeFilterEntries = Object.entries(currentFilters).filter(([, val]) => val && val !== 'All');

  const executeExport = () => {
    const recordsToExport = scope === 'filtered' ? filteredStudents : allStudents;

    if (!recordsToExport || recordsToExport.length === 0) {
      toast.error('No students available to export under the current selection.');
      return;
    }

    if (selectedKeys.length === 0) {
      toast.error('Please select at least one field to export.');
      return;
    }

    setExporting(true);
    try {
      const activeFields = selectedKeys
        .map((k) => EXPORTABLE_FIELDS.find((f) => f.key === k))
        .filter(Boolean);

      const headers = activeFields.map((f) => f.label);
      const rows = recordsToExport.map((s) => activeFields.map((f) => {
        const val = f.get(s);
        return val === undefined || val === null ? '' : val;
      }));

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `GECM_Students_${scope}_${dateStr}.${exportFormat}`;

      if (exportFormat === 'csv') {
        const csvContent = [
          headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
          ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${recordsToExport.length} students as CSV!`);
      } else {
        const book = XLSX.utils.book_new();
        const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        // Auto column widths
        sheet['!cols'] = headers.map((h, i) => {
          let maxLen = h.length;
          for (let r = 0; r < Math.min(rows.length, 50); r += 1) {
            const cellVal = String(rows[r][i] ?? '');
            if (cellVal.length > maxLen) maxLen = cellVal.length;
          }
          return { wch: Math.min(Math.max(maxLen + 3, 14), 45) };
        });

        XLSX.utils.book_append_sheet(book, sheet, 'Students_Export');
        XLSX.writeFile(book, filename);
        toast.success(`Exported ${recordsToExport.length} students as Excel Workbook!`);
      }

      onClose();
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export students: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-700/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileSpreadsheet size={18} />
              </span>
              <h3 className="text-lg font-bold text-white">Dynamic Student Data Export</h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Customize exported fields, alter columns on the fly, and download precisely the filtered student roster you need.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Active Filter Pattern Banner */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Filter size={15} className="text-blue-400" />
              <span className="font-semibold text-slate-300">Active Filter Pattern:</span>
              {activeFilterEntries.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activeFilterEntries.map(([k, v]) => (
                    <span key={k} className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-medium">
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 italic">No specific filters active (All Students)</span>
              )}
            </div>

            {savedFilterPattern && onApplyFilterPattern && (
              <button
                type="button"
                onClick={() => onApplyFilterPattern(savedFilterPattern)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                title="Restore the filter combination from your recent export session"
              >
                <RotateCcw size={12} className="text-blue-400" /> Restore Recent Pattern
              </button>
            )}
          </div>

          {/* Export Scope & Format Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Export Scope</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('filtered')}
                  className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all ${
                    scope === 'filtered'
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold">Filtered Students</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">{filteredStudents.length} matching criteria</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all ${
                    scope === 'all'
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold">All Enrolled</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">{allStudents.length} total students</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">File Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat('xlsx')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border font-semibold text-xs transition-all ${
                    exportFormat === 'xlsx'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <FileSpreadsheet size={15} /> Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border font-semibold text-xs transition-all ${
                    exportFormat === 'csv'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <FileSpreadsheet size={15} /> CSV (.csv)
                </button>
              </div>
            </div>
          </div>

          {/* Quick Field Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" /> Quick Presets
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Select All ({EXPORTABLE_FIELDS.length})
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] text-slate-400 hover:text-slate-300 hover:underline"
                >
                  Clear to Minimal
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESET_COLLECTIONS).map(([key, preset]) => {
                const isActive = preset.keys.length === selectedKeys.length && preset.keys.every((k) => selectedKeys.includes(k));
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-500/20 text-blue-200 shadow-sm'
                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.name}</span>
                    {isActive && <Check size={12} className="text-blue-400 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Field Ordering Chips */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers size={14} className="text-emerald-400" />
                Active Columns for Export ({selectedKeys.length} selected)
              </span>
              <span className="text-[11px] text-slate-400">Click &times; to remove any column</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {selectedKeys.map((key) => {
                const field = EXPORTABLE_FIELDS.find((f) => f.key === key);
                if (!field) return null;
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 text-slate-200 text-xs font-medium"
                  >
                    <span>{field.label}</span>
                    <button
                      type="button"
                      onClick={() => removeField(key)}
                      className="text-slate-400 hover:text-rose-400 ml-1"
                      title="Remove column"
                    >
                      <X size={13} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Field Selection Picker */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Alter & Toggle Available Fields
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search field name…"
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-44"
                />
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1 mb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Field Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredFields.map((field) => {
                const isSelected = selectedKeys.includes(field.key);
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => toggleField(field.key)}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500/50 bg-blue-500/10 text-slate-200'
                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    <span className="mt-0.5">
                      {isSelected ? (
                        <CheckSquare size={16} className="text-blue-400" />
                      ) : (
                        <Square size={16} className="text-slate-600" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-tight">{field.label}</p>
                      <span className="text-[10px] text-slate-400">{field.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Exporting <span className="font-semibold text-white">{scope === 'filtered' ? filteredStudents.length : allStudents.length}</span> students with <span className="font-semibold text-white">{selectedKeys.length}</span> columns ({exportFormat.toUpperCase()}).
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={exporting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={exporting || selectedKeys.length === 0}
              onClick={executeExport}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-550 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Download size={15} />
              {exporting ? 'Exporting…' : `Export to .${exportFormat}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
