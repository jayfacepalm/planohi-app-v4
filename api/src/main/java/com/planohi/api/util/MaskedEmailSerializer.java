package com.planohi.api.util;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.jsontype.TypeSerializer;
import java.io.IOException;

public class MaskedEmailSerializer extends JsonSerializer<String> {

    @Override
    public void serialize(String value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        if (value == null) {
            gen.writeNull();
        } else {
            gen.writeString(MaskingUtil.maskEmail(value));
        }
    }

    @Override
    public void serializeWithType(String value, JsonGenerator gen, SerializerProvider serializers, TypeSerializer typeSer) throws IOException {
        if (value == null) {
            gen.writeNull();
        } else {
            gen.writeString(MaskingUtil.maskEmail(value));
        }
    }
}
