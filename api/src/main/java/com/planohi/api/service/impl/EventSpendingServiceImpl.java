package com.planohi.api.service.impl;

import com.planohi.api.dto.CreateSpendingRequest;
import com.planohi.api.dto.EventSpendingDto;
import com.planohi.api.dto.UpdateSpendingRequest;
import com.planohi.api.dto.ChangeProposalResponseDto;
import com.planohi.api.enums.ChangeProposalAction;
import com.planohi.api.enums.ChangeProposalTarget;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.EventComponent;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.entity.EventSpending;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.exception.FieldValidationException;
import com.planohi.api.exception.ProposalSubmittedException;
import com.planohi.api.repository.EventComponentRepository;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.EventSpendingRepository;
import com.planohi.api.service.ChangeProposalService;
import com.planohi.api.service.EventSpendingService;
import com.planohi.api.service.WorkspaceSecurityService;
import com.planohi.api.service.ActivityLogPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventSpendingServiceImpl implements EventSpendingService {

    private final EventRepository eventRepository;
    private final EventComponentRepository eventComponentRepository;
    private final EventSpendingRepository eventSpendingRepository;
    private final WorkspaceSecurityService workspaceSecurityService;
    private final ChangeProposalService changeProposalService;
    private final ActivityLogPublisher activityLogPublisher;

    @Override
    @Transactional
    public EventSpendingDto createSpending(UUID userId, UUID componentId, CreateSpendingRequest request) {
        log.info("Creating spending for component {} by user {}", componentId, userId);

        EventComponent component = eventComponentRepository.findById(componentId)
                .orElseThrow(() -> new EntityNotFoundException("Component not found"));

        Event event = eventRepository.findById(component.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        EventCuratorRole role = workspaceSecurityService.getCuratorRole(userId, event.getId());
        if (role == EventCuratorRole.VIEWER) {
            throw new IllegalArgumentException("Access Denied: Viewers cannot modify event spending");
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new FieldValidationException("amount", "Spending amount must be a positive number greater than 0");
        }



        if (role == EventCuratorRole.COLLABORATOR) {
            // Include componentId inside proposedData since createSpending body doesn't contain it directly
            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("componentId", componentId.toString());
            data.put("description", request.getDescription());
            data.put("amount", request.getAmount());
            data.put("spentAt", request.getSpentAt().toString());

            ChangeProposalResponseDto proposal = changeProposalService.createProposal(
                    event.getId(),
                    userId,
                    ChangeProposalTarget.SPENDING,
                    ChangeProposalAction.CREATE,
                    null,
                    data
            );
            throw new ProposalSubmittedException(proposal);
        }

        EventSpending spending = EventSpending.builder()
                .componentId(componentId)
                .description(request.getDescription())
                .amount(request.getAmount())
                .spentAt(request.getSpentAt())
                .build();

        EventSpending saved = eventSpendingRepository.save(spending);
        log.info("Spending recorded successfully with ID: {}", saved.getId());

        activityLogPublisher.publish(userId, null, "SPENDING_CREATE", "SPENDING", saved.getId(), event.getId(), "SUCCESS", java.util.Map.of("description", saved.getDescription(), "amount", saved.getAmount(), "componentId", componentId));

        return mapToDto(saved, event.getId());
    }

    @Override
    @Transactional
    public EventSpendingDto updateSpending(UUID userId, UUID componentId, UUID spendingId, UpdateSpendingRequest request) {
        log.info("Updating spending {} for component {} by user {}", spendingId, componentId, userId);

        EventSpending spending = eventSpendingRepository.findById(spendingId)
                .orElseThrow(() -> new EntityNotFoundException("Spending not found"));

        if (!spending.getComponentId().equals(componentId)) {
            throw new IllegalArgumentException("Spending does not belong to this component");
        }

        EventComponent component = eventComponentRepository.findById(componentId)
                .orElseThrow(() -> new EntityNotFoundException("Component not found"));

        Event event = eventRepository.findById(component.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        EventCuratorRole role = workspaceSecurityService.getCuratorRole(userId, event.getId());
        if (role == EventCuratorRole.VIEWER) {
            throw new IllegalArgumentException("Access Denied: Viewers cannot modify event spending");
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new FieldValidationException("amount", "Spending amount must be a positive number greater than 0");
        }



        if (role == EventCuratorRole.COLLABORATOR) {
            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("componentId", componentId.toString());
            data.put("description", request.getDescription());
            data.put("amount", request.getAmount());
            data.put("spentAt", request.getSpentAt().toString());

            ChangeProposalResponseDto proposal = changeProposalService.createProposal(
                    event.getId(),
                    userId,
                    ChangeProposalTarget.SPENDING,
                    ChangeProposalAction.UPDATE,
                    spendingId,
                    data
            );
            throw new ProposalSubmittedException(proposal);
        }

        spending.setDescription(request.getDescription());
        spending.setAmount(request.getAmount());
        spending.setSpentAt(request.getSpentAt());

        EventSpending saved = eventSpendingRepository.save(spending);
        log.info("Spending updated successfully with ID: {}", saved.getId());

        activityLogPublisher.publish(userId, null, "SPENDING_UPDATE", "SPENDING", saved.getId(), event.getId(), "SUCCESS", java.util.Map.of("description", saved.getDescription(), "amount", saved.getAmount(), "componentId", componentId));

        return mapToDto(saved, event.getId());
    }

    @Override
    @Transactional
    public EventSpendingDto deleteSpending(UUID userId, UUID componentId, UUID spendingId) {
        log.info("Deleting spending {} from component {} by user {}", spendingId, componentId, userId);

        EventSpending spending = eventSpendingRepository.findById(spendingId)
                .orElseThrow(() -> new EntityNotFoundException("Spending not found"));

        if (!spending.getComponentId().equals(componentId)) {
            throw new IllegalArgumentException("Spending does not belong to this component");
        }

        EventComponent component = eventComponentRepository.findById(componentId)
                .orElseThrow(() -> new EntityNotFoundException("Component not found"));

        Event event = eventRepository.findById(component.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        EventCuratorRole role = workspaceSecurityService.getCuratorRole(userId, event.getId());
        if (role == EventCuratorRole.VIEWER) {
            throw new IllegalArgumentException("Access Denied: Viewers cannot modify event spending");
        }

        if (role == EventCuratorRole.COLLABORATOR) {
            ChangeProposalResponseDto proposal = changeProposalService.createProposal(
                    event.getId(),
                    userId,
                    ChangeProposalTarget.SPENDING,
                    ChangeProposalAction.DELETE,
                    spendingId,
                    java.util.Map.of("id", spendingId.toString(), "description", spending.getDescription())
            );
            throw new ProposalSubmittedException(proposal);
        }

        EventSpendingDto dto = mapToDto(spending, event.getId());
        eventSpendingRepository.delete(spending);
        log.info("Spending deleted successfully with ID: {}", spendingId);

        activityLogPublisher.publish(userId, null, "SPENDING_DELETE", "SPENDING", spendingId, event.getId(), "SUCCESS", java.util.Map.of("description", spending.getDescription(), "amount", spending.getAmount()));

        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventSpendingDto> getChronologicalSpendings(UUID userId, UUID eventId, String search, Pageable pageable) {
        log.info("Fetching chronological spendings for event {} by user {}", eventId, userId);

        eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkReadAccess(userId, eventId);

        java.util.List<EventComponent> components = eventComponentRepository.findByEventId(eventId);
        java.util.Map<UUID, String> componentMap = components.stream()
                .collect(java.util.stream.Collectors.toMap(EventComponent::getId, EventComponent::getName));

        Page<EventSpending> spendingsPage = eventSpendingRepository.findByEventIdAndSearch(eventId, search, pageable);

        return spendingsPage.map(spending -> {
            EventSpendingDto dto = mapToDto(spending, eventId);
            dto.setComponentName(componentMap.getOrDefault(spending.getComponentId(), "Unknown Component"));
            return dto;
        });
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventSpendingDto> getChronologicalSpendingsInternal(UUID eventId, String search, Pageable pageable) {
        log.info("Fetching chronological spendings internally for event {}", eventId);

        eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        java.util.List<EventComponent> components = eventComponentRepository.findByEventId(eventId);
        java.util.Map<UUID, String> componentMap = components.stream()
                .collect(java.util.stream.Collectors.toMap(EventComponent::getId, EventComponent::getName));

        Page<EventSpending> spendingsPage = eventSpendingRepository.findByEventIdAndSearch(eventId, search, pageable);

        return spendingsPage.map(spending -> {
            EventSpendingDto dto = mapToDto(spending, eventId);
            dto.setComponentName(componentMap.getOrDefault(spending.getComponentId(), "Unknown Component"));
            return dto;
        });
    }

    private EventSpendingDto mapToDto(EventSpending spending, UUID eventId) {
        return EventSpendingDto.builder()
                .id(spending.getId())
                .componentId(spending.getComponentId())
                .eventId(eventId)
                .description(spending.getDescription())
                .amount(spending.getAmount())
                .spentAt(spending.getSpentAt())
                .createdAt(spending.getCreatedAt())
                .build();
    }
}
