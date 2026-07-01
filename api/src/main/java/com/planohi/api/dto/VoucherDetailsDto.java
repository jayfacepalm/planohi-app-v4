package com.planohi.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoucherDetailsDto {
    private UUID id;
    private String code;
    private String createdByAlias;
    private String activatedByAlias;
    private Instant activatedAt;
    private Instant expiresAt;
    private Instant createdAt;
}
