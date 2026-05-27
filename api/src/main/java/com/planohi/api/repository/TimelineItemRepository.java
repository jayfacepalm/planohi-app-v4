package com.planohi.api.repository;

import com.planohi.api.entity.TimelineItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TimelineItemRepository extends JpaRepository<TimelineItem, UUID> {
    List<TimelineItem> findByEventIdOrderByDueAtAsc(UUID eventId);
}
