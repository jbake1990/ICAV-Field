import React from 'react';
import { X, FileText, Brain, User, Building, Calendar, Clock } from 'lucide-react';
import { TimeEntry } from '../types';
import { formatDate, formatTime } from '../utils/timeUtils';

interface JobNotesModalProps {
  entry: TimeEntry | null;
  onClose: () => void;
}

export default function JobNotesModal({ entry, onClose }: JobNotesModalProps) {
  if (!entry) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Job Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Entry Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">{entry.technicianName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">{entry.customerName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {entry.clockInTime ? formatDate(entry.clockInTime) : 'Unknown Date'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {entry.clockInTime && entry.clockOutTime 
                    ? `${formatTime(entry.clockInTime)} - ${formatTime(entry.clockOutTime)}`
                    : entry.clockInTime 
                      ? `Started at ${formatTime(entry.clockInTime)}`
                      : 'No time data'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Job Notes */}
          {entry.jobNotes && entry.jobNotes.trim() ? (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Job Notes</h3>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {entry.jobNotes}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-400">Job Notes</h3>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-center">No job notes available</p>
              </div>
            </div>
          )}

          {/* AI Summary */}
          {entry.aiSummary && entry.aiSummary.trim() ? (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Brain className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-600">AI Summary</h3>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {entry.aiSummary}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Brain className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-400">AI Summary</h3>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-dashed border-purple-200">
                <p className="text-gray-500 text-center">No AI summary available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 