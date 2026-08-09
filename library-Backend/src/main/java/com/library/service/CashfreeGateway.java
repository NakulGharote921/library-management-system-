package com.library.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.library.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class CashfreeGateway {

    public record OrderResult(String orderId, String cfOrderId, BigDecimal amount, String currency,
                              String paymentSessionId, String orderStatus) {
    }

    public record PaymentResult(String cfPaymentId, String orderId, String paymentStatus, BigDecimal paymentAmount) {
    }

    private final String appId;
    private final String secretKey;
    private final String apiVersion;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public CashfreeGateway(
            @Value("${cashfree.app-id:}") String appId,
            @Value("${cashfree.secret-key:}") String secretKey,
            @Value("${cashfree.api-version:2026-01-01}") String apiVersion,
            @Value("${cashfree.environment:sandbox}") String environment,
            ObjectMapper objectMapper) {
        this.appId = appId;
        this.secretKey = secretKey;
        this.apiVersion = apiVersion;
        this.objectMapper = objectMapper;
        String baseUrl = "production".equalsIgnoreCase(environment)
                ? "https://api.cashfree.com/pg"
                : "https://sandbox.cashfree.com/pg";
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        log.info("CashfreeGateway initialized for environment: {} (appId configured: {})",
                environment, appId != null && !appId.isBlank());
    }

    public OrderResult createOrder(String orderId, BigDecimal amountInRupees, String customerId,
                                   String customerEmail, String customerPhone, String notifyUrl) {
        if (appId == null || appId.isBlank() || secretKey == null || secretKey.isBlank()) {
            throw new BusinessException("Cashfree is not configured (CASHFREE_APP_ID / CASHFREE_SECRET_KEY missing)");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("order_amount", amountInRupees);
        body.put("order_currency", "INR");
        body.put("order_id", orderId);
        body.put("order_note", "Library payment order " + orderId);

        Map<String, Object> customer = new LinkedHashMap<>();
        customer.put("customer_id", customerId);
        if (customerEmail != null && !customerEmail.isBlank()) {
            customer.put("customer_email", customerEmail);
        }
        customer.put("customer_phone", (customerPhone == null || customerPhone.isBlank()) ? "9999999999" : customerPhone);
        body.put("customer_details", customer);

        if (notifyUrl != null && !notifyUrl.isBlank()) {
            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("notify_url", notifyUrl);
            body.put("order_meta", meta);
        }

        JsonNode response = execute(restClient.post().uri("/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body));
        String paymentSessionId = text(response, "payment_session_id");
        if (paymentSessionId == null || paymentSessionId.isBlank()) {
            log.error("Cashfree order response missing payment_session_id: {}", response);
            throw new BusinessException("Cashfree did not return a payment session id");
        }
        return new OrderResult(text(response, "order_id"), text(response, "cf_order_id"),
                decimal(response, "order_amount"), text(response, "order_currency"),
                paymentSessionId, text(response, "order_status"));
    }

    public OrderResult getOrder(String orderId) {
        JsonNode response = execute(restClient.get().uri("/orders/{orderId}", orderId));
        return new OrderResult(text(response, "order_id"), text(response, "cf_order_id"),
                decimal(response, "order_amount"), text(response, "order_currency"),
                text(response, "payment_session_id"), text(response, "order_status"));
    }

    public List<PaymentResult> getPayments(String orderId) {
        JsonNode response = execute(restClient.get().uri("/orders/{orderId}/payments", orderId));
        List<PaymentResult> result = new ArrayList<>();
        if (response != null && response.isArray()) {
            for (JsonNode node : response) {
                result.add(new PaymentResult(text(node, "cf_payment_id"), text(node, "order_id"),
                        text(node, "payment_status"), decimal(node, "payment_amount")));
            }
        }
        return result;
    }

    public boolean verifyWebhookSignature(String rawBody, String timestamp, String signature) {
        if (rawBody == null || timestamp == null || signature == null) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal((timestamp + rawBody).getBytes(StandardCharsets.UTF_8));
            String computed = Base64.getEncoder().encodeToString(hash);
            return MessageDigest.isEqual(computed.getBytes(StandardCharsets.UTF_8),
                    signature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Cashfree webhook signature verification error: {}", e.getMessage());
            return false;
        }
    }

    private JsonNode execute(RestClient.RequestHeadersSpec<?> spec) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-api-version", apiVersion);
        headers.set("x-client-id", appId);
        headers.set("x-client-secret", secretKey);
        try {
            ResponseEntity<JsonNode> response = spec.headers(h -> h.addAll(headers)).retrieve().toEntity(JsonNode.class);
            return response.getBody();
        } catch (RestClientResponseException e) {
            String message = "Cashfree API error (" + e.getStatusCode().value() + ")";
            try {
                JsonNode error = objectMapper.readTree(e.getResponseBodyAsString());
                String detail = text(error, "message");
                if (detail != null) {
                    message += ": " + detail;
                }
            } catch (Exception ignored) {
                // keep generic message
            }
            log.error("Cashfree API call failed: {}", message);
            throw new BusinessException(message);
        }
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        return value.asText();
    }

    private BigDecimal decimal(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        try {
            return new BigDecimal(value.asText());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
