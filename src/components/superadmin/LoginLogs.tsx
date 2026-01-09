import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { AlertCircle, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/badge';
import { logAPI, APIError, getUserRole } from '../../utils/api';

interface LoginLog {
  _id?: string;
  id?: string;
  email: string;
  username?: string;
  role: string;
  ipAddress?: string;
  success: boolean;
  loginMethod?: string;
  failureReason?: string;
  createdAt: string;
}

export function LoginLogs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const userRole = getUserRole();

  useEffect(() => {
    // Check if user is SUPERADMIN - if not, show error immediately
    if (userRole !== 'SUPERADMIN') {
      setError('Access denied. Login logs are only available to Superadmin users.');
      setLoading(false);
      return;
    }

    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await logAPI.getLoginLogs();
        if (response.success && response.data) {
          const logsData = response.data.logs || response.data || [];
          setLogs(Array.isArray(logsData) ? logsData : []);
        }
      } catch (err) {
        const apiError = err as APIError;
        // Handle 403 specifically - display backend message without redirect
        if (apiError.status === 403) {
          setError(apiError.message || 'Access denied. Login logs are only available to Superadmin users.');
        } else {
          setError(apiError.message || 'Failed to load login logs');
        }
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [userRole]);

  const columns: Column<LoginLog>[] = [
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (log) => (
        <div>
          <p className="text-gray-900">{log.email}</p>
          {log.username && (
            <p className="text-gray-500 text-sm">{log.username}</p>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (log) => {
        const roleColors: Record<string, string> = {
          SUPERADMIN: 'bg-red-100 text-red-700',
          SCHOOLADMIN: 'bg-blue-100 text-blue-700',
          TEACHER: 'bg-green-100 text-green-700',
        };
        return (
          <Badge className={roleColors[log.role] || 'bg-gray-100 text-gray-700'}>
            {log.role}
          </Badge>
        );
      },
    },
    {
      key: 'success',
      header: 'Status',
      sortable: true,
      render: (log) => (
        <div className="flex items-center gap-2">
          {log.success ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Success</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-600">Failed</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      sortable: true,
      render: (log) => (
        <span className="text-gray-700 font-mono text-sm">
          {log.ipAddress || 'N/A'}
        </span>
      ),
    },
    {
      key: 'loginMethod',
      header: 'Method',
      sortable: true,
      render: (log) => (
        <span className="text-gray-600 text-sm">
          {log.loginMethod || 'email_password'}
        </span>
      ),
    },
    {
      key: 'failureReason',
      header: 'Failure Reason',
      render: (log) => (
        log.failureReason ? (
          <span className="text-red-600 text-sm">{log.failureReason}</span>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      render: (log) => (
        <span className="text-gray-600 text-sm">
          {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Login Logs</h1>
          <p className="text-gray-600">Loading login logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Login Logs</h1>
          <p className="text-gray-600">View system login activity logs</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-600 font-medium">Access Denied</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900 mb-2 text-2xl font-bold">Login Logs</h1>
        <p className="text-gray-600">View system login activity logs</p>
      </div>

      {/* Logs Table */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">No login logs found</p>
          <p className="text-gray-500 text-sm">Login activity will appear here once users start logging in.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <DataTable
            columns={columns}
            data={logs}
            searchPlaceholder="Search logs by email, role, IP..."
          />
        </div>
      )}
    </div>
  );
}

