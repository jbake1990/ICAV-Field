import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  console.log(`Jobs API: ${req.method} ${req.url}`);
  
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
        return await handleGetJobs(req, res, user);
      case 'POST':
        return await handleCreateJob(req, res, user);
      case 'PUT':
        return await handleUpdateJob(req, res, user);
      case 'DELETE':
        return await handleDeleteJob(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Jobs API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetJobs(req, res, user) {
  try {
    let query;
    
    if (user.role === 'admin') {
      // Admins can see all jobs
      query = sql`
        SELECT 
          id,
          title,
          customer_name,
          description,
          location,
          estimated_hours,
          status,
          priority,
          created_by,
          created_at,
          updated_at
        FROM jobs 
        ORDER BY created_at DESC
      `;
    } else {
      // Regular users can see jobs assigned to them or jobs they created
      query = sql`
        SELECT DISTINCT
          j.id,
          j.title,
          j.customer_name,
          j.description,
          j.location,
          j.estimated_hours,
          j.status,
          j.priority,
          j.created_by,
          j.created_at,
          j.updated_at
        FROM jobs j
        LEFT JOIN job_assignments ja ON j.id = ja.job_id
        WHERE j.created_by = ${user.user_id} OR ja.user_id = ${user.user_id}
        ORDER BY j.created_at DESC
      `;
    }
    
    const { rows } = await query;
    
    // Convert database format to frontend format
    const formattedJobs = rows.map(row => ({
      id: row.id,
      title: row.title,
      customerName: row.customer_name,
      description: row.description,
      location: row.location,
      estimatedHours: parseFloat(row.estimated_hours),
      status: row.status,
      priority: row.priority,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    console.log('Successfully fetched', formattedJobs.length, 'jobs');
    return res.status(200).json(formattedJobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({ error: 'Failed to fetch jobs' });
  }
}

async function handleCreateJob(req, res, user) {
  try {
    const { 
      title, 
      customerName, 
      description, 
      location, 
      estimatedHours, 
      priority = 'medium',
      status = 'draft'
    } = req.body;

    if (!title || !customerName) {
      return res.status(400).json({ error: 'Title and customer name are required' });
    }

    const result = await sql`
      INSERT INTO jobs (
        title,
        customer_name,
        description,
        location,
        estimated_hours,
        status,
        priority,
        created_by
      ) VALUES (
        ${title},
        ${customerName},
        ${description || null},
        ${location || null},
        ${estimatedHours || 0},
        ${status}::job_status,
        ${priority}::job_priority,
        ${user.user_id}
      )
      RETURNING *
    `;

    const newJob = result.rows[0];
    
    const formattedJob = {
      id: newJob.id,
      title: newJob.title,
      customerName: newJob.customer_name,
      description: newJob.description,
      location: newJob.location,
      estimatedHours: parseFloat(newJob.estimated_hours),
      status: newJob.status,
      priority: newJob.priority,
      createdBy: newJob.created_by,
      createdAt: new Date(newJob.created_at),
      updatedAt: new Date(newJob.updated_at)
    };

    console.log('Successfully created job:', formattedJob.id);
    return res.status(201).json(formattedJob);
  } catch (error) {
    console.error('Error creating job:', error);
    return res.status(500).json({ error: 'Failed to create job' });
  }
}

async function handleUpdateJob(req, res, user) {
  try {
    const { id } = req.query;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Check if user has permission to update this job
    const jobCheck = await sql`
      SELECT created_by FROM jobs WHERE id = ${id}
    `;

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (user.role !== 'admin' && jobCheck.rows[0].created_by !== user.user_id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    
    if (updates.title !== undefined) {
      updateFields.push(`title = $${updateFields.length + 1}`);
      values.push(updates.title);
    }
    if (updates.customerName !== undefined) {
      updateFields.push(`customer_name = $${updateFields.length + 1}`);
      values.push(updates.customerName);
    }
    if (updates.description !== undefined) {
      updateFields.push(`description = $${updateFields.length + 1}`);
      values.push(updates.description);
    }
    if (updates.location !== undefined) {
      updateFields.push(`location = $${updateFields.length + 1}`);
      values.push(updates.location);
    }
    if (updates.estimatedHours !== undefined) {
      updateFields.push(`estimated_hours = $${updateFields.length + 1}`);
      values.push(updates.estimatedHours);
    }
    if (updates.status !== undefined) {
      updateFields.push(`status = $${updateFields.length + 1}::job_status`);
      values.push(updates.status);
    }
    if (updates.priority !== undefined) {
      updateFields.push(`priority = $${updateFields.length + 1}::job_priority`);
      values.push(updates.priority);
    }

    updateFields.push('updated_at = NOW()');
    values.push(id);

    const query = `
      UPDATE jobs 
      SET ${updateFields.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;

    const result = await sql.query(query, values);
    const updatedJob = result.rows[0];

    const formattedJob = {
      id: updatedJob.id,
      title: updatedJob.title,
      customerName: updatedJob.customer_name,
      description: updatedJob.description,
      location: updatedJob.location,
      estimatedHours: parseFloat(updatedJob.estimated_hours),
      status: updatedJob.status,
      priority: updatedJob.priority,
      createdBy: updatedJob.created_by,
      createdAt: new Date(updatedJob.created_at),
      updatedAt: new Date(updatedJob.updated_at)
    };

    console.log('Successfully updated job:', formattedJob.id);
    return res.status(200).json(formattedJob);
  } catch (error) {
    console.error('Error updating job:', error);
    return res.status(500).json({ error: 'Failed to update job' });
  }
}

async function handleDeleteJob(req, res, user) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Check if user has permission to delete this job
    const jobCheck = await sql`
      SELECT created_by FROM jobs WHERE id = ${id}
    `;

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (user.role !== 'admin' && jobCheck.rows[0].created_by !== user.user_id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete the job (assignments will be cascade deleted)
    await sql`DELETE FROM jobs WHERE id = ${id}`;

    console.log('Successfully deleted job:', id);
    return res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    return res.status(500).json({ error: 'Failed to delete job' });
  }
} 