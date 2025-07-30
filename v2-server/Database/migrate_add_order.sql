-- Migration to add order column to job_assignments table
-- This allows for reordering of jobs within the same day

-- Add order column to job_assignments table
ALTER TABLE job_assignments ADD COLUMN IF NOT EXISTS "order" INTEGER;

-- Create index for better performance when sorting by order
CREATE INDEX IF NOT EXISTS idx_job_assignments_order ON job_assignments("order");

-- Update existing assignments to have default order values
-- This ensures existing data has proper ordering
UPDATE job_assignments 
SET "order" = subquery.row_num
FROM (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY user_id, assigned_date 
        ORDER BY created_at
    ) as row_num
    FROM job_assignments
) as subquery
WHERE job_assignments.id = subquery.id; 