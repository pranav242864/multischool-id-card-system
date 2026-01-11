import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, MapPin, ChevronDown, School, Snowflake } from 'lucide-react';
import { AddSchoolModal } from '../modals/AddSchoolModal';
import { Badge } from '../ui/badge';
import { schoolAPI, sessionAPI, APIError } from '../../utils/api';

interface School {
  _id?: string;
  id?: string;
  name: string;
  city?: string;
  icon?: string;
  adminName?: string;
  adminEmail?: string;
  address?: string;
  contactEmail?: string;
  studentCount?: number;
  status?: 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';
  frozen?: boolean;
}

export function ManageSchools() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [sessions, setSessions] = useState<string[]>(['All sessions']);
  const [selectedSession, setSelectedSession] = useState<string>('All sessions');
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null);
  const [freezingSchoolId, setFreezingSchoolId] = useState<string | null>(null);

  const fetchSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await schoolAPI.getSchools();
      if (response.success && response.data) {
        // Map backend data to frontend format
        const mappedSchools = response.data.map((school: any) => {
          // Explicitly check for frozen field - handle both boolean and undefined/null
          const isFrozen = school.frozen === true || school.frozen === 'true';
          
          return {
          _id: school._id,
          id: school._id,
          name: school.name,
          city: school.city || '',
          address: school.address || '',
          contactEmail: school.contactEmail || '',
          adminName: school.adminName || '',
          adminEmail: school.adminEmail || school.contactEmail || '',
          studentCount: school.studentCount || 0,
          status: (school.status || 'active').toLowerCase() as 'active' | 'inactive',
            frozen: isFrozen,
          };
        });
        setSchools(mappedSchools);
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const filteredSchools = schools.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.adminName && s.adminName.toLowerCase().includes(q)) ||
      (s.adminEmail && s.adminEmail.toLowerCase().includes(q)) ||
      (s.contactEmail && s.contactEmail.toLowerCase().includes(q))
    );
  });

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setIsModalOpen(true);
  };

  const handleFreeze = async (schoolId: string) => {
    const school = schools.find(s => (s._id || s.id) === schoolId);
    // Explicitly check frozen status
    const isCurrentlyFrozen = school?.frozen === true || school?.frozen === 'true' || false;
    const action = isCurrentlyFrozen ? 'unfreeze' : 'freeze';
    
    if (!window.confirm(`Are you sure you want to ${action} this school?`)) {
      return;
    }

    setFreezingSchoolId(schoolId);
    setError(null);

    try {
      if (isCurrentlyFrozen) {
        await schoolAPI.unfreezeSchool(schoolId);
      } else {
        await schoolAPI.freezeSchool(schoolId);
      }
      // Re-fetch schools after successful freeze/unfreeze
      await fetchSchools();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || `Failed to ${action} school`);
    } finally {
      setFreezingSchoolId(null);
    }
  };

  const handleDelete = async (schoolId: string) => {
    if (!window.confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
      return;
    }

    setDeletingSchoolId(schoolId);
    setError(null);

    try {
      await schoolAPI.deleteSchool(schoolId);
      // Re-fetch schools after successful delete
      await fetchSchools();
      setSelectedSchools(selectedSchools.filter(id => id !== schoolId));
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to delete school');
    } finally {
      setDeletingSchoolId(null);
    }
  };

  const handleAddSchool = async (newSchool: School) => {
    // Modal handles the API call, we just need to re-fetch
    await fetchSchools();
  };

  const handleUpdateSchool = async (updatedSchool: School) => {
    setIsModalOpen(false);
    setEditingSchool(null);
    await fetchSchools();
  };

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
      setSelectedSchools(schools.map(s => s._id || s.id || '').filter(Boolean));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedSchools.length} school(s)? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    const errors: string[] = [];
    let successCount = 0;

    for (const schoolId of selectedSchools) {
      try {
        await schoolAPI.deleteSchool(schoolId);
        successCount++;
      } catch (err) {
        const apiError = err as APIError;
        errors.push(`${schoolId}: ${apiError.message || 'Failed to delete'}`);
      }
    }

    // Re-fetch schools after bulk delete
    await fetchSchools();

    if (errors.length > 0) {
      setError(`Deleted ${successCount} school(s). Errors: ${errors.join('; ')}`);
    } else {
      setSelectedSchools([]);
    }
  };

  const checkboxColumn: Column<School> = {
    key: 'select',
    header: (
      <input
        type="checkbox"
        checked={selectedSchools.length === schools.length && schools.length > 0}
        onChange={toggleSelectAll}
        className="w-4 h-4 accent-blue-600 cursor-pointer"
        disabled={loading}
      />
    ),
    render: (school) => {
      const schoolId = school._id || school.id || '';
      return (
        <input
          type="checkbox"
          checked={selectedSchools.includes(schoolId)}
          onChange={() => toggleSelect(schoolId)}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
          disabled={loading}
        />
      );
    },
  };

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
      header: 'Contact Info',
      sortable: true,
      render: (school) => (
        <div>
          <p className="text-gray-900 font-medium">{school.adminName || 'N/A'}</p>
          <p className="text-sm text-gray-600">{school.contactEmail || school.adminEmail || ''}</p>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      sortable: true,
      render: (school) => (
        <span className="text-gray-700">{school.address || 'N/A'}</span>
      ),
    },
    {
      key: 'studentCount',
      header: 'Students',
      sortable: true,
      render: (school) => (
        <span className="text-gray-900 font-medium">
          {(school.studentCount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (school) => {
        // Explicitly check frozen status - handle boolean true, string 'true', or undefined/null
        const isFrozen = school.frozen === true || school.frozen === 'true' || false;
        const status = (school.status || 'active').toLowerCase();
        
        // If frozen, only show Frozen badge (priority over status)
        if (isFrozen) {
          return (
            <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
              <Snowflake className="w-3 h-3 mr-1 fill-current" />
              Frozen
            </Badge>
          );
        }
        
        // Otherwise, show the status badge (Active, Inactive, etc.)
        return (
          <Badge variant={status === 'active' ? 'default' : 'secondary'}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (school) => {
        const schoolId = school._id || school.id || '';
        const isDeleting = deletingSchoolId === schoolId;
        const isFreezing = freezingSchoolId === schoolId;
        // Explicitly check frozen status
        const isFrozen = school.frozen === true || school.frozen === 'true' || false;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(school)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              disabled={loading || isDeleting || isFreezing || isFrozen}
              title={isFrozen ? 'Cannot edit frozen school' : 'Edit school'}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFreeze(schoolId)}
              className={isFrozen 
                ? "text-purple-600 hover:text-purple-700 hover:bg-purple-50" 
                : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"}
              disabled={loading || isDeleting || isFreezing}
              title={isFrozen ? 'Unfreeze school' : 'Freeze school'}
            >
              {isFreezing ? '...' : <Snowflake className={`w-4 h-4 ${isFrozen ? 'fill-current' : ''}`} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(schoolId)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={loading || isDeleting || isFreezing || isFrozen}
              title={isFrozen ? 'Cannot delete frozen school' : 'Delete school'}
            >
              {isDeleting ? '...' : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>
        );
      },
    },
  ];

  const columns: Column<School>[] = selectionMode ? [checkboxColumn, ...baseColumns] : baseColumns;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Schools</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Schools</h1>
          <p className="text-gray-600">Add, edit, and manage all schools in the system</p>
        </div>

        <div className="flex gap-2 items-center">
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New School
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search schools..."
          className="w-[250px] px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          disabled={loading}
        />

        {selectionMode ? (
          <>
            {selectedSchools.length > 0 && (
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                size="sm"
                disabled={loading || deletingSchoolId !== null}
              >
                Delete Selected ({selectedSchools.length})
              </Button>
            )}
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
          </>
        ) : (
          <Button
            onClick={() => setSelectionMode(true)}
            variant="outline"
            className="text-gray-700 bg-white border-gray-200 hover:bg-gray-50 text-sm"
            disabled={loading}
          >
            Select
          </Button>
        )}

        <div className="flex-1" />

        <div className="flex-shrink-0 relative">
          <Button
            variant="outline"
            onClick={() => setShowSessionMenu((prev) => !prev)}
            className="flex items-center gap-2 text-gray-700 bg-white border-gray-200 hover:bg-gray-50 text-sm"
            disabled={loading}
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
      {schools.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <School className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">No schools found</p>
          <Button 
            onClick={() => setIsModalOpen(true)} 
            variant="outline"
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New School
          </Button>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredSchools} showSearch={false} />
      )}

      {/* Modals */}
      <AddSchoolModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSchool(null);
          setError(null);
        }}
        school={editingSchool}
        onSave={editingSchool ? handleUpdateSchool : handleAddSchool}
      />
    </div>
  );
}
