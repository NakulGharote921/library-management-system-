package com.library.config;

import java.nio.file.Path;
import java.nio.file.Paths;

public final class UploadPaths {

    private static final Path BACKEND_DIR = findBackendDir();

    private UploadPaths() {
    }

    public static Path coversDir() {
        return BACKEND_DIR.resolve("uploads").resolve("covers");
    }

    private static Path findBackendDir() {
        String override = System.getProperty("library.backend-dir");
        if (override != null && !override.isBlank()) {
            return Paths.get(override).toAbsolutePath().normalize();
        }
        Path userDir = Paths.get(System.getProperty("user.dir")).toAbsolutePath().normalize();
        if (userDir.getFileName() != null && "library-Backend".equals(userDir.getFileName().toString())) {
            return userDir;
        }
        Path candidate = userDir.resolve("library-Backend");
        if (candidate.toFile().isDirectory()) {
            return candidate;
        }
        return userDir;
    }
}
