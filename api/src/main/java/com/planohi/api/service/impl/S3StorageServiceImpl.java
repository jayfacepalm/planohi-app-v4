package com.planohi.api.service.impl;

import com.planohi.api.service.S3StorageService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3StorageServiceImpl implements S3StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final Environment env;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @PostConstruct
    public void initBucket() {
        log.info("Initializing S3 bucket verification for: {}", bucketName);
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            log.info("S3 bucket '{}' verified successfully and exists.", bucketName);
        } catch (NoSuchBucketException e) {
            log.info("S3 bucket '{}' does not exist.", bucketName);
            if (isLocalOrDevProfile()) {
                log.info("Creating S3 bucket '{}' in local/dev environment...", bucketName);
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
                log.info("S3 bucket '{}' created successfully.", bucketName);
            } else {
                log.error("S3 bucket '{}' does not exist and auto-creation is disabled for the current profile.", bucketName);
                throw e;
            }
        } catch (Exception e) {
            log.error("Failed to verify or create S3 bucket '{}'", bucketName, e);
            throw new RuntimeException("Could not initialize S3 storage bucket", e);
        }
    }

    private boolean isLocalOrDevProfile() {
        String[] activeProfiles = env.getActiveProfiles();
        if (activeProfiles.length == 0) {
            return true; // Default profile (local development)
        }
        for (String profile : activeProfiles) {
            if ("dev".equalsIgnoreCase(profile) || "local".equalsIgnoreCase(profile)) {
                return true;
            }
        }
        return false;
    }

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    @Override
    public String uploadBanner(MultipartFile file) {
        // Validate Size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Banner image size exceeds 5MB limit");
        }

        // Validate Type
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/png") && !contentType.equals("image/jpeg") && !contentType.equals("image/jpg"))) {
            throw new IllegalArgumentException("Only PNG and JPEG images are supported");
        }

        try {
            String filename = UUID.randomUUID().toString() + "_" + StringUtils.cleanPath(file.getOriginalFilename());
            String s3Key = "banners/" + filename;

            log.info("Uploading banner file to S3 bucket: {}, key: {}", bucketName, s3Key);

            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            log.info("Banner file successfully uploaded to S3: {}", s3Key);
            return s3Key;
        } catch (IOException e) {
            log.error("Failed to read input stream for banner upload", e);
            throw new RuntimeException("Could not store image file on S3. Please try again.");
        }
    }

    @Override
    public void deleteBanner(String s3Key) {
        if (s3Key == null || s3Key.isEmpty()) {
            return;
        }
        try {
            log.info("Deleting banner from S3 bucket: {}, key: {}", bucketName, s3Key);
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();
            s3Client.deleteObject(deleteRequest);
            log.info("Banner successfully deleted from S3: {}", s3Key);
        } catch (Exception e) {
            // GAP 13 File Deletion Safety: Log warnings instead of throwing to prevent disk exceptions from failing DB transactions
            log.warn("Failed to delete banner file from S3: {}", s3Key, e);
        }
    }

    @Override
    public String generatePresignedUrl(String s3Key) {
        if (s3Key == null || s3Key.isEmpty()) {
            return null;
        }
        try {
            GetObjectPresignRequest getRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15))
                    .getObjectRequest(builder -> builder.bucket(bucketName).key(s3Key).build())
                    .build();

            PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(getRequest);
            String presignedUrl = presigned.url().toString();
            log.debug("Generated S3 pre-signed URL for key: {}", s3Key);
            return presignedUrl;
        } catch (Exception e) {
            log.error("Failed to generate S3 pre-signed URL for key: {}", s3Key, e);
            return null;
        }
    }

    @Override
    public byte[] fetchBannerBytes(String s3Key) {
        if (s3Key == null || s3Key.isEmpty()) {
            return new byte[0];
        }
        try {
            log.debug("Fetching banner bytes from S3 key: {}", s3Key);
            return s3Client.getObjectAsBytes(builder -> builder.bucket(bucketName).key(s3Key).build()).asByteArray();
        } catch (Exception e) {
            log.error("Failed to fetch banner bytes from S3 key: {}", s3Key, e);
            return new byte[0];
        }
    }
}
