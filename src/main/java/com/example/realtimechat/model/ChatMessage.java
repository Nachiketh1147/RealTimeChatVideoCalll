package com.example.realtimechat.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String roomId; // room or direct:user1-user2
    private String fromUser;
    private String toUser; // optional - for 1:1

    @Lob
    private String content;

    private Instant timestamp;

    // getters/setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getFromUser() { return fromUser; }
    public void setFromUser(String fromUser) { this.fromUser = fromUser; }
    public String getToUser() { return toUser; }
    public void setToUser(String toUser) { this.toUser = toUser; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
