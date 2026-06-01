package com.planohi.api.repository;

import com.planohi.api.entity.EventCurator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventCuratorRepository extends JpaRepository<EventCurator, UUID> {

    Optional<EventCurator> findByEventIdAndUserId(UUID eventId, UUID userId);

    List<EventCurator> findByEventId(UUID eventId);

    List<EventCurator> findByUserIdAndStatus(UUID userId, String status);

    boolean existsByEventIdAndUserId(UUID eventId, UUID userId);

    @Query("SELECT c, u.email, u.alias FROM EventCurator c JOIN UserAccount u ON c.userId = u.id WHERE c.eventId = :eventId ORDER BY c.createdAt ASC")
    List<Object[]> findCuratorsWithUserDetails(@Param("eventId") UUID eventId);

    @Query("SELECT c, e.title, u.alias FROM EventCurator c " +
           "JOIN Event e ON c.eventId = e.id " +
           "JOIN UserAccount u ON e.userId = u.id " +
           "WHERE c.userId = :userId AND c.status = :status ORDER BY c.createdAt DESC")
    List<Object[]> findInvitationsWithDetails(@Param("userId") UUID userId, @Param("status") String status);
}
