package com.planohi.activityLogs.config;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class RabbitMdcAspect {

    @Around("@annotation(org.springframework.amqp.rabbit.annotation.RabbitListener)")
    public Object manageMdc(ProceedingJoinPoint pjp) throws Throwable {
        org.springframework.amqp.core.Message message = null;
        for (Object arg : pjp.getArgs()) {
            if (arg instanceof org.springframework.amqp.core.Message m) {
                message = m;
                break;
            }
        }
        if (message != null) {
            String correlationId = (String) message.getMessageProperties().getHeaders().get("X-Correlation-Id");
            if (correlationId != null) {
                MDC.put("correlationId", correlationId);
            }
        }
        try {
            return pjp.proceed();
        } finally {
            MDC.clear();
        }
    }
}
