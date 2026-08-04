package com.library.service;

import com.library.entity.AuditLog;
import com.library.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public AuditLog log(String actorEmail, String actorName, String actorRole,
                        String action, String entityType, Long entityId, String details) {
        AuditLog entry = AuditLog.builder()
                .actorEmail(actorEmail)
                .actorName(actorName)
                .actorRole(actorRole)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .build();
        AuditLog saved = auditLogRepository.save(entry);
        log.info("AUDIT actor={} action={} entity={}#{}", actorEmail, action, entityType, entityId);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAll() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getForEntity(String entityType, Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId);
    }
}
