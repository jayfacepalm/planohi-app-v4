package com.planohi.activityLogs.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.Jackson2JavaTypeMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String ACTIVITY_EXCHANGE = "activity.exchange";
    public static final String ACTIVITY_QUEUE = "activity.log.queue";
    public static final String ACTIVITY_ROUTING_KEY = "activity.#";

    public static final String ACTIVITY_DLX = "activity.exchange.dlx";
    public static final String ACTIVITY_DLQ = "activity.log.dlq";
    public static final String ACTIVITY_DLQ_ROUTING_KEY = "activity.log";

    @Bean
    public Jackson2JsonMessageConverter consumerJackson2MessageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        converter.setTypePrecedence(Jackson2JavaTypeMapper.TypePrecedence.INFERRED);
        return converter;
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
}

