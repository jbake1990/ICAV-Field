import React, { useState, useMemo } from 'react';
import { Clock, User, MapPin, Calendar, FileText, Download, Edit, Eye, Filter, Search } from 'lucide-react';
import { WorkOrder, WorkOrderFilters, TimeEntry } from '../types';

interface WorkOrdersProps {
  workOrders: WorkOrder[];
  onViewWorkOrder: (workOrder: WorkOrder) => void;
  onEditWorkOrder: (workOrder: WorkOrder) => void;
  onExportWorkOrder: (workOrder: WorkOrder) => void;
  isLoading?: boolean;
}

export const WorkOrders: React.FC<WorkOrdersProps> = ({
  workOrders,
  onViewWorkOrder,
  onEditWorkOrder,
  onExportWorkOrder,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<WorkOrderFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(workOrder => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          workOrder.customerName.toLowerCase().includes(searchLower) ||
          workOrder.technicianName.toLowerCase().includes(searchLower) ||
          workOrder.jobDescription?.toLowerCase().includes(searchLower) ||
          workOrder.location?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(workOrder.status)) return false;
      }

      // Job Type filter
      if (filters.jobType && filters.jobType.length > 0) {
        if (!filters.jobType.includes(workOrder.jobType)) return false;
      }

      // Technician filter
      if (filters.technicianName) {
        if (workOrder.technicianName !== filters.technicianName) return false;
      }

      // Customer filter
      if (filters.customerName) {
        if (workOrder.customerName !== filters.customerName) return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const orderDate = new Date(workOrder.assignedDate);
        if (orderDate < filters.dateRange.start || orderDate > filters.dateRange.end) return false;
      }

      return true;
    });
  }, [workOrders, filters, searchTerm]);

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

  const formatDuration = (milliseconds: number) => {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Work Orders</h2>
          <p className="text-gray-600">Manage and track field work orders</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search work orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status?.join(',') || ''}
                  onChange={(e) => {
                    const values = e.target.value ? e.target.value.split(',') : [];
                    setFilters(prev => ({ ...prev, status: values as WorkOrder['status'][] }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                <select
                  value={filters.jobType?.join(',') || ''}
                  onChange={(e) => {
                    const values = e.target.value ? e.target.value.split(',') : [];
                    setFilters(prev => ({ ...prev, jobType: values as WorkOrder['jobType'][] }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Job Types</option>
                  <option value="quoted">Quoted Job</option>
                  <option value="service">Service</option>
                  <option value="bench">Bench</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                <select
                  value={filters.technicianName || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, technicianName: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Technicians</option>
                  {Array.from(new Set(workOrders.map(wo => wo.technicianName))).map(tech => (
                    <option key={tech} value={tech}>{tech}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Work Orders List */}
      <div className="space-y-4">
        {filteredWorkOrders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No work orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || Object.keys(filters).length > 0 
                ? 'Try adjusting your search or filters.'
                : 'Work orders will appear here once jobs are assigned and time tracking begins.'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredWorkOrders.map((workOrder) => (
              <div
                key={workOrder.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{workOrder.customerName}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(workOrder.status)}`}>
                        {workOrder.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getJobTypeColor(workOrder.jobType)}`}>
                        {workOrder.jobType}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{workOrder.technicianName}</span>
                      </div>
                      
                      {workOrder.location && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{workOrder.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {new Date(workOrder.assignedDate).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {workOrder.totalWorkHours 
                            ? formatDuration(workOrder.totalWorkHours)
                            : `${workOrder.estimatedHours}h (estimated)`
                          }
                        </span>
                      </div>
                    </div>

                    {workOrder.jobDescription && (
                      <p className="text-sm text-gray-600 mb-3">{workOrder.jobDescription}</p>
                    )}

                    {workOrder.workSummary && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-3">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">Work Summary</h4>
                        <p className="text-sm text-blue-800">{workOrder.workSummary}</p>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{workOrder.timeEntries.length} time entries</span>
                      {workOrder.totalDriveHours && workOrder.totalDriveHours > 0 && (
                        <span>• {formatDuration(workOrder.totalDriveHours)} drive time</span>
                      )}
                      {workOrder.totalLunchHours && workOrder.totalLunchHours > 0 && (
                        <span>• {formatDuration(workOrder.totalLunchHours)} lunch time</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onViewWorkOrder(workOrder)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => onEditWorkOrder(workOrder)}
                      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit Work Order"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => onExportWorkOrder(workOrder)}
                      className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Export PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 