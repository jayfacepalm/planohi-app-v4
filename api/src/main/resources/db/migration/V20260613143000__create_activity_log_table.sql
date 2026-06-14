CREATE TABLE activity_log (
    id UUID PRIMARY KEY,
    correlation_id VARCHAR(16) NOT NULL,
    user_id UUID,
    user_alias VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    event_id UUID,
    status VARCHAR(10) NOT NULL,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_activity_log_correlation_id ON activity_log(correlation_id);
CREATE INDEX idx_activity_log_event_id ON activity_log(event_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
