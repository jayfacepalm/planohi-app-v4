package com.planohi.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.quartz.Scheduler;
import org.mockito.Mockito;

import org.junit.jupiter.api.Disabled;

@Disabled("Skipping Spring Boot context loading test as it requires live local Postgres, Redis, RabbitMQ, and LocalStack services to be running.")
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:postgresql://localhost:5432/planohidb",
    "spring.datasource.username=planohiuser",
    "spring.datasource.password=${POSTGRES_PASSWORD:planohisecretpassword}",
    "spring.data.redis.host=localhost",
    "spring.data.redis.port=6379",
    "spring.rabbitmq.host=localhost",
    "spring.rabbitmq.port=5672",
    "security.jwt.secret-key=mockjwtsecretkeymockjwtsecretkeymockjwtsecretkey",
    "security.jwt.expiration-time=3600000",
    "security.jwt.role-secret-key=mockrolesecretkeymockrolesecretkeymockrolesecretkey",
    "security.api-key=mockapikey",
    "aws.s3.bucket-name=mockbucket",
    "aws.s3.endpoint=http://localhost:4566",
    "aws.s3.presigner-endpoint=http://localhost:4566",
    "aws.s3.access-key=mock",
    "aws.s3.secret-key=mock",
    "aws.s3.region=ap-northeast-1",
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=none",
    "spring.datasource.hikari.initialization-fail-timeout=-1",
    "spring.jpa.properties.hibernate.temp.use_jdbc_metadata_defaults=false",
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.quartz.QuartzAutoConfiguration"
})
class ApiApplicationTests {

    @Test
    void contextLoads() {
    }

    @TestConfiguration
    static class TestConfig {
        @Bean
        public Scheduler scheduler() {
            return Mockito.mock(Scheduler.class);
        }
    }
}

