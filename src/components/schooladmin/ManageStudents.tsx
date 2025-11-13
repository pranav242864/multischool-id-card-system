import { useState } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, Eye, CreditCard, ImageIcon } from 'lucide-react';
import { AddStudentModal } from '../modals/AddStudentModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Student {
  id: string;
  admissionNo: string;
  photo?: string;
  name: string;
  class: string;
  session: string;
  fatherName: string;
  mobile: string;
  dob: string;
}

export function ManageStudents() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [classFilter, setClassFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');

  const students: Student[] = [
    {
      id: '1',
      admissionNo: 'GPS1001',
      name: 'Emily Johnson',
      class: 'Class 10-A',
      session: '2025-26',
      fatherName: 'Robert Johnson',
      mobile: '+1 234 567 8901',
      dob: '2010-05-15',
    },
    {
      id: '2',
      admissionNo: 'GPS1002',
      name: 'Michael Chen',
      class: 'Class 10-A',
      session: '2025-26',
      fatherName: 'David Chen',
      mobile: '+1 234 567 8902',
      dob: '2010-08-22',
    },
    {
      id: '3',
      admissionNo: 'GPS1003',
      name: 'Sarah Williams',
      class: 'Class 9-B',
      session: '2025-26',
      fatherName: 'James Williams',
      mobile: '+1 234 567 8903',
      dob: '2011-03-10',
    },
    {
      id: '4',
      admissionNo: 'GPS1004',
      name: 'David Brown',
      class: 'Class 10-B',
      session: '2025-26',
      fatherName: 'Thomas Brown',
      mobile: '+1 234 567 8904',
      dob: '2010-11-28',
    },
  ];

  const columns: Column<Student>[] = [
    {
      key: 'photo',
      header: 'Photo',
      render: (student) => (
        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
          {student.photo ? (
            <ImageWithFallback src={student.photo} alt={student.name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>
      ),
    },
    {
      key: 'admissionNo',
      header: 'Admission No',
      sortable: true,
      render: (student) => (
        <span className="text-gray-900">{student.admissionNo}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (student) => (
        <div>
          <p className="text-gray-900">{student.name}</p>
          <p className="text-gray-600">DOB: {new Date(student.dob).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      sortable: true,
    },
    {
      key: 'fatherName',
      header: "Father's Name",
      sortable: true,
    },
    {
      key: 'mobile',
      header: 'Mobile',
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (student) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Edit"
            onClick={() => {
              setEditingStudent(student);
              setIsModalOpen(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Generate ID Card"
            className="text-blue-600"
          >
            <CreditCard className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Delete"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const filterComponent = (
    <div className="flex gap-2">
      <Select value={classFilter} onValueChange={setClassFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Filter by Class" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          <SelectItem value="10-A">Class 10-A</SelectItem>
          <SelectItem value="10-B">Class 10-B</SelectItem>
          <SelectItem value="9-B">Class 9-B</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sessionFilter} onValueChange={setSessionFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Filter by Session" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sessions</SelectItem>
          <SelectItem value="2025-26">2025-26</SelectItem>
          <SelectItem value="2024-25">2024-25</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-gray-900 mb-2">Manage Students</h1>
          <p className="text-gray-600">Add, edit, and manage all student records</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Student
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={students}
        searchPlaceholder="Search students..."
        filterComponent={filterComponent}
      />

      {/* Add/Edit Modal */}
      <AddStudentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStudent(null);
        }}
        student={editingStudent}
      />
    </div>
  );
}
