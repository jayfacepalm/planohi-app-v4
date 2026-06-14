package com.planohi.email.util;

public class MaskingUtil {

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }

        int atIndex = email.indexOf('@');
        if (atIndex <= 0 || atIndex == email.length() - 1) {
            return email;
        }

        String localPart = email.substring(0, atIndex);
        String domainPart = email.substring(atIndex + 1);

        // Mask local part:
        // "If length is greater than 1, preserve the first character and replace the remaining characters with * matching the length. If length is 1, keep it."
        String maskedLocal;
        if (localPart.length() > 1) {
            maskedLocal = localPart.charAt(0) + "*".repeat(localPart.length() - 1);
        } else {
            maskedLocal = localPart;
        }

        // Mask domain part:
        // "Domain Name (before first dot): If length is greater than 3, replace the leading characters with *** while keeping the last 3 characters. If length is 3 or less, replace the entire domain name with ***."
        // "Suffix: Retain standard suffixes intact (e.g. .com, .org, .co.uk)."
        int dotIndex = domainPart.indexOf('.');
        String domainName;
        String suffix;
        if (dotIndex != -1) {
            domainName = domainPart.substring(0, dotIndex);
            suffix = domainPart.substring(dotIndex); // Includes the dot
        } else {
            domainName = domainPart;
            suffix = "";
        }

        String maskedDomain;
        if (domainName.length() > 3) {
            maskedDomain = "***" + domainName.substring(domainName.length() - 3);
        } else {
            maskedDomain = "***";
        }

        return maskedLocal + "@" + maskedDomain + suffix;
    }
}
