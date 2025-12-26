import { useState } from 'react';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, Mail, Lock, School } from 'lucide-react';
import { AddAdminModal } from '../modals/AddAdminModal';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

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
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  
  // List of all registered schools
  const schools = [
    'Greenfield Public School',
    'Riverside High School',
    'Oakwood Academy',
    'Maple Grove School',
  ];
  
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

  // Filter admins by selected school
  const filteredAdmins = selectedSchool 
    ? admins.filter((admin) => admin.school === selectedSchool)
    : [];

  const handleEdit = (admin: SchoolAdmin) => {
    setEditingAdmin(admin);
    setIsModalOpen(true);
  };

  const handleDelete = (adminId: string) => {
    setAdmins(admins.filter((a) => a.id !== adminId));
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
        <Select value={selectedSchool} onValueChange={setSelectedSchool}>
          <SelectTrigger id="school-select" className="w-full max-w-md">
            <SelectValue placeholder="Select a school to view admins" />
          </SelectTrigger>
          <SelectContent>
            {schools.map((school) => (
              <SelectItem key={school} value={school}>
                {school}
              </SelectItem>
            ))}
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
              {filteredAdmins.map((admin) => (
                <div
                  key={admin.id}
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
                        <p className="text-gray-900 mt-1">{admin.phone}</p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-500 text-sm">School</Label>
                        <p className="text-gray-900 mt-1">{admin.school}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500 text-sm">Join Date</Label>
                        <p className="text-gray-900 mt-1">
                          {new Date(admin.joinDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-500 text-sm">Status</Label>
                        <div className="mt-1">
                          <Badge variant={admin.status === 'active' ? 'default' : 'secondary'}>
                            {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
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
                      onClick={() => handleChangePassword(admin.id)}
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(admin.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600">No admins found for this school</p>
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
