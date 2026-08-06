package com.planohi.api.service;

import com.planohi.api.dto.CreateWorkspaceCommentRequest;
import com.planohi.api.dto.WorkspaceCommentDto;
import java.util.List;
import java.util.UUID;

public interface WorkspaceCommentService {
    List<WorkspaceCommentDto> getComments(UUID userId, UUID eventId, String targetType, UUID targetId);
    WorkspaceCommentDto createComment(UUID userId, UUID eventId, CreateWorkspaceCommentRequest request);
    void deleteComment(UUID userId, UUID eventId, UUID commentId);
}
