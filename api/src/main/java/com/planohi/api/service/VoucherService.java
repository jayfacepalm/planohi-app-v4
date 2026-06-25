package com.planohi.api.service;

import com.planohi.api.dto.VoucherDetailsDto;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface VoucherService {
    List<String> generateVouchers(UUID adminUserId, int quantity, Instant expiresAt);
    void activateVoucher(UUID userId, String code);
    List<VoucherDetailsDto> getAllVouchers(UUID adminUserId);
}
