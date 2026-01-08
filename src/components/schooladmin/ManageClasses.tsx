import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Snowflake, X, AlertCircle, GraduationCap } from 'lucide-react';
import { AddClassModal } from '../modals/AddClassModal';
import { Badge } from '../ui/badge';
import { classAPI, sessionAPI, APIError } from '../../utils/api';

interface Class {
  _id?: string;
  id?: string;
  className: string;
  sessionId?: string | { _id: string; sessionName: string };
  frozen?: boolean;
  status?: 'ACTIVE' | 'DISABLED';
  schoolId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function ManageClasses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(true);
  const [freezingClassId, setFreezingClassId] = useState<string | null>(null);
  const [unfreezingClassId, setUnfreezingClassId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check for active session and fetch classes
  const fetchClasses = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch classes - if no active session, backend will return 403
      const response = await classAPI.getClasses();
      
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
        setClasses(mappedClasses);
        setHasActiveSession(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleFreeze = async (classId: string) => {
    setFreezingClassId(classId);
    setError(null);

    try {
      // For SCHOOLADMIN, schoolId comes from JWT
      await classAPI.freezeClass(classId);
      // Re-fetch classes after freeze
      await fetchClasses();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to freeze class');
    } finally {
      setFreezingClassId(null);
    }
  };

  const handleUnfreeze = async (classId: string) => {
    setUnfreezingClassId(classId);
    setError(null);

    try {
      // For SCHOOLADMIN, schoolId comes from JWT
      await classAPI.unfreezeClass(classId);
      // Re-fetch classes after unfreeze
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
    try {
      // Modal handles the creation, we just need to re-fetch
      await fetchClasses();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to refresh classes');
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
        const isDisabled = loading || creating || isFreezing || isUnfreezing || !hasActiveSession;

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

  if (loading && !error) {
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
          <p className="text-gray-600">Create and manage classes for the active session</p>
        </div>

        <div className="flex gap-2 items-center">
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading || !hasActiveSession || creating}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Class
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-600 font-medium">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              {!hasActiveSession && (
                <p className="text-sm text-red-600 mt-2">
                  All class operations are disabled until an active session is activated.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Active Session Warning */}
      {!hasActiveSession && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-gray-900 font-semibold mb-2">No Active Session</h3>
          <p className="text-gray-600 mb-4">
            No active session found for this school. Please activate a session before managing classes.
          </p>
          <p className="text-sm text-gray-500">
            Class operations (create, freeze, unfreeze) are disabled until an active session is available.
          </p>
        </div>
      )}

      {/* Toolbar */}
      {hasActiveSession && (
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
      {!hasActiveSession ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">No active session available</p>
          <p className="text-sm text-gray-500">
            Class management requires an active session. Please activate a session to continue.
          </p>
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">No classes found for the active session</p>
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
        <DataTable columns={columns} data={filteredClasses} showSearch={false} />
      )}

      {/* Modal */}
      <AddClassModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        onSave={handleCreateClass}
      />
    </div>
  );
}

