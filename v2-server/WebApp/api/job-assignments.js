import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  console.log(`Job Assignments API: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify the session token and get user info
    const sessionQuery = await sql`
      SELECT s.user_id, u.username, u.display_name, u.role, u.is_active
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ${token} AND s.expires_at > NOW()
    `;

    if (sessionQuery.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = sessionQuery.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetAssignments(req, res, user);
      case 'POST':
        return await handleCreateAssignment(req, res, user);
      case 'PUT':
        return await handleUpdateAssignment(req, res, user);
      case 'DELETE':
        return await handleDeleteAssignment(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Job Assignments API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetAssignments(req, res, user) {
  try {
    const { startDate, endDate, userId } = req.query;
    
    let query;
    const queryParams = [];
    
    if (user.role === 'admin') {
      // Admins can see all assignments with optional filters
      let whereClause = '';
      if (startDate && endDate) {
        whereClause += ' WHERE ja.assigned_date >= $1 AND ja.assigned_date <= $2';
        queryParams.push(startDate, endDate);
      }
      if (userId) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` ja.user_id = $${queryParams.length + 1}`;
        queryParams.push(userId);
      }
      
      query = `
        SELECT 
          ja.id,
          ja.job_id,
          ja.user_id,
          ja.technician_name,
          ja.assigned_date,
          ja.assigned_hours,
          ja.actual_hours,
          ja.status,
          ja.notes,
          ja.created_at,
          ja.updated_at
        FROM job_assignments ja
        ${whereClause}
        ORDER BY ja.assigned_date DESC, ja.created_at DESC
      `;
    } else {
      // Regular users can only see their own assignments
      let whereClause = ' WHERE ja.user_id = $1';
      queryParams.push(user.user_id);
      
      if (startDate && endDate) {
        whereClause += ' AND ja.assigned_date >= $2 AND ja.assigned_date <= $3';
        queryParams.push(startDate, endDate);
      }
      
      query = `
        SELECT 
          ja.id,
          ja.job_id,
          ja.user_id,
          ja.technician_name,
          ja.assigned_date,
          ja.assigned_hours,
          ja.actual_hours,
          ja.status,
          ja.notes,
          ja.created_at,
          ja.updated_at
        FROM job_assignments ja
        ${whereClause}
        ORDER BY ja.assigned_date DESC, ja.created_at DESC
      `;
    }
    
    const result = await sql.query(query, queryParams);
    
    // Convert database format to frontend format
    const formattedAssignments = result.rows.map(row => ({
      id: row.id,
      jobId: row.job_id,
      userId: row.user_id,
      technicianName: row.technician_name,
      assignedDate: new Date(row.assigned_date),
      assignedHours: parseFloat(row.assigned_hours),
      actualHours: row.actual_hours ? parseFloat(row.actual_hours) : undefined,
      status: row.status,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    console.log('Successfully fetched', formattedAssignments.length, 'job assignments');
    return res.status(200).json(formattedAssignments);
  } catch (error) {
    console.error('Error fetching job assignments:', error);
    return res.status(500).json({ error: 'Failed to fetch job assignments' });
  }
}

async function handleCreateAssignment(req, res, user) {
  try {
    const { 
      jobId, 
      userId, 
      technicianName,
      assignedDate, 
      assignedHours,
      status = 'assigned',
      notes
    } = req.body;

    if (!jobId || !userId || !assignedDate || !assignedHours) {
      return res.status(400).json({ 
        error: 'Job ID, user ID, assigned date, and assigned hours are required' 
      });
    }

    // Verify the job exists
    const jobCheck = await sql`
      SELECT id FROM jobs WHERE id = ${jobId}
    `;

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Verify the user exists and get their display name
    const userCheck = await sql`
      SELECT id, display_name FROM users WHERE id = ${userId} AND is_active = true
    `;

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or inactive' });
    }

    const actualTechnicianName = technicianName || userCheck.rows[0].display_name;

    const result = await sql`
      INSERT INTO job_assignments (
        job_id,
        user_id,
        technician_name,
        assigned_date,
        assigned_hours,
        status,
        notes
      ) VALUES (
        ${jobId},
        ${userId},
        ${actualTechnicianName},
        ${assignedDate},
        ${assignedHours},
        ${status},
        ${notes || null}
      )
      RETURNING *
    `;

    const newAssignment = result.rows[0];
    
    const formattedAssignment = {
      id: newAssignment.id,
      jobId: newAssignment.job_id,
      userId: newAssignment.user_id,
      technicianName: newAssignment.technician_name,
      assignedDate: new Date(newAssignment.assigned_date),
      assignedHours: parseFloat(newAssignment.assigned_hours),
      actualHours: newAssignment.actual_hours ? parseFloat(newAssignment.actual_hours) : undefined,
      status: newAssignment.status,
      notes: newAssignment.notes,
      createdAt: new Date(newAssignment.created_at),
      updatedAt: new Date(newAssignment.updated_at)
    };

    // Update job status to 'assigned' if it was 'draft'
    await sql`
      UPDATE jobs 
      SET status = 'assigned'::job_status, updated_at = NOW()
      WHERE id = ${jobId} AND status = 'draft'::job_status
    `;

    console.log('Successfully created job assignment:', formattedAssignment.id);
    return res.status(201).json(formattedAssignment);
  } catch (error) {
    console.error('Error creating job assignment:', error);
    return res.status(500).json({ error: 'Failed to create job assignment' });
  }
}

async function handleUpdateAssignment(req, res, user) {
  try {
    const { id } = req.query;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Assignment ID is required' });
    }

    // Check if assignment exists and user has permission
    const assignmentCheck = await sql`
      SELECT user_id FROM job_assignments WHERE id = ${id}
    `;

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Regular users can only update their own assignments (some fields only)
    // Admins can update any assignment
    if (user.role !== 'admin' && assignmentCheck.rows[0].user_id !== user.user_id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    
    if (updates.userId !== undefined && user.role === 'admin') {
      updateFields.push(`user_id = $${updateFields.length + 1}`);
      values.push(updates.userId);
      
      // Update technician name if userId changed
      if (updates.technicianName !== undefined) {
        updateFields.push(`technician_name = $${updateFields.length + 1}`);
        values.push(updates.technicianName);
      }
    }
    
    if (updates.assignedDate !== undefined && user.role === 'admin') {
      updateFields.push(`assigned_date = $${updateFields.length + 1}`);
      values.push(updates.assignedDate);
    }
    
    if (updates.assignedHours !== undefined && user.role === 'admin') {
      updateFields.push(`assigned_hours = $${updateFields.length + 1}`);
      values.push(updates.assignedHours);
    }
    
    if (updates.actualHours !== undefined) {
      updateFields.push(`actual_hours = $${updateFields.length + 1}`);
      values.push(updates.actualHours);
    }
    
    if (updates.status !== undefined) {
      updateFields.push(`status = $${updateFields.length + 1}`);
      values.push(updates.status);
    }
    
    if (updates.notes !== undefined) {
      updateFields.push(`notes = $${updateFields.length + 1}`);
      values.push(updates.notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = NOW()');
    values.push(id);

    const query = `
      UPDATE job_assignments 
      SET ${updateFields.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;

    const result = await sql.query(query, values);
    const updatedAssignment = result.rows[0];

    const formattedAssignment = {
      id: updatedAssignment.id,
      jobId: updatedAssignment.job_id,
      userId: updatedAssignment.user_id,
      technicianName: updatedAssignment.technician_name,
      assignedDate: new Date(updatedAssignment.assigned_date),
      assignedHours: parseFloat(updatedAssignment.assigned_hours),
      actualHours: updatedAssignment.actual_hours ? parseFloat(updatedAssignment.actual_hours) : undefined,
      status: updatedAssignment.status,
      notes: updatedAssignment.notes,
      createdAt: new Date(updatedAssignment.created_at),
      updatedAt: new Date(updatedAssignment.updated_at)
    };

    console.log('Successfully updated job assignment:', formattedAssignment.id);
    return res.status(200).json(formattedAssignment);
  } catch (error) {
    console.error('Error updating job assignment:', error);
    return res.status(500).json({ error: 'Failed to update job assignment' });
  }
}

async function handleDeleteAssignment(req, res, user) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Assignment ID is required' });
    }

    // Check if assignment exists and user has permission
    const assignmentCheck = await sql`
      SELECT user_id, job_id FROM job_assignments WHERE id = ${id}
    `;

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Only admins can delete assignments
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const jobId = assignmentCheck.rows[0].job_id;

    // Delete the assignment
    await sql`DELETE FROM job_assignments WHERE id = ${id}`;

    // Check if this was the last assignment for the job
    const remainingAssignments = await sql`
      SELECT COUNT(*) as count FROM job_assignments WHERE job_id = ${jobId}
    `;

    // If no assignments remain, set job status back to draft
    if (parseInt(remainingAssignments.rows[0].count) === 0) {
      await sql`
        UPDATE jobs 
        SET status = 'draft'::job_status, updated_at = NOW()
        WHERE id = ${jobId}
      `;
    }

    console.log('Successfully deleted job assignment:', id);
    return res.status(200).json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting job assignment:', error);
    return res.status(500).json({ error: 'Failed to delete job assignment' });
  }
} 