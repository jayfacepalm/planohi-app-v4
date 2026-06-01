package com.planohi.api.service;

import com.planohi.api.dto.ChangeProposalResponseDto;
import com.planohi.api.dto.ReviewProposalRequest;
import com.planohi.api.enums.ChangeProposalAction;
import com.planohi.api.enums.ChangeProposalTarget;
import java.util.List;
import java.util.UUID;

public interface ChangeProposalService {
    ChangeProposalResponseDto createProposal(
            UUID eventId,
            UUID proposedBy,
            ChangeProposalTarget targetType,
            ChangeProposalAction actionType,
            UUID targetId,
            Object proposedData);

    List<ChangeProposalResponseDto> getPendingProposals(UUID userId, UUID eventId);

    ChangeProposalResponseDto reviewProposal(UUID userId, UUID proposalId, ReviewProposalRequest request);
}
