package com.planohi.api.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.BeanProperty;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.deser.ContextualDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Configuration
@EnableCaching
public class CacheConfig {

    private static class PageDeserializer extends JsonDeserializer<Page<?>> implements ContextualDeserializer {
        private static final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        private JavaType contentType;

        public PageDeserializer() {}

        public PageDeserializer(JavaType contentType) {
            this.contentType = contentType;
        }

        @Override
        public JsonDeserializer<?> createContextual(DeserializationContext ctxt, BeanProperty property) throws JsonMappingException {
            JavaType type = ctxt.getContextualType();
            if (type != null && type.containedTypeCount() > 0) {
                return new PageDeserializer(type.containedType(0));
            }
            return this;
        }

        @Override
        public Page<?> deserialize(JsonParser p, DeserializationContext ctxt) throws IOException, JsonProcessingException {
            JsonNode node = mapper.readTree(p);
            JsonNode contentNode = node.get("content");
            List<Object> content = new ArrayList<>();
            if (contentNode != null) {
                boolean isTypeWrapped = contentNode.isArray() 
                    && contentNode.size() == 2 
                    && contentNode.get(0).isTextual() 
                    && contentNode.get(1).isArray();
                
                if (isTypeWrapped) {
                    JsonParser contentParser = contentNode.traverse(p.getCodec());
                    if (contentParser.nextToken() != null) {
                        JavaType listType = ctxt.getTypeFactory().constructCollectionType(List.class, contentType != null ? contentType : ctxt.constructType(Object.class));
                        List<?> deserializedList = ctxt.readValue(contentParser, listType);
                        if (deserializedList != null) {
                            content.addAll(deserializedList);
                        }
                    }
                } else if (contentNode.isArray()) {
                    for (JsonNode item : contentNode) {
                        if (contentType != null) {
                            content.add(mapper.treeToValue(item, contentType.getRawClass()));
                        } else {
                            content.add(mapper.treeToValue(item, Object.class));
                        }
                    }
                }
            }
            long total = node.has("totalElements") ? node.get("totalElements").asLong() : content.size();
            int number = node.has("number") ? node.get("number").asInt() : 0;
            int size = node.has("size") ? node.get("size").asInt() : Math.max(1, content.size());
            
            return new PageImpl<>(content, PageRequest.of(number, size), total);
        }
    }

    private ObjectMapper configureObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        
        SimpleModule module = new SimpleModule();
        module.addDeserializer(Page.class, new PageDeserializer());
        module.addDeserializer(PageImpl.class, (JsonDeserializer) new PageDeserializer());
        mapper.registerModule(module);

        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.activateDefaultTyping(
            mapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.EVERYTHING,
            JsonTypeInfo.As.PROPERTY
        );
        return mapper;
    }

    @Bean
    @Primary
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .computePrefixWith(cacheName -> "planohi:" + cacheName + "::")
            .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
                new GenericJackson2JsonRedisSerializer(configureObjectMapper())
            ));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(config)
            .withCacheConfiguration("otps", config.entryTtl(Duration.ofMinutes(5))) // 5-minute TTL for OTPs
            .withCacheConfiguration("events_list", config.entryTtl(Duration.ofMinutes(10)))
            .withCacheConfiguration("events_detail", config.entryTtl(Duration.ofMinutes(10)))
            .withCacheConfiguration("event_components", config.entryTtl(Duration.ofMinutes(10)))
            .withCacheConfiguration("event_budget_summary", config.entryTtl(Duration.ofMinutes(10)))
            .withCacheConfiguration("event_timeline", config.entryTtl(Duration.ofMinutes(10)))
            .withCacheConfiguration("event_invitees", config.entryTtl(Duration.ofMinutes(10)))
            .withCacheConfiguration("event_metrics", config.entryTtl(Duration.ofMinutes(10)))
            .withCacheConfiguration("public_rsvp", config.entryTtl(Duration.ofMinutes(10)))
            .build();
    }
}
