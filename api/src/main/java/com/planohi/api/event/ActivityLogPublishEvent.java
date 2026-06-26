package com.planohi.api.event;

import com.planohi.api.dto.ActivityLogEvent;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ActivityLogPublishEvent extends ApplicationEvent {
    private final ActivityLogEvent logEventData;

    public ActivityLogPublishEvent(Object source, ActivityLogEvent logEventData) {
        super(source);
        this.logEventData = logEventData;
    }
}
