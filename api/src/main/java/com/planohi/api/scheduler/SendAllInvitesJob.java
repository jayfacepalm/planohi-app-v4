package com.planohi.api.scheduler;

import java.util.UUID;

import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.quartz.QuartzJobBean;
import org.springframework.stereotype.Component;

import com.planohi.api.service.InviteeService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class SendAllInvitesJob extends QuartzJobBean {

    private InviteeService inviteeCachedService;

    @Autowired
    public void setInviteeCachedService(InviteeService inviteeCachedService) {
        this.inviteeCachedService = inviteeCachedService;
    }

    @Override
    protected void executeInternal(JobExecutionContext context) throws JobExecutionException {
        log.info("Starting scheduled SendAllInvitesJob execution");
        try {
            String eventIdStr = context.getJobDetail().getJobDataMap().getString("eventId");
            String userIdStr = context.getJobDetail().getJobDataMap().getString("userId");
            if (eventIdStr == null || userIdStr == null) {
                log.error("JobDataMap missing required eventId or userId");
                return;
            }
            UUID eventId = UUID.fromString(eventIdStr);
            UUID userId = UUID.fromString(userIdStr);
            inviteeCachedService.executeBulkSend(userId, eventId);
            log.info("SendAllInvitesJob completed successfully for event {}", eventId);
        } catch (Exception e) {
            log.error("Failed to execute SendAllInvitesJob", e);
            throw new JobExecutionException(e);
        }
    }
}
