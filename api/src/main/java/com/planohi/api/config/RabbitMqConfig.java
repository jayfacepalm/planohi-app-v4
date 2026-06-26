package com.planohi.api.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String EXCHANGE = "email.exchange";
    public static final String QUEUE = "email.send.queue";
    public static final String ROUTING_KEY = "email.send";

    public static final String ACTIVITY_EXCHANGE = "activity.exchange";
    public static final String ACTIVITY_QUEUE = "activity.log.queue";
    public static final String ACTIVITY_ROUTING_KEY = "activity.#";

    public static final String ACTIVITY_DLX = "activity.exchange.dlx";
    public static final String ACTIVITY_DLQ = "activity.log.dlq";
    public static final String ACTIVITY_DLQ_ROUTING_KEY = "activity.log";

    @Bean
    public DirectExchange emailExchange() {
        return new DirectExchange(EXCHANGE);
    }

    @Bean
    public Queue emailQueue() {
        return new Queue(QUEUE, true);
    }

    @Bean
    public Binding emailBinding(Queue emailQueue, DirectExchange emailExchange) {
        return BindingBuilder.bind(emailQueue).to(emailExchange).with(ROUTING_KEY);
    }

    @Bean
    public TopicExchange activityExchange() {
        return new TopicExchange(ACTIVITY_EXCHANGE);
    }

    @Bean
    public Queue activityQueue() {
        return QueueBuilder.durable(ACTIVITY_QUEUE)
                .withArgument("x-dead-letter-exchange", ACTIVITY_DLX)
                .withArgument("x-dead-letter-routing-key", ACTIVITY_DLQ_ROUTING_KEY)
                .build();
    }

    @Bean
    public Binding activityBinding(Queue activityQueue, TopicExchange activityExchange) {
        return BindingBuilder.bind(activityQueue).to(activityExchange).with(ACTIVITY_ROUTING_KEY);
    }

    @Bean
    public DirectExchange activityDlx() {
        return new DirectExchange(ACTIVITY_DLX);
    }

    @Bean
    public Queue activityDlq() {
        return new Queue(ACTIVITY_DLQ, true);
    }

    @Bean
    public Binding activityDlqBinding(Queue activityDlq, DirectExchange activityDlx) {
        return BindingBuilder.bind(activityDlq).to(activityDlx).with(ACTIVITY_DLQ_ROUTING_KEY);
    }

    @Bean
    public JacksonJsonMessageConverter producerJackson2MessageConverter(tools.jackson.databind.json.JsonMapper jsonMapper) {
        return new JacksonJsonMessageConverter(jsonMapper);
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, JacksonJsonMessageConverter producerJackson2MessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(producerJackson2MessageConverter);
        template.setBeforePublishPostProcessors(message -> {
            String correlationId = org.slf4j.MDC.get("correlationId");
            if (correlationId != null) {
                message.getMessageProperties().setHeader("X-Correlation-Id", correlationId);
            }
            return message;
        });
        return template;
    }
}
