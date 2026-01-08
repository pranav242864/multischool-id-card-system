import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, Mail, Lock, School } from 'lucide-react';
import { AddAdminModal } from '../modals/AddAdminModal';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { schoolAPI, APIError } from '../../utils/api';

interface SchoolAdmin {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  school?: string;
  schoolId?: any;
  phone?: string;
  status?: 'active' | 'inactive' | 'ACTIVE' | 'DISABLED';
  joinDate?: string;
  createdAt?: string;
}

export function ManageSchoolAdmins() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SchoolAdmin | null>(null);
  const [selectedAdminForPassword, setSelectedAdminForPassword] = useState<SchoolAdmin | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [schools, setSchools] = useState<any[]>([]);
  const [admins, setAdmins] = useState<SchoolAdmin[]>([]);

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

  // Note: Admin management API endpoints may not exist yet
  // This component will show empty state until API is implemented
  useEffect(() => {
    if (selectedSchoolId) {
      // TODO: Fetch admins for selected school when API is available
      // For now, set empty array
      setAdmins([]);
    }
  }, [selectedSchoolId]);

  const filteredAdmins = admins;

  const handleEdit = (admin: SchoolAdmin) => {
    setEditingAdmin(admin);
    setIsModalOpen(true);
  };

  const handleDelete = (adminId: string) => {
    // TODO: Wire delete API when CRUD is implemented
    console.log('Delete admin:', adminId);
  };

  const handleChangePassword = (adminId: string) => {
    const admin = admins.find((a) => (a._id || a.id) === adminId);
    if (admin) {
      setSelectedAdminForPassword(admin);
      setIsPasswordModalOpen(true);
    }
  };

  const handleAddAdmin = (newAdmin: SchoolAdmin) => {
    // TODO: Wire create API when CRUD is implemented
    console.log('Add admin:', newAdmin);
    setIsModalOpen(false);
  };

  const handleUpdateAdmin = (updatedAdmin: SchoolAdmin) => {
    // TODO: Wire update API when CRUD is implemented
    console.log('Update admin:', updatedAdmin);
    setIsModalOpen(false);
    setEditingAdmin(null);
  };

  if (loading && !selectedSchoolId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage School Admins</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedSchoolId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage School Admins</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage School Admins</h1>
          <p className="text-gray-600">Select a school to view and manage its administrators</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Admin
        </Button>
      </div>

      {/* School Dropdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Label htmlFor="school-select" className="text-gray-700 mb-2 block">
          Select School
        </Label>
        <Select
          value={selectedSchool}
          onValueChange={(value) => {
            const school = schools.find(s => s.name === value);
            if (school) {
              setSelectedSchool(school.name);
              setSelectedSchoolId(school._id || school.id || '');
            }
          }}
        >
          <SelectTrigger id="school-select" className="w-full max-w-md">
            <SelectValue placeholder="Select a school to view admins" />
          </SelectTrigger>
          <SelectContent>
            {schools.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No schools available</div>
            ) : (
              schools.map((school) => {
                const schoolId = school._id || school.id || '';
                return (
                  <SelectItem key={schoolId} value={school.name}>
                    {school.name}
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Admin Details Form */}
      {selectedSchool && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <School className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-gray-900 font-semibold text-lg">{selectedSchool}</h2>
                <p className="text-gray-600 text-sm">
                  {filteredAdmins.length} {filteredAdmins.length === 1 ? 'admin' : 'admins'}
                </p>
              </div>
            </div>
          </div>

          {filteredAdmins.length > 0 ? (
            <div className="space-y-4">
              {filteredAdmins.map((admin) => {
                const adminId = admin._id || admin.id || '';
                return (
                  <div
                    key={adminId}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-500 text-sm">Admin Name</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Mail className="w-4 h-4 text-purple-600" />
                            </div>
                            <p className="text-gray-900 font-medium">{admin.name}</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-500 text-sm">Email</Label>
                          <p className="text-gray-900 mt-1">{admin.email}</p>
                        </div>
                        <div>
                          <Label className="text-gray-500 text-sm">Phone</Label>
                          <p className="text-gray-900 mt-1">{admin.phone || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-500 text-sm">School</Label>
                          <p className="text-gray-900 mt-1">{admin.school || selectedSchool}</p>
                        </div>
                        <div>
                          <Label className="text-gray-500 text-sm">Join Date</Label>
                          <p className="text-gray-900 mt-1">
                            {admin.joinDate || admin.createdAt
                              ? new Date(admin.joinDate || admin.createdAt || '').toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-500 text-sm">Status</Label>
                          <div className="mt-1">
                            <Badge variant={(admin.status || 'active').toLowerCase() === 'active' ? 'default' : 'secondary'}>
                              {(admin.status || 'active').charAt(0).toUpperCase() + (admin.status || 'active').slice(1).toLowerCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(admin)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChangePassword(adminId)}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(adminId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-2">No admins found for this school</p>
              <p className="text-gray-500 text-sm mb-4">
                Admin management API endpoints are not yet implemented.
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Admin for {selectedSchool}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedSchool && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <School className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600">Select a school from the dropdown above to view its administrators</p>
        </div>
      )}

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
