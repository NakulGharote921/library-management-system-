package com.library.service;

import com.library.exception.BusinessException;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Slf4j
@Service
public class RazorpayGateway {

    private final String keyId;
    private final String keySecret;

    public RazorpayGateway(
            @Value("${razorpay.key-id}") String keyId,
            @Value("${razorpay.key-secret}") String keySecret) {
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    public String getKeyId() {
        return keyId;
    }

    public String getKeySecret() {
        return keySecret;
    }

    public int toPaise(BigDecimal amountInRupees) {
        return amountInRupees.multiply(BigDecimal.valueOf(100)).intValue();
    }

    public Order createOrder(BigDecimal amountInRupees, String currency, String receipt) {
        int amountInPaise = amountInRupees.multiply(BigDecimal.valueOf(100)).intValue();
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", currency);
            orderRequest.put("receipt", receipt);
            Order order = client.orders.create(orderRequest);
            log.info("Razorpay order created: orderId={}, amountInRupees={}, amountInPaise={}, currency={}",
                    order.get("id"), amountInRupees, amountInPaise, currency);
            return order;
        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed: error={}", e.getMessage());
            throw new BusinessException("Failed to create Razorpay order: " + e.getMessage());
        }
    }

    public Order fetchOrder(String orderId) {
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            return client.orders.fetch(orderId);
        } catch (RazorpayException e) {
            log.warn("Could not fetch Razorpay order {}: {}", orderId, e.getMessage());
            throw new BusinessException("Failed to fetch Razorpay order: " + e.getMessage());
        }
    }
}
