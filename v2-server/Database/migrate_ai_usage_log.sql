-- Create AI usage log table for monitoring and rate limiting
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes_length INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying by user and time
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_time ON ai_usage_log(user_id, timestamp);

-- Create index for monitoring overall usage
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_timestamp ON ai_usage_log(timestamp);

-- Add comment for documentation
COMMENT ON TABLE ai_usage_log IS 'Logs AI summary generation usage for monitoring and rate limiting';
COMMENT ON COLUMN ai_usage_log.user_id IS 'User who generated the AI summary';
COMMENT ON COLUMN ai_usage_log.notes_length IS 'Length of notes processed for billing/monitoring';
COMMENT ON COLUMN ai_usage_log.timestamp IS 'When the AI summary was generated';
