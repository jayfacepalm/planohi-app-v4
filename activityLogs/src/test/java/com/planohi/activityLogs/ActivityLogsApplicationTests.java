package com.planohi.activityLogs;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import org.junit.jupiter.api.Disabled;

@Disabled("Skipping Spring Boot context loading test as it requires live Postgres and RabbitMQ services.")
@SpringBootTest
class ActivityLogsApplicationTests {

	@Test
	void contextLoads() {
	}

}
