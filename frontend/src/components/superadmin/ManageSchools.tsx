import { useState } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, MapPin, Lock, ChevronDown, School } from 'lucide-react';
import { AddSchoolModal } from '../modals/AddSchoolModal';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { Badge } from '../ui/badge';

interface School {
  id: string;
  name: string;
  city: string;
  icon?: string;
  adminName: string;
  adminEmail: string;
  studentCount: number;
  status: 'active' | 'inactive';
}

export function ManageSchools() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedSchoolForPassword, setSelectedSchoolForPassword] = useState<School | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [schools, setSchools] = useState<School[]>(
    [
      { id: '1', name: 'Greenfield Public School', city: 'New York', adminName: 'John Doe', adminEmail: 'john@greenfield.edu', studentCount: 1200, status: 'active' },
      { id: '2', name: 'Riverside High School', city: 'Los Angeles', adminName: 'Michael Chen', adminEmail: 'michael@riverside.edu', studentCount: 850, status: 'active' },
      { id: '3', name: 'Oakwood Academy', city: 'Chicago', adminName: 'Sarah Williams', adminEmail: 'sarah@oakwood.edu', studentCount: 640, status: 'active' },
      { id: '4', name: 'Maple Grove School', city: 'Houston', adminName: 'David Brown', adminEmail: 'david@maplegrove.edu', studentCount: 520, status: 'inactive' },
    ]
  );

  // Session selector state — include "All sessions" and make it the default
  const sessions = ['All sessions', '2023/2024', '2024/2025', '2025/2026'];
  const [selectedSession, setSelectedSession] = useState<string>(sessions[0]);
  const [showSessionMenu, setShowSessionMenu] = useState(false);

  // New: local search state and derived filtered data
  const [searchQuery, setSearchQuery] = useState('');
  const filteredSchools = schools.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.adminName.toLowerCase().includes(q) ||
      s.adminEmail.toLowerCase().includes(q)
    );
  });

  // Selection mode state: toggles visibility of checkbox column and selection UI
  const [selectionMode, setSelectionMode] = useState(false);

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setIsModalOpen(true);
  };

  const handleDelete = (schoolId: string) => {
    setSchools(schools.filter(s => s.id !== schoolId));
    setSelectedSchools(selectedSchools.filter(id => id !== schoolId));
  };

  const handleChangePassword = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    if (school) {
      setSelectedSchoolForPassword(school);
      setIsPasswordModalOpen(true);
    }
  };

  const handleAddSchool = (newSchool: School) => {
    setSchools([...schools, { ...newSchool, id: Date.now().toString() }]);
    setIsModalOpen(false);
  };

  const handleUpdateSchool = (updatedSchool: School) => {
    setSchools(schools.map(s => (s.id === updatedSchool.id ? updatedSchool : s)));
    setIsModalOpen(false);
    setEditingSchool(null);
  };

  // ✅ Handle checkbox selections
  const toggleSelect = (schoolId: string) => {
    setSelectedSchools(prev =>
      prev.includes(schoolId)
        ? prev.filter(id => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSchools.length === schools.length) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(schools.map(s => s.id));
    }
  };

  const handleBulkDelete = () => {
    setSchools(schools.filter(s => !selectedSchools.includes(s.id)));
    setSelectedSchools([]);
  };

  // Build columns dynamically so checkbox column only appears in selection mode
  const checkboxColumn: Column<School> = {
    key: 'select',
    header: (
      <input
        type="checkbox"
        checked={selectedSchools.length === schools.length && schools.length > 0}
        onChange={toggleSelectAll}
        className="w-4 h-4 accent-blue-600 cursor-pointer"
      />
    ),
    render: (school) => (
      <input
        type="checkbox"
        checked={selectedSchools.includes(school.id)}
        onChange={() => toggleSelect(school.id)}
        className="w-4 h-4 accent-blue-600 cursor-pointer"
      />
    ),
  };

  // base columns (without checkbox)
  const baseColumns: Column<School>[] = [
    {
      key: 'icon',
      header: 'Icon',
      render: (school) => (
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center overflow-hidden">
          {school.icon ? (
            <img src={school.icon} alt={school.name} className="w-full h-full object-cover" />
          ) : (
            <School className="w-5 h-5 text-blue-600" />
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'School Name',
      sortable: true,
      render: (school) => (
        <span className="text-gray-900 font-medium">{school.name}</span>
      ),
    },
    {
      key: 'adminName',
      header: 'Admin Name',
      sortable: true,
      render: (school) => (
        <div>
          <p className="text-gray-900 font-medium">{school.adminName}</p>
          <p className="text-sm text-gray-600">{school.adminEmail}</p>
        </div>
      ),
    },
    {
      key: 'studentCount',
      header: 'Students',
      sortable: true,
      render: (school) => (
        <span className="text-gray-900 font-medium">
          {school.studentCount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (school) => (
        <Badge variant={school.status === 'active' ? 'default' : 'secondary'}>
          {school.status.charAt(0).toUpperCase() + school.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (school) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(school)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleChangePassword(school.id)}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            <Lock className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(school.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Final columns: include checkboxColumn at start only when selectionMode is true
  const columns: Column<School>[] = selectionMode ? [checkboxColumn, ...baseColumns] : baseColumns;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Schools</h1>
          <p className="text-gray-600">Add, edit, and manage all schools in the system</p>
        </div>

        <div className="flex gap-2 items-center">
          {/* Keep only Add New School in header controls; selection controls moved to toolbar */}
          <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New School
          </Button>
        </div>
      </div>

      {/* Toolbar: single Search (250px) + Select/Cancel + Session in one horizontal row */}
      <div className="flex items-center gap-4 mb-4">
        {/* Search (fixed ~250px) */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search schools..."
          className="w-[250px] px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
        />

        {/* Select / Cancel Selection button (next to search) */}
        {selectionMode ? (
          <Button
            onClick={() => {
              setSelectionMode(false);
              setSelectedSchools([]);
            }}
            variant="ghost"
            className="border border-gray-200 hover:bg-gray-50 text-sm"
          >
            Cancel Selection
          </Button>
        ) : (
          <Button
            onClick={() => setSelectionMode(true)}
            variant="outline"
            className="text-gray-700 bg-white border-gray-200 hover:bg-gray-50 text-sm"
          >
            Select
          </Button>
        )}

        {/* push session dropdown to the far right */}
        <div className="flex-1" />

        {/* Session selector (right) */}
        <div className="flex-shrink-0 relative">
          <Button
            variant="outline"
            onClick={() => setShowSessionMenu((prev) => !prev)}
            className="flex items-center gap-2 text-gray-700 bg-white border-gray-200 hover:bg-gray-50 text-sm"
          >
            <span className="hidden sm:inline">Session:</span> {selectedSession}
            <ChevronDown className="w-4 h-4" />
          </Button>

          {showSessionMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-20">
              {sessions.map((session) => (
                <button
                  key={session}
                  onClick={() => {
                    setSelectedSession(session);
                    setShowSessionMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm ${selectedSession === session ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {session}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table: pass filtered data */}
      {/* <DataTable columns={columns} data={filteredSchools} /> */}
      <DataTable columns={columns} data={filteredSchools} showSearch={false} />

      


      {/* Modals */}
      <AddSchoolModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSchool(null);
        }}
        school={editingSchool}
        onSave={editingSchool ? handleUpdateSchool : handleAddSchool}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setSelectedSchoolForPassword(null);
        }}
        school={selectedSchoolForPassword}
      />
    </div>
  );
}
