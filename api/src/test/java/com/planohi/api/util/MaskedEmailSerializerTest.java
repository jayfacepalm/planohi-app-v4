package com.planohi.api.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class MaskedEmailSerializerTest {

    static class TestDto {
        @JsonSerialize(using = MaskedEmailSerializer.class)
        private final String email;

        public TestDto(String email) {
            this.email = email;
        }

        public String getEmail() {
            return email;
        }
    }

    @Test
    void testSerialization() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        TestDto dto = new TestDto("tester@example.com");
        String json = mapper.writeValueAsString(dto);
        assertEquals("{\"email\":\"t*****@***ple.com\"}", json);
    }

    @Test
    void testSerializationWithPolymorphicDefaultTyping() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        mapper.activateDefaultTyping(
            com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator.instance,
            ObjectMapper.DefaultTyping.EVERYTHING,
            com.fasterxml.jackson.annotation.JsonTypeInfo.As.PROPERTY
        );
        TestDto dto = new TestDto("tester@example.com");
        String json = mapper.writeValueAsString(dto);
        org.junit.jupiter.api.Assertions.assertTrue(json.contains("t*****@***ple.com"));
    }
}
