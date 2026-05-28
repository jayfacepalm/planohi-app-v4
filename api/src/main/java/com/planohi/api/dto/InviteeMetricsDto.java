package com.planohi.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteeMetricsDto {
    private Long totalInvited;
    private Long respondedCount;
    private Long acceptedCount;
    private Long declinedCount;
    private Long pendingCount;
    private Long totalAttendingHeadcount;
}
