package com.planohi.api.service;

import com.planohi.api.dto.CreateWorkspaceCommentRequest;
import com.planohi.api.dto.WorkspaceCommentDto;
import com.planohi.api.entity.UserAccount;
import com.planohi.api.entity.WorkspaceComment;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.repository.UserAccountRepository;
import com.planohi.api.repository.WorkspaceCommentRepository;
import com.planohi.api.service.impl.WorkspaceCommentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WorkspaceCommentServiceTest {

    @Mock
    private WorkspaceCommentRepository workspaceCommentRepository;

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private WorkspaceSecurityService workspaceSecurityService;

    @Mock
    private ActivityLogPublisher activityLogPublisher;

    @InjectMocks
    private WorkspaceCommentServiceImpl workspaceCommentService;

    private UUID userId;
    private UUID eventId;
    private UUID targetId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        eventId = UUID.randomUUID();
        targetId = UUID.randomUUID();
    }

    @Test
    void getComments_success() {
        WorkspaceComment comment = WorkspaceComment.builder()
                .id(UUID.randomUUID())
                .eventId(eventId)
                .targetType("TIMELINE")
                .targetId(targetId)
                .userId(userId)
                .authorAlias("Alice")
                .content("Initial deposit completed.")
                .build();
        comment.setCreatedAt(Instant.now());

        when(workspaceCommentRepository.findByEventIdAndTargetTypeAndTargetIdOrderByCreatedAtAsc(eventId, "TIMELINE", targetId))
                .thenReturn(List.of(comment));

        List<WorkspaceCommentDto> result = workspaceCommentService.getComments(userId, eventId, "TIMELINE", targetId);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Alice", result.get(0).getAuthorAlias());
        assertEquals("Initial deposit completed.", result.get(0).getContent());
        verify(workspaceSecurityService).checkReadAccess(userId, eventId);
    }

    @Test
    void createComment_success() {
        UserAccount user = UserAccount.builder()
                .id(userId)
                .email("alice@example.com")
                .alias("Alice Organizer")
                .build();

        CreateWorkspaceCommentRequest request = CreateWorkspaceCommentRequest.builder()
                .targetType("TIMELINE")
                .targetId(targetId)
                .content("Vendor deposit confirmed.")
                .build();

        WorkspaceComment savedComment = WorkspaceComment.builder()
                .id(UUID.randomUUID())
                .eventId(eventId)
                .targetType("TIMELINE")
                .targetId(targetId)
                .userId(userId)
                .authorAlias("Alice Organizer")
                .content("Vendor deposit confirmed.")
                .build();
        savedComment.setCreatedAt(Instant.now());

        when(userAccountRepository.findById(userId)).thenReturn(Optional.of(user));
        when(workspaceCommentRepository.save(any(WorkspaceComment.class))).thenReturn(savedComment);

        WorkspaceCommentDto dto = workspaceCommentService.createComment(userId, eventId, request);

        assertNotNull(dto);
        assertEquals("Alice Organizer", dto.getAuthorAlias());
        assertEquals("Vendor deposit confirmed.", dto.getContent());

        verify(workspaceSecurityService).checkReadAccess(userId, eventId);
        verify(activityLogPublisher).publish(eq(userId), eq("Alice Organizer"), eq("WORKSPACE_COMMENT_ADD"), eq("TIMELINE_ITEM_COMMENT"), any(UUID.class), eq(eventId), eq("SUCCESS"), anyMap());
    }

    @Test
    void deleteComment_successAuthor() {
        UUID commentId = UUID.randomUUID();
        WorkspaceComment comment = WorkspaceComment.builder()
                .id(commentId)
                .eventId(eventId)
                .targetType("TIMELINE")
                .targetId(targetId)
                .userId(userId)
                .authorAlias("Alice")
                .content("Test comment")
                .build();

        when(workspaceCommentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(workspaceSecurityService.getCuratorRole(userId, eventId)).thenReturn(EventCuratorRole.COLLABORATOR);

        workspaceCommentService.deleteComment(userId, eventId, commentId);

        verify(workspaceCommentRepository).delete(comment);
        verify(activityLogPublisher).publish(eq(userId), eq("Alice"), eq("WORKSPACE_COMMENT_DELETE"), eq("TIMELINE_ITEM_COMMENT"), eq(commentId), eq(eventId), eq("SUCCESS"), anyMap());
    }

    @Test
    void deleteComment_successOrganizer() {
        UUID commentId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        WorkspaceComment comment = WorkspaceComment.builder()
                .id(commentId)
                .eventId(eventId)
                .targetType("TIMELINE")
                .targetId(targetId)
                .userId(otherUserId)
                .authorAlias("Bob")
                .content("Test comment")
                .build();

        when(workspaceCommentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(workspaceSecurityService.getCuratorRole(userId, eventId)).thenReturn(EventCuratorRole.ORGANIZER);

        workspaceCommentService.deleteComment(userId, eventId, commentId);

        verify(workspaceCommentRepository).delete(comment);
    }

    @Test
    void deleteComment_forbiddenViewer() {
        UUID commentId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        WorkspaceComment comment = WorkspaceComment.builder()
                .id(commentId)
                .eventId(eventId)
                .targetType("TIMELINE")
                .targetId(targetId)
                .userId(otherUserId)
                .authorAlias("Bob")
                .content("Test comment")
                .build();

        when(workspaceCommentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(workspaceSecurityService.getCuratorRole(userId, eventId)).thenReturn(EventCuratorRole.VIEWER);

        assertThrows(IllegalArgumentException.class, () -> workspaceCommentService.deleteComment(userId, eventId, commentId));
        verify(workspaceCommentRepository, never()).delete(any());
    }

    @Test
    void deleteComment_notFound() {
        UUID commentId = UUID.randomUUID();
        when(workspaceCommentRepository.findById(commentId)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> workspaceCommentService.deleteComment(userId, eventId, commentId));
    }
}
