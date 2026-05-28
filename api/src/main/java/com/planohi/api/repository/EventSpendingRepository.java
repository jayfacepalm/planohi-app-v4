package com.planohi.api.repository;

import com.planohi.api.entity.EventSpending;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface EventSpendingRepository extends JpaRepository<EventSpending, UUID> {
    List<EventSpending> findByComponentIdOrderBySpentAtAsc(UUID componentId);
    List<EventSpending> findByComponentIdInOrderBySpentAtAsc(List<UUID> componentIds);

    @Query("SELECT s FROM EventSpending s WHERE s.componentId IN (SELECT c.id FROM EventComponent c WHERE c.eventId = :eventId) ORDER BY s.spentAt Asc")
    List<EventSpending> findByEventIdOrderBySpentAtAsc(@Param("eventId") UUID eventId);
}
