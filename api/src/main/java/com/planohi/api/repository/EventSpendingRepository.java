package com.planohi.api.repository;

import com.planohi.api.entity.EventSpending;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface EventSpendingRepository extends JpaRepository<EventSpending, UUID> {
    List<EventSpending> findByComponentIdOrderBySpentAtAsc(UUID componentId);
    List<EventSpending> findByComponentIdInOrderBySpentAtAsc(List<UUID> componentIds);
}
