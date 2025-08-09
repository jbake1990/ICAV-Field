import React, { useMemo } from 'react';
import { User, Clock, MapPin, Coffee, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { TimeEntry, User as UserType } from '../types';
import { formatTime } from '../utils/timeUtils';

interface TechnicianStatus {
  user: UserType;
  status: 'active' | 'on_lunch' | 'driving' | 'idle';
  currentEntry?: TimeEntry;
  lastActivity?: Date;
  currentCustomer?: string;
  statusText: string;
  hoursToday: number;
}

interface DashboardProps {
  users: UserType[];
  timeEntries: TimeEntry[];
  isLoading: boolean;
}

export default function Dashboard({ users, timeEntries, isLoading }: DashboardProps) {
  // Calculate technician statuses
  const technicianStatuses = useMemo((): TechnicianStatus[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return users.map(user => {
      // Get all entries for this technician today
      const todayEntries = timeEntries.filter(entry => {
        const entryDate = entry.clockInTime || entry.driveStartTime;
        return entryDate && 
               entryDate >= today && 
               entryDate < tomorrow &&
               entry.technicianName === user.displayName;
      });

      // Find the most recent entry (active or completed)
      const sortedEntries = todayEntries.sort((a, b) => {
        const aTime = a.clockInTime || a.driveStartTime;
        const bTime = b.clockInTime || b.driveStartTime;
        if (!aTime || !bTime) return 0;
        return bTime.getTime() - aTime.getTime();
      });

      const currentEntry = sortedEntries.find(entry => entry.isActive);
      const lastEntry = sortedEntries[0];

      // Calculate total hours today
      const hoursToday = todayEntries.reduce((total, entry) => {
        return total + ((entry.duration || 0) / (1000 * 60 * 60));
      }, 0);

      let status: TechnicianStatus['status'] = 'idle';
      let statusText = 'Idle - No timestamps today';
      let currentCustomer: string | undefined;
      let lastActivity: Date | undefined;

      if (currentEntry) {
        currentCustomer = currentEntry.customerName;
        lastActivity = currentEntry.clockInTime || currentEntry.driveStartTime;

        if (currentEntry.isDriving) {
          status = 'driving';
          statusText = `Driving${currentEntry.driveStartTime ? ` (started ${formatTime(currentEntry.driveStartTime)})` : ''}`;
        } else if (currentEntry.isOnLunch) {
          status = 'on_lunch';
          statusText = `On Lunch${currentEntry.lunchStartTime ? ` (started ${formatTime(currentEntry.lunchStartTime)})` : ''}`;
        } else if (currentEntry.isActive) {
          status = 'active';
          statusText = `Working${currentEntry.clockInTime ? ` (since ${formatTime(currentEntry.clockInTime)})` : ''}`;
        }
      } else if (lastEntry) {
        // Has entries today but none are active
        currentCustomer = lastEntry.customerName;
        lastActivity = lastEntry.clockOutTime || lastEntry.driveEndTime || lastEntry.clockInTime || lastEntry.driveStartTime;
        statusText = `Last activity: ${lastActivity ? formatTime(lastActivity) : 'Unknown'}`;
      }

      return {
        user,
        status,
        currentEntry,
        lastActivity,
        currentCustomer,
        statusText,
        hoursToday
      };
    });
  }, [users, timeEntries]);

  // Sort technicians: active first, then by last activity
  const sortedStatuses = useMemo(() => {
    return [...technicianStatuses].sort((a, b) => {
      // Active technicians first
      if (a.status !== 'idle' && b.status === 'idle') return -1;
      if (a.status === 'idle' && b.status !== 'idle') return 1;
      
      // Then by last activity (most recent first)
      if (a.lastActivity && b.lastActivity) {
        return b.lastActivity.getTime() - a.lastActivity.getTime();
      }
      if (a.lastActivity && !b.lastActivity) return -1;
      if (!a.lastActivity && b.lastActivity) return 1;
      
      // Finally by name
      return a.user.displayName.localeCompare(b.user.displayName);
    });
  }, [technicianStatuses]);

  const getStatusIcon = (status: TechnicianStatus['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'on_lunch':
        return <Coffee className="w-5 h-5 text-orange-500" />;
      case 'driving':
        return <MapPin className="w-5 h-5 text-blue-500" />;
      case 'idle':
        return <XCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TechnicianStatus['status']) => {
    switch (status) {
      case 'active':
        return 'border-green-200 bg-green-50';
      case 'on_lunch':
        return 'border-orange-200 bg-orange-50';
      case 'driving':
        return 'border-blue-200 bg-blue-50';
      case 'idle':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard...</h2>
          <p className="text-gray-500">Fetching technician status data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Technician Dashboard</h1>
          <p className="text-gray-600">Real-time status of all field technicians</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {sortedStatuses.filter(s => s.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <Coffee className="w-8 h-8 text-orange-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {sortedStatuses.filter(s => s.status === 'on_lunch').length}
              </div>
              <div className="text-sm text-gray-600">On Lunch</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <MapPin className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {sortedStatuses.filter(s => s.status === 'driving').length}
              </div>
              <div className="text-sm text-gray-600">Driving</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <XCircle className="w-8 h-8 text-gray-400" />
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {sortedStatuses.filter(s => s.status === 'idle').length}
              </div>
              <div className="text-sm text-gray-600">Idle</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technician Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedStatuses.map((techStatus) => (
          <div
            key={techStatus.user.id}
            className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${getStatusColor(techStatus.status)}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-600" />
                <div className="font-semibold text-gray-900 truncate">
                  {techStatus.user.displayName}
                </div>
              </div>
              {getStatusIcon(techStatus.status)}
            </div>

            {/* Status */}
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-900 mb-1">Status</div>
              <div className="text-sm text-gray-600">{techStatus.statusText}</div>
            </div>

            {/* Current Customer */}
            {techStatus.currentCustomer && (
              <div className="mb-3">
                <div className="text-sm font-medium text-gray-900 mb-1">Current Customer</div>
                <div className="text-sm text-gray-600 truncate">{techStatus.currentCustomer}</div>
              </div>
            )}

            {/* Hours Today */}
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-900 mb-1">Hours Today</div>
              <div className="text-sm text-gray-600">
                {techStatus.hoursToday > 0 ? `${techStatus.hoursToday.toFixed(1)} hrs` : 'No hours logged'}
              </div>
            </div>

            {/* Last Activity */}
            {techStatus.lastActivity && (
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">Last Activity</div>
                <div className="text-xs text-gray-500">
                  {formatTime(techStatus.lastActivity)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sortedStatuses.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Technicians Found</h3>
          <p className="text-gray-500">Add technicians to see their status here.</p>
        </div>
      )}
    </div>
  );
}
