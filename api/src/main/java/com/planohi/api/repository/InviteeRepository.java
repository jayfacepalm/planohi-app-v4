package com.planohi.api.repository;

import com.planohi.api.entity.Invitee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import com.planohi.api.dto.InviteeMetricsDto;

@Repository
public interface InviteeRepository extends JpaRepository<Invitee, UUID> {
    Optional<Invitee> findByToken(String token);
    boolean existsByToken(String token);
    Page<Invitee> findByEventId(UUID eventId, Pageable pageable);
    Page<Invitee> findByEventIdAndNameContainingIgnoreCase(UUID eventId, String name, Pageable pageable);
    java.util.List<Invitee> findByEventIdAndStatus(UUID eventId, String status);

    @Query("SELECT new com.planohi.api.dto.InviteeMetricsDto(" +
           "COUNT(i.id), " +
           "COALESCE(SUM(CASE WHEN i.status != 'PENDING' THEN 1L ELSE 0L END), 0L), " +
           "COALESCE(SUM(CASE WHEN i.status = 'ACCEPTED' THEN 1L ELSE 0L END), 0L), " +
           "COALESCE(SUM(CASE WHEN i.status = 'DECLINED' THEN 1L ELSE 0L END), 0L), " +
           "COALESCE(SUM(CASE WHEN i.status = 'PENDING' THEN 1L ELSE 0L END), 0L), " +
           "COALESCE(SUM(i.attendingGuests), 0L)) " +
           "FROM Invitee i WHERE i.eventId = :eventId")
    InviteeMetricsDto getMetricsByEventId(UUID eventId);
}
