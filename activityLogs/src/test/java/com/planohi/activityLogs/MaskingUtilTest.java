package com.planohi.activityLogs;

import com.planohi.activityLogs.util.MaskingUtil;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class MaskingUtilTest {

    @Test
    void testMaskEmail() {
        assertEquals("t*****@***ple.com", MaskingUtil.maskEmail("tester@example.com"));
        assertEquals("j*******@***ail.com", MaskingUtil.maskEmail("john.doe@gmail.com"));
        assertEquals("a@***.com", MaskingUtil.maskEmail("a@b.com"));
        assertEquals("t***@***.uk", MaskingUtil.maskEmail("test@co.uk"));
        assertNull(MaskingUtil.maskEmail(null));
        assertEquals("invalid-email", MaskingUtil.maskEmail("invalid-email"));
    }
}
