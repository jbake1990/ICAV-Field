-- Migration: Add job_type column to jobs table
-- This is a one-time migration that was previously handled by the API
-- Run this manually if needed for database setup

-- Add job_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'job_type'
    ) THEN
        ALTER TABLE jobs ADD COLUMN job_type VARCHAR(50) DEFAULT 'service';
        RAISE NOTICE 'Added job_type column to jobs table';
    ELSE
        RAISE NOTICE 'job_type column already exists in jobs table';
    END IF;
END $$;

-- Update existing jobs to have a default job_type if they don't have one
UPDATE jobs 
SET job_type = 'service' 
WHERE job_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN jobs.job_type IS 'Type of job (service, maintenance, repair, etc.)';
