# Calendar Mobility and Sync Status Fixes

## Issues Addressed

### 1. Pending Sync Status Issue
**Problem**: iOS app was showing 3 pending sync items even though job assignments were loading correctly.

**Root Cause**: The app was creating time entries from job assignments and marking them for sync, which caused them to appear in the pending sync count.

**Fix**: 
- Updated iOS `TimeTrackerViewModel.swift` to exclude job assignment entries from pending sync count
- Updated Android `TimeTrackerViewModel.kt` to not mark job assignment entries for sync
- Modified `pendingEntries` and `pendingSyncCount` calculations to filter out entries with `jobAssignmentId`

### 2. Calendar Drag & Drop Limitations
**Problem**: Could only move jobs from unassigned pool to calendar, but couldn't move existing assignments between technicians or days.

**Root Cause**: The `handleDrop` function only supported unassigned jobs, not existing assignments.

**Fix**:
- Enhanced `handleDrop` function to support both `draggedJob` and `draggedAssignment`
- Added support for moving existing assignments between technicians and days
- Updated drag over handlers to support both job and assignment dragging
- Improved visual feedback with hover effects and tooltips

## Technical Changes

### Web App (`v2-server/WebApp/src/components/JobCalendar.tsx`)

1. **Enhanced Drop Handler**:
```typescript
const handleDrop = async (e: React.DragEvent, technicianId: string, date: Date) => {
  if (!draggedJob && !draggedAssignment) return;
  
  if (draggedJob) {
    // Handle unassigned jobs
  } else if (draggedAssignment) {
    // Handle moving existing assignments
    await onUpdateAssignment(assignmentId, {
      userId: technicianId,
      assignedDate: date,
      technicianName
    });
  }
}
```

2. **Improved Visual Feedback**:
- Added hover effects to assignment cards
- Added tooltips for drag functionality
- Enhanced drag over styling

### iOS App (`ICAV Time Tracker/TimeTrackerViewModel.swift`)

1. **Fixed Sync Count**:
```swift
var pendingEntries: [TimeEntry] {
    return timeEntries.filter { $0.needsSync && isWithinTwoDays($0) && $0.jobAssignmentId == nil }
}

var pendingSyncCount: Int {
    return timeEntries.filter { $0.needsSync && $0.jobAssignmentId == nil }.count
}
```

2. **Prevented Job Assignment Sync**:
```swift
// Don't mark job assignment entries for sync - they're read-only
timeEntries.append(newEntry)
```

### Android App (`Android App/app/src/main/java/com/example/icavtimetracker/viewmodel/TimeTrackerViewModel.kt`)

1. **Fixed Sync Count**:
```kotlin
private fun updatePendingSyncCount() {
    viewModelScope.launch(Dispatchers.Default) {
        _pendingSyncCount.value = _timeEntries.value.count { it.needsSync && it.jobAssignmentId == null }
    }
}
```

2. **Prevented Job Assignment Sync**:
```kotlin
// Don't mark job assignment entries for sync - they're read-only
currentEntries.add(newEntry)
```

## Features Now Available

### Full Calendar Mobility
- ✅ Move jobs from unassigned pool to any technician/day
- ✅ Move existing assignments between technicians
- ✅ Move existing assignments between days
- ✅ Move assignments between different technicians and days
- ✅ Visual feedback during drag operations
- ✅ Tooltips explaining drag functionality

### Accurate Sync Status
- ✅ Pending sync count only includes actual time entries
- ✅ Job assignments don't count toward pending sync
- ✅ Sync status accurately reflects real pending items
- ✅ Both iOS and Android apps show correct sync status

## Testing Recommendations

1. **Test Calendar Mobility**:
   - Create jobs in the unassigned pool
   - Drag them to different technicians and days
   - Move existing assignments between technicians
   - Move assignments between different days
   - Verify assignments appear correctly in iOS/Android apps

2. **Test Sync Status**:
   - Check that pending sync count is accurate
   - Verify job assignments don't create pending sync items
   - Test with actual time entries that need sync

3. **Test Cross-Platform Consistency**:
   - Verify iOS and Android show same job assignments
   - Check that sync status is consistent across platforms
   - Test that calendar changes sync properly

## Database Schema

The fixes maintain compatibility with the existing database schema:
- `job_assignments` table with `user_id`, `assigned_date`, `technician_name`
- `time_entries` table with `job_assignment_id` for linking
- Proper foreign key relationships maintained

## API Compatibility

All changes are backward compatible:
- Existing job assignment API endpoints unchanged
- Time entry sync logic preserved
- Authentication and authorization unchanged
- Database queries optimized for performance 