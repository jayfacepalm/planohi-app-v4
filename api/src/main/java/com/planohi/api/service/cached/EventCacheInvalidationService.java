package com.planohi.api.service.cached;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventCacheInvalidationService {

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Evicts all cache entries that contain the given eventId in their key.
     * This handles wildcard invalidations for events_detail, event_timeline, event_components,
     * event_budget_summary, event_chronological_spendings, etc.
     * Note: "events_list" cache is NOT wildcarded by eventId and requires allEntries=true eviction in the caller.
     */
    public void evictEventCaches(UUID eventId) {
        if (eventId == null) {
            return;
        }
        
        String pattern = "*" + eventId.toString() + "*";
        Set<String> keys = redisTemplate.keys(pattern);
        
        if (keys != null && !keys.isEmpty()) {
            log.info("Invalidating {} cache keys for eventId: {}", keys.size(), eventId);
            redisTemplate.delete(keys);
        } else {
            log.debug("No cache keys found to invalidate for eventId: {}", eventId);
        }
    }
}
