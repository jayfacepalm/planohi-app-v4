package com.planohi.api.repository;

import com.planohi.api.entity.ChangeProposal;
import com.planohi.api.enums.ChangeProposalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChangeProposalRepository extends JpaRepository<ChangeProposal, UUID> {
    List<ChangeProposal> findByEventIdAndStatus(UUID eventId, ChangeProposalStatus status);
}
