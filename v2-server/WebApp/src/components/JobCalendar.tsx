import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Plus, Trash2, Edit, AlertTriangle, X, GripVertical } from 'lucide-react';
import { Job, JobAssignment, CalendarEvent, User, JobStatus } from '../types';

interface JobCalendarProps {
  users: User[];
  jobs: Job[];
  assignments: JobAssignment[];
  onAssignJob: (jobId: string, userId: string, date: Date, hours: number) => Promise<void>;
  onUpdateAssignment: (assignmentId: string, updates: Partial<JobAssignment>) => Promise<void>;
  onDeleteAssignment: (assignmentId: string) => Promise<void>;
  onCreateJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

interface DraggedJob {
  job: Job;
  sourceType: 'unassigned' | 'calendar';
  sourceAssignmentId?: string;
}

export default function JobCalendar({ 
  users, 
  jobs, 
  assignments, 
  onAssignJob, 
  onUpdateAssignment, 
  onDeleteAssignment,
  onCreateJob 
}: JobCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [draggedJob, setDraggedJob] = useState<DraggedJob | null>(null);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [technicianOrder, setTechnicianOrder] = useState<string[]>([]);
  const [draggedTechnician, setDraggedTechnician] = useState<string | null>(null);
  const [newJob, setNewJob] = useState<{
    title: string;
    customerName: string;
    description: string;
    location: string;
    estimatedHours: number;
    priority: 'low' | 'medium' | 'high';
    status: JobStatus;
  }>({
    title: '',
    customerName: '',
    description: '',
    location: '',
    estimatedHours: 8,
    priority: 'medium',
    status: 'draft'
  });

  // Get the start of the current week (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  // Get weekdays (Monday to Friday)
  const getWeekdays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekStart = getWeekStart(currentWeek);
  const weekdays = getWeekdays(weekStart);
  
  // Debug logging
  console.log('JobCalendar - Users received:', users.length);
  console.log('JobCalendar - Users data:', users.map(u => ({
    id: u.id,
    displayName: u.displayName,
    role: u.role,
    isActive: u.isActive
  })));
  
  // Filter technicians with more lenient filtering and fallback
  const technicians = users.filter(user => {
    const isTech = user.role === 'tech' || (!user.role && user.displayName);
    const isActive = user.isActive !== false; // Default to active if not specified
    console.log('JobCalendar - User filter:', user.displayName, 'isTech:', isTech, 'isActive:', isActive);
    return isTech && isActive;
  });
  
  // If no technicians found, create some demo ones for testing
  const baseTechnicians = technicians.length > 0 ? technicians : [
    { id: 'demo1', displayName: 'John Doe', role: 'tech' as const, isActive: true, username: 'john.doe', email: 'john@icav.com' },
    { id: 'demo2', displayName: 'Jane Smith', role: 'tech' as const, isActive: true, username: 'jane.smith', email: 'jane@icav.com' },
    { id: 'demo3', displayName: 'Mike Johnson', role: 'tech' as const, isActive: true, username: 'mike.johnson', email: 'mike@icav.com' },
    { id: 'demo4', displayName: 'Sarah Wilson', role: 'tech' as const, isActive: true, username: 'sarah.wilson', email: 'sarah@icav.com' },
    { id: 'demo5', displayName: 'David Brown', role: 'tech' as const, isActive: true, username: 'david.brown', email: 'david@icav.com' }
  ] as typeof users;

  // Initialize technician order if not set (load from localStorage or default)
  React.useEffect(() => {
    if (baseTechnicians.length > 0 && technicianOrder.length === 0) {
      const savedOrder = localStorage.getItem('icav-technician-order');
      if (savedOrder) {
        try {
          const parsedOrder = JSON.parse(savedOrder);
          // Validate that saved order contains valid technician IDs
          const validOrder = parsedOrder.filter((id: string) => 
            baseTechnicians.some(t => t.id === id)
          );
          if (validOrder.length > 0) {
            setTechnicianOrder(validOrder);
            return;
          }
        } catch (error) {
          console.warn('Failed to parse saved technician order:', error);
        }
      }
      // Default to current order
      setTechnicianOrder(baseTechnicians.map(t => t.id));
    }
  }, [baseTechnicians, technicianOrder.length]);

  // Save technician order to localStorage when it changes
  React.useEffect(() => {
    if (technicianOrder.length > 0) {
      localStorage.setItem('icav-technician-order', JSON.stringify(technicianOrder));
    }
  }, [technicianOrder]);

  // Apply custom order to technicians
  const displayTechnicians = React.useMemo(() => {
    if (technicianOrder.length === 0) return baseTechnicians;
    
    const orderedTechnicians = [];
    // Add technicians in the specified order
    for (const techId of technicianOrder) {
      const tech = baseTechnicians.find(t => t.id === techId);
      if (tech) orderedTechnicians.push(tech);
    }
    // Add any new technicians not in the order list
    for (const tech of baseTechnicians) {
      if (!technicianOrder.includes(tech.id)) {
        orderedTechnicians.push(tech);
      }
    }
    return orderedTechnicians;
  }, [baseTechnicians, technicianOrder]);
  
  console.log('JobCalendar - Final technicians:', displayTechnicians.length);

  // Get unassigned jobs
  const unassignedJobs = jobs.filter(job => 
    job.status === 'draft' || 
    (job.status === 'assigned' && !assignments.some(a => a.jobId === job.id))
  );

  // Get assignments for the current week
  const weekAssignments = assignments.filter(assignment => {
    const assignedDate = new Date(assignment.assignedDate);
    return assignedDate >= weekStart && assignedDate < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  });

  // Get assignments for a specific day and technician
  const getAssignmentsForDay = (technicianId: string, date: Date) => {
    const dateStr = date.toDateString();
    return weekAssignments.filter(assignment => 
      assignment.userId === technicianId && 
      new Date(assignment.assignedDate).toDateString() === dateStr
    );
  };

  // Handle drag start for jobs
  const handleDragStart = (e: React.DragEvent, job: Job, sourceType: 'unassigned' | 'calendar', assignmentId?: string) => {
    // Stop propagation to prevent interference with technician drag/drop
    e.stopPropagation();
    setDraggedJob({ job, sourceType, sourceAssignmentId: assignmentId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ jobId: job.id, sourceType, assignmentId }));
    e.dataTransfer.setData('drag-type', 'job');
  };

  // Handle technician drag start
  const handleTechnicianDragStart = (e: React.DragEvent, technicianId: string) => {
    // Stop propagation to prevent interference with job drag/drop
    e.stopPropagation();
    setDraggedTechnician(technicianId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', technicianId);
    e.dataTransfer.setData('drag-type', 'technician');
  };

  // Handle technician drag over
  const handleTechnicianDragOver = (e: React.DragEvent) => {
    // Only handle if it's a technician being dragged
    if (e.dataTransfer.types.includes('text/plain') && draggedTechnician) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  // Handle technician drop
  const handleTechnicianDrop = (e: React.DragEvent, targetTechnicianId: string) => {
    // Only handle if it's a technician being dragged
    if (draggedTechnician) {
      e.preventDefault();
      e.stopPropagation();
      
      if (draggedTechnician === targetTechnicianId) {
        setDraggedTechnician(null);
        return;
      }

      const newOrder = [...technicianOrder];
      const draggedIndex = newOrder.indexOf(draggedTechnician);
      const targetIndex = newOrder.indexOf(targetTechnicianId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Remove dragged item and insert at target position
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedTechnician);
        setTechnicianOrder(newOrder);
      }

      setDraggedTechnician(null);
    }
  };

  // Handle drop for jobs
  const handleDrop = async (e: React.DragEvent, technicianId: string, date: Date) => {
    // Only handle job drops, not technician drops
    if (!draggedJob || draggedTechnician) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();

    const { job, sourceType, sourceAssignmentId } = draggedJob;

    try {
      if (sourceType === 'unassigned') {
        // Assign new job
        await onAssignJob(job.id, technicianId, date, job.estimatedHours);
      } else if (sourceType === 'calendar' && sourceAssignmentId) {
        // Move existing assignment
        await onUpdateAssignment(sourceAssignmentId, {
          userId: technicianId,
          assignedDate: date,
          technicianName: displayTechnicians.find(t => t.id === technicianId)?.displayName || ''
        });
      }
    } catch (error) {
      console.error('Failed to assign job:', error);
    }

    setDraggedJob(null);
  };

  // Handle drag over for jobs
  const handleDragOver = (e: React.DragEvent) => {
    // Only handle job drags, not technician drags
    if (draggedJob && !draggedTechnician) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  // Calculate total hours for a day
  const getDayTotalHours = (technicianId: string, date: Date) => {
    const dayAssignments = getAssignmentsForDay(technicianId, date);
    return dayAssignments.reduce((total, assignment) => total + assignment.assignedHours, 0);
  };

  // Check if day has overrun
  const isDayOverrun = (technicianId: string, date: Date) => {
    return getDayTotalHours(technicianId, date) > 8;
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Handle job creation
  const handleCreateJob = async () => {
    try {
      console.log('JobCalendar - Creating job:', newJob);
      
      // Get current user info - this should be passed as a prop or from context
      const jobData = {
        ...newJob,
        createdBy: 'admin' // This should come from the authenticated user
      };
      
      console.log('JobCalendar - Job data to send:', jobData);
      await onCreateJob(jobData);
      
      // Reset form
      setNewJob({
        title: '',
        customerName: '',
        description: '',
        location: '',
        estimatedHours: 8,
        priority: 'medium',
        status: 'draft'
      });
      setShowCreateJob(false);
      console.log('JobCalendar - Job created successfully');
    } catch (error) {
      console.error('JobCalendar - Failed to create job:', error);
      alert('Failed to create job: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Job Calendar</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentWeek(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000))}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              Previous Week
            </button>
            <span className="text-sm font-medium">
              {weekStart.toLocaleDateString()} - {weekdays[4].toLocaleDateString()}
            </span>
            <button
              onClick={() => setCurrentWeek(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000))}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              Next Week
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowCreateJob(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Create Job</span>
        </button>
      </div>

      <div className="flex-1 flex space-x-6">
        {/* Unassigned Jobs Panel */}
        <div className="w-64 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Unassigned Jobs</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unassignedJobs.map(job => (
              <div
                key={job.id}
                draggable
                onDragStart={(e) => handleDragStart(e, job, 'unassigned')}
                className="p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:shadow-md transition-shadow"
              >
                <div className="font-medium text-sm">{job.title}</div>
                <div className="text-xs text-gray-600">{job.customerName}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{job.estimatedHours}h</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    job.priority === 'high' ? 'bg-red-100 text-red-700' :
                    job.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {job.priority}
                  </span>
                </div>
              </div>
            ))}
            {unassignedJobs.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                No unassigned jobs
              </div>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200">
          <div className="grid grid-cols-6 border-b border-gray-200">
            {/* Header row */}
            <div className="p-4 bg-gray-50 font-semibold">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span>Technician</span>
                  <span className="ml-2 text-xs text-gray-500 font-normal">(drag to reorder)</span>
                </div>
                <button
                  onClick={() => {
                    const alphabeticalOrder = [...baseTechnicians]
                      .sort((a, b) => a.displayName.localeCompare(b.displayName))
                      .map(t => t.id);
                    setTechnicianOrder(alphabeticalOrder);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Alphabetize
                </button>
              </div>
            </div>
            {weekdays.map(day => (
              <div key={day.toISOString()} className="p-4 bg-gray-50 font-semibold text-center">
                {formatDate(day)}
              </div>
            ))}
          </div>

          {/* Technician rows */}
          {displayTechnicians.map(technician => (
            <div 
              key={technician.id} 
              className={`grid grid-cols-6 border-b border-gray-200 min-h-[120px] transition-all duration-200 ${
                draggedTechnician === technician.id ? 'opacity-50 bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {/* Technician name with drag handle */}
              <div 
                className="p-4 bg-gray-50 border-r border-gray-200 font-medium flex items-center group"
                draggable
                onDragStart={(e) => handleTechnicianDragStart(e, technician.id)}
                onDragOver={handleTechnicianDragOver}
                onDrop={(e) => handleTechnicianDrop(e, technician.id)}
              >
                <GripVertical 
                  className="w-4 h-4 text-gray-400 mr-3 cursor-grab group-hover:text-gray-600 transition-colors" 
                />
                <span className="select-none">{technician.displayName}</span>
              </div>

              {/* Days */}
              {weekdays.map(day => {
                const dayAssignments = getAssignmentsForDay(technician.id, day);
                const totalHours = getDayTotalHours(technician.id, day);
                const isOverrun = isDayOverrun(technician.id, day);

                return (
                  <div
                    key={`${technician.id}-${day.toISOString()}`}
                    className="p-2 border-r border-gray-200 min-h-[120px]"
                    onDrop={(e) => handleDrop(e, technician.id, day)}
                    onDragOver={handleDragOver}
                  >
                    {/* Day total hours indicator */}
                    {totalHours > 0 && (
                      <div className={`text-xs mb-2 flex items-center justify-between ${
                        isOverrun ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        <span>{totalHours}h</span>
                        {isOverrun && <AlertTriangle className="w-3 h-3" />}
                      </div>
                    )}

                    {/* Assigned jobs */}
                    <div className="space-y-1">
                      {dayAssignments.map(assignment => {
                        const job = jobs.find(j => j.id === assignment.jobId);
                        if (!job) return null;

                        return (
                          <div
                            key={assignment.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, job, 'calendar', assignment.id)}
                            className="p-2 bg-blue-100 border border-blue-200 rounded text-xs cursor-move hover:bg-blue-200 transition-colors"
                          >
                            <div className="font-medium truncate">{job.title}</div>
                            <div className="text-gray-600 truncate">{job.customerName}</div>
                            <div className="flex items-center justify-between mt-1">
                              <span>{assignment.assignedHours}h</span>
                              <span className={`px-1 py-0.5 rounded text-xs ${
                                assignment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                assignment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {assignment.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Create Job Modal */}
      {showCreateJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Job</h3>
              <button
                onClick={() => setShowCreateJob(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter job title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={newJob.customerName}
                  onChange={(e) => setNewJob({ ...newJob, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter job description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={newJob.location}
                  onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter job location"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newJob.estimatedHours}
                    onChange={(e) => setNewJob({ ...newJob, estimatedHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newJob.priority}
                    onChange={(e) => setNewJob({ ...newJob, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateJob(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJob}
                disabled={!newJob.title || !newJob.customerName}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 