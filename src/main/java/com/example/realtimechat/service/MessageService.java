package com.example.realtimechat.service;

import com.example.realtimechat.model.ChatMessage;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {}

@Service
public class MessageService {

    @Autowired
    private ChatMessageRepository repo;

    public ChatMessage saveMessage(ChatMessage m) {
        if (m.getTimestamp() == null) m.setTimestamp(Instant.now());
        return repo.save(m);
    }

    public List<ChatMessage> findByRoom(String roomId) {
        return repo.findAll().stream().filter(m -> roomId.equals(m.getRoomId())).collect(Collectors.toList());
    }

    public List<ChatMessage> search(String roomId, String query) {
        String q = query.toLowerCase();
        return findByRoom(roomId).stream().filter(m -> m.getContent() != null && m.getContent().toLowerCase().contains(q)).collect(Collectors.toList());
    }
}
