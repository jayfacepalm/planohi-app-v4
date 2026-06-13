package com.planohi.api.service;

import com.planohi.api.dto.EventSpendingDto;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.EventComponent;
import com.planohi.api.entity.EventSpending;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.repository.EventComponentRepository;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.EventSpendingRepository;
import com.planohi.api.service.impl.EventSpendingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EventSpendingServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private EventComponentRepository eventComponentRepository;

    @Mock
    private EventSpendingRepository eventSpendingRepository;

    @Mock
    private WorkspaceSecurityService workspaceSecurityService;

    @InjectMocks
    private EventSpendingServiceImpl eventSpendingService;

    private UUID userId;
    private UUID eventId;
    private UUID componentId;
    private Pageable pageable;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        eventId = UUID.randomUUID();
        componentId = UUID.randomUUID();
        pageable = PageRequest.of(0, 10);
    }

    @Test
    void getChronologicalSpendings_success() {
        Event event = Event.builder().id(eventId).title("Test Event").build();
        EventComponent component = EventComponent.builder().id(componentId).eventId(eventId).name("Catering").build();
        EventSpending spending = EventSpending.builder()
                .id(UUID.randomUUID())
                .componentId(componentId)
                .description("Lunch deposit")
                .amount(BigDecimal.valueOf(150.00))
                .spentAt(Instant.now())
                .build();

        Page<EventSpending> page = new PageImpl<>(List.of(spending));

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(eventComponentRepository.findByEventId(eventId)).thenReturn(List.of(component));
        when(eventSpendingRepository.findByEventIdAndSearch(eventId, "lunch", pageable)).thenReturn(page);

        Page<EventSpendingDto> result = eventSpendingService.getChronologicalSpendings(userId, eventId, "lunch", pageable);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        EventSpendingDto dto = result.getContent().get(0);
        assertEquals("Lunch deposit", dto.getDescription());
        assertEquals("Catering", dto.getComponentName());
        assertEquals(componentId, dto.getComponentId());

        verify(workspaceSecurityService).checkReadAccess(userId, eventId);
    }

    @Test
    void getChronologicalSpendings_eventNotFound() {
        when(eventRepository.findById(eventId)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> 
                eventSpendingService.getChronologicalSpendings(userId, eventId, null, pageable)
        );
    }
}
