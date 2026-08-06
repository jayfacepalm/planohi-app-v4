package com.planohi.api.service.impl;

import com.planohi.api.dto.CreateWorkspaceCommentRequest;
import com.planohi.api.dto.WorkspaceCommentDto;
import com.planohi.api.entity.UserAccount;
import com.planohi.api.entity.WorkspaceComment;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.repository.UserAccountRepository;
import com.planohi.api.repository.WorkspaceCommentRepository;
import com.planohi.api.service.ActivityLogPublisher;
import com.planohi.api.service.WorkspaceCommentService;
import com.planohi.api.service.WorkspaceSecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceCommentServiceImpl implements WorkspaceCommentService {

    private final WorkspaceCommentRepository workspaceCommentRepository;
    private final UserAccountRepository userAccountRepository;
    private final WorkspaceSecurityService workspaceSecurityService;
    private final ActivityLogPublisher activityLogPublisher;

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceCommentDto> getComments(UUID userId, UUID eventId, String targetType, UUID targetId) {
        log.info("Fetching workspace comments for event {}, targetType {}, targetId {} by user {}", eventId, targetType, targetId, userId);
        workspaceSecurityService.checkReadAccess(userId, eventId);

        List<WorkspaceComment> comments = workspaceCommentRepository
                .findByEventIdAndTargetTypeAndTargetIdOrderByCreatedAtAsc(eventId, targetType, targetId);

        return comments.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WorkspaceCommentDto createComment(UUID userId, UUID eventId, CreateWorkspaceCommentRequest request) {
        log.info("Creating workspace comment for event {}, targetType {}, targetId {} by user {}", eventId, request.getTargetType(), request.getTargetId(), userId);
        workspaceSecurityService.checkReadAccess(userId, eventId);

        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        String authorAlias = (user.getAlias() != null && !user.getAlias().isBlank()) ? user.getAlias() : user.getEmail();

        WorkspaceComment comment = WorkspaceComment.builder()
                .eventId(eventId)
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .userId(userId)
                .authorAlias(authorAlias)
                .content(request.getContent().trim())
                .build();

        WorkspaceComment saved = workspaceCommentRepository.save(comment);

        activityLogPublisher.publish(
                userId,
                authorAlias,
                "WORKSPACE_COMMENT_ADD",
                "TIMELINE_ITEM_COMMENT",
                saved.getId(),
                eventId,
                "SUCCESS",
                Map.of("targetType", request.getTargetType(), "targetId", request.getTargetId())
        );

        return mapToDto(saved);
    }

    @Override
    @Transactional
    public void deleteComment(UUID userId, UUID eventId, UUID commentId) {
        log.info("Deleting workspace comment {} in event {} by user {}", commentId, eventId, userId);

        WorkspaceComment comment = workspaceCommentRepository.findById(commentId)
                .orElseThrow(() -> new EntityNotFoundException("Workspace comment not found"));

        if (!comment.getEventId().equals(eventId)) {
            throw new EntityNotFoundException("Workspace comment not found in specified event");
        }

        EventCuratorRole curatorRole = workspaceSecurityService.getCuratorRole(userId, eventId);

        boolean isAuthor = comment.getUserId().equals(userId);
        boolean isOwnerOrOrganizer = (curatorRole == EventCuratorRole.OWNER || curatorRole == EventCuratorRole.ORGANIZER);

        if (!isAuthor && !isOwnerOrOrganizer) {
            throw new IllegalArgumentException("Access Denied: You do not have permission to delete this comment");
        }

        workspaceCommentRepository.delete(comment);

        activityLogPublisher.publish(
                userId,
                comment.getAuthorAlias(),
                "WORKSPACE_COMMENT_DELETE",
                "TIMELINE_ITEM_COMMENT",
                commentId,
                eventId,
                "SUCCESS",
                Map.of("targetType", comment.getTargetType(), "targetId", comment.getTargetId())
        );
    }

    private WorkspaceCommentDto mapToDto(WorkspaceComment comment) {
        return WorkspaceCommentDto.builder()
                .id(comment.getId())
                .eventId(comment.getEventId())
                .targetType(comment.getTargetType())
                .targetId(comment.getTargetId())
                .userId(comment.getUserId())
                .authorAlias(comment.getAuthorAlias())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
