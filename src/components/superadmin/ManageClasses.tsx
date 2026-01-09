import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Snowflake, X, AlertCircle, GraduationCap, School } from 'lucide-react';
import { AddClassModalAdmin } from '../modals/AddClassModalAdmin';
import { Badge } from '../ui/badge';
import { classAPI, schoolAPI, APIError } from '../../utils/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';

interface Class {
  _id?: string;
  id?: string;
  className: string;
  sessionId?: string | { _id: string; sessionName: string };
  frozen?: boolean;
  status?: 'ACTIVE' | 'DISABLED';
  schoolId?: string | { _id: string; name: string };
  createdAt?: string;
  updatedAt?: string;
}

export function ManageClasses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedSchoolName, setSelectedSchoolName] = useState<string>('');
  const [schools, setSchools] = useState<any[]>([]);
  const [freezingClassId, setFreezingClassId] = useState<string | null>(null);
  const [unfreezingClassId, setUnfreezingClassId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch schools on mount
  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await schoolAPI.getSchools();
        if (response.success && response.data) {
          setSchools(response.data);
        }
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.message || 'Failed to load schools');
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  // Fetch classes when school is selected
  const fetchClasses = async (showLoading = true) => {
    if (!selectedSchoolId) {
      setClasses([]);
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await classAPI.getClasses({ schoolId: selectedSchoolId });
      
      if (response.success && response.data) {
        const mappedClasses = response.data.map((cls: any) => ({
          _id: cls._id,
          id: cls._id,
          className: cls.className,
          sessionId: cls.sessionId,
          frozen: cls.frozen || false,
          status: cls.status || 'ACTIVE',
          schoolId: cls.schoolId,
          createdAt: cls.createdAt,
          updatedAt: cls.updatedAt,
        }));
        // Force state update by creating a new array reference
        // Use functional update to ensure React detects the change
        setClasses(() => [...mappedClasses]);
        setHasActiveSession(true);
      } else {
        // If response is not successful, clear classes
        setClasses([]);
      }
    } catch (err) {
      const apiError = err as APIError;
      
      // Check if error is due to no active session
      if (apiError.message?.includes('No active session found')) {
        setHasActiveSession(false);
        setClasses([]);
        setError(apiError.message || 'No active session found for this school. Please activate a session first.');
      } else {
        setError(apiError.message || 'Failed to load classes');
        setHasActiveSession(false);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (selectedSchoolId) {
      fetchClasses();
    } else {
      setClasses([]);
    }
  }, [selectedSchoolId]);

  const handleSchoolChange = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    const school = schools.find(s => (s._id || s.id) === schoolId);
    setSelectedSchoolName(school?.name || '');
  };

  const handleFreeze = async (classId: string) => {
    if (!selectedSchoolId) return;
    
    setFreezingClassId(classId);
    setError(null);

    try {
      await classAPI.freezeClass(classId, selectedSchoolId);
      await fetchClasses();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to freeze class');
    } finally {
      setFreezingClassId(null);
    }
  };

  const handleUnfreeze = async (classId: string) => {
    if (!selectedSchoolId) return;
    
    setUnfreezingClassId(classId);
    setError(null);

    try {
      await classAPI.unfreezeClass(classId, selectedSchoolId);
      await fetchClasses();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to unfreeze class');
    } finally {
      setUnfreezingClassId(null);
    }
  };

  const handleCreateClass = async () => {
    setCreating(true);
    setError(null);
    setSuccessMessage('Class created successfully!');
    
    try {
      // Small delay to ensure backend has persisted the data
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Refresh classes without showing loading spinner (to keep table visible)
      if (selectedSchoolId) {
        await fetchClasses(false);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to refresh classes');
      setSuccessMessage(null);
    } finally {
      setCreating(false);
    }
  };

  const filteredClasses = classes.filter((cls) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return cls.className.toLowerCase().includes(q);
  });

  const columns: Column<Class>[] = [
    {
      key: 'className',
      header: 'Class Name',
      sortable: true,
      render: (cls) => (
        <span className="text-gray-900 font-medium">{cls.className}</span>
      ),
    },
    {
      key: 'school',
      header: 'School',
      render: (cls) => {
        const school = typeof cls.schoolId === 'object' ? cls.schoolId.name : selectedSchoolName;
        return <span className="text-gray-600">{school || 'N/A'}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (cls) => {
        if (cls.frozen) {
          return (
            <Badge variant="secondary" className="bg-blue-500 text-white">
              <Snowflake className="w-3 h-3 mr-1" />
              Frozen
            </Badge>
          );
        }
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            Active
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (cls) => {
        const classId = cls._id || cls.id || '';
        const isFreezing = freezingClassId === classId;
        const isUnfreezing = unfreezingClassId === classId;
        const isDisabled = loading || creating || isFreezing || isUnfreezing || !hasActiveSession || !selectedSchoolId;

        return (
          <div className="flex items-center gap-2">
            {!cls.frozen ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFreeze(classId)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                disabled={isDisabled}
              >
                {isFreezing ? 'Freezing...' : (
                  <>
                    <Snowflake className="w-4 h-4 mr-1" />
                    Freeze
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnfreeze(classId)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                disabled={isDisabled}
              >
                {isUnfreezing ? 'Unfreezing...' : (
                  <>
                    <X className="w-4 h-4 mr-1" />
                    Unfreeze
                  </>
                )}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  if (loading && schools.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Classes</h1>
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
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Classes</h1>
          <p className="text-gray-600">Create and manage classes for schools</p>
        </div>

        <div className="flex gap-2 items-center">
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading || !selectedSchoolId || !hasActiveSession || creating}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Class
          </Button>
        </div>
      </div>

      {/* School Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-gray-500" />
            <Label htmlFor="school-select" className="text-gray-700 font-medium">
              Select School:
            </Label>
          </div>
          <Select value={selectedSchoolId} onValueChange={handleSchoolChange}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a school" />
            </SelectTrigger>
            <SelectContent>
              {schools.map((school) => (
                <SelectItem key={school._id || school.id} value={school._id || school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5">✓</div>
            <div>
              <p className="text-sm text-green-600 font-medium">Success</p>
              <p className="text-sm text-green-600 mt-1">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-600 font-medium">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              {error.includes('active session') && (
                <p className="text-sm text-red-600 mt-2">
                  Please activate a session for this school before creating classes. You can do this from the "Manage Sessions" page.
                </p>
              )}
              {!hasActiveSession && !error.includes('active session') && (
                <p className="text-sm text-red-600 mt-2">
                  All class operations are disabled until an active session is activated for this school.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No School Selected */}
      {!selectedSchoolId && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <School className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">Please select a school to view and manage classes</p>
        </div>
      )}

      {/* No Active Session Warning */}
      {selectedSchoolId && !hasActiveSession && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-gray-900 font-semibold mb-2">No Active Session</h3>
          <p className="text-gray-600 mb-4">
            No active session found for {selectedSchoolName || 'this school'}. Please activate a session before managing classes.
          </p>
          <p className="text-sm text-gray-500">
            Class operations (create, freeze, unfreeze) are disabled until an active session is available.
          </p>
        </div>
      )}

      {/* Toolbar */}
      {selectedSchoolId && hasActiveSession && (
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classes..."
            className="w-[250px] px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            disabled={loading || !hasActiveSession}
          />
        </div>
      )}

      {/* Table */}
      {selectedSchoolId && hasActiveSession && (
        <>
          {classes.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">No classes found for {selectedSchoolName || 'this school'}</p>
              <Button 
                onClick={() => setIsModalOpen(true)} 
                variant="outline"
                disabled={loading || creating || !hasActiveSession}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Class
              </Button>
            </div>
          ) : (
            <DataTable 
              key={`classes-${selectedSchoolId}-${classes.length}`} 
              columns={columns} 
              data={filteredClasses} 
              showSearch={false} 
            />
          )}
        </>
      )}

      {/* Modal */}
      {selectedSchoolId && (
        <AddClassModalAdmin
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setError(null);
          }}
          onSave={handleCreateClass}
          schoolId={selectedSchoolId}
          schoolName={selectedSchoolName}
        />
      )}
    </div>
  );
}
