import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Plus, Trash2, Edit, AlertTriangle, X, GripVertical } from 'lucide-react';
import { Job, JobAssignment, CalendarEvent, User, JobStatus } from '../types';

interface JobCalendarProps {
  users: User[];
  jobs: Job[];
  assignments: JobAssignment[];
  onAssignJob: (jobId: string, userId: string, date: Date) => Promise<void>;
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

  // Get weekdays (Monday to Friday) - Fix timezone issues
  const getWeekdays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      // Create date at noon to avoid timezone issues
      const day = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i, 12, 0, 0);
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
      if (!orderedTechnicians.find(t => t.id === tech.id)) {
        orderedTechnicians.push(tech);
      }
    }
    return orderedTechnicians;
  }, [baseTechnicians, technicianOrder]);

  // Get unassigned jobs (jobs with no assignments or incomplete assignments)
  const unassignedJobs = jobs.filter(job => {
    const jobAssignments = assignments.filter(a => a.jobId === job.id);
    const totalAssignedHours = jobAssignments.reduce((sum, a) => sum + a.assignedHours, 0);
    return totalAssignedHours < job.estimatedHours;
  });

  // Get remaining hours for a job
  const getJobRemainingHours = (job: Job) => {
    const jobAssignments = assignments.filter(a => a.jobId === job.id);
    const totalAssignedHours = jobAssignments.reduce((sum, a) => sum + a.assignedHours, 0);
    return Math.max(0, job.estimatedHours - totalAssignedHours);
  };

  // Get assignments for a specific technician and day
  const getAssignmentsForDay = (technicianId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return assignments.filter(assignment => 
      assignment.userId === technicianId && 
      assignment.assignedDate.toISOString().split('T')[0] === dateStr
    );
  };

  // Handle drag start for jobs
  const handleDragStart = (e: React.DragEvent, job: Job, sourceType: 'unassigned' | 'calendar', assignmentId?: string) => {
    setDraggedJob({ job, sourceType, sourceAssignmentId: assignmentId });
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle technician drag start
  const handleTechnicianDragStart = (e: React.DragEvent, technicianId: string) => {
    setDraggedTechnician(technicianId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle technician drag over
  const handleTechnicianDragOver = (e: React.DragEvent) => {
    if (draggedTechnician) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  // Handle technician drop (reordering)
  const handleTechnicianDrop = (e: React.DragEvent, targetTechnicianId: string) => {
    if (!draggedTechnician || draggedTechnician === targetTechnicianId) {
      setDraggedTechnician(null);
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();

    const newOrder = [...technicianOrder];
    const draggedIndex = newOrder.indexOf(draggedTechnician);
    const targetIndex = newOrder.indexOf(targetTechnicianId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove dragged item
      newOrder.splice(draggedIndex, 1);
      // Insert at target position
      newOrder.splice(targetIndex, 0, draggedTechnician);
      setTechnicianOrder(newOrder);
    }
    
    setDraggedTechnician(null);
  };

  // Handle drop for jobs (simplified - no time slots)
  const handleDrop = async (e: React.DragEvent, technicianId: string, date: Date) => {
    if (!draggedJob) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();

    const { job, sourceType, sourceAssignmentId } = draggedJob;
    
    console.log('Drop event:', {
      jobTitle: job.title,
      technicianId,
      date: date.toDateString(),
      sourceType,
      sourceAssignmentId
    });

    if (sourceType === 'unassigned') {
      // Assign entire job to the day
      await onAssignJob(job.id, technicianId, date);
    } else if (sourceType === 'calendar' && sourceAssignmentId) {
      // Move existing assignment to new tech/date
      const technicianName = displayTechnicians.find(t => t.id === technicianId)?.displayName || '';
      
      await onUpdateAssignment(sourceAssignmentId, {
        userId: technicianId,
        assignedDate: date,
        technicianName
      });
    }

    setDraggedJob(null);
  };

  // Handle drag over for jobs
  const handleDragOver = (e: React.DragEvent) => {
    if (draggedJob && !draggedTechnician) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
    }
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
      
      const jobData = {
        ...newJob,
        createdBy: 'admin'
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
          <h3 className="text-lg font-semibold mb-4">Jobs ({unassignedJobs.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unassignedJobs.map(job => {
              const remainingHours = getJobRemainingHours(job);
              const assignedHours = job.estimatedHours - remainingHours;
              
              return (
                <div
                  key={job.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, job, 'unassigned')}
                  className="p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:shadow-md transition-shadow"
                >
                  <div className="font-medium text-sm">{job.title}</div>
                  <div className="text-xs text-gray-600">{job.customerName}</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs">
                      <span className="text-blue-600 font-medium">{remainingHours}h remaining</span>
                      {assignedHours > 0 && (
                        <span className="text-gray-500 ml-1">({assignedHours}h assigned)</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      job.priority === 'high' ? 'bg-red-100 text-red-700' :
                      job.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {job.priority}
                    </span>
                  </div>
                </div>
              );
            })}
            {unassignedJobs.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No unassigned jobs</p>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200">
          <div className="grid grid-cols-6 gap-0">
            {/* Header row */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Technicians</span>
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            {weekdays.map((day, dayIndex) => (
              <div key={dayIndex} className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">{formatDate(day)}</div>
                  <div className="text-xs text-gray-500">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
              </div>
            ))}

            {/* Technician rows */}
            {displayTechnicians.map((technician, techIndex) => (
              <React.Fragment key={technician.id}>
                {/* Technician name column */}
                <div 
                  className={`p-3 border-r border-gray-200 ${
                    draggedTechnician === technician.id ? 'bg-blue-50' : 'bg-white'
                  }`}
                  draggable
                  onDragStart={(e) => handleTechnicianDragStart(e, technician.id)}
                  onDragOver={handleTechnicianDragOver}
                  onDrop={(e) => handleTechnicianDrop(e, technician.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{technician.displayName}</span>
                    </div>
                    <GripVertical className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Day columns for this technician */}
                {weekdays.map((day, dayIndex) => {
                  const dayAssignments = getAssignmentsForDay(technician.id, day);
                  const totalHours = dayAssignments.reduce((sum, a) => sum + a.assignedHours, 0);
                  
                  return (
                    <div
                      key={`${technician.id}-${dayIndex}`}
                      className={`p-2 border-r border-gray-200 min-h-[120px] ${
                        draggedJob ? 'bg-blue-50' : 'bg-white'
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, technician.id, day)}
                    >
                      {/* Day assignments */}
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
                              <div className="font-medium text-blue-900">{job.title}</div>
                              <div className="text-blue-700">{job.customerName}</div>
                              <div className="text-blue-600">{assignment.assignedHours}h</div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Day total */}
                      {totalHours > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-600">
                            Total: {totalHours}h
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
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