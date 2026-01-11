import React, { useState, useEffect } from 'react';
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
import { classAPI, APIError } from '../../utils/api';
import { AlertCircle } from 'lucide-react';

interface AddClassModalAdminProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  schoolId: string;
  schoolName: string;
}

export function AddClassModalAdmin({ isOpen, onClose, onSave, schoolId, schoolName }: AddClassModalAdminProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    className: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        className: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.className.trim()) {
      setError('Class name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For Superadmin, schoolId is passed as query parameter
      const response = await classAPI.createClass({
        className: formData.className.trim(),
        schoolId: schoolId,
      });
      
      // Only close modal and trigger refresh on success
      if (response.success) {
        // Close modal first, then trigger refresh
        onClose();
        // Call onSave immediately to trigger refresh
        onSave();
      } else {
        setError(response.message || 'Failed to create class');
        setLoading(false);
      }
    } catch (err: any) {
      // Extract error message from various possible formats
      let errorMessage = 'Failed to create class';
      
      // Check if it's an APIError object
      if (err && typeof err === 'object') {
        if (err.message) {
          errorMessage = err.message;
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.data?.message) {
          errorMessage = err.data.message;
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Log error for debugging (remove in production if needed)
      console.error('Class creation error:', err);
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    // Only allow closing if not loading and no error (or user explicitly wants to close)
    if (!open && !loading && !error) {
      onClose();
    } else if (!open && (loading || error)) {
      // Prevent closing during loading or when there's an error
      return;
    } else if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Class</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-600">Error</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                {error.includes('active session') && (
                  <p className="text-xs text-red-500 mt-2">
                    Tip: Go to "Manage Sessions" to activate a session for this school first.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="school" className="mb-2 block">School</Label>
              <Input
                id="school"
                value={schoolName}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="className" className="mb-2 block">Class Name *</Label>
              <Input
                id="className"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                placeholder="e.g., Class 10-A, Grade 5-B"
                required
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                if (!loading) {
                  onClose();
                }
              }} 
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.className.trim()}>
              {loading ? 'Creating...' : 'Create Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}