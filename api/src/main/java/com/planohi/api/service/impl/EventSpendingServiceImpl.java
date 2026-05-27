package com.planohi.api.service.impl;

import com.planohi.api.dto.CreateSpendingRequest;
import com.planohi.api.dto.EventSpendingDto;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.EventComponent;
import com.planohi.api.entity.EventSpending;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.exception.FieldValidationException;
import com.planohi.api.repository.EventComponentRepository;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.EventSpendingRepository;
import com.planohi.api.service.EventSpendingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventSpendingServiceImpl implements EventSpendingService {

    private final EventRepository eventRepository;
    private final EventComponentRepository eventComponentRepository;
    private final EventSpendingRepository eventSpendingRepository;

    @Override
    @Transactional
    public EventSpendingDto createSpending(UUID userId, UUID componentId, CreateSpendingRequest request) {
        log.info("Creating spending for component {} by user {}", componentId, userId);

        EventComponent component = eventComponentRepository.findById(componentId)
                .orElseThrow(() -> new EntityNotFoundException("Component not found"));

        Event event = eventRepository.findById(component.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new FieldValidationException("amount", "Spending amount must be a positive number greater than 0");
        }

        EventSpending spending = EventSpending.builder()
                .componentId(componentId)
                .description(request.getDescription())
                .amount(request.getAmount())
                .spentAt(request.getSpentAt())
                .build();

        EventSpending saved = eventSpendingRepository.save(spending);
        log.info("Spending recorded successfully with ID: {}", saved.getId());

        return mapToDto(saved, event.getId());
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
