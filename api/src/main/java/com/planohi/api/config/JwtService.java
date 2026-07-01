package com.planohi.api.config;

import com.planohi.api.enums.EventCuratorRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    @Value("${security.jwt.secret-key}")
    private String secretKey;

    @Value("${security.jwt.expiration-time}")
    private long jwtExpiration;

    @Value("${security.jwt.role-secret-key}")
    private String roleSecretKey;

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private SecretKey getRoleSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(roleSecretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateRoleToken(UUID userId, UUID eventId, EventCuratorRole role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("eventId", eventId.toString());
        claims.put("userRole", role.name());

        return Jwts.builder()
                .claims(claims)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getRoleSigningKey())
                .compact();
    }

    public Claims extractAllRoleClaims(String token) {
        return Jwts.parser()
                .verifyWith(getRoleSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID extractRoleUserId(String token) {
        String idStr = extractAllRoleClaims(token).get("userId", String.class);
        return UUID.fromString(idStr);
    }

    public UUID extractRoleEventId(String token) {
        String idStr = extractAllRoleClaims(token).get("eventId", String.class);
        return UUID.fromString(idStr);
    }

    public String extractRoleUserRole(String token) {
        return extractAllRoleClaims(token).get("userRole", String.class);
    }

    public boolean isRoleTokenExpired(String token) {
        return extractAllRoleClaims(token).getExpiration().before(new Date());
    }

    public String generateToken(UUID userId, String email, String alias, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", userId.toString());
        claims.put("alias", alias);
        claims.put("role", role);

        return Jwts.builder()
                .claims(claims)
                .subject(email)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    public UUID extractUserId(String token) {
        String idStr = extractAllClaims(token).get("id", String.class);
        return UUID.fromString(idStr);
    }

    public String extractAlias(String token) {
        return extractAllClaims(token).get("alias", String.class);
    }

    public com.planohi.api.enums.UserRole extractRole(String token) {
        String roleStr = extractAllClaims(token).get("role", String.class);
        if (roleStr == null) {
            return com.planohi.api.enums.UserRole.NORMAL;
        }
        try {
            return com.planohi.api.enums.UserRole.valueOf(roleStr);
        } catch (IllegalArgumentException e) {
            return com.planohi.api.enums.UserRole.NORMAL;
        }
    }

    public boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    public boolean validateToken(String token, String email) {
        final String extractedEmail = extractEmail(token);
        return (extractedEmail.equals(email) && !isTokenExpired(token));
    }
}
