CREATE TABLE change_proposal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    proposed_by UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    target_type VARCHAR(100) NOT NULL CHECK (target_type IN ('COMPONENT', 'SPENDING', 'TIMELINE_ITEM')),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE')),
    target_id UUID, -- NULL for CREATE actions
    proposed_data JSONB,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES user_account(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_by VARCHAR(255) NOT NULL
);

CREATE INDEX idx_change_proposal_event_status ON change_proposal(event_id, status);
CREATE INDEX idx_change_proposal_proposed_by ON change_proposal(proposed_by);
