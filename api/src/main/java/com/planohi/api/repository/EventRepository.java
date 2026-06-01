package com.planohi.api.repository;

import com.planohi.api.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {

    @Query("SELECT e FROM Event e WHERE (e.userId = :userId OR EXISTS (SELECT 1 FROM EventCurator ec WHERE ec.eventId = e.id AND ec.userId = :userId AND ec.status = 'ACCEPTED')) AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(e.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Event> findByUserIdAndSearch(@Param("userId") UUID userId,
                                      @Param("search") String search,
                                      Pageable pageable);

    @Query("SELECT e, COALESCE(SUM(c.estimatedCost), 0.00) FROM Event e " +
           "LEFT JOIN EventComponent c ON c.eventId = e.id " +
           "WHERE (e.userId = :userId OR EXISTS (SELECT 1 FROM EventCurator ec WHERE ec.eventId = e.id AND ec.userId = :userId AND ec.status = 'ACCEPTED')) AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(e.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.description) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "GROUP BY e.id")
    Page<Object[]> findByUserIdAndSearchWithBudget(@Param("userId") UUID userId,
                                                   @Param("search") String search,
                                                   Pageable pageable);

    @Query("SELECT e, COALESCE(SUM(c.estimatedCost), 0.00) FROM Event e " +
           "LEFT JOIN EventComponent c ON c.eventId = e.id " +
           "WHERE e.id = :eventId " +
           "GROUP BY e.id")
    List<Object[]> findByIdWithBudget(@Param("eventId") UUID eventId);
}
