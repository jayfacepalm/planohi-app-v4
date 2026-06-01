CREATE TABLE event_curator (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ORGANIZER', 'COLLABORATOR', 'VIEWER')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_by VARCHAR(255) NOT NULL,
    UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_curator_event ON event_curator(event_id);
CREATE INDEX idx_event_curator_user ON event_curator(user_id);
