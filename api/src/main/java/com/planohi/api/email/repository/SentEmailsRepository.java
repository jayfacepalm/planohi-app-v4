package com.planohi.api.email.repository;

import com.planohi.api.email.entity.SentEmails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface SentEmailsRepository extends JpaRepository<SentEmails, UUID> {
}
