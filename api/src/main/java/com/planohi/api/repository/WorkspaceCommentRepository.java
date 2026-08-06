package com.planohi.api.repository;

import com.planohi.api.entity.WorkspaceComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkspaceCommentRepository extends JpaRepository<WorkspaceComment, UUID> {

    List<WorkspaceComment> findByEventIdAndTargetTypeAndTargetIdOrderByCreatedAtAsc(UUID eventId, String targetType, UUID targetId);

}
