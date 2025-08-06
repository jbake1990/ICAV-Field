import React from 'react';
import { X, Clock, User, MapPin, Calendar, FileText, Download, Edit, Brain } from 'lucide-react';
import { WorkOrder, TimeEntry } from '../types';

interface WorkOrderModalProps {
  workOrder: WorkOrder | null;
  onClose: () => void;
  onEdit: (workOrder: WorkOrder) => void;
  onExport: (workOrder: WorkOrder) => void;
}

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  workOrder,
  onClose,
  onEdit,
  onExport
}) => {
  if (!workOrder) return null;

  const formatDuration = (milliseconds: number) => {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: WorkOrder['status']) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getJobTypeColor = (jobType: WorkOrder['jobType']) => {
    switch (jobType) {
      case 'quoted': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'service': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'bench': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateTotalHours = (timeEntries: TimeEntry[]) => {
    return timeEntries.reduce((total, entry) => {
      if (entry.duration) {
        // Convert milliseconds to hours
        return total + (entry.duration / (1000 * 60 * 60));
      }
      return total;
    }, 0);
  };

  const totalWorkHours = calculateTotalHours(workOrder.timeEntries);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Work Order Details</h2>
              <p className="text-gray-600">Customer: {workOrder.customerName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(workOrder)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => onExport(workOrder)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Technician:</span>
                    <span className="text-sm font-medium text-gray-900">{workOrder.technicianName}</span>
                  </div>
                  
                  {workOrder.location && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Location:</span>
                      <span className="text-sm font-medium text-gray-900">{workOrder.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Assigned Date:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(workOrder.assignedDate)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Estimated Hours:</span>
                    <span className="text-sm font-medium text-gray-900">{workOrder.estimatedHours}h</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Status & Priority</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(workOrder.status)}`}>
                      {workOrder.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">Job Type:</span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getJobTypeColor(workOrder.jobType)}`}>
                      {workOrder.jobType}
                    </span>
                  </div>
                  
                  {totalWorkHours > 0 && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">Actual Hours:</span>
                      <span className="text-sm font-medium text-gray-900">{formatDuration(totalWorkHours)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Job Description */}
          {workOrder.jobDescription && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{workOrder.jobDescription}</p>
              </div>
            </div>
          )}

          {/* Work Summary */}
          {workOrder.workSummary && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <span>Work Summary</span>
              </h3>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-purple-800 whitespace-pre-wrap">{workOrder.workSummary}</p>
              </div>
            </div>
          )}

          {/* Time Entries */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Time Entries ({workOrder.timeEntries.length})
            </h3>
            
            {/* Debug info */}
            <div className="bg-yellow-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-yellow-800">Debug Info:</h4>
              <p className="text-sm text-yellow-700">Job ID: {workOrder.jobId}</p>
              <p className="text-sm text-yellow-700">Job Assignment ID: {workOrder.jobAssignmentId}</p>
              <p className="text-sm text-yellow-700">Technician: {workOrder.technicianName}</p>
              <p className="text-sm text-yellow-700">Customer: {workOrder.customerName}</p>
              <p className="text-sm text-yellow-700">Time Entries Count: {workOrder.timeEntries.length}</p>
              {workOrder.timeEntries.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-yellow-700">First Entry Details:</p>
                  <p className="text-sm text-yellow-700">- Job ID: {workOrder.timeEntries[0].jobId}</p>
                  <p className="text-sm text-yellow-700">- Job Assignment ID: {workOrder.timeEntries[0].jobAssignmentId}</p>
                  <p className="text-sm text-yellow-700">- Technician: {workOrder.timeEntries[0].technicianName}</p>
                  <p className="text-sm text-yellow-700">- Customer: {workOrder.timeEntries[0].customerName}</p>
                </div>
              )}
              {workOrder.timeEntries.length === 0 && (
                <div className="mt-2">
                  <p className="text-sm text-yellow-700">No time entries found. Possible reasons:</p>
                  <p className="text-sm text-yellow-700">- Time entries don't have matching jobId</p>
                  <p className="text-sm text-yellow-700">- Time entries don't have matching customer name</p>
                  <p className="text-sm text-yellow-700">- Time entries don't have matching technician name</p>
                </div>
              )}
            </div>
            
            {workOrder.timeEntries.length > 0 && (
              <div className="space-y-3">
                {workOrder.timeEntries.map((entry, index) => (
                  <div key={entry.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-900">
                          Entry #{index + 1}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(entry.clockInTime || new Date())}
                        </span>
                      </div>
                      {entry.duration && (
                        <span className="text-sm font-medium text-gray-900">
                          {formatDuration(entry.duration)}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {entry.clockInTime && (
                        <div>
                          <span className="text-gray-500">Clock In:</span>
                          <span className="ml-2 font-medium">{formatTime(entry.clockInTime)}</span>
                        </div>
                      )}
                      
                      {entry.clockOutTime && (
                        <div>
                          <span className="text-gray-500">Clock Out:</span>
                          <span className="ml-2 font-medium">{formatTime(entry.clockOutTime)}</span>
                        </div>
                      )}
                      
                      {entry.driveStartTime && (
                        <div>
                          <span className="text-gray-500">Drive Start:</span>
                          <span className="ml-2 font-medium">{formatTime(entry.driveStartTime)}</span>
                        </div>
                      )}
                      
                      {entry.driveEndTime && (
                        <div>
                          <span className="text-gray-500">Drive End:</span>
                          <span className="ml-2 font-medium">{formatTime(entry.driveEndTime)}</span>
                        </div>
                      )}
                    </div>
                    
                    {entry.aiSummary && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <Brain className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-600">Summary</span>
                        </div>
                        <p className="text-sm text-gray-700">{entry.aiSummary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {workOrder.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Notes</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{workOrder.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 