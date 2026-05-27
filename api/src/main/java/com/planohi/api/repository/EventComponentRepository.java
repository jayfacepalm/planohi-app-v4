package com.planohi.api.repository;

import com.planohi.api.entity.EventComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

@Repository
public interface EventComponentRepository extends JpaRepository<EventComponent, UUID> {
    List<EventComponent> findByEventId(UUID eventId);

    @Query("SELECT c, COALESCE(SUM(s.amount), 0.00) FROM EventComponent c " +
           "LEFT JOIN EventSpending s ON s.componentId = c.id " +
           "WHERE c.eventId = :eventId " +
           "GROUP BY c.id")
    List<Object[]> findComponentsWithSpendingByEventId(@Param("eventId") UUID eventId);
}
