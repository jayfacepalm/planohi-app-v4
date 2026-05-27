package com.planohi.api.config;

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

    // Base64 encoded 256-bit key for HMAC-SHA256 (default for local dev)
    @Value("${security.jwt.secret-key:cGFzc3dvcmQxMjNzcGFzc3dvcmQxMjNzcGFzc3dvcmQxMjNzcGFzc3dvcmQxMjM=}")
    private String secretKey;

    @Value("${security.jwt.expiration-time:86400000}") // Default 24 hours in ms
    private long jwtExpiration;

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(UUID userId, String email, String alias) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", userId.toString());
        claims.put("alias", alias);

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

    public boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    public boolean validateToken(String token, String email) {
        final String extractedEmail = extractEmail(token);
        return (extractedEmail.equals(email) && !isTokenExpired(token));
    }
}
