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
import { studentAPI, APIError } from '../../utils/api';

interface Student {
  _id?: string;
  id?: string;
  admissionNo: string;
  photo?: string;
  photoUrl?: string;
  name: string;
  class?: string;
  classId?: any;
  session?: string;
  sessionId?: any;
  fatherName: string;
  motherName?: string;
  mobile: string;
  dob: string;
  address?: string;
  aadhaar?: string;
}

interface Class {
  _id: string;
  className: string;
  frozen?: boolean;
}

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  selectedClass?: Class | null;
  onSave: () => void;
  schoolId?: string; // For Superadmin to pass schoolId
}

export function AddStudentModal({ isOpen, onClose, student, selectedClass, onSave, schoolId }: AddStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    admissionNo: '',
    name: '',
    dob: '',
    fatherName: '',
    motherName: '',
    mobile: '',
    address: '',
    aadhaar: '',
    photoUrl: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        admissionNo: '',
        name: '',
        dob: '',
        fatherName: '',
        motherName: '',
        mobile: '',
        address: '',
        aadhaar: '',
        photoUrl: '',
      });
      setError(null);
    } else if (student) {
      // Populate form for editing
      setFormData({
        admissionNo: student.admissionNo || '',
        name: student.name || '',
        dob: student.dob || '',
        fatherName: student.fatherName || '',
        motherName: student.motherName || '',
        mobile: student.mobile || '',
        address: student.address || '',
        aadhaar: student.aadhaar || '',
        photoUrl: student.photoUrl || '',
      });
    }
  }, [student, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClass || !selectedClass._id) {
      setError('Class must be selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For SCHOOLADMIN, schoolId comes from JWT, sessionId is auto-set by backend via activeSessionMiddleware
      const studentData = {
        admissionNo: formData.admissionNo.trim(),
        name: formData.name.trim(),
        dob: formData.dob,
        fatherName: formData.fatherName.trim(),
        motherName: formData.motherName.trim(),
        mobile: formData.mobile.trim(),
        address: formData.address.trim(),
        classId: selectedClass._id,
        aadhaar: formData.aadhaar.trim() || undefined,
        photoUrl: formData.photoUrl.trim() || undefined,
        schoolId: schoolId, // Pass schoolId for Superadmin (will be sent as query param)
      };

      if (student && student._id) {
        // Update existing student - schoolId is included in studentData for Superadmin
        await studentAPI.updateStudent(student._id, studentData);
      } else {
        // Create new student - schoolId is included in studentData for Superadmin
        await studentAPI.createStudent(studentData);
      }
      
      // Close modal and trigger parent to re-fetch
      onClose();
      onSave();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || (student ? 'Failed to update student' : 'Failed to create student'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? 'Edit Student' : 'Add New Student'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mt-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {selectedClass && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mt-4">
            <p className="text-sm text-blue-600">
              <strong>Class:</strong> {selectedClass.className}
              {selectedClass.frozen && <span className="ml-2 text-orange-600">(Frozen - modifications not allowed)</span>}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admissionNo" className="mb-2 block">Admission Number *</Label>
              <Input
                id="admissionNo"
                value={formData.admissionNo}
                onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                placeholder="e.g., GPS1001"
                required
                disabled={loading || (selectedClass?.frozen === true)}
              />
            </div>

            <div>
              <Label htmlFor="dob" className="mb-2 block">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                required
                disabled={loading || (selectedClass?.frozen === true)}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="name" className="mb-2 block">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter student full name"
                required
                disabled={loading || (selectedClass?.frozen === true)}
              />
            </div>

            <div>
              <Label htmlFor="aadhaar" className="mb-2 block">Aadhaar Number (Optional)</Label>
              <Input
                id="aadhaar"
                value={formData.aadhaar}
                onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
                placeholder="12-digit Aadhaar number"
                maxLength={12}
                disabled={loading || (selectedClass?.frozen === true)}
              />
              <p className="text-xs text-gray-500 mt-1">12 digits only</p>
            </div>

            <div>
              <Label htmlFor="photoUrl" className="mb-2 block">Photo URL (Optional)</Label>
              <Input
                id="photoUrl"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                placeholder="https://example.com/photo.jpg"
                disabled={loading || (selectedClass?.frozen === true)}
              />
              <p className="text-xs text-gray-500 mt-1">Valid image URL (jpg, jpeg, png, gif)</p>
            </div>
          </div>

          {/* Parent Information */}
          <div className="space-y-4 mt-6">
            <h3 className="text-gray-900 font-semibold mb-4">Parent Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fatherName" className="mb-2 block">Father's Name *</Label>
                <Input
                  id="fatherName"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  placeholder="Enter father's name"
                  required
                  disabled={loading || (selectedClass?.frozen === true)}
                />
              </div>

              <div>
                <Label htmlFor="motherName" className="mb-2 block">Mother's Name *</Label>
                <Input
                  id="motherName"
                  value={formData.motherName}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                  placeholder="Enter mother's name"
                  required
                  disabled={loading || (selectedClass?.frozen === true)}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 mt-6">
            <h3 className="text-gray-900 font-semibold mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mobile" className="mb-2 block">Mobile Number *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  required
                  disabled={loading || (selectedClass?.frozen === true)}
                />
                <p className="text-xs text-gray-500 mt-1">10 digits only</p>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address" className="mb-2 block">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter full address"
                  rows={3}
                  required
                  disabled={loading || (selectedClass?.frozen === true)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (selectedClass?.frozen === true) || !selectedClass}
            >
              {loading 
                ? (student ? 'Updating...' : 'Creating...') 
                : (student ? 'Update Student' : 'Create Student')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
