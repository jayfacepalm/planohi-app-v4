package com.planohi.api.exception;

import com.planohi.api.dto.ChangeProposalResponseDto;
import lombok.Getter;

@Getter
public class ProposalSubmittedException extends RuntimeException {
    private final ChangeProposalResponseDto proposal;

    public ProposalSubmittedException(ChangeProposalResponseDto proposal) {
        super("Change proposal submitted for approval");
        this.proposal = proposal;
    }
}
