package com.planohi.email.repository;

import com.planohi.email.entity.SentEmails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface SentEmailsRepository extends JpaRepository<SentEmails, UUID> {
}
