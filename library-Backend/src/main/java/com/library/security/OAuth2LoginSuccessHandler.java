package com.library.security;

import com.library.entity.User;
import com.library.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.oauth.frontend-redirect-uri:http://localhost:3000/oauth/callback}")
    private String frontendRedirectUri;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attrs = oauthUser.getAttributes();

        String email = (String) attrs.get("email");
        String name = (String) attrs.get("name");
        if (name == null || name.isBlank()) {
            name = (String) attrs.get("given_name");
        }
        if (name == null || name.isBlank()) {
            name = email;
        }
        final String finalName = name;

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .name(finalName)
                    .email(email)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(User.Role.MEMBER)
                    .active(true)
                    .build();
            log.info("New OAuth2 user created: {}", email);
            return userRepository.save(newUser);
        });

        if (!user.isActive()) {
            getRedirectStrategy().sendRedirect(request, response, frontendRedirectUri + "?error=account_disabled");
            return;
        }

        if (!finalName.equals(user.getName())) {
            user.setName(finalName);
        }
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        String redirect = frontendRedirectUri
                + "?token=" + encode(token)
                + "&id=" + user.getId()
                + "&name=" + encode(user.getName())
                + "&email=" + encode(user.getEmail())
                + "&role=" + user.getRole().name();
        getRedirectStrategy().sendRedirect(request, response, redirect);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
