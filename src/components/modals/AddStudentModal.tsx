import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Upload } from 'lucide-react';

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

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
}

export function AddStudentModal({ isOpen, onClose, student }: AddStudentModalProps) {
  const [formData, setFormData] = useState({
    admissionNo: '',
    name: '',
    dob: '',
    gender: '',
    class: '',
    session: '',
    fatherName: '',
    motherName: '',
    mobile: '',
    email: '',
    address: '',
    bloodGroup: '',
  });

  useEffect(() => {
    if (student) {
      setFormData({
        admissionNo: student.admissionNo,
        name: student.name,
        dob: student.dob,
        gender: '',
        class: student.class,
        session: student.session,
        fatherName: student.fatherName,
        motherName: '',
        mobile: student.mobile,
        email: '',
        address: '',
        bloodGroup: '',
      });
    } else {
      setFormData({
        admissionNo: '',
        name: '',
        dob: '',
        gender: '',
        class: '',
        session: '',
        fatherName: '',
        motherName: '',
        mobile: '',
        email: '',
        address: '',
        bloodGroup: '',
      });
    }
  }, [student, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Student data:', formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? 'Edit Student' : 'Add New Student'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div>
            <Label>Student Photo</Label>
            <div className="mt-2 flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <Button type="button" variant="outline" size="sm">
                Upload Photo
              </Button>
            </div>
            <p className="text-gray-600 mt-2">JPG or PNG, max 2MB</p>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admissionNo">Admission Number *</Label>
              <Input
                id="admissionNo"
                value={formData.admissionNo}
                onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                placeholder="GPS1001"
                required
              />
            </div>

            <div>
              <Label htmlFor="session">Session *</Label>
              <Select
                value={formData.session}
                onValueChange={(value) => setFormData({ ...formData, session: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-26">2025-26</SelectItem>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2023-24">2023-24</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter student name"
                required
              />
            </div>

            <div>
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="class">Class *</Label>
              <Select
                value={formData.class}
                onValueChange={(value) => setFormData({ ...formData, class: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Class 10-A">Class 10-A</SelectItem>
                  <SelectItem value="Class 10-B">Class 10-B</SelectItem>
                  <SelectItem value="Class 9-A">Class 9-A</SelectItem>
                  <SelectItem value="Class 9-B">Class 9-B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Select
                value={formData.bloodGroup}
                onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Parent Information */}
          <div className="space-y-4">
            <h3 className="text-gray-900">Parent Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fatherName">Father's Name *</Label>
                <Input
                  id="fatherName"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  placeholder="Enter father's name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="motherName">Mother's Name *</Label>
                <Input
                  id="motherName"
                  value={formData.motherName}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                  placeholder="Enter mother's name"
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-gray-900">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="+1 234 567 8900"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@example.com"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter full address"
                  rows={3}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {student ? 'Update Student' : 'Add Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
