package com.planohi.api.service.impl;

import com.planohi.api.dto.BudgetSummaryResponse;
import com.planohi.api.dto.CreateComponentRequest;
import com.planohi.api.dto.EventComponentDto;
import com.planohi.api.dto.EventComponentsResponse;
import com.planohi.api.dto.EventSpendingDto;
import com.planohi.api.dto.UpdateComponentRequest;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.EventComponent;
import com.planohi.api.entity.EventSpending;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.repository.EventComponentRepository;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.EventSpendingRepository;
import com.planohi.api.service.EventComponentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventComponentServiceImpl implements EventComponentService {

    private final EventRepository eventRepository;
    private final EventComponentRepository eventComponentRepository;
    private final EventSpendingRepository eventSpendingRepository;

    @Override
    @Transactional
    public EventComponentDto createComponent(UUID userId, UUID eventId, CreateComponentRequest request) {
        log.info("Creating component '{}' for event {} by user {}", request.getName(), eventId, userId);
        
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        EventComponent component = EventComponent.builder()
                .eventId(eventId)
                .name(request.getName())
                .estimatedCost(request.getEstimatedCost())
                .build();

        EventComponent saved = eventComponentRepository.save(component);
        log.info("Component successfully saved with ID {}", saved.getId());
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public EventComponentDto updateComponent(UUID userId, UUID eventId, UUID componentId, UpdateComponentRequest request) {
        log.info("Updating component {} for event {} by user {}", componentId, eventId, userId);
        
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        EventComponent component = eventComponentRepository.findById(componentId)
                .orElseThrow(() -> new EntityNotFoundException("Component not found"));

        if (!component.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Component does not belong to this event");
        }

        component.setName(request.getName());
        component.setEstimatedCost(request.getEstimatedCost());

        EventComponent saved = eventComponentRepository.save(component);
        log.info("Component successfully updated with ID {}", saved.getId());
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public EventComponentsResponse getComponents(UUID userId, UUID eventId) {
        log.debug("Fetching components for event {} by user {}", eventId, userId);
        
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        List<EventComponent> components = eventComponentRepository.findByEventId(eventId);
        
        List<EventComponentDto> dtos = components.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        BigDecimal total = components.stream()
                .map(EventComponent::getEstimatedCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return EventComponentsResponse.builder()
                .components(dtos)
                .totalEstimatedCost(total)
                .build();
    }

    @Override
    @Transactional
    public void deleteComponent(UUID userId, UUID eventId, UUID componentId) {
        log.info("Deleting component {} from event {} by user {}", componentId, eventId, userId);
        
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        EventComponent component = eventComponentRepository.findById(componentId)
                .orElseThrow(() -> new EntityNotFoundException("Component not found"));

        if (!component.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Component does not belong to this event");
        }

        eventComponentRepository.delete(component);
        log.info("Component successfully deleted");
    }

    private EventComponentDto mapToDto(EventComponent component) {
        return EventComponentDto.builder()
                .id(component.getId())
                .eventId(component.getEventId())
                .name(component.getName())
                .estimatedCost(component.getEstimatedCost())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public BudgetSummaryResponse getBudgetSummary(UUID userId, UUID eventId) {
        log.debug("Fetching budget summary for event {} by user {}", eventId, userId);
        
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        List<Object[]> results = eventComponentRepository.findComponentsWithSpendingByEventId(eventId);
        
        List<UUID> componentIds = results.stream()
                .map(row -> ((EventComponent) row[0]).getId())
                .collect(Collectors.toList());

        List<EventSpending> allSpendings = componentIds.isEmpty() ? 
                new ArrayList<>() : 
                eventSpendingRepository.findByComponentIdInOrderBySpentAtAsc(componentIds);

        Map<UUID, List<EventSpending>> spendingsMap = allSpendings.stream()
                .collect(Collectors.groupingBy(EventSpending::getComponentId));

        BigDecimal totalEstimated = BigDecimal.ZERO;
        BigDecimal totalActual = BigDecimal.ZERO;
        List<BudgetSummaryResponse.ComponentBudgetSummary> componentsSummary = new ArrayList<>();
        
        for (Object[] row : results) {
            EventComponent component = (EventComponent) row[0];
            BigDecimal actualSpent = (BigDecimal) row[1];
            
            totalEstimated = totalEstimated.add(component.getEstimatedCost());
            totalActual = totalActual.add(actualSpent);
            
            List<EventSpending> spendings = spendingsMap.getOrDefault(component.getId(), new ArrayList<>());
            List<EventSpendingDto> spendingDtos = spendings.stream()
                    .map(this::mapSpendingToDto)
                    .collect(Collectors.toList());
                    
            componentsSummary.add(BudgetSummaryResponse.ComponentBudgetSummary.builder()
                    .id(component.getId())
                    .name(component.getName())
                    .estimatedCost(component.getEstimatedCost())
                    .actualSpent(actualSpent)
                    .spendings(spendingDtos)
                    .build());
        }

        return BudgetSummaryResponse.builder()
                .totalEstimatedCost(totalEstimated)
                .totalActualSpent(totalActual)
                .components(componentsSummary)
                .build();
    }

    private EventSpendingDto mapSpendingToDto(EventSpending spending) {
        return EventSpendingDto.builder()
                .id(spending.getId())
                .componentId(spending.getComponentId())
                .description(spending.getDescription())
                .amount(spending.getAmount())
                .spentAt(spending.getSpentAt())
                .createdAt(spending.getCreatedAt())
                .build();
    }
}
