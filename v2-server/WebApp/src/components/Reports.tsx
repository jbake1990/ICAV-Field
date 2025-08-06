import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Download, FileText, Users, Building, X, Search, Clock, User, MapPin } from 'lucide-react';
import { TimeEntry, ReportType, ReportFilters, ReportData, TechnicianReport, CustomerReport } from '../types';
import { formatDate, formatTime } from '../utils/timeUtils';

interface ReportsProps {
  timeEntries: TimeEntry[];
  onClose: () => void;
}

type SearchMode = 'tech' | 'customer' | 'lunch';

interface TechSearchData {
  technicianName: string;
  entries: TimeEntry[];
  totalHours: number;
  totalDriveHours: number;
  totalLunchHours: number;
  daysWorked: number;
}

interface CustomerSearchData {
  customerName: string;
  jobId?: string;
  entries: TimeEntry[];
  technicians: string[];
  totalHours: number;
  totalDriveHours: number;
  totalLunchHours: number;
}

interface LunchSearchData {
  date: Date;
  entries: TimeEntry[];
  technicians: string[];
  totalLunchHours: number;
  averageLunchDuration: number;
}

export default function Reports({ timeEntries, onClose }: ReportsProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>('tech');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date()
    },
    includeDriveTime: true,
    includeLunchTime: true,
    groupBy: 'technician'
  });

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Get unique technicians and customers for dropdowns
  const technicians = useMemo(() => {
    const techs = new Set(timeEntries.map(entry => entry.technicianName));
    return Array.from(techs).sort();
  }, [timeEntries]);

  const customers = useMemo(() => {
    const custs = new Set(timeEntries.map(entry => entry.customerName));
    return Array.from(custs).sort();
  }, [timeEntries]);

  // Filter entries based on current filters
  const filteredEntries = useMemo(() => {
    return timeEntries.filter(entry => {
      const entryDate = entry.clockInTime || entry.driveStartTime;
      if (!entryDate) return false;

      // Date range filter
      if (entryDate < filters.dateRange.start || entryDate > filters.dateRange.end) {
        return false;
      }

      return true;
    });
  }, [timeEntries, filters]);

  // Tech Search Data
  const techSearchData = useMemo((): TechSearchData[] => {
    if (!selectedTechnician) return [];

    const techEntries = filteredEntries.filter(entry => 
      entry.technicianName.toLowerCase().includes(selectedTechnician.toLowerCase())
    );

    const techMap = new Map<string, TechSearchData>();
    
    techEntries.forEach(entry => {
      if (!techMap.has(entry.technicianName)) {
        techMap.set(entry.technicianName, {
          technicianName: entry.technicianName,
          entries: [],
          totalHours: 0,
          totalDriveHours: 0,
          totalLunchHours: 0,
          daysWorked: 0
        });
      }
      
      const data = techMap.get(entry.technicianName)!;
      data.entries.push(entry);
      data.totalHours += (entry.duration || 0) / (1000 * 60 * 60);
      data.totalDriveHours += (entry.driveDuration || 0) / (1000 * 60 * 60);
      data.totalLunchHours += (entry.lunchDuration || 0) / (1000 * 60 * 60);
    });

    // Calculate days worked
    techMap.forEach(data => {
      const uniqueDays = new Set(data.entries.map(entry => {
        const date = entry.clockInTime || entry.driveStartTime;
        return date ? date.toDateString() : 'unknown';
      }));
      data.daysWorked = uniqueDays.size;
    });

    return Array.from(techMap.values());
  }, [filteredEntries, selectedTechnician]);

  // Customer Search Data
  const customerSearchData = useMemo((): CustomerSearchData[] => {
    if (!selectedCustomer) return [];

    const customerEntries = filteredEntries.filter(entry => 
      entry.customerName.toLowerCase().includes(selectedCustomer.toLowerCase())
    );

    const customerMap = new Map<string, CustomerSearchData>();
    
    customerEntries.forEach(entry => {
      const key = `${entry.customerName}-${entry.jobId || 'no-job'}`;
      
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerName: entry.customerName,
          jobId: entry.jobId,
          entries: [],
          technicians: [],
          totalHours: 0,
          totalDriveHours: 0,
          totalLunchHours: 0
        });
      }
      
      const data = customerMap.get(key)!;
      data.entries.push(entry);
      data.totalHours += (entry.duration || 0) / (1000 * 60 * 60);
      data.totalDriveHours += (entry.driveDuration || 0) / (1000 * 60 * 60);
      data.totalLunchHours += (entry.lunchDuration || 0) / (1000 * 60 * 60);
      
      if (!data.technicians.includes(entry.technicianName)) {
        data.technicians.push(entry.technicianName);
      }
    });

    return Array.from(customerMap.values());
  }, [filteredEntries, selectedCustomer]);

  // Lunch Search Data
  const lunchSearchData = useMemo((): LunchSearchData[] => {
    const lunchEntries = filteredEntries.filter(entry => entry.lunchDuration && entry.lunchDuration > 0);
    
    // Filter by selected date for lunch search
    const dateFilteredEntries = searchMode === 'lunch' 
      ? lunchEntries.filter(entry => {
          const entryDate = entry.clockInTime || entry.driveStartTime;
          return entryDate && entryDate.toDateString() === selectedDate.toDateString();
        })
      : lunchEntries;
    
    const lunchMap = new Map<string, LunchSearchData>();
    
    dateFilteredEntries.forEach(entry => {
      const date = entry.clockInTime || entry.driveStartTime;
      if (!date) return;
      
      const dateKey = date.toDateString();
      
      if (!lunchMap.has(dateKey)) {
        lunchMap.set(dateKey, {
          date: date,
          entries: [],
          technicians: [],
          totalLunchHours: 0,
          averageLunchDuration: 0
        });
      }
      
      const data = lunchMap.get(dateKey)!;
      data.entries.push(entry);
      data.totalLunchHours += (entry.lunchDuration || 0) / (1000 * 60 * 60);
      
      if (!data.technicians.includes(entry.technicianName)) {
        data.technicians.push(entry.technicianName);
      }
    });

    // Calculate average lunch duration
    lunchMap.forEach(data => {
      data.averageLunchDuration = data.totalLunchHours / data.entries.length;
    });

    return Array.from(lunchMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredEntries, searchMode, selectedDate]);

  // Get entries for selected date (for mini calendar)
  const selectedDateEntries = useMemo(() => {
    if (!selectedTechnician) return [];
    
    return filteredEntries.filter(entry => {
      const entryDate = entry.clockInTime || entry.driveStartTime;
      if (!entryDate) return false;
      
      return entry.technicianName.toLowerCase().includes(selectedTechnician.toLowerCase()) &&
             entryDate.toDateString() === selectedDate.toDateString();
    });
  }, [filteredEntries, selectedTechnician, selectedDate]);

  // Mini Calendar Component
  const MiniCalendar = ({ onDateSelect }: { onDateSelect: (date: Date) => void }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDay = firstDay.getDay();
      
      const days = [];
      for (let i = 0; i < startingDay; i++) {
        days.push(null);
      }
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
      }
      return days;
    };

    const hasEntriesForDate = (date: Date) => {
      return filteredEntries.some(entry => {
        const entryDate = entry.clockInTime || entry.driveStartTime;
        return entryDate && entryDate.toDateString() === date.toDateString() &&
               entry.technicianName.toLowerCase().includes(selectedTechnician.toLowerCase());
      });
    };

    const days = getDaysInMonth(currentMonth);

    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            ←
          </button>
          <h3 className="text-lg font-semibold">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            →
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-xs">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {days.map((day, index) => (
            <button
              key={index}
              onClick={() => day && onDateSelect(day)}
              className={`p-2 text-center text-sm rounded hover:bg-blue-50 ${
                day ? 'cursor-pointer' : ''
              } ${
                day && day.toDateString() === selectedDate.toDateString()
                  ? 'bg-blue-500 text-white'
                  : hasEntriesForDate(day!)
                    ? 'bg-green-100 text-green-800'
                    : 'text-gray-700'
              }`}
              disabled={!day}
            >
              {day ? day.getDate() : ''}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Export functions
  const exportToCSV = () => {
    let headers: string[];
    let data: any[];

    switch (searchMode) {
      case 'tech':
        headers = ['Date', 'Technician', 'Customer', 'Clock In', 'Clock Out', 'Duration', 'Drive', 'Lunch'];
        data = selectedDateEntries.map(entry => [
          formatDate(entry.clockInTime || entry.driveStartTime || new Date()),
          entry.technicianName,
          entry.customerName,
          entry.clockInTime ? formatTime(entry.clockInTime) : 'N/A',
          entry.clockOutTime ? formatTime(entry.clockOutTime) : 'N/A',
          ((entry.duration || 0) / (1000 * 60 * 60)).toFixed(2),
          ((entry.driveDuration || 0) / (1000 * 60 * 60)).toFixed(2),
          ((entry.lunchDuration || 0) / (1000 * 60 * 60)).toFixed(2)
        ]);
        break;
      case 'customer':
        headers = ['Date', 'Technician', 'Customer', 'Job ID', 'Clock In', 'Clock Out', 'Duration', 'Drive', 'Lunch'];
        data = customerSearchData.flatMap(customer => 
          customer.entries.map(entry => [
            formatDate(entry.clockInTime || entry.driveStartTime || new Date()),
            entry.technicianName,
            entry.customerName,
            entry.jobId || 'N/A',
            entry.clockInTime ? formatTime(entry.clockInTime) : 'N/A',
            entry.clockOutTime ? formatTime(entry.clockOutTime) : 'N/A',
            ((entry.duration || 0) / (1000 * 60 * 60)).toFixed(2),
            ((entry.driveDuration || 0) / (1000 * 60 * 60)).toFixed(2),
            ((entry.lunchDuration || 0) / (1000 * 60 * 60)).toFixed(2)
          ])
        );
        break;
      case 'lunch':
        headers = ['Date', 'Technician', 'Customer', 'Lunch Start', 'Lunch End', 'Duration'];
        data = lunchSearchData.flatMap(lunch => 
          lunch.entries.map(entry => [
            formatDate(entry.clockInTime || entry.driveStartTime || new Date()),
            entry.technicianName,
            entry.customerName,
            entry.lunchStartTime ? formatTime(entry.lunchStartTime) : 'N/A',
            entry.lunchEndTime ? formatTime(entry.lunchEndTime) : 'N/A',
            ((entry.lunchDuration || 0) / (1000 * 60 * 60)).toFixed(2)
          ])
        );
        break;
      default:
        return;
    }

    const csvContent = [headers, ...data]
      .map(row => row.map((cell: any) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${searchMode}-report-${formatDate(new Date())}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Advanced Reports</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-4 flex-shrink-0">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Search Mode</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSearchMode('tech')}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      searchMode === 'tech'
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Technician Search</div>
                        <div className="text-sm text-gray-500">Search by tech with mini calendar</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setSearchMode('customer')}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      searchMode === 'customer'
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Building className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Customer Search</div>
                        <div className="text-sm text-gray-500">Search by customer across all techs</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setSearchMode('lunch')}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      searchMode === 'lunch'
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Lunch Time Search</div>
                        <div className="text-sm text-gray-500">Search lunch times for all techs</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Filters</h3>
                <div className="space-y-3">
                  {searchMode === 'customer' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date Range
                        </label>
                        <div className="space-y-2">
                          <input
                            type="date"
                            value={filters.dateRange.start.toISOString().split('T')[0]}
                            onChange={(e) => setFilters(prev => ({
                              ...prev,
                              dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="date"
                            value={filters.dateRange.end.toISOString().split('T')[0]}
                            onChange={(e) => setFilters(prev => ({
                              ...prev,
                              dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Customer
                        </label>
                        <select
                          value={selectedCustomer}
                          onChange={(e) => setSelectedCustomer(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Customer</option>
                          {customers.map(customer => (
                            <option key={customer} value={customer}>{customer}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {searchMode === 'tech' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Technician
                        </label>
                        <select
                          value={selectedTechnician}
                          onChange={(e) => setSelectedTechnician(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Technician</option>
                          {technicians.map(tech => (
                            <option key={tech} value={tech}>{tech}</option>
                          ))}
                        </select>
                      </div>

                      {selectedTechnician && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Date
                          </label>
                          <MiniCalendar onDateSelect={setSelectedDate} />
                        </div>
                      )}
                    </>
                  )}

                  {searchMode === 'lunch' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Date
                      </label>
                      <MiniCalendar onDateSelect={setSelectedDate} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">
                  {searchMode === 'tech' ? techSearchData.length :
                   searchMode === 'customer' ? customerSearchData.length :
                   lunchSearchData.length}
                </div>
                <div className="text-sm text-blue-600">
                  {searchMode === 'tech' ? 'Technicians' :
                   searchMode === 'customer' ? 'Customers' :
                   'Days with Lunch'}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  {searchMode === 'tech' ? 
                    techSearchData.reduce((sum, tech) => sum + tech.totalHours, 0).toFixed(1) :
                   searchMode === 'customer' ? 
                    customerSearchData.reduce((sum, cust) => sum + cust.totalHours, 0).toFixed(1) :
                   lunchSearchData.reduce((sum, lunch) => sum + lunch.totalLunchHours, 0).toFixed(1)}
                </div>
                <div className="text-sm text-green-600">
                  {searchMode === 'lunch' ? 'Total Lunch Hours' : 'Total Hours'}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">
                  {searchMode === 'tech' ? 
                    techSearchData.reduce((sum, tech) => sum + tech.totalDriveHours, 0).toFixed(1) :
                   searchMode === 'customer' ? 
                    customerSearchData.reduce((sum, cust) => sum + cust.totalDriveHours, 0).toFixed(1) :
                   lunchSearchData.length > 0 ? 
                    (lunchSearchData.reduce((sum, lunch) => sum + lunch.averageLunchDuration, 0) / lunchSearchData.length).toFixed(1) : '0.0'}
                </div>
                <div className="text-sm text-purple-600">
                  {searchMode === 'lunch' ? 'Avg Lunch Duration' : 'Drive Hours'}
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-900">
                  {searchMode === 'tech' ? 
                    techSearchData.reduce((sum, tech) => sum + tech.totalLunchHours, 0).toFixed(1) :
                   searchMode === 'customer' ? 
                    customerSearchData.reduce((sum, cust) => sum + cust.totalLunchHours, 0).toFixed(1) :
                   lunchSearchData.length}
                </div>
                <div className="text-sm text-orange-600">
                  {searchMode === 'lunch' ? 'Days with Lunch' : 'Lunch Hours'}
                </div>
              </div>
            </div>

            {/* Report Content */}
            <div className="space-y-6">
              {searchMode === 'tech' && selectedTechnician && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Technician: {selectedTechnician} - {formatDate(selectedDate)}
                  </h3>
                  
                  {techSearchData.map(tech => (
                    <div key={tech.technicianName} className="bg-white border rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-medium text-gray-900">{tech.technicianName}</h4>
                        <div className="text-sm text-gray-500">{tech.daysWorked} days worked</div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <div className="font-medium text-gray-900">{tech.totalHours.toFixed(1)}</div>
                          <div className="text-gray-500">Total Hours</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{tech.totalDriveHours.toFixed(1)}</div>
                          <div className="text-gray-500">Drive Hours</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{tech.totalLunchHours.toFixed(1)}</div>
                          <div className="text-gray-500">Lunch Hours</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{tech.entries.length}</div>
                          <div className="text-gray-500">Entries</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Selected Date Entries */}
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50">
                      <h4 className="font-medium text-gray-900">Entries for {formatDate(selectedDate)}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drive</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedDateEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{entry.customerName}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {entry.clockInTime ? formatTime(entry.clockInTime) : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {entry.clockOutTime ? formatTime(entry.clockOutTime) : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {entry.formattedDuration || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {entry.formattedDriveDuration || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {entry.formattedLunchDuration || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {searchMode === 'customer' && selectedCustomer && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Customer: {selectedCustomer}
                  </h3>
                  
                  <div className="space-y-4">
                    {customerSearchData.map((customer, index) => (
                      <div key={index} className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-medium text-gray-900">{customer.customerName}</h4>
                          <div className="text-sm text-gray-500">
                            {customer.jobId ? `Job ID: ${customer.jobId}` : 'No Job ID'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <div className="font-medium text-gray-900">{customer.totalHours.toFixed(1)}</div>
                            <div className="text-gray-500">Total Hours</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{customer.totalDriveHours.toFixed(1)}</div>
                            <div className="text-gray-500">Drive Hours</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{customer.totalLunchHours.toFixed(1)}</div>
                            <div className="text-gray-500">Lunch Hours</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{customer.technicians.length}</div>
                            <div className="text-gray-500">Technicians</div>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-700 mb-1">Technicians:</div>
                          <div className="flex flex-wrap gap-2">
                            {customer.technicians.map(tech => (
                              <span key={tech} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Entries Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drive</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {customer.entries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {formatDate(entry.clockInTime || entry.driveStartTime || new Date())}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{entry.technicianName}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {entry.clockInTime ? formatTime(entry.clockInTime) : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {entry.clockOutTime ? formatTime(entry.clockOutTime) : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {entry.formattedDuration || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {entry.formattedDriveDuration || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {entry.formattedLunchDuration || 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchMode === 'lunch' && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Lunch Time Report - {formatDate(selectedDate)}
                  </h3>
                  
                  <div className="space-y-4">
                    {lunchSearchData.length > 0 ? (
                      <div className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-medium text-gray-900">{formatDate(selectedDate)}</h4>
                          <div className="text-sm text-gray-500">
                            {lunchSearchData[0].technicians.length} technicians, {lunchSearchData[0].entries.length} entries
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <div className="font-medium text-gray-900">{lunchSearchData[0].totalLunchHours.toFixed(2)}</div>
                            <div className="text-gray-500">Total Lunch Hours</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{lunchSearchData[0].averageLunchDuration.toFixed(2)}</div>
                            <div className="text-gray-500">Avg Lunch Duration</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{lunchSearchData[0].technicians.length}</div>
                            <div className="text-gray-500">Technicians</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{lunchSearchData[0].entries.length}</div>
                            <div className="text-gray-500">Entries</div>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-700 mb-1">Technicians:</div>
                          <div className="flex flex-wrap gap-2">
                            {lunchSearchData[0].technicians.map((tech: string) => (
                              <span key={tech} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Lunch Entries Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch Start</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch End</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {lunchSearchData[0].entries.map((entry: TimeEntry) => (
                                <tr key={entry.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-900">{entry.technicianName}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{entry.customerName}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {entry.lunchStartTime ? formatTime(entry.lunchStartTime) : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {entry.lunchEndTime ? formatTime(entry.lunchEndTime) : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {entry.formattedLunchDuration || 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}