package com.planohi.api.service.cached;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.net.ServerSocket;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.planohi.api.dto.CreateTimelineItemRequest;
import com.planohi.api.dto.EventTimelineResponse;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.UserAccount;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.enums.UserRole;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.TimelineItemRepository;
import com.planohi.api.repository.UserAccountRepository;
import com.planohi.api.service.WorkspaceSecurityService;

import redis.embedded.RedisServer;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=update",
        "spring.mail.host=localhost",
        "spring.mail.port=2525",
        "security.api-key=test-api-key",
        "security.jwt.secret-key=test-secret-key-12345678901234567890123456789012",
        "security.jwt.role-secret-key=test-role-secret-key-12345678901234567890",
        "AWS_S3_BUCKET_NAME=test-bucket",
        "AWS_REGION=us-east-1"
})
public class TimelineCacheIntegrationTest {

    private static RedisServer redisServer;
    private static int redisPort;

    @BeforeAll
    static void startRedis() throws IOException {
        redisPort = findFreePort();
        redisServer = new RedisServer(redisPort);
        redisServer.start();
    }

    @AfterAll
    static void stopRedis() {
        if (redisServer != null) {
            redisServer.stop();
        }
    }

    private static int findFreePort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", () -> "localhost");
        registry.add("spring.data.redis.port", () -> redisPort);
    }

    @Autowired
    private TimelineCachedService timelineCachedService;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private TimelineItemRepository timelineItemRepository;

    @Autowired
    private CacheManager cacheManager;

    @MockitoBean
    private WorkspaceSecurityService workspaceSecurityService;

    @MockitoBean
    private com.planohi.api.service.S3StorageService s3StorageService;

    private UserAccount owner;
    private UserAccount organizer;
    private Event event;

    @BeforeEach
    void setUp() {
        cacheManager.getCacheNames().forEach(name -> cacheManager.getCache(name).clear());

        timelineItemRepository.deleteAll();
        eventRepository.deleteAll();
        userAccountRepository.deleteAll();

        owner = UserAccount.builder()
                .email("owner@test.com")
                .passwordHash("hash")
                .alias("Owner")
                .role(UserRole.NORMAL)
                .build();
        owner = userAccountRepository.save(owner);

        organizer = UserAccount.builder()
                .email("organizer@test.com")
                .passwordHash("hash")
                .alias("Organizer")
                .role(UserRole.NORMAL)
                .build();
        organizer = userAccountRepository.save(organizer);

        event = Event.builder()
                .userId(owner.getId())
                .title("Cache Test Event")
                .startDate(Instant.now().minus(1, ChronoUnit.DAYS))
                .endDate(Instant.now().plus(5, ChronoUnit.DAYS))
                .currency("USD")
                .build();
        event = eventRepository.save(event);

        // Mock security service to allow both users read/write access
        doNothing().when(workspaceSecurityService).checkReadAccess(owner.getId(), event.getId());
        doNothing().when(workspaceSecurityService).checkReadAccess(organizer.getId(), event.getId());
        when(workspaceSecurityService.getCuratorRole(owner.getId(), event.getId())).thenReturn(EventCuratorRole.OWNER);
        when(workspaceSecurityService.getCuratorRole(organizer.getId(), event.getId()))
                .thenReturn(EventCuratorRole.ORGANIZER);
    }

    @Test
    void testConcurrentUpdatesAreImmediatelyVisible() {
        // 1. Owner fetches event timeline (Cache miss, writes to Global Cache)
        EventTimelineResponse initialOwnerView = timelineCachedService.getEventTimeline(owner.getId(), event.getId());
        assertThat(initialOwnerView.getItems()).isEmpty();

        // Assert it's in the cache
        org.springframework.cache.Cache cache = cacheManager.getCache("event_timeline");
        assertThat(cache.get(event.getId().toString())).isNotNull();

        // 2. Organizer fetches event timeline (Cache hit from Global Cache)
        EventTimelineResponse organizerView = timelineCachedService.getEventTimeline(organizer.getId(), event.getId());
        assertThat(organizerView.getItems()).isEmpty();

        // 3. Organizer adds a new milestone (Evicts Global Cache)
        CreateTimelineItemRequest request = new CreateTimelineItemRequest();
        request.setTitle("Book Venue");
        request.setDueAt(Instant.now().plus(2, ChronoUnit.DAYS));

        timelineCachedService.createTimelineItem(organizer.getId(), event.getId(), request);

        // Assert it was evicted
        assertThat(cache.get(event.getId().toString())).isNull();

        // 4. Owner fetches event timeline (Cache miss, writes to Global Cache)
        EventTimelineResponse finalOwnerView = timelineCachedService.getEventTimeline(owner.getId(), event.getId());
        assertThat(finalOwnerView.getItems()).hasSize(1);
        assertThat(finalOwnerView.getItems().get(0).getTitle()).isEqualTo("Book Venue");
    }
}
