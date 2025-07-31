import React, { useState, useMemo } from 'react';
import { FileText, Brain, Search, Filter, Calendar, User, Building } from 'lucide-react';
import { TimeEntry } from '../types';
import { formatDate, formatTime } from '../utils/timeUtils';

interface JobNotesViewProps {
  timeEntries: TimeEntry[];
  onClose: () => void;
}

export default function JobNotesView({ timeEntries, onClose }: JobNotesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');

  // Filter entries that have job notes or AI summaries
  const entriesWithNotes = useMemo(() => {
    return timeEntries.filter(entry => 
      (entry.jobNotes && entry.jobNotes.trim()) || 
      (entry.aiSummary && entry.aiSummary.trim())
    );
  }, [timeEntries]);

  // Filter based on search and filters
  const filteredEntries = useMemo(() => {
    return entriesWithNotes.filter(entry => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          entry.customerName.toLowerCase().includes(searchLower) ||
          entry.technicianName.toLowerCase().includes(searchLower) ||
          (entry.jobNotes && entry.jobNotes.toLowerCase().includes(searchLower)) ||
          (entry.aiSummary && entry.aiSummary.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Technician filter
      if (selectedTechnician !== 'all' && entry.technicianName !== selectedTechnician) {
        return false;
      }

      // Customer filter
      if (selectedCustomer !== 'all' && entry.customerName !== selectedCustomer) {
        return false;
      }

      return true;
    });
  }, [entriesWithNotes, searchTerm, selectedTechnician, selectedCustomer]);

  // Get unique technicians and customers for filters
  const technicians = useMemo(() => 
    [...new Set(entriesWithNotes.map(entry => entry.technicianName))].sort(),
    [entriesWithNotes]
  );

  const customers = useMemo(() => 
    [...new Set(entriesWithNotes.map(entry => entry.customerName))].sort(),
    [entriesWithNotes]
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Job Notes & Summaries</h2>
            <span className="text-sm text-gray-500">
              ({filteredEntries.length} of {entriesWithNotes.length} entries)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FileText className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Technician Filter */}
            <div>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Technicians</option>
                {technicians.map(tech => (
                  <option key={tech} value={tech}>{tech}</option>
                ))}
              </select>
            </div>

            {/* Customer Filter */}
            <div>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Customers</option>
                {customers.map(customer => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTechnician('all');
                setSelectedCustomer('all');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Job Notes Found</h3>
              <p className="text-gray-500">
                {entriesWithNotes.length === 0 
                  ? "No time entries have job notes or AI summaries yet."
                  : "No entries match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredEntries.map(entry => (
                <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  {/* Entry Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-gray-900">{entry.technicianName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{entry.customerName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-500">
                          {entry.clockInTime ? formatDate(entry.clockInTime) : 'Unknown Date'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {entry.clockInTime && entry.clockOutTime && (
                        <span>
                          {formatTime(entry.clockInTime)} - {formatTime(entry.clockOutTime)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Job Notes */}
                  {entry.jobNotes && entry.jobNotes.trim() && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <h4 className="font-medium text-gray-900">Job Notes</h4>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">{entry.jobNotes}</p>
                      </div>
                    </div>
                  )}

                  {/* AI Summary */}
                  {entry.aiSummary && entry.aiSummary.trim() && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Brain className="w-4 h-4 text-purple-500" />
                        <h4 className="font-medium text-purple-600">AI Summary</h4>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <p className="text-gray-700 whitespace-pre-wrap">{entry.aiSummary}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 