package com.library.exception;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Value
@Builder
public class ErrorResponse {

    Instant timestamp;
    int status;
    String error;
    String message;
    String path;
    Map<String, String> fieldErrors;
    List<String> details;
}
