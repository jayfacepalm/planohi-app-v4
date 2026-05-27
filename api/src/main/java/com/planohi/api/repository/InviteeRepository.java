package com.planohi.api.repository;

import com.planohi.api.entity.Invitee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InviteeRepository extends JpaRepository<Invitee, UUID> {
    Optional<Invitee> findByToken(String token);
    boolean existsByToken(String token);
}
