package com.planohi.api.service.impl;

import com.planohi.api.dto.VoucherDetailsDto;
import com.planohi.api.entity.UserAccount;
import com.planohi.api.entity.Voucher;
import com.planohi.api.enums.UserRole;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.repository.UserAccountRepository;
import com.planohi.api.repository.VoucherRepository;
import com.planohi.api.service.VoucherService;
import com.planohi.api.service.ActivityLogPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoucherServiceImpl implements VoucherService {

    private final VoucherRepository voucherRepository;
    private final UserAccountRepository userAccountRepository;
    private final ActivityLogPublisher activityLogPublisher;

    @Override
    @Transactional
    public List<String> generateVouchers(UUID adminUserId, int quantity, Instant expiresAt) {
        log.info("Generating {} vouchers by admin user: {}", quantity, adminUserId);

        UserAccount admin = userAccountRepository.findById(adminUserId)
                .orElseThrow(() -> new EntityNotFoundException("Admin account not found"));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new IllegalArgumentException("Only administrators can generate voucher codes.");
        }

        List<String> generatedCodes = new ArrayList<>();
        List<Voucher> vouchersToSave = new ArrayList<>();

        for (int i = 0; i < quantity; i++) {
            String code;
            do {
                code = generateCode();
            } while (voucherRepository.existsByCode(code) || generatedCodes.contains(code));

            generatedCodes.add(code);
            vouchersToSave.add(Voucher.builder()
                    .code(code)
                    .createdByUserId(adminUserId)
                    .expiresAt(expiresAt)
                    .build());
        }

        voucherRepository.saveAll(vouchersToSave);

        activityLogPublisher.publish(adminUserId, admin.getAlias(), "VOUCHER_GENERATE", "VOUCHER", null, null, "SUCCESS", Map.of("quantity", quantity));

        return generatedCodes;
    }

    @Override
    @Transactional
    public void activateVoucher(UUID userId, String code) {
        if (code == null || code.trim().isEmpty()) {
            throw new IllegalArgumentException("Voucher code cannot be empty.");
        }

        String normalizedCode = code.trim().toUpperCase();
        log.info("User {} is attempting to activate voucher code: {}", userId, normalizedCode);

        // Fetch voucher with pessimistic write lock to guard against concurrent activations
        Voucher voucher = voucherRepository.findByCodeWithLock(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException("Invalid voucher code."));

        if (voucher.getActivatedByUserId() != null) {
            throw new IllegalArgumentException("This voucher code has already been activated.");
        }

        if (voucher.getExpiresAt() != null && voucher.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("This voucher code has expired.");
        }

        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User account not found"));

        if (user.getRole() == UserRole.PREMIUM || user.getRole() == UserRole.ADMIN) {
            throw new IllegalArgumentException("Your account is already premium or admin tier.");
        }

        // Activate voucher
        voucher.setActivatedByUserId(userId);
        voucher.setActivatedAt(Instant.now());
        voucherRepository.save(voucher);

        // Upgrade user role to PREMIUM
        user.setRole(UserRole.PREMIUM);
        userAccountRepository.save(user);

        log.info("Voucher successfully activated. User {} upgraded to PREMIUM.", userId);

        activityLogPublisher.publish(userId, user.getAlias(), "VOUCHER_ACTIVATE", "USER", userId, null, "SUCCESS", Map.of("code", normalizedCode));
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoucherDetailsDto> getAllVouchers(UUID adminUserId) {
        log.debug("Listing all vouchers for admin: {}", adminUserId);

        UserAccount admin = userAccountRepository.findById(adminUserId)
                .orElseThrow(() -> new EntityNotFoundException("Admin account not found"));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new IllegalArgumentException("Only administrators can view vouchers.");
        }

        List<Voucher> vouchers = voucherRepository.findAll();
        List<VoucherDetailsDto> dtos = new ArrayList<>();

        for (Voucher v : vouchers) {
            String creatorAlias = userAccountRepository.findById(v.getCreatedByUserId())
                    .map(UserAccount::getAlias).orElse("Unknown");
            String activatorAlias = null;
            if (v.getActivatedByUserId() != null) {
                activatorAlias = userAccountRepository.findById(v.getActivatedByUserId())
                        .map(UserAccount::getAlias).orElse("Unknown");
            }

            dtos.add(VoucherDetailsDto.builder()
                    .id(v.getId())
                    .code(v.getCode())
                    .createdByAlias(creatorAlias)
                    .activatedByAlias(activatorAlias)
                    .activatedAt(v.getActivatedAt())
                    .expiresAt(v.getExpiresAt())
                    .createdAt(v.getCreatedAt())
                    .build());
        }

        return dtos;
    }

    private String generateCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder("PLANOHI-PREM-");
        for (int i = 0; i < 8; i++) {
            if (i == 4) {
                sb.append("-");
            }
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
