package com.library.exception;

import lombok.Getter;

@Getter
public class ResourceNotFoundException extends RuntimeException {

    private final String resource;
    private final Object id;

    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " not found for id: " + id);
        this.resource = resource;
        this.id = id;
    }
}
