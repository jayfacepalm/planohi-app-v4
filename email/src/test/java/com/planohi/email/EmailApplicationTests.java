package com.planohi.email;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.junit.jupiter.api.Disabled;

@Disabled("Skipping Spring Boot context loading test as it requires live SMTP and RabbitMQ services.")
@SpringBootTest
class EmailApplicationTests {

	@Test
	void contextLoads() {
	}

}

