package com.planohi.api.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.planohi.api.config.UserPrincipal;
import com.planohi.api.dto.ChangeProposalResponseDto;
import com.planohi.api.dto.CreateComponentRequest;
import com.planohi.api.dto.CreateSpendingRequest;
import com.planohi.api.dto.CreateTimelineItemRequest;
import com.planohi.api.dto.ReviewProposalRequest;
import com.planohi.api.dto.UpdateComponentRequest;
import com.planohi.api.dto.UpdateSpendingRequest;
import com.planohi.api.entity.ChangeProposal;
import com.planohi.api.enums.ChangeProposalAction;
import com.planohi.api.enums.ChangeProposalStatus;
import com.planohi.api.enums.ChangeProposalTarget;
import com.planohi.api.entity.EventComponent;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.entity.EventSpending;
import com.planohi.api.entity.TimelineItem;
import com.planohi.api.entity.UserAccount;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.repository.ChangeProposalRepository;
import com.planohi.api.repository.EventComponentRepository;
import com.planohi.api.repository.EventSpendingRepository;
import com.planohi.api.repository.TimelineItemRepository;
import com.planohi.api.repository.UserAccountRepository;
import com.planohi.api.service.ChangeProposalService;
import com.planohi.api.service.WorkspaceSecurityService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ChangeProposalServiceImpl implements ChangeProposalService {

    private final ChangeProposalRepository changeProposalRepository;
    private final UserAccountRepository userAccountRepository;
    private final EventComponentRepository eventComponentRepository;
    private final EventSpendingRepository eventSpendingRepository;
    private final TimelineItemRepository timelineItemRepository;
    private final WorkspaceSecurityService workspaceSecurityService;
    private final CacheManager cacheManager;
    private final ObjectMapper objectMapper;

    public ChangeProposalServiceImpl(
            ChangeProposalRepository changeProposalRepository,
            UserAccountRepository userAccountRepository,
            EventComponentRepository eventComponentRepository,
            EventSpendingRepository eventSpendingRepository,
            TimelineItemRepository timelineItemRepository,
            WorkspaceSecurityService workspaceSecurityService,
            CacheManager cacheManager) {
        this.changeProposalRepository = changeProposalRepository;
        this.userAccountRepository = userAccountRepository;
        this.eventComponentRepository = eventComponentRepository;
        this.eventSpendingRepository = eventSpendingRepository;
        this.timelineItemRepository = timelineItemRepository;
        this.workspaceSecurityService = workspaceSecurityService;
        this.cacheManager = cacheManager;
        this.objectMapper = new ObjectMapper()
                .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
                .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .disable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ChangeProposalResponseDto createProposal(
            UUID eventId,
            UUID proposedBy,
            ChangeProposalTarget targetType,
            ChangeProposalAction actionType,
            UUID targetId,
            Object proposedData) {

        log.info("Creating change proposal for event {}, target {}, action {} by user {}",
                eventId, targetType, actionType, proposedBy);

        UserAccount user = userAccountRepository.findById(proposedBy)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        Map<String, Object> dataMap = null;
        if (proposedData != null) {
            if (proposedData instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> casted = (Map<String, Object>) proposedData;
                dataMap = casted;
            } else {
                dataMap = objectMapper.convertValue(proposedData, new TypeReference<Map<String, Object>>() {
                });
            }
        }

        ChangeProposal proposal = ChangeProposal.builder()
                .eventId(eventId)
                .proposedBy(proposedBy)
                .targetType(targetType)
                .actionType(actionType)
                .targetId(targetId)
                .proposedData(dataMap)
                .status(ChangeProposalStatus.PENDING)
                .build();

        ChangeProposal saved = changeProposalRepository.save(proposal);
        log.info("Successfully persisted change proposal {} for event {}", saved.getId(), eventId);

        // Evict event proposals cache on creation
        evictProposalsCache(eventId);

        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChangeProposalResponseDto> getPendingProposals(UUID userId, UUID eventId) {
        log.info("Fetching pending proposals for event {} by user {}", eventId, userId);

        // This validates if the user is a member of the event workspace (throws if not)
        EventCuratorRole role = workspaceSecurityService.getCuratorRole(userId, eventId);

        return changeProposalRepository.findByEventIdAndStatus(eventId, ChangeProposalStatus.PENDING).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ChangeProposalResponseDto reviewProposal(UUID userId, UUID proposalId, ReviewProposalRequest request) {
        log.info("Reviewing proposal {} by user {} action {}", proposalId, userId, request.getAction());

        ChangeProposal proposal = changeProposalRepository.findById(proposalId)
                .orElseThrow(() -> new EntityNotFoundException("Change proposal not found"));

        EventCuratorRole role = workspaceSecurityService.getCuratorRole(userId, proposal.getEventId());
        if (role != EventCuratorRole.OWNER && role != EventCuratorRole.ORGANIZER) {
            throw new IllegalArgumentException(
                    "Access Denied: Only Owners and Organizers can approve/reject proposals");
        }

        if (proposal.getStatus() != ChangeProposalStatus.PENDING) {
            throw new IllegalArgumentException("This proposal has already been processed");
        }

        ChangeProposalStatus status = ChangeProposalStatus.valueOf(request.getAction().toUpperCase());
        proposal.setStatus(status);
        proposal.setReviewedBy(userId);
        proposal.setReviewedAt(Instant.now());

        if (status == ChangeProposalStatus.APPROVED) {
            log.info("Applying approved proposal {}", proposalId);
            executeProposalChanges(proposal);
        }

        ChangeProposal saved = changeProposalRepository.save(proposal);

        // Evict all event and list caches to sync live dashboards
        evictAllCaches();

        return mapToDto(saved);
    }

    private void executeProposalChanges(ChangeProposal proposal) {
        ChangeProposalTarget target = proposal.getTargetType();
        ChangeProposalAction action = proposal.getActionType();
        UUID proposerId = proposal.getProposedBy();

        executeSaveWithProposerAudit(proposerId, () -> {
            if (target == ChangeProposalTarget.COMPONENT) {
                if (action == ChangeProposalAction.CREATE) {
                    CreateComponentRequest req = objectMapper.convertValue(proposal.getProposedData(),
                            CreateComponentRequest.class);
                    EventComponent component = EventComponent.builder()
                            .eventId(proposal.getEventId())
                            .name(req.getName())
                            .estimatedCost(req.getEstimatedCost())
                            .build();
                    eventComponentRepository.save(component);
                } else if (action == ChangeProposalAction.UPDATE) {
                    UpdateComponentRequest req = objectMapper.convertValue(proposal.getProposedData(),
                            UpdateComponentRequest.class);
                    EventComponent component = eventComponentRepository.findById(proposal.getTargetId())
                            .orElseThrow(() -> new EntityNotFoundException("Component not found"));
                    component.setName(req.getName());
                    component.setEstimatedCost(req.getEstimatedCost());
                    eventComponentRepository.save(component);
                } else if (action == ChangeProposalAction.DELETE) {
                    EventComponent component = eventComponentRepository.findById(proposal.getTargetId())
                            .orElseThrow(() -> new EntityNotFoundException("Component not found"));
                    eventComponentRepository.delete(component);
                }
            } else if (target == ChangeProposalTarget.SPENDING) {
                if (action == ChangeProposalAction.CREATE) {
                    CreateSpendingRequest req = objectMapper.convertValue(proposal.getProposedData(),
                            CreateSpendingRequest.class);
                    UUID componentId = UUID.fromString((String) proposal.getProposedData().get("componentId"));
                    EventSpending spending = EventSpending.builder()
                            .componentId(componentId)
                            .description(req.getDescription())
                            .amount(req.getAmount())
                            .spentAt(req.getSpentAt())
                            .build();
                    eventSpendingRepository.save(spending);
                } else if (action == ChangeProposalAction.UPDATE) {
                    UpdateSpendingRequest req = objectMapper.convertValue(proposal.getProposedData(),
                            UpdateSpendingRequest.class);
                    EventSpending spending = eventSpendingRepository.findById(proposal.getTargetId())
                            .orElseThrow(() -> new EntityNotFoundException("Spending transaction not found"));
                    spending.setDescription(req.getDescription());
                    spending.setAmount(req.getAmount());
                    spending.setSpentAt(req.getSpentAt());
                    eventSpendingRepository.save(spending);
                } else if (action == ChangeProposalAction.DELETE) {
                    EventSpending spending = eventSpendingRepository.findById(proposal.getTargetId())
                            .orElseThrow(() -> new EntityNotFoundException("Spending transaction not found"));
                    eventSpendingRepository.delete(spending);
                }
            } else if (target == ChangeProposalTarget.TIMELINE_ITEM) {
                if (action == ChangeProposalAction.CREATE) {
                    CreateTimelineItemRequest req = objectMapper.convertValue(proposal.getProposedData(),
                            CreateTimelineItemRequest.class);
                    TimelineItem item = TimelineItem.builder()
                            .eventId(proposal.getEventId())
                            .title(req.getTitle())
                            .dueAt(req.getDueAt())
                            .isDone(false)
                            .build();
                    timelineItemRepository.save(item);
                } else if (action == ChangeProposalAction.UPDATE) {
                    boolean isDone = (Boolean) proposal.getProposedData().get("isDone");
                    TimelineItem item = timelineItemRepository.findById(proposal.getTargetId())
                            .orElseThrow(() -> new EntityNotFoundException("Timeline milestone not found"));
                    item.setDone(isDone);
                    timelineItemRepository.save(item);
                }
            }
        });
    }

    private void executeSaveWithProposerAudit(UUID proposerId, Runnable saveAction) {
        UserAccount proposer = userAccountRepository.findById(proposerId)
                .orElseThrow(() -> new EntityNotFoundException("Proposer account not found"));

        Authentication originalAuth = SecurityContextHolder.getContext().getAuthentication();
        UserPrincipal principal = UserPrincipal.builder()
                .id(proposer.getId())
                .email(proposer.getEmail())
                .alias(proposer.getAlias())
                .build();
        Authentication tempAuth = new UsernamePasswordAuthenticationToken(
                principal, "", Collections.emptyList());

        try {
            SecurityContextHolder.getContext().setAuthentication(tempAuth);
            saveAction.run();
        } finally {
            SecurityContextHolder.getContext().setAuthentication(originalAuth);
        }
    }

    private void evictProposalsCache(UUID eventId) {
        // Evicts proposals cache if any specific event proposal cache is registered
        Cache cache = cacheManager.getCache("event_proposals");
        if (cache != null) {
            cache.evict(eventId.toString());
        }
    }

    private void evictAllCaches() {
        String[] caches = { "event_components", "events_detail", "event_budget_summary", "event_timeline",
                "events_list", "event_proposals" };
        for (String cacheName : caches) {
            Cache cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
            }
        }
    }

    private ChangeProposalResponseDto mapToDto(ChangeProposal proposal) {
        UserAccount proposer = userAccountRepository.findById(proposal.getProposedBy())
                .orElseThrow(() -> new EntityNotFoundException("Proposer not found"));

        return ChangeProposalResponseDto.builder()
                .id(proposal.getId())
                .eventId(proposal.getEventId())
                .proposedBy(proposal.getProposedBy())
                .proposerAlias(proposer.getAlias())
                .targetType(proposal.getTargetType())
                .actionType(proposal.getActionType())
                .targetId(proposal.getTargetId())
                .proposedData(proposal.getProposedData())
                .status(proposal.getStatus())
                .reviewedBy(proposal.getReviewedBy())
                .reviewedAt(proposal.getReviewedAt())
                .createdAt(proposal.getCreatedAt())
                .build();
    }
}
