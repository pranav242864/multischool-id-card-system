import { useState } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, Mail, Lock, ChevronDown } from 'lucide-react';
import { AddAdminModal } from '../modals/AddAdminModal';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { Badge } from '../ui/badge';

interface SchoolAdmin {
  id: string;
  name: string;
  email: string;
  school: string;
  phone: string;
  status: 'active' | 'inactive';
  joinDate: string;
}

export function ManageSchoolAdmins() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SchoolAdmin | null>(null);
  const [selectedAdminForPassword, setSelectedAdminForPassword] = useState<SchoolAdmin | null>(null);
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [admins, setAdmins] = useState<SchoolAdmin[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@greenfield.edu',
      school: 'Greenfield Public School',
      phone: '+1-555-0101',
      status: 'active',
      joinDate: '2024-01-15',
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'michael@riverside.edu',
      school: 'Riverside High School',
      phone: '+1-555-0102',
      status: 'active',
      joinDate: '2024-02-20',
    },
    {
      id: '3',
      name: 'Sarah Williams',
      email: 'sarah@oakwood.edu',
      school: 'Oakwood Academy',
      phone: '+1-555-0103',
      status: 'active',
      joinDate: '2024-03-10',
    },
    {
      id: '4',
      name: 'David Brown',
      email: 'david@maplegrove.edu',
      school: 'Maple Grove School',
      phone: '+1-555-0104',
      status: 'inactive',
      joinDate: '2023-12-05',
    },
  ]);

  // Session selector state — include "All sessions" and make it the default
  const sessions = ['All sessions', '2023/2024', '2024/2025', '2025/2026'];
  const [selectedSession, setSelectedSession] = useState<string>(sessions[0]);
  const [showSessionMenu, setShowSessionMenu] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const filteredAdmins = admins.filter((a) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.school.toLowerCase().includes(q) ||
      a.phone.toLowerCase().includes(q)
    );
  });

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);

  const handleEdit = (admin: SchoolAdmin) => {
    setEditingAdmin(admin);
    setIsModalOpen(true);
  };

  const handleDelete = (adminId: string) => {
    setAdmins(admins.filter((a) => a.id !== adminId));
    setSelectedAdmins(selectedAdmins.filter((id) => id !== adminId));
  };

  const handleBulkDelete = () => {
    setAdmins(admins.filter((a) => !selectedAdmins.includes(a.id)));
    setSelectedAdmins([]);
  };

  const handleChangePassword = (adminId: string) => {
    const admin = admins.find((a) => a.id === adminId);
    if (admin) {
      setSelectedAdminForPassword(admin);
      setIsPasswordModalOpen(true);
    }
  };

  const handleAddAdmin = (newAdmin: SchoolAdmin) => {
    setAdmins([...admins, { ...newAdmin, id: Date.now().toString() }]);
    setIsModalOpen(false);
  };

  const handleUpdateAdmin = (updatedAdmin: SchoolAdmin) => {
    setAdmins(admins.map((a) => (a.id === updatedAdmin.id ? updatedAdmin : a)));
    setIsModalOpen(false);
    setEditingAdmin(null);
  };

  // ✅ Bulk selection logic
  const toggleSelect = (id: string) => {
    setSelectedAdmins((prev) =>
      prev.includes(id) ? prev.filter((aid) => aid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAdmins.length === admins.length) {
      setSelectedAdmins([]);
    } else {
      setSelectedAdmins(admins.map((a) => a.id));
    }
  };

  const checkboxColumn: Column<SchoolAdmin> = {
    key: 'select',
    header: (
      <input
        type="checkbox"
        checked={selectedAdmins.length === admins.length && admins.length > 0}
        onChange={toggleSelectAll}
        className="w-4 h-4 accent-blue-600 cursor-pointer"
      />
    ),
    render: (admin) => (
      <input
        type="checkbox"
        checked={selectedAdmins.includes(admin.id)}
        onChange={() => toggleSelect(admin.id)}
        className="w-4 h-4 accent-blue-600 cursor-pointer"
      />
    ),
  };

  const baseColumns: Column<SchoolAdmin>[] = [
    {
      key: 'name',
      header: 'Admin Name',
      sortable: true,
      render: (admin) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-gray-900 font-medium">{admin.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (admin) => <span className="text-gray-700">{admin.email}</span>,
    },
    {
      key: 'school',
      header: 'School',
      sortable: true,
      render: (admin) => <span className="text-gray-700">{admin.school}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (admin) => <span className="text-gray-700">{admin.phone}</span>,
    },
    {
      key: 'joinDate',
      header: 'Join Date',
      sortable: true,
      render: (admin) => (
        <span className="text-gray-700">
          {new Date(admin.joinDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (admin) => (
        <Badge variant={admin.status === 'active' ? 'default' : 'secondary'}>
          {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (admin) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(admin)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Edit admin"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleChangePassword(admin.id)}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            title="Change password"
          >
            <Lock className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(admin.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Delete admin"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const columns: Column<SchoolAdmin>[] = selectionMode ? [checkboxColumn, ...baseColumns] : baseColumns;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage School Admins</h1>
          <p className="text-gray-600">Add, edit, and manage school administrators</p>
        </div>
        <div className="flex gap-2">
          {selectedAdmins.length > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedAdmins.length})
            </Button>
          )}
          <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New Admin
          </Button>
        </div>
      </div>

      {/* Toolbar: Search + Select/Cancel + Session */}
      <div className="flex items-center gap-4 mb-4">
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search admins..."
          className="w-[250px] px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
        />

        {/* Select / Cancel Selection button (aligned with search) */}
        {selectionMode ? (
          <Button
            onClick={() => {
              setSelectionMode(false);
              setSelectedAdmins([]);
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

        {/* Spacer */}
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

      {/* Table */}
      {/* <DataTable columns={columns} data={filteredAdmins} searchPlaceholder="" /> */}
      <DataTable columns={columns} data={filteredAdmins} showSearch={false} />

      {/* Modals */}
      <AddAdminModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAdmin(null);
        }}
        admin={editingAdmin}
        onSave={editingAdmin ? handleUpdateAdmin : handleAddAdmin}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setSelectedAdminForPassword(null);
        }}
        school={selectedAdminForPassword as any}
      />
    </div>
  );
}
