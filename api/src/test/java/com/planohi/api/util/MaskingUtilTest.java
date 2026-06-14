package com.planohi.api.util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MaskingUtilTest {

    @Test
    void testMaskEmail() {
        assertEquals("t*****@***ple.com", MaskingUtil.maskEmail("tester@example.com"));
        assertEquals("j*******@***ail.com", MaskingUtil.maskEmail("john.doe@gmail.com"));
        assertEquals("a@***.com", MaskingUtil.maskEmail("a@b.com"));
        assertEquals("t***@***.uk", MaskingUtil.maskEmail("test@co.uk"));
        assertEquals("t*****@***.example.com", MaskingUtil.maskEmail("tester@sub.example.com"));

        // Null, empty, and invalid formats
        assertNull(MaskingUtil.maskEmail(null));
        assertEquals("", MaskingUtil.maskEmail(""));
        assertEquals("invalid-email", MaskingUtil.maskEmail("invalid-email"));
        assertEquals("invalid@", MaskingUtil.maskEmail("invalid@"));
        assertEquals("@invalid", MaskingUtil.maskEmail("@invalid"));
    }
}
