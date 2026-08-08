package com.library.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class CorsConfigTest {

    @Test
    void allowedOriginPatternsMatchDeployedFrontendOrigins() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(
                "http://localhost:3000",
                "https://library-management-system-jqbm*.vercel.app"));

        assertNotNull(config.checkOrigin("https://library-management-system-jqbm-p9iivn7io.vercel.app"));
        assertNotNull(config.checkOrigin("https://library-management-system-jqbm.vercel.app"));
        assertNotNull(config.checkOrigin("http://localhost:3000"));
        assertNull(config.checkOrigin("https://unrelated-other.vercel.app"));
        assertNull(config.checkOrigin("https://library-management-system-evil.vercel.app"));
    }
}
