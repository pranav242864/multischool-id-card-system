import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, CheckCircle2, XCircle, Archive, ChevronDown, Calendar } from 'lucide-react';
import { AddSessionModal } from '../modals/AddSessionModal';
import { Badge } from '../ui/badge';
import { schoolAPI, sessionAPI, APIError, getUserRole } from '../../utils/api';

interface Session {
  _id?: string;
  id?: string;
  sessionName: string;
  startDate: string;
  endDate: string;
  activeStatus?: boolean;
  archived?: boolean;
  archivedAt?: string | null;
  schoolId?: string | { _id: string; name: string };
  status?: 'ACTIVE' | 'DISABLED';
  createdAt?: string;
  updatedAt?: string;
}

interface School {
  _id: string;
  name: string;
}

export function ManageSessions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [selectedSchoolName, setSelectedSchoolName] = useState<string>('Select School');
  const [showSchoolMenu, setShowSchoolMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activatingSessionId, setActivatingSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Fetch schools on mount
  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await schoolAPI.getSchools();
        if (response.success && response.data) {
          const schoolList = response.data.map((school: any) => ({
            _id: school._id,
            name: school.name,
          }));
          setSchools(schoolList);
          // Auto-select first school if available and SUPERADMIN
          if (schoolList.length > 0 && getUserRole() === 'SUPERADMIN') {
            setSelectedSchoolId(schoolList[0]._id);
            setSelectedSchoolName(schoolList[0].name);
          }
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

  // Fetch sessions when school is selected
  const fetchSessions = async () => {
    if (!selectedSchoolId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await sessionAPI.getSessions(selectedSchoolId);
      if (response.success && response.data) {
        const mappedSessions = response.data.map((session: any) => ({
          _id: session._id,
          id: session._id,
          sessionName: session.sessionName,
          startDate: session.startDate,
          endDate: session.endDate,
          activeStatus: session.activeStatus || false,
          archived: session.archived || false,
          archivedAt: session.archivedAt || null,
          schoolId: session.schoolId,
          status: session.status || 'ACTIVE',
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }));
        setSessions(mappedSessions);
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [selectedSchoolId]);

  const handleActivate = async (sessionId: string) => {
    if (!selectedSchoolId) {
      setError('School ID is required');
      return;
    }

    setActivatingSessionId(sessionId);
    setError(null);

    try {
      await sessionAPI.activateSession(sessionId, selectedSchoolId);
      // Re-fetch sessions after activation
      await fetchSessions();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to activate session');
    } finally {
      setActivatingSessionId(null);
    }
  };

  const handleCreateSession = async () => {
    setCreating(true);
    setError(null);
    try {
      // Modal handles the creation, we just need to re-fetch
      await fetchSessions();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to refresh sessions');
    } finally {
      setCreating(false);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return s.sessionName.toLowerCase().includes(q);
  });

  const baseColumns: Column<Session>[] = [
    {
      key: 'sessionName',
      header: 'Session Name',
      sortable: true,
      render: (session) => (
        <span className="text-gray-900 font-medium">{session.sessionName}</span>
      ),
    },
    {
      key: 'dates',
      header: 'Date Range',
      render: (session) => (
        <div className="text-sm text-gray-600">
          <div>{new Date(session.startDate).toLocaleDateString()}</div>
          <div className="text-gray-400">to</div>
          <div>{new Date(session.endDate).toLocaleDateString()}</div>
        </div>
      ),
    },
    {
      key: 'activeStatus',
      header: 'Status',
      render: (session) => {
        if (session.archived) {
          return (
            <Badge variant="secondary" className="bg-gray-500 text-white">
              <Archive className="w-3 h-3 mr-1" />
              Archived
            </Badge>
          );
        }
        if (session.activeStatus) {
          return (
            <Badge variant="default" className="bg-green-600 text-white">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Active
            </Badge>
          );
        }
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (session) => {
        const sessionId = session._id || session.id || '';
        const isActivating = activatingSessionId === sessionId;
        const isDisabled = loading || creating || isActivating || session.archived;

        return (
          <div className="flex items-center gap-2">
            {!session.activeStatus && !session.archived && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleActivate(sessionId)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                disabled={isDisabled}
              >
                {isActivating ? 'Activating...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Activate
                  </>
                )}
              </Button>
            )}
            {session.activeStatus && (
              <Badge variant="default" className="bg-green-600 text-white">
                Current Active
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  if (loading && !selectedSchoolId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Sessions</h1>
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
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Sessions</h1>
          <p className="text-gray-600">Create and manage academic sessions for schools</p>
        </div>

        <div className="flex gap-2 items-center">
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading || !selectedSchoolId || creating}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Session
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* School Selection (SUPERADMIN only) */}
      {getUserRole() === 'SUPERADMIN' && (
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowSchoolMenu((prev) => !prev)}
              className="flex items-center gap-2 text-gray-700 bg-white border-gray-200 hover:bg-gray-50 text-sm min-w-[200px]"
              disabled={loading}
            >
              <span>{selectedSchoolName}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>

            {showSchoolMenu && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                {schools.map((school) => (
                  <button
                    key={school._id}
                    onClick={() => {
                      setSelectedSchoolId(school._id);
                      setSelectedSchoolName(school.name);
                      setShowSchoolMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm ${selectedSchoolId === school._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {school.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search sessions..."
          className="w-[250px] px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          disabled={loading || !selectedSchoolId}
        />
      </div>

      {/* Table */}
      {!selectedSchoolId ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">Please select a school to view sessions</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">No sessions found for this school</p>
          <Button 
            onClick={() => setIsModalOpen(true)} 
            variant="outline"
            disabled={loading || creating}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Session
          </Button>
        </div>
      ) : (
        <DataTable columns={baseColumns} data={filteredSessions} showSearch={false} />
      )}

      {/* Modal */}
      <AddSessionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        schoolId={selectedSchoolId}
        onSave={handleCreateSession}
      />
    </div>
  );
}

