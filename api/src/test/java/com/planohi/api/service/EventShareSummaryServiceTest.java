package com.planohi.api.service;

import com.planohi.api.dto.EventShareSummaryDto;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.EventComponent;
import com.planohi.api.entity.TimelineItem;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.repository.EventComponentRepository;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.TimelineItemRepository;
import com.planohi.api.service.impl.EventServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EventShareSummaryServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private TimelineItemRepository timelineItemRepository;

    @Mock
    private EventComponentRepository eventComponentRepository;

    @Mock
    private WorkspaceSecurityService workspaceSecurityService;

    @InjectMocks
    private EventServiceImpl eventService;

    private UUID userId;
    private UUID eventId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        eventId = UUID.randomUUID();
    }

    @Test
    void getShareSummary_success() {
        Event event = Event.builder()
                .id(eventId)
                .userId(userId)
                .title("Annual Summit 2026")
                .description("Gathering tech leaders.")
                .currency("USD")
                .build();

        TimelineItem item1 = TimelineItem.builder()
                .id(UUID.randomUUID())
                .eventId(eventId)
                .title("Reserve Venue")
                .dueAt(Instant.now())
                .isDone(true)
                .build();

        TimelineItem item2 = TimelineItem.builder()
                .id(UUID.randomUUID())
                .eventId(eventId)
                .title("Send Invites")
                .dueAt(Instant.now().plusSeconds(3600))
                .isDone(false)
                .build();

        EventComponent comp1 = EventComponent.builder()
                .id(UUID.randomUUID())
                .eventId(eventId)
                .name("Venue & Decor")
                .estimatedCost(BigDecimal.valueOf(5000))
                .build();

        List<Object[]> componentRows = new ArrayList<>();
        componentRows.add(new Object[]{comp1, BigDecimal.valueOf(4500)});

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(timelineItemRepository.findByEventIdOrderByDueAtAsc(eventId)).thenReturn(List.of(item1, item2));
        when(eventComponentRepository.findComponentsWithSpendingByEventId(eventId)).thenReturn(componentRows);

        EventShareSummaryDto summary = eventService.getShareSummary(userId, eventId);

        assertNotNull(summary);
        assertEquals(eventId, summary.getEventId());
        assertEquals("Annual Summit 2026", summary.getTitle());
        assertEquals("USD", summary.getCurrency());
        assertEquals("https://planohi.com/events/" + eventId, summary.getShareUrl());

        assertEquals(BigDecimal.valueOf(5000), summary.getTotalPlannedCost());
        assertEquals(BigDecimal.valueOf(4500), summary.getTotalActualSpent());

        assertEquals(2, summary.getTimeline().size());
        assertTrue(summary.getTimeline().get(0).isDone());
        assertEquals("Reserve Venue", summary.getTimeline().get(0).getTitle());

        assertEquals(1, summary.getComponents().size());
        assertEquals("Venue & Decor", summary.getComponents().get(0).getName());
        assertEquals(BigDecimal.valueOf(5000), summary.getComponents().get(0).getEstimatedCost());
        assertEquals(BigDecimal.valueOf(4500), summary.getComponents().get(0).getActualSpent());

        verify(workspaceSecurityService).checkReadAccess(userId, eventId);
    }

    @Test
    void getShareSummary_eventNotFound() {
        when(eventRepository.findById(eventId)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> eventService.getShareSummary(userId, eventId));
    }
}
