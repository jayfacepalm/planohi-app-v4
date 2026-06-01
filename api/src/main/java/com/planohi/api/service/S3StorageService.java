package com.planohi.api.service;

import org.springframework.web.multipart.MultipartFile;

public interface S3StorageService {
    String uploadBanner(MultipartFile file);
    void deleteBanner(String s3Key);
    String generatePresignedUrl(String s3Key);
    byte[] fetchBannerBytes(String s3Key);
}
