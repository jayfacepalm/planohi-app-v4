package com.planohi.api.service.cached;

import com.planohi.api.dto.CreateWorkspaceCommentRequest;
import com.planohi.api.dto.WorkspaceCommentDto;
import com.planohi.api.service.WorkspaceCommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceCommentCachedService {

    private final WorkspaceCommentService workspaceCommentService;

    @Cacheable(value = "workspace_comments", key = "#eventId.toString() + ':' + #targetType + ':' + #targetId.toString()")
    public List<WorkspaceCommentDto> getComments(UUID userId, UUID eventId, String targetType, UUID targetId) {
        return workspaceCommentService.getComments(userId, eventId, targetType, targetId);
    }

    @CacheEvict(value = "workspace_comments", key = "#eventId.toString() + ':' + #request.targetType + ':' + #request.targetId.toString()")
    public WorkspaceCommentDto createComment(UUID userId, UUID eventId, CreateWorkspaceCommentRequest request) {
        log.info("Evicting workspace_comments cache for event {} and target {}", eventId, request.getTargetId());
        return workspaceCommentService.createComment(userId, eventId, request);
    }

    @CacheEvict(value = "workspace_comments", allEntries = true)
    public void deleteComment(UUID userId, UUID eventId, UUID commentId) {
        log.info("Evicting all workspace_comments entries for deleted comment {}", commentId);
        workspaceCommentService.deleteComment(userId, eventId, commentId);
    }
}
