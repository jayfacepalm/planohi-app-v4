package com.planohi.api.email.repository;

import com.planohi.api.email.entity.EmailTemplate;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, String> {

    @Override
    @Cacheable(value = "email_templates", key = "#id")
    Optional<EmailTemplate> findById(String id);
}
