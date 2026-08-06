CREATE TABLE workspace_comment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- e.g. 'TIMELINE', 'SPENDING'
    target_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    author_alias VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE INDEX idx_workspace_comment_target ON workspace_comment(target_type, target_id);
CREATE INDEX idx_workspace_comment_event ON workspace_comment(event_id);
CREATE INDEX idx_workspace_comment_user ON workspace_comment(user_id);
